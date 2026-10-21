<script setup>
import { CircleAlert } from 'lucide-vue-next'
</script>

<template>
  <!-- Error de un envío (no de un campo): role="alert" lo anuncia apenas aparece. -->
  <p role="alert" class="flex items-start gap-2 rounded-md bg-error-bg px-3.5 py-3 text-small text-error">
    <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
    <span><slot /></span>
  </p>
</template>
