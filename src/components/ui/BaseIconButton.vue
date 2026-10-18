<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBadge from './BaseBadge.vue'

const props = defineProps({
  // El componente de ícono de lucide-vue-next, por ejemplo :icon="Heart".
  // Un componente de Vue es un objeto (o una función), por eso ese tipo.
  icon: { type: [Object, Function], required: true },
  // Un botón con solo un ícono no tiene texto visible: label es obligatorio
  // para que los lectores de pantalla sepan qué hace ("Ver favoritos").
  label: { type: String, required: true },
  // ghost: sobre fondos claros · secondary: con borde · primary: relleno azul
  // inverse: sobre el header azul (ícono blanco)
  variant: {
    type: String,
    default: 'ghost',
    validator: (value) => ['ghost', 'secondary', 'primary', 'inverse'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  // Contador opcional sobre el ícono (favoritos, carrito). 0 o null lo oculta.
  badge: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
  // Con "to" se dibuja como RouterLink (p. ej. el ícono de favoritos lleva a /favoritos).
  to: { type: [String, Object], default: null },
})

const isLink = computed(() => Boolean(props.to))

const emit = defineEmits(['click'])

const variantClasses = {
  ghost: 'text-ink hover:bg-brand-tint hover:text-brand-deep',
  secondary: 'border border-line bg-surface text-ink hover:border-brand-deep hover:text-brand-deep',
  primary: 'bg-brand-deep text-white hover:bg-brand-deeper',
  inverse: 'text-white hover:bg-white/15 focus-visible:outline-white',
}

// md y lg cumplen el mínimo táctil de 44px; sm amplía su área con un ::before invisible.
const sizeClasses = {
  sm: 'size-9 [&>svg]:size-[18px] before:absolute before:-inset-1',
  md: 'size-11 [&>svg]:size-[22px]',
  lg: 'size-12 [&>svg]:size-6',
}

const showBadge = computed(() => props.badge !== null && props.badge > 0)

// El contador también se anuncia: "Ver carrito, 3".
const accessibleLabel = computed(() => (showBadge.value ? `${props.label}, ${props.badge}` : props.label))
</script>

<template>
  <component
    :is="isLink ? RouterLink : 'button'"
    :to="to || undefined"
    :type="isLink ? undefined : type"
    :disabled="isLink ? undefined : disabled"
    :aria-label="accessibleLabel"
    :title="label"
    class="relative inline-flex shrink-0 items-center justify-center rounded-md transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
    :class="[variantClasses[variant], sizeClasses[size]]"
    @click="emit('click', $event)"
  >
    <!-- <component :is> dibuja el componente que llegue en la prop "icon" -->
    <component :is="icon" :stroke-width="1.75" aria-hidden="true" />
    <BaseBadge
      v-if="showBadge"
      variant="count"
      :count="badge"
      class="absolute -top-0.5 -right-0.5 ring-2"
      :class="variant === 'inverse' ? 'ring-brand' : 'ring-surface'"
      aria-hidden="true"
    />
  </component>
</template>
