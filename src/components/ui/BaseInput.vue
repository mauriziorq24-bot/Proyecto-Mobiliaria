<script setup>
import { CircleAlert } from 'lucide-vue-next'
import { computed, useId } from 'vue'

// Los atributos que no son props (name, autocomplete, inputmode, @blur…) no deben caer
// en el <div> exterior sino en el <input>. Por eso desactivamos la herencia automática
// y los pasamos a mano con v-bind="$attrs".
defineOptions({ inheritAttrs: false })

const props = defineProps({
  // v-model en el padre se traduce a la prop "modelValue" + el evento "update:modelValue".
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, required: true },
  // Oculta la etiqueta a la vista pero la deja para lectores de pantalla (p. ej. el buscador del header).
  hideLabel: { type: Boolean, default: false },
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'email', 'password', 'tel', 'search', 'number', 'url'].includes(value),
  },
  placeholder: { type: String, default: '' },
  // Texto de ayuda bajo el campo; se reemplaza por el error cuando lo hay.
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  // Si no se pasa un id, se genera uno único para enlazar <label> e <input>.
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const messageId = computed(() => `${inputId.value}-message`)
const hasError = computed(() => Boolean(props.error))
const message = computed(() => props.error || props.hint)

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="inputId" class="text-small font-semibold text-ink" :class="hideLabel && 'sr-only'">
      {{ label }}
      <span v-if="required" class="text-ink-muted" aria-hidden="true">*</span>
    </label>

    <div class="relative">
      <!-- Slot "leading": un ícono dentro del campo, a la izquierda (p. ej. la lupa del buscador) -->
      <span
        v-if="$slots.leading"
        class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-muted [&_svg]:size-[18px]"
      >
        <slot name="leading" />
      </span>

      <input
        v-bind="$attrs"
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="hasError || undefined"
        :aria-describedby="message ? messageId : undefined"
        class="h-[46px] w-full rounded-md border bg-surface px-3.5 text-base text-ink transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-ink-muted focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-ground disabled:text-ink-muted"
        :class="[
          $slots.leading && 'pl-10',
          hasError
            ? 'border-error focus:ring-2 focus:ring-error/25'
            : 'border-line hover:border-ink-muted/50 focus:border-brand focus:ring-2 focus:ring-brand/25',
        ]"
        @input="handleInput"
      />
    </div>

    <p
      v-if="message"
      :id="messageId"
      class="flex items-start gap-1.5 text-small"
      :class="hasError ? 'text-error' : 'text-ink-muted'"
      :aria-live="hasError ? 'polite' : undefined"
    >
      <CircleAlert v-if="hasError" class="mt-px size-4 shrink-0" aria-hidden="true" />
      {{ message }}
    </p>
  </div>
</template>
