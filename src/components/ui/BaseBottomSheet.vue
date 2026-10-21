<script setup>
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import BaseIconButton from './BaseIconButton.vue'

// Panel inferior (bottom sheet) sobre un <dialog> nativo abierto con showModal().
// El navegador ya da lo difícil: el foco no sale del panel (el resto de la página queda
// inerte), Escape dispara "cancel" y al cerrar el foco vuelve a donde estaba.
// Aquí se agregan: cerrar tocando el fondo, bloquear el scroll de la página y la animación.
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  closeLabel: { type: String, default: 'Cerrar' },
})

// close: la persona pidió cerrar (X, Escape o fondo). El padre decide y cambia `open`.
const emit = defineEmits(['close'])

const titleId = useId()
const dialog = ref(null)
const sheet = ref(null)
// shown: estado visual (posición del panel). Va separado de `open` porque el <dialog>
// tiene que abrirse antes de que empiece la animación y cerrarse cuando termina.
const shown = ref(false)

// Duraciones (DESIGN.md: ~200ms ease-out). Entrar dura un poco más que salir:
// lo que aparece se acompaña con la vista; lo que se va no debe hacer esperar.
const ENTER_MS = 240
const EXIT_MS = 180
let closeTimer = null
// El botón que abrió el panel: al cerrar, el foco vuelve a él. Los navegadores
// modernos ya lo hacen con <dialog>, pero no todos ni en todos los casos.
let opener = null

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function lockScroll(locked) {
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

function show() {
  // Si se vuelve a abrir mientras se cerraba, se cancela el cierre y el panel sube
  // desde donde esté: las transiciones CSS se pueden interrumpir sin saltos.
  clearTimeout(closeTimer)
  if (!dialog.value.open) {
    opener = document.activeElement
    dialog.value.showModal()
  }
  lockScroll(true)
  // Leer el estilo obliga al navegador a calcular la posición inicial (abajo, fuera de la
  // pantalla) antes de cambiarla; sin esto el panel aparecería de golpe, sin subir.
  getComputedStyle(sheet.value).transform
  shown.value = true
}

function hide() {
  shown.value = false
  clearTimeout(closeTimer)
  closeTimer = setTimeout(finishClose, reducedMotion() ? 0 : EXIT_MS)
}

function finishClose() {
  if (dialog.value?.open) dialog.value.close()
  lockScroll(false)
  // preventScroll: devolver el foco no debe mover la página.
  if (opener?.isConnected) opener.focus({ preventScroll: true })
  opener = null
}

watch(
  () => props.open,
  (isOpen) => (isOpen ? show() : hide()),
  { flush: 'post' },
)

// Escape: el navegador cerraría el <dialog> de golpe. Se cancela para animar la salida.
function onCancel(event) {
  event.preventDefault()
  emit('close')
}

// Si el navegador lo cierra igual (p. ej. Escape dos veces seguidas en Chrome), se sincroniza.
function onNativeClose() {
  shown.value = false
  lockScroll(false)
  if (props.open) emit('close')
}

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  lockScroll(false)
})
</script>

<template>
  <!-- El <dialog> ocupa toda la pantalla y es transparente: dentro van el fondo y el panel.
       Sin clases de display: un <dialog> cerrado debe seguir con display:none. -->
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
    @cancel="onCancel"
    @close="onNativeClose"
  >
    <!-- Fondo: se oscurece. Tocarlo cierra. -->
    <div
      class="fixed inset-0 bg-ink/40 transition-opacity ease-out"
      :class="shown ? 'opacity-100' : 'opacity-0'"
      :style="{ transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms` }"
      aria-hidden="true"
      @click="emit('close')"
    />

    <!-- Panel: sube desde abajo con curva de drawer (arranca rápido y frena suave).
         Solo se anima transform: no recalcula el layout, va fluido en teléfonos modestos. -->
    <div
      ref="sheet"
      class="fixed inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full flex-col rounded-t-lg bg-surface shadow-lg transition-transform ease-[cubic-bezier(0.32,0.72,0,1)] sm:max-w-lg"
      :class="shown ? 'translate-y-0' : 'translate-y-full'"
      :style="{ transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms` }"
    >
      <div class="flex h-16 shrink-0 items-center gap-2 border-b border-line pr-2.5 pl-5">
        <h2 :id="titleId" class="flex-1 text-title">{{ title }}</h2>
        <slot name="actions" />
        <!-- autofocus: al abrir, el foco va a cerrar (no a "Limpiar", que borraría sin querer) -->
        <BaseIconButton :icon="X" :label="closeLabel" autofocus @click="emit('close')" />
      </div>

      <div class="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
        <slot />
      </div>

      <div
        v-if="$slots.footer"
        class="shrink-0 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <slot name="footer" />
      </div>
    </div>
  </dialog>
</template>
