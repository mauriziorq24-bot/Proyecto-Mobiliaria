<script setup>
import { RouterView } from 'vue-router'
import AppFooter from './AppFooter.vue'
import AppHeader from './AppHeader.vue'
import AppToast from './AppToast.vue'
import ServerWakeNotice from './ServerWakeNotice.vue'
</script>

<template>
  <!-- min-h-dvh + flex-1 en <main>: el footer queda abajo aunque la página tenga poco contenido -->
  <div class="flex min-h-dvh flex-col">
    <!-- Enlace oculto para teclado: salta el header y va directo al contenido -->
    <a
      href="#contenido"
      class="sr-only z-50 rounded-md bg-surface px-4 py-2 font-semibold text-brand-deep shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Saltar al contenido
    </a>

    <AppHeader />

    <main id="contenido" tabindex="-1" class="flex-1 focus:outline-none">
      <RouterView />
    </main>

    <AppFooter />

    <ServerWakeNotice />
    <AppToast />
  </div>
</template>
