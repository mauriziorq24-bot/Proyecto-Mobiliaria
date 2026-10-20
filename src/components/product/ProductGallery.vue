<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const PLACEHOLDER = '/placeholder-producto.svg'

const props = defineProps({
  // URLs de las fotos (el campo "imagenes" del producto en API.md).
  imagenes: { type: Array, default: () => [] },
  // Nombre del producto: se usa en el texto alternativo de cada foto.
  nombre: { type: String, required: true },
})

const track = ref(null)
// Botones de miniatura por índice, para mover el foco con las flechas.
const thumbButtons = []
const activeIndex = ref(0)
// Índices de las fotos que fallaron al cargar: esas se dibujan con el placeholder.
const failed = ref(new Set())

// Sin fotos, la galería muestra una sola diapositiva con el placeholder.
const hasImages = computed(() => props.imagenes.length > 0)
const slides = computed(() => (hasImages.value ? props.imagenes : [PLACEHOLDER]))
const isMultiple = computed(() => slides.value.length > 1)

function srcFor(index) {
  return failed.value.has(index) ? PLACEHOLDER : slides.value[index]
}

function altFor(index) {
  if (!hasImages.value || failed.value.has(index)) return `${props.nombre} (foto no disponible)`
  return isMultiple.value ? `${props.nombre}, foto ${index + 1} de ${slides.value.length}` : props.nombre
}

function onImageError(index) {
  // Si el que falla es el propio placeholder, no se insiste (evita un bucle de errores).
  if (slides.value[index] === PLACEHOLDER || failed.value.has(index)) return
  failed.value = new Set(failed.value).add(index)
}

// Si cambian las fotos (otro producto), se vuelve a la primera y se reintentan las que fallaron.
watch(
  () => props.imagenes,
  () => {
    failed.value = new Set()
    activeIndex.value = 0
    if (track.value) track.value.scrollLeft = 0
  },
)

// El deslizamiento lo hace el navegador (scroll-snap). Aquí solo se lee en qué foto quedó:
// cada foto mide el ancho del carril, así que scrollLeft / ancho = número de foto.
function onScroll() {
  const el = track.value
  if (!el || el.clientWidth === 0) return
  const index = Math.round(el.scrollLeft / el.clientWidth)
  activeIndex.value = Math.min(Math.max(index, 0), slides.value.length - 1)
}

function goTo(index) {
  const el = track.value
  if (!el) return
  const target = Math.min(Math.max(index, 0), slides.value.length - 1)
  activeIndex.value = target
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollTo({ left: target * el.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' })
}

// Flechas izquierda/derecha cuando el foco está en la foto grande o en una miniatura.
function onKeydown(event) {
  if (!isMultiple.value) return
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
  if (!step) return
  // preventDefault evita que la flecha haga además el scroll nativo del carril.
  event.preventDefault()

  // Si el foco está en una miniatura, se avanza desde esa miniatura y el foco pasa a la nueva:
  // el teclado sigue a la foto.
  const focusedThumb = thumbButtons.indexOf(document.activeElement)
  goTo((focusedThumb === -1 ? activeIndex.value : focusedThumb) + step)
  if (focusedThumb !== -1) {
    nextTick(() => thumbButtons[activeIndex.value]?.focus())
  }
}
</script>

<template>
  <div role="region" aria-roledescription="galería" :aria-label="`Fotos de ${nombre}`" @keydown="onKeydown">
    <div class="relative">
      <!--
        El carril: una fila de fotos, cada una del 100% del ancho, con scroll horizontal.
        snap-x snap-mandatory: al soltar el dedo, el scroll siempre termina alineado a una foto.
        overscroll-x-contain: llegar al final no dispara el "atrás" del navegador en móvil.
        El scrollbar se oculta: en móvil se desliza con el dedo y en escritorio están las miniaturas.
      -->
      <div
        ref="track"
        :tabindex="isMultiple ? 0 : undefined"
        class="flex aspect-square overflow-hidden rounded-md border border-line bg-surface"
        :class="
          isMultiple &&
          'snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        "
        @scroll.passive="onScroll"
      >
        <div
          v-for="(_, index) in slides"
          :key="index"
          class="size-full shrink-0 snap-center snap-always"
          :role="isMultiple ? 'group' : undefined"
          :aria-label="isMultiple ? `${index + 1} de ${slides.length}` : undefined"
        >
          <!-- object-contain: en la ficha se ve el mueble completo, sin recortes -->
          <img
            :src="srcFor(index)"
            :alt="altFor(index)"
            :loading="index === 0 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : undefined"
            decoding="async"
            width="1080"
            height="1080"
            draggable="false"
            class="size-full object-contain select-none"
            @error="onImageError(index)"
          />
        </div>
      </div>

      <!--
        Puntos (solo móvil). La foto activa es una barra más ancha: el estado cambia de forma,
        no solo de color. Son indicadores, no botones: el gesto es deslizar.
      -->
      <div
        v-if="isMultiple"
        class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center md:hidden"
        aria-hidden="true"
      >
        <div class="flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1.5 shadow-sm">
          <span
            v-for="(_, index) in slides"
            :key="index"
            class="h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out"
            :class="index === activeIndex ? 'w-4 bg-ink' : 'w-1.5 bg-ink/30'"
          />
        </div>
      </div>
    </div>

    <!-- Anuncia el cambio a lectores de pantalla ("Foto 2 de 4") sin mostrar nada en pantalla -->
    <p v-if="isMultiple" class="sr-only" aria-live="polite">Foto {{ activeIndex + 1 }} de {{ slides.length }}</p>

    <!-- Miniaturas (desde tablet) -->
    <ul v-if="isMultiple" class="mt-3 hidden flex-wrap gap-2 md:flex" aria-label="Miniaturas">
      <li v-for="(_, index) in slides" :key="index">
        <button
          :ref="(el) => (thumbButtons[index] = el)"
          type="button"
          :aria-label="`Ver foto ${index + 1} de ${slides.length}`"
          :aria-current="index === activeIndex ? 'true' : undefined"
          class="block size-[72px] overflow-hidden rounded-md border bg-surface transition-[border-color,opacity] duration-200 ease-out"
          :class="
            index === activeIndex
              ? 'border-brand-deep ring-1 ring-brand-deep'
              : 'border-line opacity-70 hover:border-ink/25 hover:opacity-100'
          "
          @click="goTo(index)"
        >
          <img
            :src="srcFor(index)"
            alt=""
            loading="lazy"
            decoding="async"
            width="72"
            height="72"
            class="size-full object-contain"
            @error="onImageError(index)"
          />
        </button>
      </li>
    </ul>
  </div>
</template>
