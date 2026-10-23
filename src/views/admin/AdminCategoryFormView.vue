<script setup>
import { ArrowLeft, ExternalLink, FolderX, Lock } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseConfirmDialog from '../../components/ui/BaseConfirmDialog.vue'
import BaseErrorState from '../../components/ui/BaseErrorState.vue'
import BaseFormError from '../../components/ui/BaseFormError.vue'
import BaseInput from '../../components/ui/BaseInput.vue'
import { useAsync } from '../../composables/useAsync'
import { recargarCategorias } from '../../composables/useCategorias'
import { useToast } from '../../composables/useToast'
import {
  actualizarCategoria,
  CAMPOS_CATEGORIA,
  crearCategoria,
  ERRORES_CATEGORIA,
  esCategoriaNoEncontrada,
  generarSlug,
  getCategorias,
} from '../../services/categoriaService'
import { FORBIDDEN_MESSAGE, isForbidden, submitErrorMessage } from '../../services/errorMessages'
import { invalidarCatalogo } from '../../services/productoService'

// Formulario compartido de /admin/categorias/nueva (crear) y /admin/categorias/:id (editar).
// Los campos son los de CategoriaRequest (API.md): nombre y descripción. El slug lo genera
// el backend a partir del nombre; aquí solo se muestra, sin poder editarlo.
const route = useRoute()
const router = useRouter()
const toast = useToast()

const esNueva = route.name === 'admin-category-new'
const categoriaId = Number(route.params.id)

// Al terminar se vuelve a la lista: con "Atrás" si se llegó desde ella (así no se duplica en el historial).
const anterior = window.history.state?.back
const vieneDeLaLista = typeof anterior === 'string' && anterior.split('?')[0] === '/admin/categorias'

function volverALaLista() {
  if (vieneDeLaLista) router.back()
  else router.replace({ name: 'admin-categories' })
}

// --- Carga ---
// No hay GET /api/v1/categorias/{id} (da 405): se pide la lista y se busca. La lista también
// sirve para avisar de un nombre repetido antes de enviar.
const carga = useAsync(() => getCategorias())
const categorias = computed(() => carga.data.value ?? [])
const categoria = computed(() => (esNueva ? null : (categorias.value.find((c) => c.id === categoriaId) ?? null)))
const noEncontrada = computed(() => !esNueva && Boolean(carga.data.value) && !categoria.value)

// --- Formulario ---
const form = reactive({ nombre: '', descripcion: '' })
const errors = reactive({ nombre: '', descripcion: '' })

// El Swagger no da largos máximos (pendiente 32 de API.md). 255 es el largo por defecto
// de una columna de texto en Spring/JPA: más largo, la base de datos lo rechazaría.
const LIMITES = { nombre: 60, descripcion: 255 }

// Las demás categorías, para avisar si el nombre daría un enlace que ya existe.
const otras = computed(() => categorias.value.filter((c) => c.id !== categoriaId))

const rules = {
  nombre(value) {
    const nombre = value.trim()
    if (!nombre) return 'Escribe el nombre de la categoría.'
    if (nombre.length < 3) return 'El nombre es muy corto: usa al menos 3 caracteres.'
    if (nombre.length > LIMITES.nombre) return `El nombre puede tener hasta ${LIMITES.nombre} caracteres.`
    const repetida = otras.value.find((c) => c.slug === generarSlug(nombre))
    if (repetida) return `Ya existe la categoría «${repetida.nombre}», con el mismo enlace. Usa otro nombre.`
    return ''
  },
  descripcion(value) {
    return value.trim().length > LIMITES.descripcion ? `La descripción puede tener hasta ${LIMITES.descripcion} caracteres.` : ''
  },
}

// Antes del primer envío no se marcan errores; después, cada campo se revisa al salir de él.
const attempted = ref(false)

function validateField(field) {
  errors[field] = rules[field](form[field])
}

function handleBlur(field) {
  if (attempted.value) validateField(field)
}

// --- Enlace (slug) ---
const slugPrevio = computed(() => generarSlug(form.nombre))
// Al editar: si el nombre nuevo daría otro slug, se avisa. No sabemos si el backend lo regenera
// al editar (pendiente 32): por eso dice "podría".
const slugPodriaCambiar = computed(() => !esNueva && categoria.value && slugPrevio.value && slugPrevio.value !== categoria.value.slug)

// --- Cambios sin guardar ---
function comparable() {
  return JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() })
}

const original = ref(comparable())
const hayCambios = computed(() => comparable() !== original.value)

// Al llegar la categoría (también tras "Reintentar") se copia al formulario.
watch(
  categoria,
  (c) => {
    if (!c) return
    form.nombre = c.nombre ?? ''
    form.descripcion = c.descripcion ?? ''
    original.value = comparable()
  },
  { immediate: true },
)

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

function onBeforeUnload(event) {
  if (permitirSalida || !hayCambios.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

// --- Guardar ---
const envio = useAsync((datos) => (esNueva ? crearCategoria(datos) : actualizarCategoria(categoriaId, datos)), {
  immediate: false,
})

const serverError = computed(() => {
  const error = envio.error.value
  if (!error) return ''
  if (isForbidden(error)) return FORBIDDEN_MESSAGE
  if (error.code === ERRORES_CATEGORIA.DATOS_INVALIDOS) {
    return 'El servidor no aceptó los datos y no dijo cuál falló. Revisa los campos y vuelve a intentarlo.'
  }
  if (!esNueva && esCategoriaNoEncontrada(error)) {
    return 'Esta categoría ya no existe: alguien la eliminó mientras la editabas. Copia lo que necesites y vuelve a la lista.'
  }
  return submitErrorMessage(error, 'guardar la categoría')
})

async function guardar() {
  if (envio.loading.value) return
  attempted.value = true
  CAMPOS_CATEGORIA.forEach(validateField)

  const firstInvalid = CAMPOS_CATEGORIA.find((field) => errors[field])
  if (firstInvalid) {
    envio.error.value = null // el error del envío anterior ya no aplica
    document.getElementById(`categoria-${firstInvalid}`)?.focus()
    return
  }

  const guardada = await envio.execute({ ...form })
  const error = envio.error.value

  if (!error) {
    permitirSalida = true
    // La tienda tiene copias de las categorías (menú) y de los productos (categoriaNombre): se renuevan.
    invalidarCatalogo()
    recargarCategorias()
    toast.show(esNueva ? `Creamos la categoría «${guardada.nombre}».` : `Guardamos los cambios de «${guardada.nombre}».`, {
      tone: 'success',
      duration: 6000,
      action: guardada.slug ? { label: 'Ver en la tienda', to: `/categoria/${guardada.slug}` } : null,
    })
    volverALaLista()
    return
  }

  // 400 con detalle (o 409 de nombre repetido): cada mensaje va junto a su campo y el foco al primero.
  if (error.code === ERRORES_CATEGORIA.DATOS_INVALIDOS) {
    const campos = Object.keys(error.campos ?? {})
    if (campos.length) {
      for (const campo of campos) errors[campo] = error.campos[campo]
      envio.error.value = null
      await nextTick()
      document.getElementById(`categoria-${CAMPOS_CATEGORIA.find((campo) => error.campos[campo])}`)?.focus()
    }
  }
}

const fieldClass =
  'w-full rounded-md border bg-surface px-3.5 text-base text-ink transition-[border-color,box-shadow] duration-200 ease-out focus:outline-none focus-visible:outline-none'
function fieldState(field) {
  return errors[field]
    ? 'border-error focus:ring-2 focus:ring-error'
    : 'border-line-strong hover:border-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/25'
}
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-4 pt-6 pb-12 sm:px-6 lg:px-10 lg:pt-10">
    <RouterLink
      :to="{ name: 'admin-categories' }"
      class="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md pr-2 pl-1 text-small font-semibold text-brand-deep hover:text-brand-deeper"
      @click.prevent="volverALaLista"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
      Categorías
    </RouterLink>

    <!-- Cargando: la forma del formulario, sin h1 falso (el foco espera en <main>) -->
    <div v-if="carga.loading.value" class="mt-3" aria-busy="true">
      <span class="sr-only">Cargando la categoría…</span>
      <div class="h-8 w-56 max-w-full animate-pulse rounded-sm bg-line" aria-hidden="true" />
      <div class="mt-6 space-y-5 rounded-md border border-line bg-surface px-4 py-6 sm:px-6" aria-hidden="true">
        <div v-for="n in 3" :key="n">
          <div class="h-3.5 w-28 animate-pulse rounded-sm bg-line" />
          <div class="mt-2 h-[46px] animate-pulse rounded-md bg-ground" />
        </div>
      </div>
    </div>

    <!-- Error de carga -->
    <div v-else-if="carga.error.value" class="mt-3">
      <h1 class="sr-only">{{ esNueva ? 'Nueva categoría' : 'Editar categoría' }}</h1>
      <BaseErrorState
        :title="esNueva ? 'No pudimos preparar el formulario' : 'No pudimos cargar esta categoría'"
        :error="carga.error.value"
        :subject="esNueva ? 'las categorías' : 'esta categoría'"
        @retry="carga.retry()"
      />
    </div>

    <!-- No existe -->
    <div v-else-if="noEncontrada" class="mt-3 flex flex-col items-start">
      <FolderX class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <h1 class="mt-3 text-headline text-ink">No encontramos esta categoría</h1>
      <p class="mt-2 max-w-measure text-ink-muted">Puede que la hayan eliminado. Revisa la lista de categorías.</p>
      <BaseButton class="mt-6" :to="{ name: 'admin-categories' }">Ver las categorías</BaseButton>
    </div>

    <template v-else>
      <div class="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div class="min-w-0">
          <h1 class="text-headline text-balance text-ink">{{ esNueva ? 'Nueva categoría' : 'Editar categoría' }}</h1>
          <p class="mt-1 text-ink-muted">
            <template v-if="esNueva">Los campos con * son obligatorios.</template>
            <template v-else>{{ categoria?.nombre }} · Los campos con * son obligatorios.</template>
          </p>
        </div>
        <a
          v-if="categoria"
          :href="`/categoria/${categoria.slug}`"
          target="_blank"
          rel="noopener"
          class="inline-flex min-h-11 items-center gap-1.5 rounded-md text-small font-semibold text-brand-deep hover:text-brand-deeper"
        >
          Ver en la tienda
          <ExternalLink class="size-4" aria-hidden="true" />
          <span class="sr-only">(se abre en otra pestaña)</span>
        </a>
      </div>

      <form class="mt-6" novalidate @submit.prevent="guardar">
        <div class="space-y-5 rounded-md border border-line bg-surface px-4 py-6 sm:px-6">
          <BaseInput
            id="categoria-nombre"
            v-model="form.nombre"
            label="Nombre"
            required
            autocomplete="off"
            :maxlength="LIMITES.nombre + 20"
            :error="errors.nombre"
            hint="Como se verá en el menú de la tienda. Ejemplo: Sillería."
            @blur="handleBlur('nombre')"
          />

          <!-- Enlace: solo lectura. readonly (no disabled) para que se pueda leer y copiar con el teclado. -->
          <div>
            <label for="categoria-slug" class="mb-1.5 flex items-center gap-1.5 text-small font-semibold text-ink">
              Enlace en la tienda
              <Lock class="size-3.5 text-ink-muted" aria-hidden="true" />
            </label>
            <div
              class="flex h-[46px] items-center rounded-md border border-line bg-ground px-3.5 font-mono text-small has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand"
            >
              <span class="shrink-0 text-ink-muted" aria-hidden="true">/categoria/</span>
              <input
                id="categoria-slug"
                :value="esNueva ? slugPrevio : categoria?.slug"
                readonly
                :placeholder="esNueva ? 'se-genera-con-el-nombre' : ''"
                aria-describedby="categoria-slug-message"
                class="min-w-0 flex-1 truncate bg-transparent text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
            <div aria-live="polite">
              <p id="categoria-slug-message" class="mt-1.5 text-small text-ink-muted">
                <template v-if="esNueva">Lo genera el servidor a partir del nombre al guardar. Esto es una vista previa.</template>
                <template v-else-if="slugPodriaCambiar">
                  Con el nombre nuevo, el servidor podría cambiarlo a
                  <span class="font-mono text-ink [overflow-wrap:anywhere]">/categoria/{{ slugPrevio }}</span>, y los enlaces que ya
                  compartiste dejarían de funcionar.
                </template>
                <template v-else>Lo genera el servidor a partir del nombre: no se puede editar.</template>
              </p>
            </div>
          </div>

          <div>
            <label for="categoria-descripcion" class="mb-1.5 block text-small font-semibold text-ink">Descripción</label>
            <textarea
              id="categoria-descripcion"
              v-model="form.descripcion"
              rows="3"
              :aria-invalid="Boolean(errors.descripcion) || undefined"
              aria-describedby="categoria-descripcion-message"
              class="min-h-24 resize-y py-3"
              :class="[fieldClass, fieldState('descripcion')]"
              @blur="handleBlur('descripcion')"
            />
            <div aria-live="polite">
              <p
                id="categoria-descripcion-message"
                class="mt-1.5 flex justify-between gap-3 text-small"
                :class="errors.descripcion ? 'text-error' : 'text-ink-muted'"
              >
                <span>{{ errors.descripcion || 'Qué se encuentra en ella. Ejemplo: Sillas ergonómicas, gerenciales y de visita.' }}</span>
                <span class="shrink-0 tabular-nums" aria-hidden="true">
                  {{ form.descripcion.trim().length }}/{{ LIMITES.descripcion }}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <BaseFormError v-if="serverError">{{ serverError }}</BaseFormError>
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <BaseButton variant="secondary" :disabled="envio.loading.value" @click="volverALaLista">Cancelar</BaseButton>
            <BaseButton type="submit" :loading="envio.loading.value">
              {{ esNueva ? 'Crear categoría' : 'Guardar cambios' }}
            </BaseButton>
          </div>
        </div>
      </form>
    </template>

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
        {{ esNueva ? 'La categoría todavía no está creada: se perderá lo que escribiste.' : 'Se perderán los cambios que hiciste en esta categoría.' }}
      </p>
    </BaseConfirmDialog>
  </div>
</template>
