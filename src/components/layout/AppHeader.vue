<script setup>
import { CalendarCheck, Heart, LayoutGrid, Menu, RotateCw, Search, ShoppingCart } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import logoUrl from '../../assets/logo.png'
import { useCategorias } from '../../composables/useCategorias'
import { useDebounce } from '../../composables/useDebounce'
import { company } from '../../config/empresa'
import { useCotizacionStore } from '../../stores/cotizacion'
import { useFavoritosStore } from '../../stores/favoritos'
import BaseButton from '../ui/BaseButton.vue'
import BaseIconButton from '../ui/BaseIconButton.vue'
import BaseInput from '../ui/BaseInput.vue'
import AccountMenu from './AccountMenu.vue'
import AppMobileMenu from './AppMobileMenu.vue'

const route = useRoute()
const router = useRouter()
const { categorias, loading, error, retry } = useCategorias()

// Favoritos: cuántos productos guardados (los que ya no están en el catálogo no cuentan).
// Con 0, el contador se oculta.
const favoritos = useFavoritosStore()
const favoritosLabel = computed(() => {
  const n = favoritos.cantidad
  return `Ver favoritos, ${n} ${n === 1 ? 'producto guardado' : 'productos guardados'}`
})

// Cotización: unidades en total (2 sillas + 1 escritorio = 3). Con 0, el contador se oculta.
const cotizacion = useCotizacionStore()
const cotizacionLabel = computed(() => {
  const n = cotizacion.totalUnidades
  return `Mi cotización, ${n} ${n === 1 ? 'producto' : 'productos'}`
})

function isActiveCategory(slug) {
  return route.name === 'category' && route.params.slug === slug
}

// En móvil, si la categoría activa queda fuera de la fila de chips, se desplaza hasta verla.
// 'nearest' mueve la fila solo lo justo: si el chip ya se ve, no la toca
// (con 'center' el chip dorado "Agendar visita" quedaba cortado a la izquierda).
const chipList = ref(null)
watch(
  [() => route.params.slug, loading],
  async () => {
    await nextTick()
    chipList.value?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
  { immediate: true },
)

// --- Buscador ---
// "  silla   malla " → "silla malla": la misma limpieza que hace useFiltrosUrl con ?q=.
function cleanQuery(text) {
  return text.trim().replace(/\s+/g, ' ')
}

// Si ya estamos en /buscar?q=..., el campo muestra lo que se buscó; en otras páginas queda vacío
// (aunque su URL traiga un ?q= que no es una búsqueda).
// Solo se reescribe si de verdad cambió: si no, al escribir "silla " (con el espacio
// para seguir con "malla") la URL limpia queda "silla" y el campo se comería el espacio.
const query = ref('')
watch(
  () => (route.name === 'search' ? route.query.q : ''),
  (q) => {
    const fromUrl = typeof q === 'string' ? q : ''
    if (cleanQuery(query.value) !== cleanQuery(fromUrl)) query.value = fromUrl
  },
  { immediate: true },
)

const onSearchPage = () => route.name === 'search'

// En /buscar los resultados se actualizan mientras se escribe: 300 ms después de la
// última tecla se cambia ?q= con replace (no llena el historial) y se conservan los filtros.
function replaceSearchQuery(text) {
  const q = cleanQuery(text)
  if (q === (route.query.q ?? '')) return
  router.replace({ query: { ...route.query, q: q || undefined } })
}

const debouncedQuery = useDebounce(query, 300)
watch(debouncedQuery, (text) => {
  if (onSearchPage()) replaceSearchQuery(text)
})

function submitSearch(event) {
  if (onSearchPage()) {
    // En /buscar, Enter aplica el texto al momento, sin esperar el debounce ni perder los filtros.
    replaceSearchQuery(query.value)
  } else {
    // Desde otra página es una búsqueda nueva: push, para que "Atrás" vuelva a donde estaba.
    // Con el campo vacío va a /buscar sin ?q=, que muestra todo el catálogo.
    const q = cleanQuery(query.value)
    router.push({ name: 'search', query: q ? { q } : {} })
  }
  // En el teléfono, quitar el foco cierra el teclado y deja ver los resultados.
  event.target.querySelector('input')?.blur()
}

// --- Altura de la franja fija ---
// La barra "Filtros" de /buscar y su barra lateral se pegan justo debajo del header.
// La altura cambia entre móvil (buscador en su propia fila) y escritorio, así que se mide
// y se publica como variable CSS para usarla con top-(--header-h).
// En pantallas bajas (variante `short` de style.css) la franja deja de ser fija:
// entonces no tapa nada y la variable vale 0.
const SHORT_VIEWPORT = '(max-height: 32em)'
const stickyBar = ref(null)
let resizeObserver = null
let shortViewport = null

function publishHeaderHeight() {
  const height = shortViewport.matches ? 0 : stickyBar.value.offsetHeight
  document.documentElement.style.setProperty('--header-h', `${height}px`)
}

// --- Sombra al hacer scroll (La regla de lo que flota) ---
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 4
}

// --- Panel "Todas" las categorías ---
const allOpen = ref(false)
const allWrapper = ref(null)

function onPointerDown(event) {
  if (allOpen.value && !allWrapper.value?.contains(event.target)) allOpen.value = false
}
function onKeydown(event) {
  if (event.key === 'Escape' && allOpen.value) {
    allOpen.value = false
    allWrapper.value?.querySelector('button')?.focus()
  }
}

// --- Menú móvil ---
const menuOpen = ref(false)
const menuButton = ref(null)

async function closeMenu() {
  menuOpen.value = false
  // Al cerrar, el foco vuelve al botón que abrió el menú.
  await nextTick()
  menuButton.value?.$el?.focus()
}

// Al cambiar de página se cierra cualquier panel abierto.
watch(
  () => route.fullPath,
  () => {
    allOpen.value = false
    menuOpen.value = false
  },
)

onMounted(() => {
  shortViewport = window.matchMedia(SHORT_VIEWPORT)
  shortViewport.addEventListener('change', publishHeaderHeight)
  resizeObserver = new ResizeObserver(publishHeaderHeight)
  resizeObserver.observe(stickyBar.value)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  shortViewport?.removeEventListener('change', publishHeaderHeight)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})

const hideScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
</script>

<template>
  <!-- display: contents: el <header> no genera caja propia. Un elemento sticky solo se queda
       fijo dentro de su contenedor; si el contenedor fuera el <header> (que mide lo mismo que
       su contenido), la franja azul se iría con la página. Así su contenedor es todo el layout. -->
  <header class="contents">
    <!-- Franja azul: fija arriba (salvo en pantallas bajas). En móvil incluye el buscador en una segunda fila. -->
    <div
      ref="stickyBar"
      class="sticky top-0 z-40 bg-brand transition-shadow duration-200 ease-out short:static"
      :class="scrolled && 'shadow-sm'"
    >
      <div
        class="container-page flex flex-wrap items-center gap-x-2 gap-y-2.5 pt-2 pb-3 md:h-[72px] md:flex-nowrap md:gap-x-6 md:py-0"
      >
        <RouterLink
          to="/"
          class="order-1 -ml-1 flex shrink-0 items-center gap-2.5 rounded-md p-1 focus-visible:outline-white"
          aria-label="Mobiliario de Oficina, ir al inicio"
        >
          <img :src="logoUrl" alt="" width="40" height="40" class="size-10 rounded-md" />
          <span class="text-wordmark text-white">
            Mobiliario<br />de Oficina
          </span>
        </RouterLink>

        <!-- Buscador: en móvil ocupa su propia fila (order-3), en tablet/escritorio va al centro -->
        <form
          role="search"
          class="order-3 w-full rounded-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white md:order-2 md:max-w-2xl md:flex-1"
          @submit.prevent="submitSearch"
        >
          <BaseInput
            v-model="query"
            type="search"
            label="Buscar productos"
            hide-label
            placeholder="Buscar sillas, escritorios, mesas…"
            enterkeyhint="search"
            autocomplete="off"
          >
            <template #leading><Search /></template>
          </BaseInput>
        </form>

        <div class="order-2 ml-auto flex items-center gap-1 md:order-3 md:ml-0 lg:gap-2">
          <!-- Anillo de foco blanco: el Azul Silla por defecto no se vería sobre el header azul -->
          <BaseButton variant="visit" to="/agendar-cita" class="mr-2 focus-visible:outline-white max-lg:hidden">
            <template #icon-left><CalendarCheck /></template>
            Agendar visita
          </BaseButton>
          <!-- Cuenta: en móvil y tablet va en el menú lateral -->
          <AccountMenu class="max-lg:hidden" />
          <BaseIconButton
            :icon="Heart"
            label="Ver favoritos"
            variant="inverse"
            to="/favoritos"
            :badge="favoritos.cantidad"
            :badge-label="favoritosLabel"
          />
          <BaseIconButton
            :icon="ShoppingCart"
            label="Mi cotización"
            variant="inverse"
            to="/carrito"
            :badge="cotizacion.totalUnidades"
            :badge-label="cotizacionLabel"
          />
          <BaseIconButton
            ref="menuButton"
            :icon="Menu"
            label="Abrir menú"
            variant="inverse"
            class="-mr-1.5 lg:hidden"
            aria-haspopup="dialog"
            :aria-expanded="menuOpen"
            @click="menuOpen = true"
          />
        </div>
      </div>
    </div>

    <!-- Móvil: chips con scroll horizontal. "Agendar visita" siempre es el primero. -->
    <nav aria-label="Categorías" class="border-b border-line bg-surface md:hidden">
      <ul ref="chipList" :class="hideScrollbar" class="flex scroll-px-4 gap-2 overflow-x-auto px-4 py-2.5">
        <li class="shrink-0">
          <RouterLink
            to="/agendar-cita"
            class="relative inline-flex items-center gap-1.5 rounded-sm bg-showroom-gold px-3 py-1.5 text-small font-semibold text-ink before:absolute before:inset-x-0 before:-inset-y-1.5"
          >
            <CalendarCheck class="size-4" aria-hidden="true" />
            Agendar visita
          </RouterLink>
        </li>

        <template v-if="loading">
          <li v-for="n in 3" :key="n" class="h-[34px] w-28 shrink-0 animate-pulse rounded-sm bg-ground" />
        </template>
        <li v-else-if="error" class="shrink-0">
          <button
            type="button"
            class="relative inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-small font-semibold text-ink-muted before:absolute before:inset-x-0 before:-inset-y-1.5"
            @click="retry"
          >
            <RotateCw class="size-4" aria-hidden="true" />
            Reintentar categorías
          </button>
        </li>
        <template v-else>
          <li v-for="categoria in categorias" :key="categoria.id" class="shrink-0">
            <RouterLink
              :to="`/categoria/${categoria.slug}`"
              class="relative inline-flex rounded-sm border px-3 py-1.5 text-small font-semibold whitespace-nowrap transition-colors duration-200 ease-out before:absolute before:inset-x-0 before:-inset-y-1.5"
              :class="
                isActiveCategory(categoria.slug)
                  ? 'border-brand-deep bg-brand-tint text-brand-deep'
                  : 'border-line bg-surface text-ink-muted'
              "
              :aria-current="isActiveCategory(categoria.slug) ? 'page' : undefined"
            >
              {{ categoria.nombre }}
            </RouterLink>
          </li>
        </template>
      </ul>
    </nav>

    <!-- Tablet y escritorio: barra blanca de categorías -->
    <nav aria-label="Categorías" class="hidden border-b border-line bg-surface md:block">
      <div class="container-page flex h-12 items-center gap-2">
        <div ref="allWrapper" class="relative h-full shrink-0">
          <button
            type="button"
            class="-ml-3 inline-flex h-full items-center gap-2 rounded-sm px-3 text-small font-semibold text-ink transition-colors duration-200 ease-out hover:text-brand-deep"
            :aria-expanded="allOpen"
            aria-controls="all-categories-panel"
            @click="allOpen = !allOpen"
          >
            <LayoutGrid class="size-[18px]" :stroke-width="1.75" aria-hidden="true" />
            Todas
          </button>

          <Transition
            enter-active-class="transition-[opacity,transform] duration-200 ease-out"
            enter-from-class="opacity-0 scale-[0.97] -translate-y-1"
            leave-active-class="transition-[opacity,transform] duration-150 ease-out"
            leave-to-class="opacity-0 scale-[0.98]"
          >
            <div
              v-if="allOpen"
              id="all-categories-panel"
              class="absolute top-[calc(100%+6px)] -left-3 z-30 w-[min(36rem,calc(100vw-3rem))] origin-top-left rounded-lg bg-surface p-2 shadow-lg"
            >
              <p v-if="loading" class="px-3 py-2.5 text-small text-ink-muted">Cargando categorías…</p>
              <div v-else-if="error" class="flex items-center justify-between gap-4 px-3 py-2.5">
                <p class="text-small text-ink-muted">No se pudieron cargar las categorías.</p>
                <BaseButton variant="ghost" size="sm" @click="retry">Reintentar</BaseButton>
              </div>
              <p v-else-if="!categorias.length" class="px-3 py-2.5 text-small text-ink-muted">
                Todavía no hay categorías publicadas.
              </p>
              <ul v-else class="grid gap-0.5 sm:grid-cols-2">
                <li v-for="categoria in categorias" :key="categoria.id">
                  <RouterLink
                    :to="`/categoria/${categoria.slug}`"
                    class="block rounded-md px-3 py-2.5 transition-colors duration-200 ease-out hover:bg-ground"
                    :aria-current="isActiveCategory(categoria.slug) ? 'page' : undefined"
                  >
                    <span class="block font-semibold text-ink">{{ categoria.nombre }}</span>
                    <span v-if="categoria.descripcion" class="mt-0.5 block text-small text-ink-muted">
                      {{ categoria.descripcion }}
                    </span>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </Transition>
        </div>

        <span class="h-5 w-px shrink-0 bg-line" aria-hidden="true" />

        <ul v-if="loading" class="flex flex-1 gap-6 px-3" aria-hidden="true">
          <li v-for="n in 4" :key="n" class="h-3.5 w-24 animate-pulse rounded-sm bg-ground" />
        </ul>
        <p v-else-if="error" class="flex-1 px-3 text-small text-ink-muted">
          No se pudieron cargar las categorías.
          <button type="button" class="font-semibold text-brand-deep underline" @click="retry">Reintentar</button>
        </p>
        <ul v-else :class="hideScrollbar" class="flex h-full min-w-0 flex-1 overflow-x-auto">
          <li v-for="categoria in categorias" :key="categoria.id" class="h-full shrink-0">
            <RouterLink
              :to="`/categoria/${categoria.slug}`"
              class="relative inline-flex h-full items-center px-3 text-small font-semibold whitespace-nowrap transition-colors duration-200 ease-out hover:text-ink"
              :class="isActiveCategory(categoria.slug) ? 'text-ink' : 'text-ink-muted'"
              :aria-current="isActiveCategory(categoria.slug) ? 'page' : undefined"
            >
              {{ categoria.nombre }}
              <!-- Categoría activa: subrayado Azul Silla de 2px (estado por forma, no solo color) -->
              <span
                v-if="isActiveCategory(categoria.slug)"
                class="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
                aria-hidden="true"
              />
            </RouterLink>
          </li>
        </ul>

        <RouterLink
          :to="{ name: 'search', query: { enShowroom: 'true' } }"
          class="-mr-3 inline-flex h-full shrink-0 items-center gap-2 px-3 text-small font-semibold text-ink-muted transition-colors duration-200 ease-out hover:text-ink"
        >
          <span class="size-2 rounded-full bg-showroom-gold" aria-hidden="true" />
          En showroom
        </RouterLink>
      </div>
    </nav>

    <AppMobileMenu :open="menuOpen" :categorias="categorias" :company="company" @close="closeMenu" />
  </header>
</template>
