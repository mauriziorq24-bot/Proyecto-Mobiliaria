<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ShowroomVitrine from './ShowroomVitrine.vue'

const AUTOPLAY_MS = 5000

const props = defineProps({
  // Lista de { url, alt } (company.heroPhotos en src/config/empresa.js).
  photos: { type: Array, default: () => [] },
})

const root = ref(null)
const track = ref(null)
// Botones de los puntos por índice, para mover el foco con las flechas.
const dotButtons = []
const activeIndex = ref(0)
// Índices de las fotos que fallaron al cargar: ese paso muestra la ilustración.
const failed = ref(new Set())

// Si no carga ninguna (o no hay fotos), queda solo la ilustración: sin controles ni avance.
const allFailed = computed(() => failed.value.size >= props.photos.length)
const isMultiple = computed(() => !allFailed.value && props.photos.length > 1)

function onImageError(index) {
  if (failed.value.has(index)) return
  failed.value = new Set(failed.value).add(index)
}

// --- Navegación ---
// Igual que ProductGallery: el deslizamiento lo hace el navegador (scroll-snap) y aquí solo
// se lee en qué foto quedó. Cada foto mide el ancho del carril: scrollLeft / ancho = número de foto.
function onScroll() {
  const el = track.value
  if (!el || el.clientWidth === 0) return
  const index = Math.round(el.scrollLeft / el.clientWidth)
  activeIndex.value = Math.min(Math.max(index, 0), props.photos.length - 1)
}

// Da la vuelta: después de la última viene la primera, y antes de la primera, la última.
function goTo(index) {
  const el = track.value
  if (!el) return
  const count = props.photos.length
  const target = (index + count) % count
  activeIndex.value = target
  // El scroll "smooth" del navegador es la transición: desacelera al llegar (ease-out) y se
  // puede interrumpir con el dedo en cualquier momento. Con movimiento reducido, salta directo.
  el.scrollTo({ left: target * el.clientWidth, behavior: reduceMotion.value ? 'auto' : 'smooth' })
}

function onKeydown(event) {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
  if (!step) return
  // preventDefault evita que la flecha haga además el scroll nativo del carril.
  event.preventDefault()
  goTo(activeIndex.value + step)
}

// Con el foco en un punto, las flechas pasan al punto vecino. Al recibir el foco ese punto
// muestra su foto (@focus), así que el teclado cambia de foto sin pulsar Enter.
function onDotKeydown(event, index) {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
  if (!step) return
  event.preventDefault()
  const count = props.photos.length
  dotButtons[(index + step + count) % count]?.focus()
}

// --- Avance automático ---
// Cada motivo de pausa es un estado aparte: el carrusel solo avanza si no hay ninguno.
const reduceMotion = ref(false)
const hovered = ref(false)
const keyboardFocus = ref(false)
const touching = ref(false)
const pageHidden = ref(false)

const isRotating = computed(
  () =>
    isMultiple.value &&
    !reduceMotion.value &&
    !hovered.value &&
    !keyboardFocus.value &&
    !touching.value &&
    !pageHidden.value,
)

// Un temporizador por paso (no un setInterval): cada cambio de foto, también los manuales,
// reinicia la cuenta, así nunca salta a los 2 s de que la persona eligió una foto.
let timer = null
function schedule() {
  clearTimeout(timer)
  timer = isRotating.value ? setTimeout(() => goTo(activeIndex.value + 1), AUTOPLAY_MS) : null
}
watch([isRotating, activeIndex], schedule)

// Solo el mouse pausa al pasar por encima (en táctil, "hover" lo simula un toque).
function onPointerEnter(event) {
  if (event.pointerType === 'mouse') hovered.value = true
}
function onPointerLeave(event) {
  if (event.pointerType === 'mouse') hovered.value = false
}

// Pausa con el foco del teclado (:focus-visible), no con el clic en un punto.
function onFocusIn(event) {
  keyboardFocus.value = event.target.matches(':focus-visible')
}
function onFocusOut(event) {
  if (!root.value?.contains(event.relatedTarget)) keyboardFocus.value = false
}

function onVisibilityChange() {
  pageHidden.value = document.hidden
}

let motionQuery = null
function onMotionChange() {
  reduceMotion.value = motionQuery.matches
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  onMotionChange()
  motionQuery.addEventListener('change', onMotionChange)
  onVisibilityChange()
  document.addEventListener('visibilitychange', onVisibilityChange)
  schedule()
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  motionQuery?.removeEventListener('change', onMotionChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <!-- Ninguna foto disponible: solo la ilustración -->
  <ShowroomVitrine v-if="allFailed" />

  <div
    v-else
    ref="root"
    role="region"
    aria-roledescription="carrusel"
    aria-label="Fotos de nuestros muebles"
    class="relative size-full"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <!--
      Puntos de paginación. El contenedor deja pasar el dedo (pointer-events-none) para que
      deslizar sobre la foto funcione; solo la pastilla recibe toques.
    -->
    <div v-if="isMultiple" class="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
      <!-- Pastilla oscura translúcida: con el 50% los puntos blancos se ven incluso sobre una foto blanca -->
      <div class="pointer-events-auto flex items-center rounded-full bg-ink/50 px-1">
        <!--
          La foto activa es una barra más ancha (cambia la forma, no solo el color).
          El punto se ve pequeño, pero el botón mide 24 × 24 px para poder tocarlo.
          @focus: al llegar a un punto con Tab o con las flechas, se muestra su foto.
        -->
        <button
          v-for="(photo, index) in photos"
          :key="photo.url"
          :ref="(el) => (dotButtons[index] = el)"
          type="button"
          :aria-label="`Foto ${index + 1} de ${photos.length}`"
          :aria-current="index === activeIndex ? 'true' : undefined"
          class="flex h-6 min-w-6 items-center justify-center rounded-full"
          @click="goTo(index)"
          @focus="goTo(index)"
          @keydown="onDotKeydown($event, index)"
        >
          <span
            class="h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out"
            :class="index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/55'"
          />
        </button>
      </div>
    </div>

    <!--
      El carril: la misma técnica de ProductGallery. Una fila de fotos del 100% del ancho con
      scroll horizontal; snap-mandatory hace que al soltar el dedo siempre quede una foto entera.
      tabindex="0": con el foco en el carril, las flechas del teclado cambian de foto.
    -->
    <div
      ref="track"
      :tabindex="isMultiple ? 0 : undefined"
      class="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      @scroll.passive="onScroll"
      @keydown="onKeydown"
      @touchstart.passive="touching = true"
      @touchend="touching = false"
      @touchcancel="touching = false"
    >
      <div
        v-for="(photo, index) in photos"
        :key="photo.url"
        role="group"
        aria-roledescription="diapositiva"
        :aria-label="`${index + 1} de ${photos.length}`"
        class="size-full shrink-0 snap-center snap-always"
      >
        <ShowroomVitrine v-if="failed.has(index)" />
        <!-- width/height reservan la proporción; object-cover recorta sin deformar -->
        <img
          v-else
          :src="photo.url"
          :alt="photo.alt"
          :loading="index === 0 ? 'eager' : 'lazy'"
          :fetchpriority="index === 0 ? 'high' : undefined"
          decoding="async"
          width="1600"
          height="900"
          draggable="false"
          class="size-full object-cover object-center select-none"
          @error="onImageError(index)"
        />
      </div>
    </div>

    <!--
      Anuncio para lectores de pantalla. Mientras avanza solo, aria-live="off": no interrumpe cada
      5 s. Pausado (o con movimiento reducido), "polite" anuncia la foto que la persona eligió.
    -->
    <p v-if="isMultiple" class="sr-only" :aria-live="isRotating ? 'off' : 'polite'">
      Foto {{ activeIndex + 1 }} de {{ photos.length }}: {{ photos[activeIndex]?.alt }}
    </p>
  </div>
</template>
