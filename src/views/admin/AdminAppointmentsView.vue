<script setup>
import {
  Building2,
  CalendarDays,
  CalendarX,
  ChevronLeft,
  Clock,
  Inbox,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  RotateCw,
  SearchX,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StatusFilter from '../../components/admin/StatusFilter.vue'
import StatusPicker from '../../components/admin/StatusPicker.vue'
import BaseBadge from '../../components/ui/BaseBadge.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseErrorState from '../../components/ui/BaseErrorState.vue'
import { useAsync } from '../../composables/useAsync'
import { useCambioDeEstado } from '../../composables/useCambioDeEstado'
import { useDetalleEnUrl } from '../../composables/useDetalleEnUrl'
import { cambiarEstadoCita, obtenerCitasAdmin } from '../../services/citaService'
import { FORBIDDEN_MESSAGE, isForbidden } from '../../services/errorMessages'
import { ahoraEnCaracas, describirDia, formatearFechaHora, formatearHora, formatearRegistro, sumarDias } from '../../utils/fecha'
import { describirEstado, ESTADOS_CITA, etiquetaTipoAsesoria } from '../../utils/formato'
import { confirmarCitaUrl } from '../../utils/whatsapp'

// Citas del panel, con dos formas de verlas (?vista=):
// - Agenda (por defecto): de hoy en adelante, agrupadas por día, sin las canceladas.
// - Lista: todas, filtrables por estado (?estado=), pendientes primero.
// Todo en hora de Caracas (src/utils/fecha.js): "hoy" es el día del showroom, no el del dispositivo.
// El detalle se abre en la misma página (?codigo=), como en cotizaciones.
const route = useRoute()
const carga = useAsync(() => obtenerCitasAdmin())
const citas = computed(() => carga.data.value ?? [])

// Se recalcula al actualizar: el panel puede quedar abierto de un día para otro.
const hoy = ref(ahoraEnCaracas().fecha)
const manana = computed(() => sumarDias(hoy.value, 1))

function actualizar() {
  hoy.value = ahoraEnCaracas().fecha
  carga.retry()
}

const { codigo, rutaDetalle, volver, ponerQuery } = useDetalleEnUrl({
  idTitulo: 'cita-detalle-titulo',
  idFila: (c) => `cita-${c}`,
})

const { cambiar, guardando } = useCambioDeEstado({
  carga,
  clave: 'codigoCita',
  enviar: cambiarEstadoCita,
  etiqueta: (estado) => describirEstado(ESTADOS_CITA, estado).etiqueta,
})

const numero = new Intl.NumberFormat('es-VE')
const plural = (n, una, varias) => `${numero.format(n)} ${n === 1 ? una : varias}`
const estadoDe = (cita) => describirEstado(ESTADOS_CITA, cita.estado)
const cuando = (cita) => (cita.fecha ? formatearFechaHora(cita.fecha, cita.hora) : 'Sin fecha')
const yaPaso = (cita) => Boolean(cita.fecha) && cita.fecha < hoy.value
// Una cita que ya pasó y nadie cerró: hay que marcarla Completada o Cancelada.
const sinCerrar = (cita) => yaPaso(cita) && (cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA')

const conteo = computed(() => {
  const cuenta = {}
  for (const c of citas.value) cuenta[c.estado] = (cuenta[c.estado] ?? 0) + 1
  return cuenta
})

const resumen = computed(() => {
  const deHoy = citas.value.filter((c) => c.fecha === hoy.value && c.estado !== 'CANCELADA').length
  const pendientes = conteo.value.PENDIENTE ?? 0
  return `${plural(deHoy, 'cita', 'citas')} hoy · ${plural(pendientes, 'por confirmar', 'por confirmar')}`
})

// --- Vista (?vista=lista) y filtro (?estado=) ---
const vista = computed({
  get: () => (route.query.vista === 'lista' ? 'lista' : 'agenda'),
  set: (valor) => ponerQuery('vista', valor === 'lista' ? 'lista' : null),
})
const filtroEstado = computed({
  get: () => (ESTADOS_CITA[route.query.estado] ? route.query.estado : null),
  set: (valor) => ponerQuery('estado', valor),
})

// 'AAAA-MM-DDTHH:MM' se puede comparar como texto.
const momento = (cita) => cita.fechaHora ?? ''

// Agenda: de hoy en adelante, sin canceladas, por día y por hora.
const agenda = computed(() => {
  const dias = new Map()
  const proximas = citas.value
    .filter((c) => c.fecha && c.fecha >= hoy.value && c.estado !== 'CANCELADA')
    .sort((a, b) => momento(a).localeCompare(momento(b)))
  for (const cita of proximas) {
    if (!dias.has(cita.fecha)) dias.set(cita.fecha, [])
    dias.get(cita.fecha).push(cita)
  }
  return [...dias].map(([fecha, delDia]) => ({ fecha, titulo: tituloDia(fecha), citas: delDia }))
})

function tituloDia(fecha) {
  const completo = describirDia(fecha).completo // "lunes 26 de octubre"
  if (fecha === hoy.value) return `Hoy, ${completo}`
  if (fecha === manana.value) return `Mañana, ${completo}`
  return completo.charAt(0).toUpperCase() + completo.slice(1)
}

const pasadasSinCerrar = computed(() => citas.value.filter(sinCerrar).length)

// Lista: pendientes primero (la más próxima arriba); las demás, la más reciente arriba.
const ordenadas = computed(() =>
  [...citas.value].sort((a, b) => {
    const pa = a.estado === 'PENDIENTE'
    const pb = b.estado === 'PENDIENTE'
    if (pa !== pb) return pa ? -1 : 1
    return pa ? momento(a).localeCompare(momento(b)) : momento(b).localeCompare(momento(a))
  }),
)
const visibles = computed(() =>
  filtroEstado.value ? ordenadas.value.filter((c) => c.estado === filtroEstado.value) : ordenadas.value,
)

// --- Detalle ---
const seleccionada = computed(() => citas.value.find((c) => c.codigoCita === codigo.value) ?? null)
const noEncontrada = computed(() => Boolean(codigo.value && carga.data.value && !seleccionada.value))

function cuandoRelativo(cita) {
  if (!cita.fecha) return ''
  if (cita.fecha === hoy.value) return 'Hoy'
  if (cita.fecha === manana.value) return 'Mañana'
  if (yaPaso(cita)) return 'Ya pasó'
  return ''
}

const whatsappLink = computed(() => {
  const cita = seleccionada.value
  if (!cita) return null
  return confirmarCitaUrl({ ...cita, tipo: etiquetaTipoAsesoria(cita.tipoAsesoria), cuando: cuando(cita) })
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 pt-8 pb-12 sm:px-6 lg:px-10 lg:pt-10">
    <!-- En el teléfono, con el detalle abierto, el encabezado se oculta a la vista (el h1 sigue
         para el lector de pantalla) y "Actualizar" se quita. -->
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div :class="codigo && 'max-lg:sr-only'">
        <h1 class="text-headline text-ink">Citas</h1>
        <p class="mt-1 text-ink-muted tabular-nums" aria-live="polite">
          <template v-if="carga.data.value">{{ resumen }}</template>
          <template v-else>Las visitas y asesorías agendadas desde la tienda.</template>
        </p>
      </div>
      <BaseButton
        variant="secondary"
        size="sm"
        :class="codigo && 'max-lg:hidden'"
        :loading="carga.loading.value"
        @click="actualizar"
      >
        <template #icon-left><RotateCw /></template>
        Actualizar
      </BaseButton>
    </div>

    <!-- Cargando (solo la primera vez) -->
    <ul
      v-if="carga.loading.value && !carga.data.value"
      class="mt-6 divide-y divide-line rounded-md border border-line bg-surface lg:max-w-xl"
      aria-busy="true"
    >
      <li class="sr-only">Cargando las citas…</li>
      <li v-for="n in 5" :key="n" class="flex gap-4 px-4 py-4" aria-hidden="true">
        <div class="h-4 w-16 animate-pulse rounded-sm bg-line" />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-3.5 w-2/5 animate-pulse rounded-sm bg-line" />
          <div class="h-3 w-3/5 animate-pulse rounded-sm bg-ground" />
        </div>
      </li>
    </ul>

    <div
      v-else-if="carga.error.value && isForbidden(carga.error.value)"
      role="alert"
      class="mt-6 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center"
    >
      <Lock class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <p class="mt-3 text-ink-muted">{{ FORBIDDEN_MESSAGE }}</p>
    </div>

    <div v-else-if="carga.error.value" class="mt-6">
      <BaseErrorState title="No pudimos cargar las citas" :error="carga.error.value" subject="las citas" @retry="actualizar" />
    </div>

    <div
      v-else-if="!citas.length"
      class="mt-6 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center"
    >
      <Inbox class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <p class="mt-3 text-card-title text-ink">Aún no hay citas</p>
      <p class="mt-1 max-w-[45ch] text-small text-ink-muted">Aparecen aquí cuando un cliente agenda una visita desde la tienda.</p>
    </div>

    <div v-else class="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-6">
      <!-- Agenda o lista -->
      <section aria-label="Citas" :class="codigo && 'max-lg:hidden'">
        <!-- Agenda / Lista: dos botones del mismo ancho, grandes para el pulgar -->
        <div role="group" aria-label="Cómo ver las citas" class="grid grid-cols-2 rounded-md border border-line-strong bg-surface p-1">
          <button
            v-for="opcion in [
              { valor: 'agenda', texto: 'Agenda' },
              { valor: 'lista', texto: 'Lista' },
            ]"
            :key="opcion.valor"
            type="button"
            class="min-h-10 rounded-sm font-semibold transition-colors duration-200 ease-out"
            :class="vista === opcion.valor ? 'bg-ink text-white' : 'text-ink hover:bg-ground'"
            :aria-pressed="vista === opcion.valor"
            @click="vista = opcion.valor"
          >
            {{ opcion.texto }}
          </button>
        </div>

        <!-- Agenda -->
        <template v-if="vista === 'agenda'">
          <p
            v-if="pasadasSinCerrar"
            class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-warning-bg px-3.5 py-3 text-small text-warning"
          >
            <span>{{ plural(pasadasSinCerrar, 'cita que ya pasó sigue', 'citas que ya pasaron siguen') }} sin cerrar.</span>
            <button type="button" class="min-h-9 font-semibold underline underline-offset-2" @click="vista = 'lista'">
              Verlas en la lista
            </button>
          </p>

          <div
            v-if="!agenda.length"
            class="mt-4 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center"
          >
            <CalendarX class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
            <p class="mt-3 text-card-title text-ink">No hay citas próximas</p>
            <p class="mt-1 text-small text-ink-muted">Las pasadas y las canceladas están en la lista.</p>
            <BaseButton variant="secondary" class="mt-5" @click="vista = 'lista'">Ver la lista</BaseButton>
          </div>

          <section v-for="dia in agenda" :key="dia.fecha" :aria-labelledby="`dia-${dia.fecha}`" class="mt-5">
            <h2 :id="`dia-${dia.fecha}`" class="flex items-baseline justify-between gap-3">
              <span class="font-bold text-ink">{{ dia.titulo }}</span>
              <span class="shrink-0 text-small text-ink-muted tabular-nums">{{ plural(dia.citas.length, 'cita', 'citas') }}</span>
            </h2>
            <ul class="mt-2 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
              <li v-for="cita in dia.citas" :key="cita.codigoCita">
                <RouterLink
                  :id="`cita-${cita.codigoCita}`"
                  :to="rutaDetalle(cita.codigoCita)"
                  class="flex gap-4 px-4 py-3.5 transition-colors duration-200 ease-out focus-visible:-outline-offset-2"
                  :class="
                    cita.codigoCita === codigo
                      ? 'bg-brand-tint shadow-[inset_3px_0_0_var(--color-brand-deep)]'
                      : 'hover:bg-ground'
                  "
                  :aria-current="cita.codigoCita === codigo ? 'true' : undefined"
                >
                  <span class="w-[4.5rem] shrink-0 font-bold text-ink tabular-nums">{{ formatearHora(cita.hora) }}</span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-start justify-between gap-3">
                      <span class="min-w-0 font-semibold [overflow-wrap:anywhere] text-ink">{{ cita.nombreCliente || 'Sin nombre' }}</span>
                      <BaseBadge :variant="estadoDe(cita).tono" class="shrink-0">{{ estadoDe(cita).etiqueta }}</BaseBadge>
                    </span>
                    <span class="mt-0.5 block text-small text-ink-muted">{{ etiquetaTipoAsesoria(cita.tipoAsesoria) }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </section>
        </template>

        <!-- Lista -->
        <template v-else>
          <StatusFilter
            v-model="filtroEstado"
            class="mt-4"
            :estados="ESTADOS_CITA"
            :conteo="conteo"
            :total="citas.length"
            label="Filtrar por estado"
          />

          <div
            v-if="!visibles.length"
            class="mt-4 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center"
          >
            <SearchX class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
            <p class="mt-3 text-card-title text-ink">
              Ninguna cita {{ describirEstado(ESTADOS_CITA, filtroEstado).etiqueta.toLowerCase() }}
            </p>
            <BaseButton variant="secondary" class="mt-5" @click="filtroEstado = null">Ver todas</BaseButton>
          </div>

          <ul v-else class="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            <li v-for="cita in visibles" :key="cita.codigoCita">
              <RouterLink
                :id="`cita-${cita.codigoCita}`"
                :to="rutaDetalle(cita.codigoCita)"
                class="block px-4 py-3.5 transition-colors duration-200 ease-out focus-visible:-outline-offset-2"
                :class="
                  cita.codigoCita === codigo
                    ? 'bg-brand-tint shadow-[inset_3px_0_0_var(--color-brand-deep)]'
                    : 'hover:bg-ground'
                "
                :aria-current="cita.codigoCita === codigo ? 'true' : undefined"
              >
                <span class="flex items-start justify-between gap-3">
                  <span class="min-w-0 font-semibold [overflow-wrap:anywhere] text-ink">{{ cita.nombreCliente || 'Sin nombre' }}</span>
                  <BaseBadge :variant="estadoDe(cita).tono" class="shrink-0">{{ estadoDe(cita).etiqueta }}</BaseBadge>
                </span>
                <span class="mt-0.5 block text-small text-ink first-letter:uppercase">{{ cuando(cita) }}</span>
                <span class="mt-0.5 block text-small text-ink-muted">
                  {{ etiquetaTipoAsesoria(cita.tipoAsesoria) }} · <span class="font-mono">{{ cita.codigoCita }}</span>
                  <template v-if="sinCerrar(cita)"> · <span class="font-semibold text-warning">Ya pasó</span></template>
                </span>
              </RouterLink>
            </li>
          </ul>
        </template>
      </section>

      <!-- Detalle -->
      <section v-if="codigo" aria-labelledby="cita-detalle-titulo" class="lg:sticky lg:top-6">
        <BaseButton variant="ghost" size="sm" class="-ml-2 lg:hidden" @click="volver">
          <template #icon-left><ChevronLeft /></template>
          {{ vista === 'lista' ? 'Todas las citas' : 'Agenda' }}
        </BaseButton>

        <div v-if="noEncontrada" class="mt-3 rounded-md border border-line bg-surface px-6 py-10 text-center lg:mt-0">
          <h2 id="cita-detalle-titulo" tabindex="-1" class="text-card-title text-ink focus:outline-none">
            No encontramos la cita <span class="font-mono">{{ codigo }}</span>
          </h2>
          <p class="mt-1 text-small text-ink-muted">Puede que el cliente la haya cancelado. Vuelve a la lista.</p>
          <BaseButton variant="secondary" class="mt-5" @click="volver">Ver las citas</BaseButton>
        </div>

        <article v-else-if="seleccionada" class="mt-3 rounded-md border border-line bg-surface lg:mt-0">
          <header class="border-b border-line px-4 py-4 sm:px-5">
            <h2 id="cita-detalle-titulo" tabindex="-1" class="text-title [overflow-wrap:anywhere] text-ink focus:outline-none">
              {{ seleccionada.nombreCliente || 'Sin nombre' }}
            </h2>
            <p class="mt-0.5 text-small text-ink-muted">
              <span class="font-mono">{{ seleccionada.codigoCita }}</span>
              <template v-if="formatearRegistro(seleccionada.creadoEn)">
                · Agendada el {{ formatearRegistro(seleccionada.creadoEn) }}
              </template>
            </p>
          </header>

          <div class="space-y-5 px-4 py-4 sm:px-5">
            <div class="flex gap-3 rounded-md bg-ground px-3.5 py-3">
              <CalendarDays class="mt-0.5 size-5 shrink-0 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
              <div class="min-w-0">
                <p class="font-bold text-ink first-letter:uppercase">
                  {{ cuando(seleccionada) }}
                  <span v-if="cuandoRelativo(seleccionada)" class="font-semibold text-ink-muted">· {{ cuandoRelativo(seleccionada) }}</span>
                </p>
                <p class="text-ink">{{ etiquetaTipoAsesoria(seleccionada.tipoAsesoria) }}</p>
                <p class="mt-0.5 flex items-center gap-1.5 text-small text-ink-muted">
                  <Clock class="size-3.5" aria-hidden="true" /> Hora de Caracas
                </p>
              </div>
            </div>

            <div>
              <StatusPicker
                :estados="ESTADOS_CITA"
                :actual="seleccionada.estado"
                :guardando="guardando.has(seleccionada.codigoCita)"
                @cambiar="cambiar(seleccionada, $event)"
              />
              <p v-if="sinCerrar(seleccionada)" class="mt-2 text-small text-warning">
                Esta cita ya pasó: márcala como Completada o Cancelada.
              </p>
            </div>

            <div>
              <BaseButton
                v-if="whatsappLink"
                variant="whatsapp"
                size="lg"
                block
                :href="whatsappLink"
                target="_blank"
                rel="noopener"
              >
                <template #icon-left><MessageCircle /></template>
                Confirmar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
              </BaseButton>
              <p v-else class="text-small text-ink-muted">
                El teléfono de esta cita no sirve para WhatsApp. Escríbele por correo.
              </p>
              <p v-if="whatsappLink" class="mt-2 text-small text-ink-muted">
                Abre el chat con el mensaje listo. Al enviarlo, marca la cita como Confirmada.
              </p>
            </div>

            <section aria-labelledby="cita-cliente">
              <h3 id="cita-cliente" class="text-label text-ink-muted uppercase">Cliente</h3>
              <dl class="mt-2 space-y-2">
                <div v-if="seleccionada.empresa" class="flex gap-3">
                  <dt class="sr-only">Empresa</dt>
                  <Building2 class="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <dd class="min-w-0 [overflow-wrap:anywhere] text-ink">{{ seleccionada.empresa }}</dd>
                </div>
                <div v-if="seleccionada.telefono" class="flex gap-3">
                  <dt class="sr-only">Teléfono</dt>
                  <Phone class="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <dd>
                    <a :href="`tel:${seleccionada.telefono}`" class="font-semibold text-brand-deep underline-offset-2 hover:underline">
                      {{ seleccionada.telefono }}
                    </a>
                  </dd>
                </div>
                <div v-if="seleccionada.email" class="flex gap-3">
                  <dt class="sr-only">Correo</dt>
                  <Mail class="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <dd class="min-w-0">
                    <a
                      :href="`mailto:${seleccionada.email}?subject=${encodeURIComponent(`Tu cita ${seleccionada.codigoCita}`)}`"
                      class="font-semibold [overflow-wrap:anywhere] text-brand-deep underline-offset-2 hover:underline"
                    >
                      {{ seleccionada.email }}
                    </a>
                  </dd>
                </div>
              </dl>
              <p
                v-if="seleccionada.notas"
                class="mt-3 rounded-md bg-ground px-3.5 py-3 whitespace-pre-line [overflow-wrap:anywhere] text-ink"
              >
                <span class="sr-only">Notas del cliente: </span>{{ seleccionada.notas }}
              </p>
            </section>
          </div>
        </article>
      </section>

      <div
        v-else
        class="sticky top-6 hidden flex-col items-center rounded-md border border-dashed border-line-strong px-6 py-16 text-center lg:flex"
      >
        <CalendarDays class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
        <p class="mt-3 text-ink-muted">Elige una cita para ver sus datos y confirmarla con el cliente.</p>
      </div>
    </div>
  </div>
</template>
