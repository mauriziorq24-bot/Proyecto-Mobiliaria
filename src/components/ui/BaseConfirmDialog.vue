<script setup>
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import BaseButton from './BaseButton.vue'

// Pregunta de confirmación antes de algo que no se puede deshacer (p. ej. cancelar una cita).
// Usa un <dialog> nativo abierto con showModal(): el navegador deja inerte el resto de la página,
// mantiene el foco dentro y dispara "cancel" con Escape. role="alertdialog": interrumpe a propósito.
// En móvil aparece abajo, cerca del pulgar; desde sm, centrado.
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  confirmLabel: { type: String, required: true },
  cancelLabel: { type: String, default: 'Volver' },
  // danger para lo destructivo; primary para lo demás.
  confirmVariant: { type: String, default: 'danger' },
  // Mientras se envía: el botón muestra la carga y el diálogo no se puede cerrar.
  loading: { type: Boolean, default: false },
})

// confirm: eligió la acción. close: eligió no hacerla (botón, Escape o fondo). El padre cambia `open`.
const emit = defineEmits(['confirm', 'close'])

const titleId = useId()
const bodyId = useId()
const dialog = ref(null)
const cancelButton = ref(null)
// Quien abrió el diálogo: al cerrar, el foco vuelve ahí (si todavía existe en la página).
let opener = null

function lockScroll(locked) {
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => props.open,
  (isOpen) => {
    const el = dialog.value
    if (!el) return
    if (isOpen && !el.open) {
      opener = document.activeElement
      el.showModal()
      lockScroll(true)
      // El foco empieza en la opción segura: un Enter apurado no cancela nada.
      cancelButton.value?.$el?.focus()
    } else if (!isOpen && el.open) {
      el.close()
    }
  },
  { flush: 'post' },
)

function requestClose() {
  if (!props.loading) emit('close')
}

// Escape: el navegador cerraría el <dialog> solo. Se cancela para que decida el padre.
function onCancel(event) {
  event.preventDefault()
  requestClose()
}

// El clic en el fondo (::backdrop) llega con el <dialog> como target; el panel interior lo tapa.
function onClick(event) {
  if (event.target === dialog.value) requestClose()
}

function onNativeClose() {
  lockScroll(false)
  if (opener?.isConnected) opener.focus({ preventScroll: true })
  opener = null
  if (props.open) emit('close')
}

onBeforeUnmount(() => lockScroll(false))
</script>

<template>
  <!-- starting:: el panel entra subiendo 8px y apareciendo (200ms ease-out); al salir, se va sin animar. -->
  <dialog
    ref="dialog"
    role="alertdialog"
    :aria-labelledby="titleId"
    :aria-describedby="bodyId"
    class="w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/40 max-sm:mx-0 max-sm:mt-auto max-sm:mb-0 sm:m-auto sm:max-w-md"
    @cancel="onCancel"
    @click="onClick"
    @close="onNativeClose"
  >
    <div
      class="rounded-t-lg bg-surface px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none sm:rounded-lg sm:p-6 starting:translate-y-2 starting:opacity-0"
    >
      <h2 :id="titleId" class="text-title text-balance text-ink">{{ title }}</h2>
      <div :id="bodyId" class="mt-2 text-ink-muted">
        <slot />
      </div>
      <slot name="error" />

      <!-- En móvil, la acción queda abajo, más cerca del pulgar; desde sm, a la derecha -->
      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BaseButton ref="cancelButton" variant="secondary" :disabled="loading" @click="requestClose">
          {{ cancelLabel }}
        </BaseButton>
        <BaseButton :variant="confirmVariant" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </div>
  </dialog>
</template>
