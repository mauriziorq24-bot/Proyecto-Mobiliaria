<script setup>
import { Building2, ChevronLeft, FileText, Inbox, Lock, Mail, MessageCircle, Phone, RotateCw, SearchX } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StatusFilter from '../../components/admin/StatusFilter.vue'
import StatusPicker from '../../components/admin/StatusPicker.vue'
import BaseBadge from '../../components/ui/BaseBadge.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseErrorState from '../../components/ui/BaseErrorState.vue'
import { useAsync } from '../../composables/useAsync'
import { useCambioDeEstado } from '../../composables/useCambioDeEstado'
import { useDetalleEnUrl } from '../../composables/useDetalleEnUrl'
import { cambiarEstadoCotizacion, obtenerCotizaciones } from '../../services/cotizacionService'
import { FORBIDDEN_MESSAGE, isForbidden } from '../../services/errorMessages'
import { formatearRegistro } from '../../utils/fecha'
import { describirEstado, ESTADOS_COTIZACION, formatearPrecio } from '../../utils/formato'
import { responderCotizacionUrl } from '../../utils/whatsapp'

// Cotizaciones del panel: lista (pendientes primero) y detalle de la elegida, en la misma página.
// Teléfono: la lista o el detalle, uno a la vez, sin tablas. Desde lg: los dos lado a lado.
// El estado se cambia al instante y se revierte si el backend falla (useCambioDeEstado).
const route = useRoute()
const carga = useAsync(() => obtenerCotizaciones())
const cotizaciones = computed(() => carga.data.value ?? [])

const { codigo, rutaDetalle, volver, ponerQuery } = useDetalleEnUrl({
  idTitulo: 'cotizacion-detalle-titulo',
  idFila: (c) => `cotizacion-${c}`,
})

const { cambiar, guardando } = useCambioDeEstado({
  carga,
  clave: 'codigoCotizacion',
  enviar: cambiarEstadoCotizacion,
  etiqueta: (estado) => describirEstado(ESTADOS_COTIZACION, estado).etiqueta,
})

const numero = new Intl.NumberFormat('es-VE')
const plural = (n, una, varias) => `${numero.format(n)} ${n === 1 ? una : varias}`
const estadoDe = (cotizacion) => describirEstado(ESTADOS_COTIZACION, cotizacion.estado)
const unidades = (cotizacion) => (cotizacion.detalles ?? []).reduce((total, d) => total + (d.cantidad ?? 0), 0)

// --- Filtro (?estado=) y orden ---
const filtroEstado = computed({
  get: () => (ESTADOS_COTIZACION[route.query.estado] ? route.query.estado : null),
  set: (valor) => ponerQuery('estado', valor),
})

const conteo = computed(() => {
  const cuenta = {}
  for (const c of cotizaciones.value) cuenta[c.estado] = (cuenta[c.estado] ?? 0) + 1
  return cuenta
})

// Pendientes primero; dentro de cada grupo, la más reciente arriba.
// fechaCreacion es 'AAAA-MM-DDTHH:MM:SS…': se puede comparar como texto.
const ordenadas = computed(() =>
  [...cotizaciones.value].sort((a, b) => {
    const pendiente = Number(b.estado === 'PENDIENTE') - Number(a.estado === 'PENDIENTE')
    return pendiente || String(b.fechaCreacion ?? '').localeCompare(String(a.fechaCreacion ?? ''))
  }),
)
const visibles = computed(() =>
  filtroEstado.value ? ordenadas.value.filter((c) => c.estado === filtroEstado.value) : ordenadas.value,
)

const resumen = computed(() => {
  const total = cotizaciones.value.length
  const pendientes = conteo.value.PENDIENTE ?? 0
  const base = plural(total, 'solicitud', 'solicitudes')
  return pendientes ? `${base} · ${plural(pendientes, 'pendiente', 'pendientes')}` : `${base} · ninguna pendiente`
})

// --- Detalle ---
const seleccionada = computed(() => cotizaciones.value.find((c) => c.codigoCotizacion === codigo.value) ?? null)
const noEncontrada = computed(() => Boolean(codigo.value && carga.data.value && !seleccionada.value))

// Cada detalle trae el Producto como entidad (API.md): la foto está en imagenes[0].urlImagen.
const lineas = computed(() =>
  (seleccionada.value?.detalles ?? []).map((detalle, indice) => ({
    id: detalle.id ?? indice,
    productoId: detalle.producto?.id ?? null,
    nombre: detalle.producto?.nombre ?? 'Producto sin nombre',
    imagen: detalle.producto?.imagenes?.[0]?.urlImagen || '/placeholder-producto.svg',
    cantidad: detalle.cantidad ?? 0,
    precioUnitario: detalle.precioUnitario,
    subtotal: (detalle.cantidad ?? 0) * (detalle.precioUnitario ?? 0),
  })),
)
// totalUsd lo calcula el backend; si faltara, se suma aquí.
const total = computed(() => seleccionada.value?.totalUsd ?? lineas.value.reduce((suma, l) => suma + l.subtotal, 0))
const whatsappLink = computed(() => (seleccionada.value ? responderCotizacionUrl(seleccionada.value) : null))

function onImageError(event) {
  if (!event.target.src.endsWith('/placeholder-producto.svg')) event.target.src = '/placeholder-producto.svg'
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 pt-8 pb-12 sm:px-6 lg:px-10 lg:pt-10">
    <!-- En el teléfono, con el detalle abierto, el encabezado de la lista se oculta a la vista
         (el h1 sigue para el lector de pantalla) y "Actualizar" se quita. -->
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div :class="codigo && 'max-lg:sr-only'">
        <h1 class="text-headline text-ink">Cotizaciones</h1>
        <p class="mt-1 text-ink-muted tabular-nums" aria-live="polite">
          <template v-if="carga.data.value">{{ resumen }}</template>
          <template v-else>Las solicitudes que llegan desde Mi cotización.</template>
        </p>
      </div>
      <BaseButton
        variant="secondary"
        size="sm"
        :class="codigo && 'max-lg:hidden'"
        :loading="carga.loading.value"
        @click="carga.retry()"
      >
        <template #icon-left><RotateCw /></template>
        Actualizar
      </BaseButton>
    </div>

    <!-- Cargando (solo la primera vez: "Actualizar" deja la lista a la vista) -->
    <ul
      v-if="carga.loading.value && !carga.data.value"
      class="mt-6 divide-y divide-line rounded-md border border-line bg-surface lg:max-w-xl"
      aria-busy="true"
    >
      <li class="sr-only">Cargando las cotizaciones…</li>
      <li v-for="n in 5" :key="n" class="space-y-2 px-4 py-4" aria-hidden="true">
        <div class="flex justify-between gap-4">
          <div class="h-3.5 w-2/5 animate-pulse rounded-sm bg-line" />
          <div class="h-4 w-20 animate-pulse rounded-sm bg-line" />
        </div>
        <div class="h-3 w-3/5 animate-pulse rounded-sm bg-ground" />
      </li>
    </ul>

    <!-- Sin permiso: reintentar no lo cambia -->
    <div
      v-else-if="carga.error.value && isForbidden(carga.error.value)"
      role="alert"
      class="mt-6 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center"
    >
      <Lock class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <p class="mt-3 text-ink-muted">{{ FORBIDDEN_MESSAGE }}</p>
    </div>

    <div v-else-if="carga.error.value" class="mt-6">
      <BaseErrorState
        title="No pudimos cargar las cotizaciones"
        :error="carga.error.value"
        subject="las cotizaciones"
        @retry="carga.retry()"
      />
    </div>

    <!-- Aún no llega ninguna -->
    <div
      v-else-if="!cotizaciones.length"
      class="mt-6 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center"
    >
      <Inbox class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <p class="mt-3 text-card-title text-ink">Aún no llega ninguna solicitud</p>
      <p class="mt-1 max-w-[45ch] text-small text-ink-muted">
        Aparecen aquí cuando un cliente envía su cotización desde la tienda.
      </p>
    </div>

    <div v-else class="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-6">
      <!-- Lista -->
      <section aria-label="Lista de cotizaciones" :class="codigo && 'max-lg:hidden'">
        <StatusFilter
          v-model="filtroEstado"
          :estados="ESTADOS_COTIZACION"
          :conteo="conteo"
          :total="cotizaciones.length"
          label="Filtrar por estado"
        />

        <div
          v-if="!visibles.length"
          class="mt-4 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center"
        >
          <SearchX class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
          <p class="mt-3 text-card-title text-ink">
            Ninguna cotización {{ describirEstado(ESTADOS_COTIZACION, filtroEstado).etiqueta.toLowerCase() }}
          </p>
          <BaseButton variant="secondary" class="mt-5" @click="filtroEstado = null">Ver todas</BaseButton>
        </div>

        <ul v-else class="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
          <li v-for="cotizacion in visibles" :key="cotizacion.codigoCotizacion">
            <RouterLink
              :id="`cotizacion-${cotizacion.codigoCotizacion}`"
              :to="rutaDetalle(cotizacion.codigoCotizacion)"
              class="block px-4 py-3.5 transition-colors duration-200 ease-out focus-visible:-outline-offset-2"
              :class="
                cotizacion.codigoCotizacion === codigo
                  ? 'bg-brand-tint shadow-[inset_3px_0_0_var(--color-brand-deep)]'
                  : 'hover:bg-ground'
              "
              :aria-current="cotizacion.codigoCotizacion === codigo ? 'true' : undefined"
            >
              <span class="flex items-start justify-between gap-3">
                <span class="min-w-0 font-semibold [overflow-wrap:anywhere] text-ink">
                  {{ cotizacion.nombreCliente || 'Sin nombre' }}
                </span>
                <BaseBadge :variant="estadoDe(cotizacion).tono" class="shrink-0">{{ estadoDe(cotizacion).etiqueta }}</BaseBadge>
              </span>
              <span class="mt-0.5 block text-small text-ink-muted">
                <span class="font-mono">{{ cotizacion.codigoCotizacion }}</span>
                · {{ formatearRegistro(cotizacion.fechaCreacion) }}
              </span>
              <span class="mt-1 block text-small text-ink tabular-nums">
                {{ plural(unidades(cotizacion), 'unidad', 'unidades') }} ·
                {{ formatearPrecio(cotizacion.totalUsd) }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- Detalle. Desde lg queda fijo junto a la lista: si es más alto que la pantalla (muchos
           productos), tiene su propio scroll; si no, el final solo se vería al terminar la lista. -->
      <section
        v-if="codigo"
        aria-labelledby="cotizacion-detalle-titulo"
        class="thin-scrollbar lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain"
      >
        <BaseButton variant="ghost" size="sm" class="-ml-2 lg:hidden" @click="volver">
          <template #icon-left><ChevronLeft /></template>
          Todas las cotizaciones
        </BaseButton>

        <div v-if="noEncontrada" class="mt-3 rounded-md border border-line bg-surface px-6 py-10 text-center lg:mt-0">
          <h2 id="cotizacion-detalle-titulo" tabindex="-1" class="text-card-title text-ink focus:outline-none">
            No encontramos la cotización <span class="font-mono">{{ codigo }}</span>
          </h2>
          <p class="mt-1 text-small text-ink-muted">Revisa el código o vuelve a la lista.</p>
          <BaseButton variant="secondary" class="mt-5" @click="volver">Ver todas</BaseButton>
        </div>

        <article v-else-if="seleccionada" class="mt-3 rounded-md border border-line bg-surface lg:mt-0">
          <header class="border-b border-line px-4 py-4 sm:px-5">
            <h2
              id="cotizacion-detalle-titulo"
              tabindex="-1"
              class="text-title [overflow-wrap:anywhere] text-ink focus:outline-none"
            >
              {{ seleccionada.nombreCliente || 'Sin nombre' }}
            </h2>
            <p class="mt-0.5 text-small text-ink-muted">
              <span class="font-mono">{{ seleccionada.codigoCotizacion }}</span>
              · Recibida el {{ formatearRegistro(seleccionada.fechaCreacion) }}
            </p>
          </header>

          <div class="space-y-5 px-4 py-4 sm:px-5">
            <StatusPicker
              :estados="ESTADOS_COTIZACION"
              :actual="seleccionada.estado"
              :guardando="guardando.has(seleccionada.codigoCotizacion)"
              @cambiar="cambiar(seleccionada, $event)"
            />

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
                Responder por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
              </BaseButton>
              <p v-else class="text-small text-ink-muted">
                El teléfono de esta solicitud no sirve para WhatsApp. Escríbele por correo.
              </p>
            </div>

            <section aria-labelledby="cotizacion-cliente">
              <h3 id="cotizacion-cliente" class="text-label text-ink-muted uppercase">Cliente</h3>
              <!-- Filas de 44px: teléfono y correo se tocan con el pulgar (WCAG 2.5.8) -->
              <dl class="mt-1">
                <div v-if="seleccionada.empresa" class="flex min-h-11 items-center gap-3">
                  <dt class="sr-only">Empresa</dt>
                  <Building2 class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <dd class="min-w-0 [overflow-wrap:anywhere] text-ink">{{ seleccionada.empresa }}</dd>
                </div>
                <div v-if="seleccionada.telefono" class="flex min-h-11 items-center gap-3">
                  <dt class="sr-only">Teléfono</dt>
                  <Phone class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <dd>
                    <a
                      :href="`tel:${seleccionada.telefono}`"
                      class="inline-flex min-h-11 items-center font-semibold text-brand-deep underline-offset-2 hover:underline"
                    >
                      {{ seleccionada.telefono }}
                    </a>
                  </dd>
                </div>
                <div v-if="seleccionada.email" class="flex min-h-11 items-center gap-3">
                  <dt class="sr-only">Correo</dt>
                  <Mail class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <dd class="min-w-0">
                    <a
                      :href="`mailto:${seleccionada.email}?subject=${encodeURIComponent(`Tu solicitud de cotización ${seleccionada.codigoCotizacion}`)}`"
                      class="inline-flex min-h-11 items-center font-semibold [overflow-wrap:anywhere] text-brand-deep underline-offset-2 hover:underline"
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

            <section aria-labelledby="cotizacion-productos">
              <h3 id="cotizacion-productos" class="text-label text-ink-muted uppercase">
                Productos · {{ plural(unidades(seleccionada), 'unidad', 'unidades') }}
              </h3>
              <ul class="mt-2 divide-y divide-line border-y border-line">
                <li v-for="linea in lineas" :key="linea.id" class="flex gap-3 py-3">
                  <img
                    :src="linea.imagen"
                    alt=""
                    width="48"
                    height="60"
                    loading="lazy"
                    class="aspect-[4/5] w-12 shrink-0 rounded-sm bg-ground object-cover object-center"
                    @error="onImageError"
                  />
                  <div class="min-w-0 flex-1">
                    <a
                      v-if="linea.productoId"
                      :href="`/producto/${linea.productoId}`"
                      target="_blank"
                      rel="noopener"
                      class="font-semibold [overflow-wrap:anywhere] text-ink underline-offset-2 hover:text-brand-deep hover:underline"
                    >
                      {{ linea.nombre }}<span class="sr-only"> (se abre en otra pestaña)</span>
                    </a>
                    <p v-else class="font-semibold text-ink">{{ linea.nombre }}</p>
                    <p class="text-small text-ink-muted tabular-nums">
                      {{ numero.format(linea.cantidad) }} × {{ formatearPrecio(linea.precioUnitario) }}
                    </p>
                  </div>
                  <p class="shrink-0 font-semibold text-ink tabular-nums">{{ formatearPrecio(linea.subtotal) }}</p>
                </li>
              </ul>
              <div class="mt-3 flex items-baseline justify-between gap-3">
                <p class="text-ink-muted">Total referencial</p>
                <p class="text-title text-ink tabular-nums">{{ formatearPrecio(total) }}</p>
              </div>
              <p class="mt-1 text-small text-ink-muted">
                Con los precios referenciales del momento en que se envió la solicitud.
              </p>
            </section>
          </div>
        </article>
      </section>

      <!-- Escritorio sin nada abierto -->
      <div
        v-else
        class="sticky top-6 hidden flex-col items-center rounded-md border border-dashed border-line-strong px-6 py-16 text-center lg:flex"
      >
        <FileText class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
        <p class="mt-3 text-ink-muted">Elige una cotización para ver sus productos y responderle al cliente.</p>
      </div>
    </div>
  </div>
</template>
