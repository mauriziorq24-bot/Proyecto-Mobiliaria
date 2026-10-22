<script setup>
import { CircleCheck } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useToast } from '../../composables/useToast'

// Aviso breve que confirma una acción ("Cerraste sesión.", "Agregado a tu cotización").
// Uno solo para toda la app (vive en AppLayout); se muestra con useToast().show(texto) y se va solo.
const { toast, hide, pause, resume } = useToast()

const toneClasses = {
  neutral: 'bg-ink text-white',
  success: 'border border-success/30 bg-success-bg text-ink',
}
</script>

<template>
  <!-- role="status" (aria-live="polite") queda siempre en el DOM: los lectores de pantalla solo
       anuncian cambios dentro de una región que ya existía cuando apareció el texto.
       En móvil sube lo que mida la barra inferior (--bottom-bar-h) para no taparla. -->
  <div
    role="status"
    class="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+var(--bottom-bar-h,0px))] z-40 flex justify-center"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="translate-y-2 opacity-0"
    >
      <!-- Con enlace, el aviso recibe clics y no se va mientras se apunta o se enfoca -->
      <p
        v-if="toast.message"
        class="flex max-w-md items-center gap-3 rounded-md px-4 py-3 text-small shadow-lg"
        :class="[toneClasses[toast.tone], toast.action && 'pointer-events-auto']"
        @mouseenter="pause"
        @mouseleave="resume"
        @focusin="pause"
        @focusout="resume"
      >
        <CircleCheck
          class="size-5 shrink-0"
          :class="toast.tone === 'success' && 'text-success'"
          aria-hidden="true"
        />
        <span>{{ toast.message }}</span>
        <RouterLink
          v-if="toast.action"
          :to="toast.action.to"
          class="relative ml-1 shrink-0 font-semibold whitespace-nowrap underline underline-offset-4 before:absolute before:-inset-x-2 before:-inset-y-3"
          :class="toast.tone === 'success' ? 'text-success hover:text-ink' : 'text-white'"
          @click="hide"
        >
          {{ toast.action.label }}
        </RouterLink>
      </p>
    </Transition>
  </div>
</template>
