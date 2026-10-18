<script setup>
import { computed } from 'vue'

const props = defineProps({
  // showroom: etiqueta "EN SHOWROOM" · material: chip de material sobre la foto
  // count: contador redondo (favoritos, carrito) · success / error / warning / info: estados
  variant: {
    type: String,
    default: 'info',
    validator: (value) =>
      ['showroom', 'material', 'count', 'success', 'error', 'warning', 'info'].includes(value),
  },
  // Solo para variant="count": el número a mostrar. Por encima de "max" se muestra "99+".
  count: { type: Number, default: null },
  max: { type: Number, default: 99 },
})

const variantClasses = {
  showroom: 'gap-1.5 rounded-sm bg-ink px-[7px] py-[3px] text-label uppercase text-white',
  material: 'rounded-sm border border-line bg-surface px-[7px] py-[3px] text-label uppercase text-ink',
  count: 'h-5 min-w-5 justify-center rounded-full bg-ink px-1.5 text-xs font-bold tabular-nums text-white',
  success: 'gap-1.5 rounded-sm bg-success-bg px-2 py-0.5 text-small text-success',
  error: 'gap-1.5 rounded-sm bg-error-bg px-2 py-0.5 text-small text-error',
  warning: 'gap-1.5 rounded-sm bg-warning-bg px-2 py-0.5 text-small text-warning',
  info: 'gap-1.5 rounded-sm bg-brand-tint px-2 py-0.5 text-small text-brand-deep',
}

const displayCount = computed(() => {
  if (props.count === null) return null
  return props.count > props.max ? `${props.max}+` : String(props.count)
})
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0"
    :class="variantClasses[variant]"
  >
    <!-- El punto dorado es la señal de showroom (La regla del dorado) -->
    <span v-if="variant === 'showroom'" class="size-1.5 rounded-full bg-showroom-gold" aria-hidden="true" />
    <!-- Si se pasa "count" se muestra el número; si no, lo que venga en el slot -->
    <template v-if="displayCount !== null">{{ displayCount }}</template>
    <slot v-else />
  </span>
</template>
