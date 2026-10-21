<script setup>
import { ChevronRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import CategorySilhouette from './CategorySilhouette.vue'

const props = defineProps({
  // Categoría de GET /api/v1/categorias: { id, nombre, slug, descripcion }
  categoria: { type: Object, required: true },
  // Foto opcional. Si existe, se muestra la foto; si no (o si falla), la silueta del mueble.
  imagenUrl: { type: String, default: null },
})

const imageFailed = ref(false)
watch(
  () => props.imagenUrl,
  () => {
    imageFailed.value = false
  },
)
const showImage = computed(() => Boolean(props.imagenUrl) && !imageFailed.value)
</script>

<template>
  <!--
    Móvil: fila (miniatura a la izquierda, texto a la derecha, flecha al final).
    Desde tablet: tarjeta vertical con la imagen arriba, en proporción 4:3.
    No hay botones dentro, así que la tarjeta entera puede ser el enlace.
  -->
  <RouterLink
    :to="`/categoria/${categoria.slug}`"
    class="group flex h-full items-center gap-4 overflow-hidden rounded-md border border-line bg-surface p-3 transition-colors duration-200 ease-out hover:border-ink/25 md:flex-col md:items-stretch md:gap-0 md:p-0"
  >
    <div
      class="relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-sm bg-ground md:aspect-[4/3] md:w-full md:rounded-none"
    >
      <img
        v-if="showImage"
        :src="imagenUrl"
        alt=""
        loading="lazy"
        decoding="async"
        class="size-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="flex size-full items-center justify-center text-ink-muted transition-colors duration-200 ease-out group-hover:text-brand-deep md:px-[8%]"
      >
        <CategorySilhouette :slug="categoria.slug" floor class="w-full" />
      </div>
    </div>

    <div class="min-w-0 flex-1 md:px-4 md:pt-3 md:pb-4">
      <h3 class="text-card-title">{{ categoria.nombre }}</h3>
      <!-- En tablet (5 columnas angostas) la descripción no cabe; vuelve en escritorio -->
      <p v-if="categoria.descripcion" class="mt-0.5 line-clamp-2 text-small text-ink-muted md:hidden lg:block">
        {{ categoria.descripcion }}
      </p>
    </div>

    <ChevronRight
      class="size-5 shrink-0 text-ink-muted transition-transform duration-200 ease-out group-hover:translate-x-0.5 md:hidden"
      aria-hidden="true"
    />
  </RouterLink>
</template>
