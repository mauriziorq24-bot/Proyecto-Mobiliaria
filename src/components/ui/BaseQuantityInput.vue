<script setup>
import { Minus, Plus } from 'lucide-vue-next'
import { computed, useId } from 'vue'

// Selector de cantidad: [−] [ 2 ] [+]. Se usa con v-model="cantidad".
// defineModel crea la prop modelValue y el evento update:modelValue en una sola línea.
const quantity = defineModel({ type: Number, default: 1 })

const props = defineProps({
  min: { type: Number, default: 1 },
  max: { type: Number, default: 99 },
  // Texto para lectores de pantalla; se muestra solo si showLabel es true.
  label: { type: String, default: 'Cantidad' },
  showLabel: { type: Boolean, default: false },
})

const inputId = useId()

const canDecrease = computed(() => quantity.value > props.min)
const canIncrease = computed(() => quantity.value < props.max)

function clamp(value) {
  return Math.min(Math.max(value, props.min), props.max)
}

function step(delta) {
  quantity.value = clamp(quantity.value + delta)
}

// Al escribir a mano: se aceptan solo enteros dentro del rango.
// Si el campo queda vacío o con algo inválido, al salir vuelve al mínimo.
function onChange(event) {
  const value = Number.parseInt(event.target.value, 10)
  quantity.value = Number.isNaN(value) ? props.min : clamp(value)
  event.target.value = quantity.value
}

const buttonClasses =
  'inline-flex size-11 shrink-0 items-center justify-center text-ink transition-[background-color,color,transform] duration-200 ease-out hover:bg-brand-tint hover:text-brand-deep active:scale-[0.92] disabled:cursor-not-allowed disabled:text-ink-muted/50 disabled:hover:bg-transparent disabled:active:scale-100'
</script>

<template>
  <div class="inline-flex flex-col gap-1.5">
    <label :for="inputId" :class="showLabel ? 'text-small text-ink-muted' : 'sr-only'">{{ label }}</label>
    <div
      class="inline-flex h-[46px] items-center overflow-hidden rounded-md border border-line bg-surface focus-within:border-brand-deep"
    >
      <button
        type="button"
        :class="buttonClasses"
        :disabled="!canDecrease"
        :aria-label="`Disminuir ${label.toLowerCase()}`"
        @click="step(-1)"
      >
        <Minus class="size-4" aria-hidden="true" />
      </button>
      <!-- type="text" + inputmode: teclado numérico en móvil sin las flechitas del type="number" -->
      <input
        :id="inputId"
        :value="quantity"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="off"
        class="h-full w-10 border-x border-line bg-transparent text-center text-base font-semibold tabular-nums outline-none"
        @change="onChange"
        @keydown.up.prevent="step(1)"
        @keydown.down.prevent="step(-1)"
      />
      <button
        type="button"
        :class="buttonClasses"
        :disabled="!canIncrease"
        :aria-label="`Aumentar ${label.toLowerCase()}`"
        @click="step(1)"
      >
        <Plus class="size-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
