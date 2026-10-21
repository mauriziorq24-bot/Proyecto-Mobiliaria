<script setup>
import { CircleAlert } from 'lucide-vue-next'
import { computed, ref, useId, watch } from 'vue'
import { useDebounce } from '../../composables/useDebounce'

// Campos "Desde" y "Hasta" del precio referencial (USD).
// Guardan su propio texto mientras la persona escribe y avisan al padre con `update`.
// El padre decide qué hacer: en escritorio se aplica a la URL (si es válido);
// en el panel móvil se guarda en el borrador.
const props = defineProps({
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  // Mínimo y máximo del catálogo, como placeholder.
  placeholderMin: { type: Number, default: null },
  placeholderMax: { type: Number, default: null },
  // Espera tras la última tecla antes de avisar. 0 = al momento (borrador móvil).
  debounce: { type: Number, default: 0 },
})

// update: { precioMin, precioMax, valid } · valid es false si "Desde" es mayor que "Hasta".
const emit = defineEmits(['update'])

const id = useId()
const errorId = `${id}-error`

const minText = ref('')
const maxText = ref('')

// '' → null; '150' → 150. Los campos solo admiten dígitos (ver onInput), así que no hay negativos.
function toNumber(text) {
  return text === '' ? null : Number(text)
}

// Si el valor cambia desde fuera (chip quitado, "Limpiar", Atrás del navegador), los campos lo reflejan.
// Solo se reescriben si el número es otro: así no se pisa lo que la persona está escribiendo.
watch(
  () => [props.min, props.max],
  ([min, max]) => {
    if (toNumber(minText.value) !== min) minText.value = min == null ? '' : String(min)
    if (toNumber(maxText.value) !== max) maxText.value = max == null ? '' : String(max)
  },
  { immediate: true },
)

const values = computed(() => ({ precioMin: toNumber(minText.value), precioMax: toNumber(maxText.value) }))

// El error se muestra al instante, sin esperar el debounce.
const invalid = computed(() => {
  const { precioMin, precioMax } = values.value
  return precioMin != null && precioMax != null && precioMin > precioMax
})

const source = props.debounce ? useDebounce(values, props.debounce) : values
watch(source, ({ precioMin, precioMax }) => {
  if (precioMin === props.min && precioMax === props.max) return
  emit('update', { precioMin, precioMax, valid: !(precioMin != null && precioMax != null && precioMin > precioMax) })
})

// inputmode="numeric" muestra el teclado de números en el teléfono, pero no impide pegar
// "-50" o "1.2e3": se quitan todos los caracteres que no sean dígitos.
function onInput(event, field) {
  const clean = event.target.value.replace(/\D/g, '').slice(0, 7)
  if (clean !== event.target.value) event.target.value = clean
  if (field === 'min') minText.value = clean
  else maxText.value = clean
}

const inputClass =
  'h-[46px] w-full rounded-md border bg-surface pr-3 pl-7 text-base text-ink tabular-nums transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-ink-muted focus:outline-none focus-visible:outline-none'
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-3">
      <div v-for="field in ['min', 'max']" :key="field" class="flex flex-col gap-1.5">
        <label :for="`${id}-${field}`" class="text-small font-semibold text-ink">
          {{ field === 'min' ? 'Desde' : 'Hasta' }}
        </label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted" aria-hidden="true">
            $
          </span>
          <input
            :id="`${id}-${field}`"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="off"
            enterkeyhint="done"
            :value="field === 'min' ? minText : maxText"
            :placeholder="(field === 'min' ? placeholderMin : placeholderMax)?.toString() ?? ''"
            :aria-invalid="invalid || undefined"
            :aria-describedby="invalid ? errorId : undefined"
            :class="[
              inputClass,
              invalid
                ? 'border-error focus:ring-2 focus:ring-error/25'
                : 'border-line hover:border-ink-muted/50 focus:border-brand focus:ring-2 focus:ring-brand/25',
            ]"
            @input="onInput($event, field)"
          />
        </div>
      </div>
    </div>

    <!-- La región aria-live existe siempre: si apareciera junto con el mensaje, no se anunciaría -->
    <div aria-live="polite">
      <p v-if="invalid" :id="errorId" class="mt-2 flex items-start gap-1.5 text-small text-error">
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        «Desde» no puede ser mayor que «Hasta».
      </p>
    </div>
  </div>
</template>
