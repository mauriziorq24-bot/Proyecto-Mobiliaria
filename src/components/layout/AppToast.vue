<script setup>
import { CircleCheck } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

// Aviso breve que confirma una acción ("Cerraste sesión."). Uno solo para toda la app
// (vive en AppLayout); se muestra con useToast().show(texto) y se va solo.
const { message } = useToast()
</script>

<template>
  <!-- role="status" queda siempre en el DOM: los lectores de pantalla solo anuncian
       cambios dentro de una región que ya existía cuando apareció el texto. -->
  <div role="status" class="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center">
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="translate-y-2 opacity-0"
    >
      <p
        v-if="message"
        class="flex max-w-md items-center gap-3 rounded-md bg-ink px-4 py-3 text-small text-white shadow-lg"
      >
        <CircleCheck class="size-5 shrink-0" aria-hidden="true" />
        {{ message }}
      </p>
    </Transition>
  </div>
</template>
