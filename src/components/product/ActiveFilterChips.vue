<script setup>
import { X } from 'lucide-vue-next'

// Chips de los filtros activos, cada uno con su X, y al final "Limpiar filtros".
// En móvil van en una fila con scroll horizontal (scroll); en escritorio, en varias líneas.
defineProps({
  // Lista de filtrosActivos() (src/utils/filtrosActivos.js).
  chips: { type: Array, default: () => [] },
  scroll: { type: Boolean, default: false },
})

const emit = defineEmits(['remove', 'clear'])

const hideScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
</script>

<template>
  <ul
    v-if="chips.length"
    aria-label="Filtros activos"
    class="flex items-center gap-2"
    :class="scroll ? ['-mx-4 overflow-x-auto px-4 py-1 md:-mx-6 md:px-6', hideScrollbar] : 'flex-wrap'"
  >
    <li v-for="chip in chips" :key="chip.clave" class="shrink-0">
      <span
        class="inline-flex h-9 items-center rounded-sm border border-brand-deep bg-brand-tint pl-3 text-small font-semibold whitespace-nowrap text-brand-deep tabular-nums"
      >
        {{ chip.etiqueta }}
        <!-- La X mide 32px a la vista; el ::before amplía el área táctil a 44px -->
        <button
          type="button"
          class="relative ml-0.5 grid size-8 place-items-center rounded-sm transition-colors duration-200 ease-out before:absolute before:-inset-1.5 hover:bg-brand-deep/10"
          :aria-label="`Quitar filtro ${chip.nombre}`"
          @click="emit('remove', chip)"
        >
          <X class="size-4" :stroke-width="2.25" aria-hidden="true" />
        </button>
      </span>
    </li>
    <li class="shrink-0">
      <button
        type="button"
        class="relative inline-flex h-9 items-center rounded-sm px-2 text-small font-semibold whitespace-nowrap text-brand-deep underline-offset-4 before:absolute before:inset-x-0 before:-inset-y-1 hover:underline"
        @click="emit('clear')"
      >
        Limpiar filtros
      </button>
    </li>
  </ul>
</template>
