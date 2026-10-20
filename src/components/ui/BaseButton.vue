<script setup>
import { LoaderCircle } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

// Props: los datos que el componente padre le pasa a este botón.
// Cada prop declara su tipo, su valor por defecto y, si hace falta, un validador.
const props = defineProps({
  // primary: acción principal · secondary: apoyo · ghost: acción discreta
  // visit: "Agendar visita" (dorado showroom) · whatsapp: "Enviar por WhatsApp"
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost', 'visit', 'whatsapp'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  // Atributo type del <button>. Por defecto "button" para no enviar formularios sin querer.
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value),
  },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  // Ocupa todo el ancho disponible (útil en móvil y en formularios).
  block: { type: Boolean, default: false },
  // Si lleva "to", se dibuja como RouterLink (navegación interna);
  // si lleva "href", como <a> (enlaces externos: WhatsApp, Instagram…). Si no, es un <button>.
  to: { type: [String, Object], default: null },
  href: { type: String, default: null },
})

const tag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return 'button'
})
const isButton = computed(() => tag.value === 'button')

// Cada etiqueta recibe solo su atributo de destino. RouterLink genera su propio href:
// si además le llega la clave href (aunque valga undefined), Vue la aplica encima,
// el <a> queda sin href y el teclado ya no puede llegar al enlace.
const linkAttrs = computed(() => {
  if (props.to) return { to: props.to }
  if (props.href) return { href: props.href }
  return {}
})

// Emits: los eventos que este botón le avisa al padre.
// Al declarar "click" aquí, Vue deja de pasarlo directo al <button>
// y somos nosotros quienes decidimos cuándo emitirlo.
const emit = defineEmits(['click'])

function handleClick(event) {
  // Mientras carga o está deshabilitado, el padre no recibe el clic.
  if (props.loading || props.disabled) return
  emit('click', event)
}

const variantClasses = {
  primary: 'bg-brand-deep text-white hover:bg-brand-deeper',
  secondary: 'border border-brand-deep bg-surface text-brand-deep hover:bg-brand-tint',
  ghost: 'bg-transparent text-brand-deep hover:bg-brand-tint',
  visit: 'bg-showroom-gold text-ink hover:bg-showroom-gold-deep',
  whatsapp: 'bg-whatsapp text-white hover:bg-whatsapp-deep',
}

// En "sm" el botón mide 36px, pero el área táctil se amplía a 44px con un ::before invisible.
const sizeClasses = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm font-semibold [&_svg]:size-4 before:absolute before:inset-x-0 before:-inset-y-1',
  md: 'h-[46px] gap-2 px-5 text-base font-semibold [&_svg]:size-[18px]',
  lg: 'h-13 gap-2.5 px-6 text-base font-bold [&_svg]:size-5',
}

const classes = computed(() => [
  'relative inline-flex shrink-0 select-none items-center justify-center rounded-md whitespace-nowrap',
  'transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.97]',
  'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
  variantClasses[props.variant],
  sizeClasses[props.size],
  props.block && 'w-full',
  props.loading && 'cursor-progress active:scale-100',
])
</script>

<template>
  <!-- <component :is> elige la etiqueta: <button>, <a> o RouterLink -->
  <component
    :is="tag"
    v-bind="linkAttrs"
    :type="isButton ? type : undefined"
    :class="classes"
    :disabled="isButton ? disabled : undefined"
    :aria-disabled="loading || undefined"
    :aria-busy="loading || undefined"
    @click="handleClick"
  >
    <!-- Mientras carga, el contenido se vuelve invisible pero conserva su espacio:
         así el botón no cambia de ancho y nada salta en la página. -->
    <span class="inline-flex items-center gap-[inherit]" :class="loading && 'invisible'">
      <!-- Slot con nombre "icon-left": un ícono opcional antes del texto -->
      <slot name="icon-left" />
      <!-- Slot por defecto: el texto del botón -->
      <slot />
      <slot name="icon-right" />
    </span>

    <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <LoaderCircle class="animate-spin" aria-hidden="true" />
      <span class="sr-only">Cargando</span>
    </span>
  </component>
</template>
