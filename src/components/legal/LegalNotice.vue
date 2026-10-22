<script setup>
import { RouterLink } from 'vue-router'

// Línea "Al … aceptas los Términos y la Política de privacidad" bajo los botones que envían datos
// (DESIGN.md › Términos y privacidad). Sin casilla obligatoria: enviar ya es aceptar.
// Los enlaces abren otra pestaña para que la persona no pierda lo que escribió en el formulario.
// RouterLink con target="_blank" no navega en esta pestaña: deja que el navegador abra la nueva.
defineProps({
  // Lo que hace el botón: "crear tu cuenta", "enviar", "continuar con Google"…
  action: { type: String, required: true },
})

const link = 'underline underline-offset-2 hover:text-ink'
</script>

<template>
  <p class="text-small text-ink-muted">
    Al {{ action }} aceptas los
    <RouterLink :to="{ name: 'terms' }" target="_blank" rel="noopener" :class="link">Términos<span class="sr-only"> (se abre en otra pestaña)</span></RouterLink>
    y la
    <RouterLink :to="{ name: 'terms', hash: '#privacidad' }" target="_blank" rel="noopener" :class="link">Política de privacidad<span class="sr-only"> (se abre en otra pestaña)</span></RouterLink>.
  </p>
</template>
