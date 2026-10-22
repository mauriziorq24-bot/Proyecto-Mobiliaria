<script setup>
import { CircleOff, MessageCircle, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { favoritoNoDisponibleUrl } from '../../utils/whatsapp'
import BaseButton from '../ui/BaseButton.vue'

const PLACEHOLDER = '/placeholder-producto.svg'

// Un favorito que salió del catálogo (DESIGN.md › Favoritos). Se dibuja con la copia que guardó el
// store ({ nombre, categoriaNombre, imagen }): la ficha ya no existe, así que no enlaza a nada.
// Misma forma que ProductCard para que la grilla no cambie de ritmo.
const props = defineProps({
  // Item del store de favoritos con copia: { productoId, disponible: false, copia }.
  item: { type: Object, required: true },
})

const emit = defineEmits(['remove'])

const copia = computed(() => props.item.copia)

const imageFailed = ref(false)
const imageSrc = computed(() => (copia.value.imagen && !imageFailed.value ? copia.value.imagen : PLACEHOLDER))

function onImageError() {
  if (imageSrc.value !== PLACEHOLDER) imageFailed.value = true
}

const whatsappLink = computed(() => favoritoNoDisponibleUrl(copia.value.nombre))
</script>

<template>
  <article class="flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface">
    <div class="aspect-[4/5] overflow-hidden bg-ground">
      <img
        :src="imageSrc"
        alt=""
        loading="lazy"
        decoding="async"
        width="1080"
        height="1350"
        class="size-full object-cover object-center opacity-50 grayscale"
        @error="onImageError"
      />
    </div>

    <div class="flex flex-1 flex-col p-3 md:p-4">
      <p v-if="copia.categoriaNombre" class="truncate text-small text-ink-muted">{{ copia.categoriaNombre }}</p>
      <!-- tabindex -1: al deshacer un "Quitar", el foco vuelve aquí -->
      <h3
        :id="`favorito-nd-${item.productoId}`"
        tabindex="-1"
        class="mt-1 line-clamp-2 min-h-[2.7em] rounded-sm text-card-title text-ink-muted"
      >
        {{ copia.nombre }}
      </h3>

      <!-- No disponible: lo dice el texto, no solo lo atenuado (regla del estado por forma) -->
      <div class="mt-auto pt-3">
        <p class="flex items-start gap-1.5 text-small font-semibold text-warning">
          <CircleOff class="mt-px size-4 shrink-0" aria-hidden="true" />
          Ya no está disponible
        </p>

        <div class="mt-3 grid gap-2">
          <BaseButton
            variant="whatsapp"
            size="sm"
            block
            wrap
            :href="whatsappLink"
            target="_blank"
            rel="noopener"
            :aria-label="`Preguntar por WhatsApp por ${copia.nombre} (se abre en otra pestaña)`"
          >
            <template #icon-left><MessageCircle /></template>
            Preguntar por WhatsApp
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            block
            :aria-label="`Quitar ${copia.nombre} de favoritos`"
            @click="emit('remove')"
          >
            <template #icon-left><Trash2 /></template>
            Quitar
          </BaseButton>
        </div>
      </div>
    </div>
  </article>
</template>
