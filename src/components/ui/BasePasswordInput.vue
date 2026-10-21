<script setup>
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'
import BaseInput from './BaseInput.vue'

// BaseInput de contraseña con un botón para mostrarla. Reemplaza al campo "Repetir contraseña":
// quien duda de lo que escribió, lo mira.
// Todo lo que reciba (v-model, label, hint, error, autocomplete…) pasa tal cual a BaseInput:
// con un solo elemento raíz, Vue reenvía los atributos solo (fallthrough).
const visible = ref(false)
</script>

<template>
  <BaseInput :type="visible ? 'text' : 'password'">
    <template #trailing>
      <!-- 44×44: área táctil mínima. aria-pressed dice si la contraseña está visible. -->
      <button
        type="button"
        class="flex size-11 items-center justify-center rounded-md text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand"
        :aria-pressed="visible"
        aria-label="Mostrar contraseña"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" class="size-5" aria-hidden="true" />
        <Eye v-else class="size-5" aria-hidden="true" />
      </button>
    </template>
  </BaseInput>
</template>
