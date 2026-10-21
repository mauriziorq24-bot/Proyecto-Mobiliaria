<script setup>
import { CalendarCheck, LogOut } from 'lucide-vue-next'
import { computed } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { useLogout } from '../composables/useLogout'
import { useAuthStore } from '../stores/auth'

// Versión mínima: se completa en la Fase 8.
// TODO: cuando exista GET /auth/v1/me (pendiente 5 de API.md), mostrar también el correo.
// Hoy el JWT solo trae el nombre de usuario, y no se pide nada a la API: por eso esta vista
// no tiene estados de carga, error ni vacío (la ruta exige sesión, así que siempre hay usuario).
const auth = useAuthStore()
const { logout } = useLogout()

const username = computed(() => auth.usuario?.username ?? '')
const initial = computed(() => [...username.value][0]?.toUpperCase() ?? '')
</script>

<template>
  <div class="mx-auto w-full max-w-md px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
    <!-- Igual que login y registro: en móvil sin tarjeta, desde sm una tarjeta plana con borde. -->
    <section aria-labelledby="profile-title" class="sm:rounded-md sm:border sm:border-line sm:bg-surface sm:p-8">
      <h1 id="profile-title" class="text-headline text-ink">Mi perfil</h1>

      <div class="mt-6 flex items-center gap-4">
        <span
          class="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-tint text-title text-brand-deep"
          aria-hidden="true"
        >
          {{ initial }}
        </span>
        <dl class="min-w-0">
          <dt class="text-small text-ink-muted">Nombre de usuario</dt>
          <dd class="truncate font-bold text-ink" :title="username">{{ username }}</dd>
        </dl>
      </div>

      <div class="mt-8 border-t border-line pt-6">
        <p class="text-ink-muted">Con tu cuenta puedes agendar visitas a nuestro showroom.</p>
        <BaseButton to="/agendar-cita" variant="visit" block class="mt-4">
          <template #icon-left><CalendarCheck /></template>
          Agendar visita
        </BaseButton>
      </div>

      <BaseButton variant="secondary" block class="mt-3" @click="logout">
        <template #icon-left><LogOut /></template>
        Cerrar sesión
      </BaseButton>
    </section>
  </div>
</template>
