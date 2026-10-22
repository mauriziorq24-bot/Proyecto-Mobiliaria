<script setup>
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Heart,
  Info,
  ListPlus,
  LogOut,
  MessageCircle,
  ShoppingCart,
  TriangleAlert,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseFormError from '../components/ui/BaseFormError.vue'
import { useAsync } from '../composables/useAsync'
import { useLogout } from '../composables/useLogout'
import { useToast } from '../composables/useToast'
import { cotizacionApiActiva } from '../services/cotizacionService'
import { submitErrorMessage } from '../services/errorMessages'
import { obtenerCatalogo } from '../services/productoService'
import { useAuthStore } from '../stores/auth'
import { useCotizacionStore } from '../stores/cotizacion'
import { useFavoritosStore } from '../stores/favoritos'
import { escucharCitasGuardadas, leerCitasGuardadas } from '../utils/citasGuardadas'
import { escucharCotizacionesEnviadas, leerCotizacionesEnviadas } from '../utils/cotizacionesEnviadas'
import { ahoraEnCaracas, desdeFechaHoraBackend, formatearFechaCorta, formatearFechaHora } from '../utils/fecha'
import { formatearPrecio } from '../utils/formato'
import { consultarCotizacionUrl } from '../utils/whatsapp'

// Mi perfil (DESIGN.md › Mi perfil). La ruta exige sesión, así que siempre hay usuario.
// No se pide nada a la API al entrar: todo sale de la sesión y de este navegador, por eso no hay
// estado de carga de la página. Solo "Volver a cotizar lo mismo" pide el catálogo.
// TODO: cuando exista GET /auth/v1/me (pendiente 5 de API.md), mostrar también el correo.
const auth = useAuthStore()
const favoritos = useFavoritosStore()
const cotizacion = useCotizacionStore()
const toast = useToast()
const { logout } = useLogout()

const username = computed(() => auth.usuario?.username ?? '')
const initial = computed(() => [...username.value][0]?.toUpperCase() ?? '')

// --- Lo guardado en este navegador con esta cuenta ---
const citas = shallowRef(leerCitasGuardadas(username.value))
const enviadas = shallowRef(leerCotizacionesEnviadas(username.value))

function recargar() {
  citas.value = leerCitasGuardadas(username.value)
  enviadas.value = leerCotizacionesEnviadas(username.value)
}

// "Ahora" se actualiza cada minuto: una visita que empieza deja de contar como próxima.
const ahora = shallowRef(ahoraEnCaracas())

// Próximas visitas, la más cercana primero. Una cita con fechaHora ilegible no cuenta.
const proximas = computed(() => {
  const ahoraTexto = `${ahora.value.fecha}T${ahora.value.hora}`
  return citas.value
    .flatMap((cita) => {
      try {
        const { fecha, hora } = desdeFechaHoraBackend(cita.fechaHora)
        return [{ fecha, hora, inicio: `${fecha}T${hora}` }]
      } catch {
        return []
      }
    })
    .filter((cita) => cita.inicio > ahoraTexto)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
})

// Las filas de accesos. `unidad` completa el número para el lector de pantalla ("2 visitas próximas").
const accesos = computed(() => {
  const proxima = proximas.value[0]
  const visitas = proximas.value.length
  const unidades = cotizacion.totalUnidades
  return [
    {
      to: '/mi-cita',
      icon: CalendarDays,
      titulo: 'Mis visitas',
      cantidad: visitas,
      unidad: visitas === 1 ? 'visita próxima' : 'visitas próximas',
      detalle: proxima ? `Próxima: ${formatearFechaHora(proxima.fecha, proxima.hora)}` : 'Sin visitas próximas',
    },
    {
      to: '/favoritos',
      icon: Heart,
      titulo: 'Mis favoritos',
      cantidad: favoritos.cantidad,
      unidad: favoritos.cantidad === 1 ? 'producto' : 'productos',
      detalle: favoritos.cantidad ? 'Los productos que guardaste' : 'Aún no tienes favoritos',
    },
    {
      to: '/carrito',
      icon: ShoppingCart,
      titulo: 'Mi cotización',
      cantidad: unidades,
      unidad: unidades === 1 ? 'unidad' : 'unidades',
      detalle: unidades ? `Total referencial ${formatearPrecio(cotizacion.totalReferencial)}` : 'Vacía',
    },
  ]
})

// --- Cotizaciones enviadas ---
// Con el formulario activo la sección siempre está (vacía, invita a cotizar). Sin él, nada se
// puede enviar desde la web: solo aparece si hay alguna guardada de antes.
const mostrarHistorial = computed(() => cotizacionApiActiva || enviadas.value.length > 0)

const historial = computed(() =>
  enviadas.value.map((enviada) => ({
    ...enviada,
    fecha: formatearFechaCorta(enviada.enviadaEn),
    productos: enviada.items.length,
    unidades: enviada.items.reduce((total, item) => total + item.cantidad, 0),
  })),
)

const abiertas = reactive(new Set())

function alternar(codigo) {
  if (abiertas.has(codigo)) abiertas.delete(codigo)
  else abiertas.add(codigo)
}

const panelId = (codigo) => `cotizacion-${codigo}`
const codigoId = (codigo) => `cotizacion-${codigo}-codigo`

// --- Copiar el código (como en las confirmaciones) ---
// Si el portapapeles falla, el código queda seleccionado para copiarlo a mano.
const copiado = ref('') // código copiado hace un momento
const seleccionado = ref('') // código que quedó seleccionado
let copyTimer = null

const copyMessage = computed(() => {
  if (copiado.value) return 'Código copiado.'
  if (seleccionado.value) return 'No pudimos copiarlo. El código quedó seleccionado: cópialo desde tu teléfono o con Ctrl+C.'
  return ''
})

async function copiarCodigo(codigo) {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(codigo)
    seleccionado.value = ''
    copiado.value = codigo
    copyTimer = setTimeout(() => (copiado.value = ''), 2500)
  } catch {
    const range = document.createRange()
    range.selectNodeContents(document.getElementById(codigoId(codigo)))
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    copiado.value = ''
    seleccionado.value = codigo
  }
}

// --- Volver a cotizar lo mismo ---
// Se pide el catálogo para saber qué sigue disponible y con qué precio. Solo al tocar el botón:
// así el perfil no espera a la API (ni al arranque de Render) para mostrarse.
const { error: errorCatalogo, execute: pedirCatalogo } = useAsync(() => obtenerCatalogo(), { immediate: false })
const recotizando = ref('') // código de la que se está agregando
const aviso = ref(null) // { codigo, tipo: 'error' | 'ninguno', texto }

async function volverACotizar(enviada) {
  const codigo = enviada.codigoCotizacion
  recotizando.value = codigo
  aviso.value = null
  const catalogo = await pedirCatalogo()
  recotizando.value = ''

  if (!catalogo) {
    aviso.value = { codigo, tipo: 'error', texto: submitErrorMessage(errorCatalogo.value, 'revisar el catálogo') }
    return
  }

  // Si ya estaban en la cotización, la cantidad se suma (hasta 99), como al agregar desde la ficha.
  const porId = new Map(catalogo.productos.map((producto) => [producto.id, producto]))
  let agregados = 0
  for (const item of enviada.items) {
    const producto = porId.get(item.productoId)
    if (!producto) continue
    cotizacion.agregar(producto, item.cantidad)
    agregados++
  }
  const noDisponibles = enviada.items.length - agregados

  if (!agregados) {
    aviso.value = {
      codigo,
      tipo: 'ninguno',
      texto: 'Ninguno de estos productos sigue en el catálogo. Escríbenos por WhatsApp y te ayudamos a encontrar algo parecido.',
    }
    return
  }

  const partes = [`Agregamos ${agregados} ${agregados === 1 ? 'producto' : 'productos'} a tu cotización`]
  if (noDisponibles) partes.push(`${noDisponibles} ya no ${noDisponibles === 1 ? 'está disponible' : 'están disponibles'}`)
  toast.show(partes.join(' · '), { tone: 'success', duration: 6000, action: { label: 'Ver mi cotización', to: '/carrito' } })
}

// Si otra pestaña agenda una visita o envía una solicitud, el perfil se pone al día.
const dejarDeEscuchar = []
let relojTimer = null

onMounted(() => {
  dejarDeEscuchar.push(escucharCitasGuardadas(recargar), escucharCotizacionesEnviadas(recargar))
  relojTimer = setInterval(() => (ahora.value = ahoraEnCaracas()), 60_000)
})

onBeforeUnmount(() => {
  dejarDeEscuchar.forEach((dejar) => dejar())
  clearInterval(relojTimer)
  clearTimeout(copyTimer)
})

// Fila de los grupos (accesos y cerrar sesión). El anillo de foco va por dentro: el grupo recorta lo que sobresale.
const row =
  'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 ease-out hover:bg-ground focus-visible:-outline-offset-2'
const groupTitle = 'px-1 text-label text-ink-muted uppercase'
</script>

<template>
  <div
    class="mx-auto w-full px-4 pt-8 pb-12 sm:px-6 sm:pt-12 sm:pb-16"
    :class="mostrarHistorial ? 'max-w-5xl' : 'max-w-xl'"
  >
    <h1 class="text-headline text-ink">Mi perfil</h1>

    <!-- Móvil: un menú de secciones en una columna (cuenta, accesos, enviadas, cerrar sesión).
         Escritorio: cuenta, accesos y cerrar sesión a la izquierda; las enviadas a la derecha.
         La última fila (1fr) absorbe el alto de las enviadas para que la izquierda no se estire. -->
    <div
      class="mt-6 grid gap-8"
      :class="mostrarHistorial && 'lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-10'"
    >
      <section aria-labelledby="perfil-cuenta" class="lg:col-start-1 lg:row-start-1">
        <h2 id="perfil-cuenta" :class="groupTitle">Tu cuenta</h2>
        <div class="mt-2 flex items-center gap-4 rounded-md border border-line bg-surface p-4">
          <span
            class="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-tint text-title text-brand-deep"
            aria-hidden="true"
          >
            {{ initial }}
          </span>
          <dl class="min-w-0">
            <dt class="text-small text-ink-muted">Nombre de usuario</dt>
            <dd class="truncate font-bold text-ink" :title="username">{{ username }}</dd>
          </dl>
        </div>
      </section>

      <nav aria-labelledby="perfil-accesos" class="lg:col-start-1 lg:row-start-2">
        <h2 id="perfil-accesos" :class="groupTitle">Lo tuyo</h2>
        <ul class="mt-2 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
          <li v-for="acceso in accesos" :key="acceso.to">
            <RouterLink :to="acceso.to" :class="row">
              <component :is="acceso.icon" class="size-5 shrink-0 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block font-semibold text-ink">{{ acceso.titulo }}</span>
                <span class="block text-small text-ink-muted">{{ acceso.detalle }}</span>
              </span>
              <span
                v-if="acceso.cantidad"
                class="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint px-2 text-small font-bold text-brand-deep tabular-nums"
              >
                {{ acceso.cantidad }}<span class="sr-only">&nbsp;{{ acceso.unidad }}</span>
              </span>
              <ChevronRight class="size-[18px] shrink-0 text-ink-muted" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
        <BaseButton to="/agendar-cita" variant="visit" block class="mt-4">
          <template #icon-left><CalendarCheck /></template>
          Agendar visita
        </BaseButton>
      </nav>

      <section
        v-if="mostrarHistorial"
        aria-labelledby="perfil-enviadas"
        class="lg:col-start-2 lg:row-span-4 lg:row-start-1"
      >
        <h2 id="perfil-enviadas" :class="groupTitle">Cotizaciones enviadas</h2>

        <p class="mt-2 flex items-start gap-2.5 rounded-md bg-brand-tint px-3.5 py-3 text-small text-ink">
          <Info class="mt-px size-4 shrink-0 text-brand-deep" aria-hidden="true" />
          <span>Aquí aparecen las citas y cotizaciones que hiciste con tu cuenta desde este navegador.</span>
        </p>

        <div v-if="!historial.length" class="mt-3 rounded-md border border-line bg-surface p-5">
          <p class="font-semibold text-ink">Aún no has enviado solicitudes desde este navegador.</p>
          <p class="mt-1 text-small text-ink-muted">Arma tu lista y pide el precio final desde Mi cotización.</p>
          <BaseButton to="/carrito" variant="secondary" class="mt-4 max-sm:w-full">Ir a Mi cotización</BaseButton>
        </div>

        <ul v-else class="mt-3 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
          <li v-for="enviada in historial" :key="enviada.codigoCotizacion">
            <h3>
              <button
                type="button"
                class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 ease-out hover:bg-ground focus-visible:-outline-offset-2"
                :aria-expanded="abiertas.has(enviada.codigoCotizacion)"
                :aria-controls="panelId(enviada.codigoCotizacion)"
                @click="alternar(enviada.codigoCotizacion)"
              >
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-baseline gap-x-2">
                    <span class="font-bold break-all text-ink tabular-nums">{{ enviada.codigoCotizacion }}</span>
                    <span class="text-small text-ink-muted">{{ enviada.fecha }}</span>
                  </span>
                  <span class="block text-small text-ink-muted">
                    <span class="tabular-nums">{{ enviada.productos }}</span>
                    {{ enviada.productos === 1 ? 'producto' : 'productos' }}
                    (<span class="tabular-nums">{{ enviada.unidades }}</span>
                    {{ enviada.unidades === 1 ? 'unidad' : 'unidades' }})
                  </span>
                </span>
                <span class="shrink-0 text-right text-price text-ink tabular-nums">
                  <span class="sr-only">Total referencial: </span>{{ formatearPrecio(enviada.totalReferencial) }}
                </span>
                <ChevronDown
                  class="size-[18px] shrink-0 text-ink-muted transition-transform duration-200 ease-out motion-reduce:transition-none"
                  :class="abiertas.has(enviada.codigoCotizacion) && 'rotate-180'"
                  aria-hidden="true"
                />
              </button>
            </h3>

            <div
              v-show="abiertas.has(enviada.codigoCotizacion)"
              :id="panelId(enviada.codigoCotizacion)"
              class="border-t border-line px-4 pt-3 pb-4"
            >
              <ul class="divide-y divide-line text-small">
                <li v-for="item in enviada.items" :key="item.productoId" class="flex justify-between gap-4 py-2">
                  <span class="min-w-0 text-ink">
                    <span class="font-semibold tabular-nums">{{ item.cantidad }} ×</span> {{ item.nombre }}
                  </span>
                  <span class="shrink-0 text-right text-ink tabular-nums">
                    <span class="sr-only">Subtotal referencial: </span>{{ formatearPrecio(item.cantidad * item.precioReferencialUsd) }}
                  </span>
                </li>
              </ul>
              <p class="mt-2 border-t border-line pt-2 text-small text-ink-muted">
                Precios referenciales de cuando la enviaste. Si vuelves a cotizarla, se usan los de hoy.
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <BaseButton
                  size="sm"
                  class="max-sm:w-full"
                  :loading="recotizando === enviada.codigoCotizacion"
                  @click="volverACotizar(enviada)"
                >
                  <template #icon-left><ListPlus /></template>
                  Volver a cotizar lo mismo
                </BaseButton>
                <BaseButton
                  variant="whatsapp"
                  size="sm"
                  class="max-sm:w-full"
                  :href="consultarCotizacionUrl(enviada.codigoCotizacion)"
                  target="_blank"
                  rel="noopener"
                >
                  <template #icon-left><MessageCircle /></template>
                  Preguntar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
                </BaseButton>
              </div>

              <BaseFormError v-if="aviso?.codigo === enviada.codigoCotizacion && aviso.tipo === 'error'" class="mt-3">
                {{ aviso.texto }}
              </BaseFormError>
              <p
                v-else-if="aviso?.codigo === enviada.codigoCotizacion"
                role="status"
                class="mt-3 flex items-start gap-2.5 rounded-md bg-warning-bg px-3.5 py-3 text-small text-ink"
              >
                <TriangleAlert class="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
                <span>{{ aviso.texto }}</span>
              </p>

              <div class="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
                <p class="text-small text-ink-muted">
                  Código
                  <span :id="codigoId(enviada.codigoCotizacion)" class="font-semibold text-ink tabular-nums select-all">
                    {{ enviada.codigoCotizacion }}
                  </span>
                </p>
                <BaseButton variant="ghost" size="sm" @click="copiarCodigo(enviada.codigoCotizacion)">
                  <template #icon-left>
                    <Check v-if="copiado === enviada.codigoCotizacion" />
                    <Copy v-else />
                  </template>
                  {{ copiado === enviada.codigoCotizacion ? 'Copiado' : 'Copiar código' }}
                </BaseButton>
                <p v-if="seleccionado === enviada.codigoCotizacion" class="w-full text-small text-ink">
                  {{ copyMessage }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <div class="lg:col-start-1 lg:row-start-3">
        <button type="button" :class="row" class="rounded-md border border-line bg-surface font-semibold text-ink" @click="logout">
          <LogOut class="size-5 shrink-0 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>

    <!-- Siempre en el DOM para que el lector de pantalla anuncie "Código copiado" -->
    <p role="status" class="sr-only">{{ copyMessage }}</p>
  </div>
</template>
