<script setup>
import { RotateCw, TriangleAlert } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'

// Bloque de error para una sección que no pudo cargar sus datos, con botón para reintentar.
defineProps({
  title: { type: String, default: 'No pudimos cargar esta sección' },
  description: { type: String, default: 'Revisa tu conexión e inténtalo de nuevo.' },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <div role="alert" class="flex flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center">
    <TriangleAlert class="size-8 text-error" :stroke-width="1.75" aria-hidden="true" />
    <p class="mt-3 text-card-title">{{ title }}</p>
    <p class="mt-1 max-w-[45ch] text-small text-ink-muted">{{ description }}</p>
    <BaseButton variant="secondary" class="mt-5" @click="emit('retry')">
      <template #icon-left><RotateCw /></template>
      Reintentar
    </BaseButton>
  </div>
</template>
