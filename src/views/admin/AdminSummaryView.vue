<script setup>
import { CalendarDays, FileText, Lock, Package, RotateCw, Tags, TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../../components/ui/BaseButton.vue'
import { useAnuncio } from '../../composables/useAnuncio'
import { useAsync } from '../../composables/useAsync'
import { getCategorias } from '../../services/categoriaService'
import { citasAdminActiva, obtenerCitasAdmin } from '../../services/citaService'
import { obtenerCotizaciones } from '../../services/cotizacionService'
import { adminErrorMessage, isForbidden } from '../../services/errorMessages'
import { obtenerProductos } from '../../services/productoService'
import { ahoraEnCaracas } from '../../utils/fecha'

// Resumen del panel: un contador por cada dato que la API ya puede dar (ver API.md).
// - Productos y categorías: GET públicos.
// - Cotizaciones: GET /api/v1/cotizaciones, solo ADMIN (un 403 muestra el aviso de permisos).
// - Citas: GET /api/v1/citas, solo ADMIN. Solo con VITE_ADMIN_CITAS_API=true.
// Cada contador carga por su lado: si uno falla, los demás se ven igual.
// Las filas de cotizaciones y citas llevan a su sección (`to`).
const productos = useAsync(() => obtenerProductos())
const categorias = useAsync(() => getCategorias())
const cotizaciones = useAsync(() => obtenerCotizaciones())
const citas = citasAdminActiva ? useAsync(() => obtenerCitasAdmin()) : null

const numero = new Intl.NumberFormat('es-VE')
const listaCorta = new Intl.ListFormat('es', { type: 'conjunction' })

function cantidad(n, singular, plural) {
  return `${numero.format(n)} ${n === 1 ? singular : plural}`
}

const filas = computed(() => [
  {
    id: 'productos',
    titulo: 'Productos en el catálogo',
    icon: Package,
    estado: productos,
    subject: 'los productos',
    valor: productos.data.value?.length,
    detalle: (() => {
      const lista = productos.data.value
      if (!lista) return ''
      if (!lista.length) return 'Aún no hay productos publicados'
      const enShowroom = lista.filter((p) => p.enShowroom === true).length
      return enShowroom ? `${numero.format(enShowroom)} en showroom` : 'Ninguno en showroom'
    })(),
  },
  {
    id: 'categorias',
    titulo: 'Categorías',
    icon: Tags,
    estado: categorias,
    subject: 'las categorías',
    valor: categorias.data.value?.length,
    detalle: (() => {
      const lista = categorias.data.value
      if (!lista) return ''
      if (!lista.length) return 'Aún no hay categorías'
      const nombres = lista.slice(0, 3).map((c) => c.nombre)
      const resto = lista.length - nombres.length
      return resto > 0 ? `${nombres.join(', ')} y ${cantidad(resto, 'más', 'más')}` : listaCorta.format(nombres)
    })(),
  },
  {
    id: 'cotizaciones',
    titulo: 'Cotizaciones por atender',
    icon: FileText,
    estado: cotizaciones,
    subject: 'las cotizaciones',
    to: { name: 'admin-quotes', query: { estado: 'PENDIENTE' } },
    valor: cotizaciones.data.value?.filter((c) => c.estado === 'PENDIENTE').length,
    detalle: (() => {
      const lista = cotizaciones.data.value
      if (!lista) return ''
      if (!lista.length) return 'Aún no llega ninguna solicitud'
      return `De ${cantidad(lista.length, 'recibida', 'recibidas')} en total`
    })(),
  },
  ...(citas
    ? [
        {
          id: 'citas',
          titulo: 'Citas por confirmar',
          icon: CalendarDays,
          estado: citas,
          subject: 'las citas',
          to: { name: 'admin-appointments' },
          valor: citas.data.value?.filter((c) => c.estado === 'PENDIENTE').length,
          detalle: (() => {
            const lista = citas.data.value
            if (!lista) return ''
            if (!lista.length) return 'Aún no hay citas agendadas'
            // "Hoy" en Caracas, como la agenda (src/utils/fecha.js).
            const hoy = ahoraEnCaracas().fecha
            const deHoy = lista.filter((c) => c.fecha === hoy && c.estado !== 'CANCELADA').length
            return deHoy ? `${cantidad(deHoy, 'cita', 'citas')} hoy` : 'Ninguna cita hoy'
          })(),
        },
      ]
    : []),
])

// El enlace cubre toda la fila con un ::after; el anillo de foco va en ese ::after, por dentro.
const enlaceFila =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand"

const cargando = computed(() => filas.value.some((fila) => fila.estado.loading.value))

// Al terminar "Actualizar" se avisa al lector de pantalla. Si alguna fila falla, no hace falta:
// su error ya se anuncia solo (role="alert").
const { anuncio, anunciar } = useAnuncio()

async function actualizar() {
  await Promise.all([productos.retry(), categorias.retry(), cotizaciones.retry(), citas?.retry()])
  if (!filas.value.some((fila) => fila.estado.error.value)) anunciar('Resumen actualizado.')
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 sm:px-6 lg:px-10 lg:pt-10">
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="text-headline text-ink">Resumen</h1>
        <p class="mt-1 text-ink-muted">Cómo está la tienda en este momento.</p>
      </div>
      <BaseButton variant="secondary" size="sm" :loading="cargando" @click="actualizar">
        <template #icon-left><RotateCw /></template>
        Actualizar
      </BaseButton>
    </div>

    <ul class="mt-6 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
      <li
        v-for="fila in filas"
        :key="fila.id"
        class="relative flex min-h-20 items-center gap-4 px-4 py-4 transition-colors duration-200 ease-out sm:px-5"
        :class="fila.to && 'hover:bg-ground'"
        :aria-busy="fila.estado.loading.value"
      >
        <component
          :is="fila.estado.error.value ? (isForbidden(fila.estado.error.value) ? Lock : TriangleAlert) : fila.icon"
          class="size-5 shrink-0"
          :class="fila.estado.error.value && !isForbidden(fila.estado.error.value) ? 'text-error' : 'text-ink-muted'"
          :stroke-width="1.75"
          aria-hidden="true"
        />

        <div class="min-w-0 flex-1">
          <!-- El número se lee junto al título ("Categorías: 5"); el grande de la derecha es solo visual. -->
          <h2 :id="`resumen-${fila.id}`" class="font-semibold text-ink">
            <!-- Enlace estirado: toda la fila lleva a la sección -->
            <component
              :is="fila.to ? RouterLink : 'span'"
              :to="fila.to"
              :class="fila.to && enlaceFila"
            >
              {{ fila.titulo
              }}<span v-if="!fila.estado.loading.value && !fila.estado.error.value" class="sr-only">: {{ numero.format(fila.valor ?? 0) }}</span>
            </component>
          </h2>

          <div v-if="fila.estado.loading.value" class="mt-1.5 h-3 w-40 max-w-full animate-pulse rounded-sm bg-line" aria-hidden="true" />
          <p v-else-if="fila.estado.error.value" role="alert" class="text-small text-ink-muted">
            {{ adminErrorMessage(fila.estado.error.value, fila.subject) }}
          </p>
          <p v-else class="text-small text-ink-muted">{{ fila.detalle }}</p>
        </div>

        <div v-if="fila.estado.loading.value" class="h-7 w-10 shrink-0 animate-pulse rounded-sm bg-line" aria-hidden="true" />
        <BaseButton
          v-else-if="fila.estado.error.value && !isForbidden(fila.estado.error.value)"
          variant="ghost"
          size="sm"
          class="relative z-10 shrink-0"
          :aria-describedby="`resumen-${fila.id}`"
          @click="fila.estado.retry()"
        >
          Reintentar
        </BaseButton>
        <p
          v-else-if="!fila.estado.error.value"
          class="shrink-0 text-title text-ink tabular-nums"
          aria-hidden="true"
        >
          {{ numero.format(fila.valor ?? 0) }}
        </p>
      </li>
    </ul>

    <p class="sr-only" role="status">{{ anuncio }}</p>
  </div>
</template>
