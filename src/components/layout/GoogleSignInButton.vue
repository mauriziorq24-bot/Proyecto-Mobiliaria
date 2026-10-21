<script setup>
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import { GOOGLE_CLIENT_ID, SHOW_MOCK_GOOGLE_BUTTON, renderGoogleButton } from '../../utils/googleSignIn'

// "Continuar con Google". Tres casos:
// - Con Client ID: el botón oficial de Google (lo dibuja su script dentro de un iframe).
// - Sin Client ID, con mocks y en desarrollo: un botón simulado para probar el flujo.
// - Si no: no se muestra nada (AuthLayout oculta también el separador).
const emit = defineEmits(['credential', 'unavailable'])

const container = useTemplateRef('container')
const loadingScript = ref(Boolean(GOOGLE_CLIENT_ID))

function render() {
  return renderGoogleButton(container.value, (credential) => emit('credential', credential))
}

// Google pide el ancho en píxeles al dibujar el botón: si el espacio cambia (girar el teléfono,
// redimensionar la ventana) se vuelve a dibujar. Espera 150 ms a que el cambio termine.
let resizeObserver = null
let resizeTimer = null
let renderedWidth = 0

function watchWidth() {
  renderedWidth = container.value.clientWidth
  resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const width = container.value?.clientWidth ?? 0
      if (width && width !== renderedWidth) {
        renderedWidth = width
        render().catch(() => {}) // el script ya cargó: si falla, queda el botón anterior
      }
    }, 150)
  })
  resizeObserver.observe(container.value)
}

onMounted(async () => {
  if (!GOOGLE_CLIENT_ID) return
  try {
    await render()
    watchWidth()
  } catch {
    // Script bloqueado (bloqueador de anuncios, sin conexión): se ocultan botón y separador.
    emit('unavailable')
  } finally {
    loadingScript.value = false
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  clearTimeout(resizeTimer)
})
</script>

<template>
  <!-- h-11: el botón "large" de Google mide 44px. El alto queda reservado mientras carga el script. -->
  <div v-if="GOOGLE_CLIENT_ID" class="relative h-11">
    <!-- Este div lo llena el script de Google: Vue no debe poner nada adentro. -->
    <div ref="container" class="flex h-full justify-center" />
    <div
      v-if="loadingScript"
      class="absolute inset-0 animate-pulse rounded-md border border-line bg-surface motion-reduce:animate-none"
      aria-hidden="true"
    />
  </div>

  <BaseButton
    v-else-if="SHOW_MOCK_GOOGLE_BUTTON"
    variant="secondary"
    block
    @click="emit('credential', 'id-token-simulado')"
  >
    Continuar con Google (simulado)
  </BaseButton>
</template>
