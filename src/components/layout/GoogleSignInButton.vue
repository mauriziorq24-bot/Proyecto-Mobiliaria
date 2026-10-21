<script setup>
import { onMounted, ref, useTemplateRef } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import { GOOGLE_CLIENT_ID, SHOW_MOCK_GOOGLE_BUTTON, renderGoogleButton } from '../../utils/googleSignIn'

// "Continuar con Google". Tres casos:
// - Con Client ID: el botón oficial de Google (lo dibuja su script dentro de un iframe).
// - Sin Client ID, con mocks y en desarrollo: un botón simulado para probar el flujo.
// - Si no: no se muestra nada (AuthLayout oculta también el separador).
const emit = defineEmits(['credential', 'unavailable'])

const container = useTemplateRef('container')
const loadingScript = ref(Boolean(GOOGLE_CLIENT_ID))

onMounted(async () => {
  if (!GOOGLE_CLIENT_ID) return
  try {
    await renderGoogleButton(container.value, (credential) => emit('credential', credential))
  } catch {
    // Script bloqueado (bloqueador de anuncios, sin conexión): se ocultan botón y separador.
    emit('unavailable')
  } finally {
    loadingScript.value = false
  }
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
