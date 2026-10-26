<script setup>
import { computed } from 'vue'

// Filtro de una lista del panel por estado: "Todas (8)", "Pendientes (3)"…
// Los botones pasan a otra línea si no caben: en el teléfono no hay scroll horizontal.
const props = defineProps({
  // ESTADOS_COTIZACION o ESTADOS_CITA de utils/formato.js
  estados: { type: Object, required: true },
  // { PENDIENTE: 3, … } y el total, para mostrar cuántos hay de cada uno.
  conteo: { type: Object, required: true },
  total: { type: Number, required: true },
  // null = todos
  modelValue: { type: String, default: null },
  todosLabel: { type: String, default: 'Todas' },
  label: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])
const numero = new Intl.NumberFormat('es-VE')

const opciones = computed(() => [
  { valor: null, texto: props.todosLabel, cantidad: props.total },
  ...Object.entries(props.estados).map(([valor, estado]) => ({
    valor,
    texto: estado.filtro,
    cantidad: props.conteo[valor] ?? 0,
  })),
])
</script>

<template>
  <div role="group" :aria-label="label" class="flex flex-wrap gap-2">
    <button
      v-for="opcion in opciones"
      :key="opcion.valor ?? 'todos'"
      type="button"
      class="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-semibold transition-colors duration-200 ease-out"
      :class="
        opcion.valor === modelValue
          ? 'border-ink bg-ink text-white'
          : 'border-line-strong bg-surface text-ink hover:bg-ground'
      "
      :aria-pressed="opcion.valor === modelValue"
      @click="emit('update:modelValue', opcion.valor)"
    >
      {{ opcion.texto }}
      <span class="tabular-nums" :class="opcion.valor === modelValue ? 'text-white/80' : 'text-ink-muted'">
        {{ numero.format(opcion.cantidad) }}
      </span>
    </button>
  </div>
</template>
