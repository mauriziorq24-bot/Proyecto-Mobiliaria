<script setup>
import { LoaderCircle } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from './components/layout/AppLayout.vue'
import ServerWakeNotice from './components/layout/ServerWakeNotice.vue'

// Las rutas del panel (meta.layout: 'admin') traen su propio layout, AdminLayout, como componente
// de la ruta padre /admin: así solo se descarga al entrar ahí. El resto de la app usa el de la tienda.
const route = useRoute()

// Al abrir /admin directamente, la primera navegación espera el perfil (el guard pregunta el rol a
// /auth/v1/me) y, con Render dormido, puede tardar. Mientras tanto no se dibuja la tienda vacía:
// solo este aviso. route.matched está vacío hasta que termina esa primera navegación.
const comprobandoAcceso = computed(() => !route.matched.length && window.location.pathname.startsWith('/admin'))
</script>

<template>
  <div v-if="comprobandoAcceso" class="flex min-h-dvh items-center justify-center bg-ground px-4">
    <p role="status" class="flex items-center gap-3 text-ink-muted">
      <LoaderCircle class="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Comprobando tu acceso…
    </p>
    <ServerWakeNotice />
  </div>
  <RouterView v-else-if="route.meta.layout === 'admin'" />
  <AppLayout v-else />
</template>
