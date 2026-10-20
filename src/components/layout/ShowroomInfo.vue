<script setup>
import { Clock, MapPin } from 'lucide-vue-next'
import { company } from '../../config/empresa'

// Dirección y horario del showroom, leídos de config/empresa.js (nunca escritos en la vista).
const { showroom } = company
</script>

<template>
  <!-- Fila flexible: cada dato toma su ancho natural y pasa abajo solo si no cabe -->
  <dl class="flex flex-col gap-4 text-small sm:flex-row sm:flex-wrap sm:gap-x-10">
    <div class="flex gap-2.5">
      <MapPin class="mt-px size-[18px] shrink-0 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <div>
        <dt class="font-semibold text-ink">Showroom</dt>
        <dd class="text-ink-muted">{{ showroom.address }}</dd>
        <dd v-if="showroom.mapsUrl" class="mt-1">
          <a :href="showroom.mapsUrl" target="_blank" rel="noopener" class="font-semibold text-brand-deep underline">
            Cómo llegar
          </a>
        </dd>
      </div>
    </div>
    <div class="flex gap-2.5">
      <Clock class="mt-px size-[18px] shrink-0 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <div>
        <dt class="font-semibold text-ink">Horario</dt>
        <dd v-for="item in showroom.schedule" :key="item.days" class="text-ink-muted">
          {{ item.days }}: <span class="whitespace-nowrap">{{ item.hours }}</span>
        </dd>
      </div>
    </div>
  </dl>
</template>
