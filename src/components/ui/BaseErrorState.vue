<script setup>
import { RotateCw, TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import { loadErrorMessage } from '../../services/errorMessages'
import BaseButton from './BaseButton.vue'

// Bloque de error para una sección que no pudo cargar sus datos, con botón para reintentar.
const props = defineProps({
  title: { type: String, default: 'No pudimos cargar esta sección' },
  // El error que se capturó: decide el texto (sin conexión o falla del servidor).
  error: { type: [Error, Object], default: null },
  // Qué no cargó, para el texto de falla del servidor: "este producto", "las categorías"…
  subject: { type: String, default: 'esta sección' },
  // Texto fijo, solo si una vista necesita otro distinto a los de errorMessages.js.
  description: { type: String, default: '' },
})

const message = computed(() => props.description || loadErrorMessage(props.error, props.subject))

const emit = defineEmits(['retry'])
</script>

<template>
  <div role="alert" class="flex flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center">
    <TriangleAlert class="size-8 text-error" :stroke-width="1.75" aria-hidden="true" />
    <p class="mt-3 text-card-title">{{ title }}</p>
    <p class="mt-1 max-w-[45ch] text-small text-ink-muted">{{ message }}</p>
    <BaseButton variant="secondary" class="mt-5" @click="emit('retry')">
      <template #icon-left><RotateCw /></template>
      Reintentar
    </BaseButton>
  </div>
</template>
