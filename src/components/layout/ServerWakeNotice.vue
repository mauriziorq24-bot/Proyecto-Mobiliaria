<script setup>
import { LoaderCircle } from 'lucide-vue-next'
import { useServerWaking } from '../../composables/useAsync'

// Aviso flotante cuando alguna carga lleva más de 5 s: casi siempre es el servidor de
// Render arrancando tras estar dormido. Uno solo para toda la app (vive en AppLayout).
const waking = useServerWaking()
</script>

<template>
  <!-- role="status" queda siempre en el DOM: los lectores de pantalla solo anuncian
       cambios dentro de una región que ya existía cuando apareció el texto. -->
  <div
    role="status"
    class="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+var(--altura-barra-inferior,0px))] z-40 flex justify-center"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="translate-y-2 opacity-0"
    >
      <p
        v-if="waking"
        class="flex max-w-md items-center gap-3 rounded-md bg-ink px-4 py-3 text-small text-white shadow-lg"
      >
        <LoaderCircle class="size-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Estamos despertando el servidor, esto puede tardar un momento…
      </p>
    </Transition>
  </div>
</template>
