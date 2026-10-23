<script setup>
import { ArrowLeft, Check, ChevronDown, ExternalLink, PackageX } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import ProductImagesField from '../../components/admin/ProductImagesField.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseConfirmDialog from '../../components/ui/BaseConfirmDialog.vue'
import BaseErrorState from '../../components/ui/BaseErrorState.vue'
import BaseFormError from '../../components/ui/BaseFormError.vue'
import BaseInput from '../../components/ui/BaseInput.vue'
import { useAsync } from '../../composables/useAsync'
import { useToast } from '../../composables/useToast'
import { TIPOS_ESPACIO } from '../../config/tiposEspacio'
import { getCategorias } from '../../services/categoriaService'
import { FORBIDDEN_MESSAGE, isForbidden, submitErrorMessage } from '../../services/errorMessages'
import {
  actualizarProducto,
  CAMPOS_PRODUCTO,
  crearProducto,
  ERRORES_PRODUCTO,
  esProductoNoEncontrado,
  obtenerProductoPorId,
} from '../../services/productoService'
import { formatearPrecio } from '../../utils/formato'

// Formulario compartido de /admin/productos/nuevo (crear) y /admin/productos/:id (editar).
// Los campos son los de ProductoRequest (API.md), con sus nombres tal cual: así un 400 del
// backend que nombra un campo ("precioReferencialUsd") cae directo junto a ese campo.
const route = useRoute()
const router = useRouter()
const toast = useToast()

const esNuevo = route.name === 'admin-product-new'
const productoId = route.params.id

// Al terminar se vuelve a la lista. Si se llegó desde ella, con "Atrás": así conserva
// la búsqueda, los filtros y la posición de la página.
const anterior = window.history.state?.back
const vieneDeLaLista = typeof anterior === 'string' && anterior.split('?')[0] === '/admin/productos'

function volverALaLista() {
  if (vieneDeLaLista) router.back()
  else router.replace({ name: 'admin-products' })
}

// --- Carga: las categorías siempre; el producto, solo al editar ---
const carga = useAsync(() => Promise.all([esNuevo ? null : obtenerProductoPorId(productoId), getCategorias()]))
const producto = computed(() => carga.data.value?.[0] ?? null)
const categorias = computed(() => carga.data.value?.[1] ?? [])
const noEncontrado = computed(() => !esNuevo && esProductoNoEncontrado(carga.error.value))

// --- Formulario ---
// El precio se edita como texto ("1250,50"): se convierte a número al validar y al enviar.
const form = reactive({
  nombre: '',
  descripcion: '',
  categoriaId: null,
  tipoEspacio: '',
  precioReferencialUsd: '',
  enShowroom: false,
  material: '',
  dimensionesEstandar: '',
  imagenes: [],
})
const errors = reactive(Object.fromEntries(CAMPOS_PRODUCTO.map((campo) => [campo, ''])))

const LIMITES = { nombre: 120, descripcion: 1000, material: 255, dimensionesEstandar: 60 }
const PRECIO_MAXIMO = 100000

// "1250,50", "1250.5" o "$ 1250" → { valor: 1250.5 } · lo que no sirve → { error }.
// Se acepta coma o punto decimal (en Venezuela se escribe con coma), pero sin separador de miles:
// "1.250" sería ambiguo (¿mil doscientos cincuenta o uno con veinticinco?).
function leerPrecio(texto) {
  const limpio = String(texto ?? '').replace(/[$\s]/g, '')
  if (!limpio) return { error: 'Escribe el precio referencial.' }
  if (!/^\d+([.,]\d+)?$/.test(limpio)) {
    return { error: 'Escribe solo números, con coma para los decimales y sin puntos de miles: 1250,50.' }
  }
  if (/[.,]\d{3,}$/.test(limpio)) return { error: 'Usa como máximo 2 decimales, sin puntos de miles: 1250,50.' }
  const valor = Number(limpio.replace(',', '.'))
  if (valor <= 0) return { error: 'El precio debe ser mayor que 0.' }
  if (valor > PRECIO_MAXIMO) return { error: `Revisa el precio: es mayor que ${formatearPrecio(PRECIO_MAXIMO)}.` }
  return { valor }
}

// Número → texto del campo, siempre con 2 decimales: 480 → "480,00".
function precioEnCampo(valor) {
  return Number(valor).toFixed(2).replace('.', ',')
}

function largoMaximo(campo, nombre) {
  return (value) => (value.trim().length > LIMITES[campo] ? `${nombre} puede tener hasta ${LIMITES[campo]} caracteres.` : '')
}

// Cada regla devuelve el mensaje de error, o '' si el campo está bien. El orden es el de la página:
// así el foco va al primer campo con error.
const rules = {
  nombre(value) {
    const nombre = value.trim()
    if (!nombre) return 'Escribe el nombre del producto.'
    if (nombre.length < 3) return 'El nombre es muy corto: usa al menos 3 caracteres.'
    return largoMaximo('nombre', 'El nombre')(value)
  },
  descripcion: largoMaximo('descripcion', 'La descripción'),
  categoriaId(value) {
    if (value == null) return 'Elige una categoría.'
    if (!categorias.value.some((c) => c.id === value)) return 'Esa categoría ya no existe. Elige otra.'
    return ''
  },
  tipoEspacio(value) {
    if (!value) return 'Elige el ambiente.'
    if (!TIPOS_ESPACIO.some((tipo) => tipo.valor === value)) return 'Elige uno de los ambientes de la lista.'
    return ''
  },
  precioReferencialUsd: (value) => leerPrecio(value).error ?? '',
  enShowroom: () => '',
  material: largoMaximo('material', 'El material'),
  dimensionesEstandar: largoMaximo('dimensionesEstandar', 'Las dimensiones'),
  imagenes: (value) => (value.length ? '' : 'Agrega al menos una imagen: la primera es la que se ve en el catálogo.'),
}

// Antes del primer envío no se marcan errores; después, cada campo se revisa al salir de él.
const attempted = ref(false)

function validateField(field) {
  errors[field] = rules[field](form[field])
}

function handleBlur(field) {
  if (attempted.value) validateField(field)
}

// Al salir del precio se deja con 2 decimales si es válido ("480" → "480,00").
function handlePrecioBlur() {
  const { valor } = leerPrecio(form.precioReferencialUsd)
  if (valor !== undefined) form.precioReferencialUsd = precioEnCampo(valor)
  handleBlur('precioReferencialUsd')
}

const precioVistaPrevia = computed(() => {
  const { valor } = leerPrecio(form.precioReferencialUsd)
  return valor === undefined ? '' : `En la tienda: Precio referencial ${formatearPrecio(valor)}`
})

// Elegir una opción la valida al momento (no hay "salir del campo" en un radio o un select).
function elegir(field, value) {
  form[field] = value
  if (attempted.value) validateField(field)
}

const imagesField = useTemplateRef('imagesField')

function focusField(field) {
  if (field === 'imagenes') imagesField.value?.focus()
  else if (field === 'tipoEspacio') {
    const radios = [...document.querySelectorAll('input[name="producto-tipoEspacio"]')]
    ;(radios.find((radio) => radio.checked) ?? radios[0])?.focus()
  } else document.getElementById(`producto-${field}`)?.focus()
}

// --- Cambios sin guardar ---
// Se compara lo que importa al guardar: "480" y "480,00" son el mismo precio.
function comparable() {
  const { valor } = leerPrecio(form.precioReferencialUsd)
  return JSON.stringify({
    ...form,
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    material: form.material.trim(),
    dimensionesEstandar: form.dimensionesEstandar.trim(),
    precioReferencialUsd: valor ?? form.precioReferencialUsd.trim(),
  })
}

const original = ref(comparable())
const hayCambios = computed(() => comparable() !== original.value)

// Al llegar el producto (también tras "Reintentar") se copia al formulario. Lo que llegue sin valor queda vacío.
watch(producto, (p) => p && llenarFormulario(p), { immediate: true })

function llenarFormulario(p) {
  form.nombre = p.nombre ?? ''
  form.descripcion = p.descripcion ?? ''
  form.categoriaId = p.categoriaId ?? null
  form.tipoEspacio = p.tipoEspacio ?? ''
  form.precioReferencialUsd = p.precioReferencialUsd == null ? '' : precioEnCampo(p.precioReferencialUsd)
  form.enShowroom = p.enShowroom === true
  form.material = p.material ?? ''
  form.dimensionesEstandar = p.dimensionesEstandar ?? ''
  form.imagenes = Array.isArray(p.imagenes) ? [...new Set(p.imagenes.filter(Boolean))] : []
  original.value = comparable()
}

// Salir con cambios: se pregunta antes. permitirSalida se activa al guardar o al confirmar la salida.
let permitirSalida = false
const salidaPendiente = ref(null)

onBeforeRouteLeave((to) => {
  if (permitirSalida || !hayCambios.value) return true
  salidaPendiente.value = to
  return false
})

function salirSinGuardar() {
  const destino = salidaPendiente.value
  permitirSalida = true
  salidaPendiente.value = null
  router.push(destino)
}

// Cerrar la pestaña o recargar: el navegador muestra su propio aviso (no deja personalizar el texto).
function onBeforeUnload(event) {
  if (permitirSalida || !hayCambios.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

// --- Guardar ---
const envio = useAsync((datos) => (esNuevo ? crearProducto(datos) : actualizarProducto(productoId, datos)), {
  immediate: false,
})
const comprobandoImagenes = ref(false)
const guardando = computed(() => envio.loading.value || comprobandoImagenes.value)
const imagenesRotas = ref([])
const dialogoRotasAbierto = ref(false)

const serverError = computed(() => {
  const error = envio.error.value
  if (!error) return ''
  if (isForbidden(error)) return FORBIDDEN_MESSAGE
  if (error.code === ERRORES_PRODUCTO.DATOS_INVALIDOS) {
    return 'El servidor no aceptó los datos y no dijo cuál falló. Revisa los campos y vuelve a intentarlo.'
  }
  if (!esNuevo && esProductoNoEncontrado(error)) {
    return 'Este producto ya no existe: alguien lo eliminó mientras lo editabas. Copia lo que necesites y vuelve a la lista.'
  }
  return submitErrorMessage(error, 'guardar el producto')
})

async function guardar({ aunqueNoCarguen = false } = {}) {
  if (guardando.value) return
  attempted.value = true
  CAMPOS_PRODUCTO.forEach(validateField)

  const firstInvalid = CAMPOS_PRODUCTO.find((field) => errors[field])
  if (firstInvalid) {
    envio.error.value = null // el error del envío anterior ya no aplica
    focusField(firstInvalid)
    return
  }

  // Una imagen que no carga se vería rota en la tienda: se pregunta antes de guardar.
  if (!aunqueNoCarguen) {
    comprobandoImagenes.value = true
    imagenesRotas.value = (await imagesField.value?.imagenesRotas()) ?? []
    comprobandoImagenes.value = false
    if (imagenesRotas.value.length) {
      dialogoRotasAbierto.value = true
      return
    }
  }

  const datos = { ...form, imagenes: [...form.imagenes], precioReferencialUsd: leerPrecio(form.precioReferencialUsd).valor }
  const guardado = await envio.execute(datos)
  const error = envio.error.value

  if (!error) {
    permitirSalida = true
    toast.show(esNuevo ? `Creamos «${guardado.nombre}».` : `Guardamos los cambios de «${guardado.nombre}».`, {
      tone: 'success',
      duration: 6000,
      action: { label: 'Ver en la tienda', to: `/producto/${guardado.id}` },
    })
    volverALaLista()
    return
  }

  // 400 con detalle: cada mensaje va junto a su campo y el foco al primero.
  if (error.code === ERRORES_PRODUCTO.DATOS_INVALIDOS) {
    const campos = Object.keys(error.campos ?? {})
    if (campos.length) {
      for (const campo of campos) errors[campo] = error.campos[campo]
      envio.error.value = null
      await nextTick()
      focusField(CAMPOS_PRODUCTO.find((campo) => error.campos[campo]))
    }
  }
}

function guardarAunqueNoCarguen() {
  dialogoRotasAbierto.value = false
  guardar({ aunqueNoCarguen: true })
}

function revisarImagenes() {
  dialogoRotasAbierto.value = false
  // Al cerrarse, el diálogo devuelve el foco al botón Guardar: después se lleva al campo de imágenes.
  setTimeout(() => imagesField.value?.focus(), 0)
}

// --- Estilos compartidos ---
const fieldClass =
  'w-full rounded-md border bg-surface px-3.5 text-base text-ink transition-[border-color,box-shadow] duration-200 ease-out focus:outline-none focus-visible:outline-none'
function fieldState(field) {
  return errors[field]
    ? 'border-error focus:ring-2 focus:ring-error'
    : 'border-line-strong hover:border-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/25'
}
const optionRow =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors duration-200 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand'
const sectionClass = 'px-4 py-6 sm:px-6'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6 lg:px-10 lg:pt-10">
    <RouterLink
      :to="{ name: 'admin-products' }"
      class="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md pr-2 pl-1 text-small font-semibold text-brand-deep hover:text-brand-deeper"
      @click.prevent="volverALaLista"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
      Productos
    </RouterLink>

    <!-- Cargando: la forma del formulario, sin h1 falso (el foco espera en <main>) -->
    <div v-if="carga.loading.value" class="mt-3" aria-busy="true">
      <span class="sr-only">Cargando el producto…</span>
      <div class="h-8 w-64 max-w-full animate-pulse rounded-sm bg-line" aria-hidden="true" />
      <div class="mt-6 space-y-5 rounded-md border border-line bg-surface px-4 py-6 sm:px-6" aria-hidden="true">
        <div v-for="n in 4" :key="n">
          <div class="h-3.5 w-28 animate-pulse rounded-sm bg-line" />
          <div class="mt-2 h-[46px] animate-pulse rounded-md bg-ground" />
        </div>
      </div>
    </div>

    <!-- No existe -->
    <div v-else-if="noEncontrado" class="mt-3 flex flex-col items-start">
      <PackageX class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <h1 class="mt-3 text-headline text-ink">No encontramos este producto</h1>
      <p class="mt-2 max-w-measure text-ink-muted">Puede que lo hayan eliminado. Revisa la lista de productos.</p>
      <BaseButton class="mt-6" :to="{ name: 'admin-products' }">Ver los productos</BaseButton>
    </div>

    <!-- Error de carga -->
    <div v-else-if="carga.error.value" class="mt-3">
      <h1 class="sr-only">{{ esNuevo ? 'Nuevo producto' : 'Editar producto' }}</h1>
      <BaseErrorState
        :title="esNuevo ? 'No pudimos preparar el formulario' : 'No pudimos cargar este producto'"
        :error="carga.error.value"
        :subject="esNuevo ? 'las categorías' : 'este producto'"
        @retry="carga.retry()"
      />
    </div>

    <template v-else>
      <div class="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div class="min-w-0">
          <h1 class="text-headline text-balance text-ink">{{ esNuevo ? 'Nuevo producto' : 'Editar producto' }}</h1>
          <p class="mt-1 text-ink-muted">
            <template v-if="esNuevo">Los campos con * son obligatorios.</template>
            <template v-else>{{ producto?.nombre }} · Los campos con * son obligatorios.</template>
          </p>
        </div>
        <a
          v-if="!esNuevo"
          :href="`/producto/${productoId}`"
          target="_blank"
          rel="noopener"
          class="inline-flex min-h-11 items-center gap-1.5 rounded-md text-small font-semibold text-brand-deep hover:text-brand-deeper"
        >
          Ver en la tienda
          <ExternalLink class="size-4" aria-hidden="true" />
          <span class="sr-only">(se abre en otra pestaña)</span>
        </a>
      </div>

      <form class="mt-6" novalidate @submit.prevent="guardar()">
        <div class="divide-y divide-line rounded-md border border-line bg-surface">
          <!-- Datos del producto -->
          <section :class="sectionClass" aria-labelledby="producto-seccion-datos">
            <h2 id="producto-seccion-datos" class="font-bold text-ink">Datos del producto</h2>
            <div class="mt-4 space-y-5">
              <BaseInput
                id="producto-nombre"
                v-model="form.nombre"
                label="Nombre"
                required
                autocomplete="off"
                :maxlength="LIMITES.nombre + 20"
                :error="errors.nombre"
                hint="Como se verá en el catálogo. Ejemplo: Silla Ejecutiva Malla Transpirable."
                @blur="handleBlur('nombre')"
              />

              <div>
                <label for="producto-descripcion" class="mb-1.5 block text-small font-semibold text-ink">Descripción</label>
                <textarea
                  id="producto-descripcion"
                  v-model="form.descripcion"
                  rows="4"
                  :aria-invalid="Boolean(errors.descripcion) || undefined"
                  aria-describedby="producto-descripcion-message"
                  class="min-h-28 resize-y py-3"
                  :class="[fieldClass, fieldState('descripcion')]"
                  @blur="handleBlur('descripcion')"
                />
                <div aria-live="polite">
                  <p
                    id="producto-descripcion-message"
                    class="mt-1.5 flex justify-between gap-3 text-small"
                    :class="errors.descripcion ? 'text-error' : 'text-ink-muted'"
                  >
                    <span>{{ errors.descripcion || 'Para qué sirve, qué incluye, cómo se ajusta.' }}</span>
                    <span class="shrink-0 tabular-nums" aria-hidden="true">
                      {{ form.descripcion.trim().length }}/{{ LIMITES.descripcion }}
                    </span>
                  </p>
                </div>
              </div>

              <div class="sm:max-w-xs">
                <label for="producto-categoriaId" class="mb-1.5 block text-small font-semibold text-ink">
                  Categoría <span class="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <div class="relative">
                  <select
                    id="producto-categoriaId"
                    :value="form.categoriaId ?? ''"
                    required
                    :aria-invalid="Boolean(errors.categoriaId) || undefined"
                    :aria-describedby="errors.categoriaId ? 'producto-categoriaId-message' : undefined"
                    class="h-[46px] cursor-pointer appearance-none pr-10"
                    :class="[fieldClass, fieldState('categoriaId'), form.categoriaId == null && 'text-ink-muted']"
                    @change="elegir('categoriaId', $event.target.value === '' ? null : Number($event.target.value))"
                  >
                    <option value="" disabled>Elige una categoría</option>
                    <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id" class="text-ink">
                      {{ categoria.nombre }}
                    </option>
                  </select>
                  <ChevronDown
                    class="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                </div>
                <div aria-live="polite">
                  <p v-if="errors.categoriaId" id="producto-categoriaId-message" class="mt-1.5 text-small text-error">
                    {{ errors.categoriaId }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Ambiente -->
          <section :class="sectionClass">
            <fieldset :aria-describedby="errors.tipoEspacio ? 'producto-tipoEspacio-message' : undefined">
              <legend class="font-bold text-ink">
                Ambiente <span class="font-semibold text-ink-muted" aria-hidden="true">*</span>
              </legend>
              <p class="mt-1 text-small text-ink-muted">Dónde se usa: filtra el catálogo en la tira de muestras.</p>
              <div class="mt-4 grid gap-2 sm:grid-cols-2">
                <label
                  v-for="tipo in TIPOS_ESPACIO"
                  :key="tipo.valor"
                  :class="[
                    optionRow,
                    form.tipoEspacio === tipo.valor
                      ? 'border-brand-deep bg-brand-tint text-brand-deep'
                      : errors.tipoEspacio
                        ? 'border-error text-ink hover:bg-ground'
                        : 'border-line text-ink hover:bg-ground',
                  ]"
                >
                  <input
                    type="radio"
                    class="sr-only"
                    name="producto-tipoEspacio"
                    :value="tipo.valor"
                    :checked="form.tipoEspacio === tipo.valor"
                    @change="elegir('tipoEspacio', tipo.valor)"
                  />
                  <span class="grid size-7 shrink-0 place-items-center rounded-sm" :class="tipo.swatchClass" aria-hidden="true">
                    <component :is="tipo.icon" class="size-4" :stroke-width="2" />
                  </span>
                  <span class="min-w-0 flex-1 font-semibold">{{ tipo.etiqueta }}</span>
                  <Check
                    class="size-4 shrink-0"
                    :class="form.tipoEspacio === tipo.valor ? 'text-brand-deep' : 'invisible'"
                    :stroke-width="2.5"
                    aria-hidden="true"
                  />
                </label>
              </div>
              <div aria-live="polite">
                <p v-if="errors.tipoEspacio" id="producto-tipoEspacio-message" class="mt-1.5 text-small text-error">
                  {{ errors.tipoEspacio }}
                </p>
              </div>
            </fieldset>
          </section>

          <!-- Precio y showroom -->
          <section :class="sectionClass" aria-labelledby="producto-seccion-precio">
            <h2 id="producto-seccion-precio" class="font-bold text-ink">Precio y showroom</h2>
            <div class="mt-4 space-y-5">
              <BaseInput
                id="producto-precioReferencialUsd"
                v-model="form.precioReferencialUsd"
                class="tabular-nums"
                label="Precio referencial (USD)"
                required
                inputmode="decimal"
                autocomplete="off"
                placeholder="0,00"
                :error="errors.precioReferencialUsd"
                :hint="precioVistaPrevia || 'Con coma para los decimales: 1250,50. El precio final se da en la cotización.'"
                @blur="handlePrecioBlur"
              >
                <template #leading><span class="font-semibold text-ink">$</span></template>
              </BaseInput>

              <!-- Interruptor como el de /buscar. El punto dorado: es lo que lleva al showroom. -->
              <button
                type="button"
                role="switch"
                :aria-checked="form.enShowroom"
                aria-describedby="producto-enShowroom-hint"
                class="group flex min-h-11 w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors duration-200 ease-out sm:max-w-xs"
                :class="form.enShowroom ? 'border-brand-deep bg-brand-tint text-brand-deep' : 'border-line-strong text-ink hover:bg-ground'"
                @click="form.enShowroom = !form.enShowroom"
              >
                <span class="size-2.5 shrink-0 rounded-full bg-showroom-gold" aria-hidden="true" />
                <span class="min-w-0 flex-1 font-semibold">En showroom</span>
                <span
                  class="relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ease-out"
                  :class="form.enShowroom ? 'bg-brand-deep' : 'bg-line-strong'"
                  aria-hidden="true"
                >
                  <span
                    class="absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
                    :class="form.enShowroom && 'translate-x-4'"
                  />
                </span>
              </button>
              <p id="producto-enShowroom-hint" class="-mt-3.5 text-small text-ink-muted">
                Se puede ver y probar en el showroom: lleva la etiqueta «En showroom» en la tienda.
              </p>
            </div>
          </section>

          <!-- Detalles -->
          <section :class="sectionClass" aria-labelledby="producto-seccion-detalles">
            <h2 id="producto-seccion-detalles" class="font-bold text-ink">Detalles</h2>
            <div class="mt-4 grid gap-5 sm:grid-cols-2">
              <BaseInput
                id="producto-material"
                v-model="form.material"
                label="Material"
                autocomplete="off"
                :error="errors.material"
                hint="Ejemplo: Melamina 18 mm con estructura metálica."
                @blur="handleBlur('material')"
              />
              <BaseInput
                id="producto-dimensionesEstandar"
                v-model="form.dimensionesEstandar"
                label="Dimensiones estándar"
                autocomplete="off"
                :error="errors.dimensionesEstandar"
                hint="Ancho x fondo x alto: 0.65m x 0.65m x 1.20m."
                @blur="handleBlur('dimensionesEstandar')"
              />
            </div>
          </section>

          <!-- Imágenes -->
          <section id="producto-imagenes" :class="sectionClass" class="scroll-mt-6" aria-labelledby="producto-seccion-imagenes">
            <h2 id="producto-seccion-imagenes" class="font-bold text-ink">
              Imágenes <span class="font-semibold text-ink-muted" aria-hidden="true">*</span>
            </h2>
            <p class="mt-1 text-small text-ink-muted">Se ven en 4:5, como en la tienda. La primera es la principal.</p>
            <div class="mt-4">
              <ProductImagesField ref="imagesField" v-model="form.imagenes" :error="errors.imagenes" />
            </div>
          </section>
        </div>

        <div class="mt-6 space-y-4">
          <BaseFormError v-if="serverError">{{ serverError }}</BaseFormError>
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <BaseButton variant="secondary" :disabled="guardando" @click="volverALaLista">Cancelar</BaseButton>
            <BaseButton type="submit" :loading="guardando">
              {{ esNuevo ? 'Crear producto' : 'Guardar cambios' }}
            </BaseButton>
          </div>
        </div>
      </form>
    </template>

    <!-- Imágenes que no cargan -->
    <BaseConfirmDialog
      :open="dialogoRotasAbierto"
      :title="imagenesRotas.length === 1 ? 'Una imagen no carga' : `${imagenesRotas.length} imágenes no cargan`"
      confirm-label="Guardar de todos modos"
      confirm-variant="primary"
      cancel-label="Revisar imágenes"
      @confirm="guardarAunqueNoCarguen"
      @close="revisarImagenes"
    >
      <p>En la tienda se verá un dibujo de reemplazo en su lugar. Revisa que la URL esté completa y que la foto ya esté subida.</p>
      <ul class="mt-3 space-y-1 text-small">
        <li v-for="url in imagenesRotas" :key="url" class="font-mono break-all text-ink">{{ url }}</li>
      </ul>
    </BaseConfirmDialog>

    <!-- Salir sin guardar -->
    <BaseConfirmDialog
      :open="salidaPendiente !== null"
      title="¿Salir sin guardar?"
      confirm-label="Salir sin guardar"
      cancel-label="Seguir editando"
      @confirm="salirSinGuardar"
      @close="salidaPendiente = null"
    >
      <p>
        {{ esNuevo ? 'El producto todavía no está creado: se perderá lo que escribiste.' : 'Se perderán los cambios que hiciste en este producto.' }}
      </p>
    </BaseConfirmDialog>
  </div>
</template>
