<script setup>
import { ChevronDown, CircleAlert } from 'lucide-vue-next'
import { computed, onMounted, useId } from 'vue'
import {
  cargarTelefono,
  codigoPais,
  digitosNacionales,
  formatearMientrasEscribe,
  nombrePais,
  otrosPaises,
  PAIS_POR_DEFECTO,
  PAISES_FRECUENTES,
  paisDeTexto,
} from '../../utils/telefono'

// Teléfono de cualquier país: selector de código + número con el formato del país.
// Uso: <BasePhoneInput v-model="form.telefono" v-model:pais="form.paisTelefono" label="Teléfono" />
// v-model es el texto tal como se ve ('0414-1234567' o '+57 300 1234567'); para enviarlo al
// backend se convierte a E.164 con normalizarTelefono(texto, pais) de src/utils/telefono.js.

// Como en BaseInput: name, @blur… van al <input>, no al <div> exterior.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  // Código ISO del país elegido ('VE', 'CO'…). Se usa con v-model:pais.
  pais: { type: String, default: PAIS_POR_DEFECTO },
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:pais'])

const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const messageId = computed(() => `${inputId.value}-message`)
const hasError = computed(() => Boolean(props.error))
const message = computed(() => props.error || props.hint)

// La librería de teléfonos (~40 kB) se carga solo en las páginas que usan este campo.
// Al llegar, se da formato a lo que ya estuviera escrito (p. ej. un borrador recuperado).
onMounted(async () => {
  if ((await cargarTelefono()) && props.modelValue) actualizar(props.modelValue)
})

// --- Selector de país ---
const frecuentes = computed(() =>
  PAISES_FRECUENTES.map(({ pais, codigo }) => ({ pais, codigo, nombre: nombrePais(pais) })),
)
// otrosPaises() está vacío hasta que carga la librería. Si el país elegido no es de los frecuentes
// (p. ej. un borrador con 'FR'), se agrega solo, para que el selector no quede en blanco.
const otros = computed(() => {
  const lista = otrosPaises()
  if (lista.length || PAISES_FRECUENTES.some((p) => p.pais === props.pais)) return lista
  return [{ pais: props.pais, codigo: codigoPais(props.pais), nombre: nombrePais(props.pais) }]
})
const codigoVisible = computed(() => codigoPais(props.pais))

// Otro país: los mismos dígitos, con el formato del país nuevo.
// Si estaba escrito con '+', se quita el código viejo: la persona acaba de decir que es de otro país.
function elegirPais(event) {
  const pais = event.target.value
  emit('update:pais', pais)
  const texto = props.modelValue.trim()
  if (!texto) return
  const digitos = texto.startsWith('+') ? digitosNacionales(texto) : texto.replace(/\D/g, '')
  emit('update:modelValue', formatearMientrasEscribe(digitos, pais))
}

// --- Número ---
// Lo que cuenta de un número son los dígitos y un '+' al inicio; espacios, guiones y paréntesis
// los pone el formato. Más de 16 no existe: ni el internacional más largo ('+' y 15 dígitos).
const limpiar = (texto) => {
  const t = String(texto ?? '').trim()
  const mas = t.startsWith('+') || t.startsWith('00') ? '+' : ''
  return (mas + t.replace(/^00/, '').replace(/\D/g, '')).slice(0, 16)
}

// Texto limpio → { texto con formato, país }. Con '+', el código decide el país.
function formatear(limpio) {
  if (!limpio.startsWith('+')) return { texto: formatearMientrasEscribe(limpio, props.pais), pais: props.pais }
  const pais = paisDeTexto(limpio, props.pais) ?? props.pais
  return { texto: formatearMientrasEscribe(limpio, pais), pais }
}

function actualizar(texto) {
  const resultado = formatear(limpiar(texto))
  if (resultado.pais !== props.pais) emit('update:pais', resultado.pais)
  emit('update:modelValue', resultado.texto)
  return resultado.texto
}

function onInput(event) {
  const input = event.target
  let limpio = limpiar(input.value)
  // Posición del cursor contada en dígitos: es lo único que no cambia al dar formato.
  let posicion = limpiar(input.value.slice(0, input.selectionStart ?? input.value.length)).length

  // Borrar un espacio o un guion no cambia los dígitos y el formato lo volvería a poner:
  // el cursor no avanzaría nunca. Se borra el dígito de al lado, como espera la persona.
  if (event.inputType?.startsWith('delete') && limpio === limpiar(props.modelValue)) {
    if (event.inputType === 'deleteContentBackward' && posicion > 0) {
      limpio = limpio.slice(0, posicion - 1) + limpio.slice(posicion)
      posicion -= 1
    } else if (event.inputType === 'deleteContentForward') {
      limpio = limpio.slice(0, posicion) + limpio.slice(posicion + 1)
    }
  }

  const texto = actualizar(limpio)
  // Se escribe en el campo aquí mismo: si el texto no cambió (p. ej. se escribió una letra),
  // Vue no lo vuelve a pintar y la letra quedaría a la vista.
  input.value = texto

  // El cursor va justo después del mismo dígito en que estaba, aunque el formato agregue espacios.
  let cursor = 0
  for (let contados = 0; cursor < texto.length && contados < posicion; cursor++) {
    if (/[\d+]/.test(texto[cursor])) contados++
  }
  input.setSelectionRange(cursor, cursor)
}
</script>

<template>
  <div class="flex flex-col">
    <label :for="inputId" class="mb-1.5 text-small font-semibold text-ink">
      {{ label }}
      <span v-if="required" class="text-ink-muted" aria-hidden="true">*</span>
    </label>

    <div class="flex gap-2">
      <!-- Selector de país: un <select> nativo (teclado y lector de pantalla gratis) transparente
           sobre el código visible. Cerrado muestra solo "+58" para dejarle espacio al número;
           abierto, cada opción dice "Venezuela +58". Sin banderas: en Windows se ven como letras. -->
      <div
        class="relative flex h-[46px] shrink-0 items-center gap-1 rounded-md border border-line-strong bg-surface pr-2.5 pl-3 text-base text-ink tabular-nums transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25 hover:border-ink-muted"
        :class="disabled && 'bg-ground text-ink-muted'"
      >
        <span aria-hidden="true">+{{ codigoVisible }}</span>
        <ChevronDown class="size-4 text-ink-muted" aria-hidden="true" />
        <select
          :value="pais"
          :disabled="disabled"
          aria-label="País del teléfono"
          class="absolute inset-0 cursor-pointer text-base opacity-0 disabled:cursor-not-allowed"
          @change="elegirPais"
        >
          <optgroup label="Frecuentes">
            <option v-for="opcion in frecuentes" :key="opcion.pais" :value="opcion.pais">
              {{ opcion.nombre }} +{{ opcion.codigo }}
            </option>
          </optgroup>
          <optgroup v-if="otros.length" label="Todos los países">
            <option v-for="opcion in otros" :key="opcion.pais" :value="opcion.pais">
              {{ opcion.nombre }} +{{ opcion.codigo }}
            </option>
          </optgroup>
        </select>
      </div>

      <input
        v-bind="$attrs"
        :id="inputId"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :aria-invalid="hasError || undefined"
        :aria-describedby="message ? messageId : undefined"
        class="h-[46px] w-full min-w-0 rounded-md border bg-surface px-3.5 text-base text-ink tabular-nums transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-ink-muted focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-ground disabled:text-ink-muted"
        :class="
          hasError
            ? 'border-error focus:ring-2 focus:ring-error'
            : 'border-line-strong hover:border-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/25'
        "
        @input="onInput"
      />
    </div>

    <!-- Igual que en BaseInput: la región aria-live existe siempre para que se anuncien los cambios. -->
    <div aria-live="polite">
      <p
        v-if="message"
        :id="messageId"
        class="mt-1.5 flex items-start gap-1.5 text-small"
        :class="hasError ? 'text-error' : 'text-ink-muted'"
      >
        <CircleAlert v-if="hasError" class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ message }}
      </p>
    </div>
  </div>
</template>
