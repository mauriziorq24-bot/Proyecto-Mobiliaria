<script setup>
import { PackageSearch } from 'lucide-vue-next'
import ProductCard from './ProductCard.vue'
import ProductCardSkeleton from './ProductCardSkeleton.vue'

defineProps({
  productos: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  // Cuántas tarjetas de carga mostrar: 8 llena dos filas en escritorio.
  skeletonCount: { type: Number, default: 8 },
  // ids marcados como favoritos (solo visual hasta que exista el store).
  favoritos: { type: Array, default: () => [] },
})

const emit = defineEmits(['toggle-favorito'])

// 2 columnas en móvil, 3 en tablet, 4 en escritorio (DESIGN.md).
const gridClasses = 'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6'
</script>

<template>
  <!-- Cargando -->
  <div v-if="loading" role="status" aria-live="polite">
    <span class="sr-only">Cargando productos…</span>
    <ul :class="gridClasses" aria-hidden="true">
      <li v-for="n in skeletonCount" :key="n">
        <ProductCardSkeleton />
      </li>
    </ul>
  </div>

  <!-- Vacío: el mensaje lo decide cada vista con el slot "empty" -->
  <div
    v-else-if="productos.length === 0"
    class="flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center"
  >
    <PackageSearch class="size-10 text-ink-muted" :stroke-width="1.5" aria-hidden="true" />
    <div class="mt-4 max-w-[45ch]">
      <slot name="empty">
        <p class="text-card-title">No hay productos para mostrar</p>
        <p class="mt-1 text-small text-ink-muted">Prueba con otra categoría o quita algún filtro.</p>
      </slot>
    </div>
  </div>

  <!-- Con productos -->
  <ul v-else :class="gridClasses">
    <li v-for="producto in productos" :key="producto.id">
      <ProductCard
        :producto="producto"
        :favorito="favoritos.includes(producto.id)"
        @toggle-favorito="emit('toggle-favorito', $event)"
      />
    </li>
  </ul>
</template>
