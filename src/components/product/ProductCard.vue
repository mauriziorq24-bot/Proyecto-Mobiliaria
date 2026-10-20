<script setup>
import { Heart } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { formatearPrecio } from '../../utils/formato'
import BaseBadge from '../ui/BaseBadge.vue'

const PLACEHOLDER = '/placeholder-producto.svg'

const props = defineProps({
  // ProductoResponse de API.md, con sus campos en español tal cual.
  producto: { type: Object, required: true },
  // Solo visual por ahora: el estado real vendrá del store de favoritos.
  favorito: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-favorito'])

// Si la foto falla al cargar, se cambia por el placeholder.
const imageFailed = ref(false)
// Si cambia el producto (p. ej. al filtrar la grilla), se vuelve a intentar con su foto.
watch(
  () => props.producto.imagenes?.[0],
  () => {
    imageFailed.value = false
  },
)

const imageSrc = computed(() => {
  const first = props.producto.imagenes?.[0]
  return first && !imageFailed.value ? first : PLACEHOLDER
})

const hasPrice = computed(() => props.producto.precioReferencialUsd != null)

function onImageError() {
  // Si el que falla es el propio placeholder, no se insiste (evita un bucle de errores).
  if (imageSrc.value !== PLACEHOLDER) imageFailed.value = true
}
</script>

<template>
  <!--
    Toda la tarjeta enlaza al producto con el patrón "enlace estirado":
    el <a> va en el nombre y su ::after cubre la tarjeta entera.
    Así el botón de favorito puede vivir dentro sin anidar un botón dentro de un enlace
    (HTML inválido y confuso para lectores de pantalla).
  -->
  <article
    class="group relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors duration-200 ease-out hover:border-ink/25 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand"
  >
    <div class="relative aspect-square overflow-hidden bg-ground">
      <img
        :src="imageSrc"
        :alt="producto.nombre"
        loading="lazy"
        decoding="async"
        width="800"
        height="800"
        class="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        @error="onImageError"
      />
      <BaseBadge v-if="producto.enShowroom" variant="showroom" class="absolute top-2 right-2">
        En showroom
      </BaseBadge>
    </div>

    <div class="flex flex-1 flex-col p-3 md:p-4">
      <p class="truncate text-small text-ink-muted">{{ producto.categoriaNombre }}</p>
      <h3 class="mt-1 text-card-title">
        <RouterLink
          :to="{ name: 'product', params: { id: producto.id } }"
          class="line-clamp-2 min-h-[2.7em] outline-none after:absolute after:inset-0 after:content-['']"
        >
          {{ producto.nombre }}
        </RouterLink>
      </h3>

      <!-- mt-auto empuja el precio al fondo: en una fila, todos los precios quedan alineados -->
      <div class="mt-auto flex items-end justify-between gap-1 pt-3">
        <p class="min-w-0">
          <template v-if="hasPrice">
            <span class="block text-small text-ink-muted">Precio referencial</span>
            <span class="block text-price tabular-nums">
              {{ formatearPrecio(producto.precioReferencialUsd) }}
            </span>
          </template>
          <span v-else class="block text-small text-ink-muted">Consultar precio</span>
        </p>

        <!--
          relative z-10 lo pone por encima del enlace estirado.
          size-11 = 44px de área táctil; el ícono se ve de 20px.
          -mr-2 -mb-2 compensa el área extra para que el ícono quede alineado al borde del texto.
        -->
        <button
          type="button"
          class="relative z-10 -mr-2 -mb-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-[color,background-color,transform] duration-200 ease-out hover:bg-brand-tint hover:text-brand-deep active:scale-[0.9]"
          :class="favorito ? 'text-brand-deep' : 'text-ink-muted'"
          :aria-pressed="favorito"
          :aria-label="favorito ? `Quitar ${producto.nombre} de favoritos` : `Guardar ${producto.nombre} en favoritos`"
          @click="emit('toggle-favorito', producto)"
        >
          <Heart class="size-5" :fill="favorito ? 'currentColor' : 'none'" :stroke-width="1.75" aria-hidden="true" />
        </button>
      </div>
    </div>
  </article>
</template>
