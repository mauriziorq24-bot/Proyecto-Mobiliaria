<script setup>
import { FileText, Lock, Package, RotateCw, Tags, TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import { useAsync } from '../../composables/useAsync'
import { getCategorias } from '../../services/categoriaService'
import { obtenerCotizaciones } from '../../services/cotizacionService'
import { adminErrorMessage, isForbidden } from '../../services/errorMessages'
import { obtenerProductos } from '../../services/productoService'

// Resumen del panel: un contador por cada dato que la API ya puede dar (ver API.md).
// - Productos y categorías: GET públicos.
// - Cotizaciones: GET /api/v1/cotizaciones, solo ADMIN (un 403 muestra el aviso de permisos).
// - Citas: no aparece. Falta GET /api/v1/citas para administración (pendiente 29 de API.md).
// Cada contador carga por su lado: si uno falla, los demás se ven igual.
const productos = useAsync(() => obtenerProductos())
const categorias = useAsync(() => getCategorias())
const cotizaciones = useAsync(() => obtenerCotizaciones())

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
    valor: cotizaciones.data.value?.filter((c) => c.estado === 'PENDIENTE').length,
    detalle: (() => {
      const lista = cotizaciones.data.value
      if (!lista) return ''
      if (!lista.length) return 'Aún no llega ninguna solicitud'
      return `De ${cantidad(lista.length, 'recibida', 'recibidas')} en total`
    })(),
  },
])

const cargando = computed(() => filas.value.some((fila) => fila.estado.loading.value))

function actualizar() {
  productos.retry()
  categorias.retry()
  cotizaciones.retry()
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
        class="flex min-h-20 items-center gap-4 px-4 py-4 sm:px-5"
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
            {{ fila.titulo
            }}<span v-if="!fila.estado.loading.value && !fila.estado.error.value" class="sr-only">: {{ numero.format(fila.valor ?? 0) }}</span>
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
          class="shrink-0"
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
  </div>
</template>
