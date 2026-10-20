<script setup>
import { ArrowLeft, ChevronRight, SearchX } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import CategorySilhouette from '../components/product/CategorySilhouette.vue'
import ProductGrid from '../components/product/ProductGrid.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseErrorState from '../components/ui/BaseErrorState.vue'
import { useCategorias } from '../composables/useCategorias'
import { obtenerProductos } from '../services/productoService'
import { setPageTitle } from '../utils/pageTitle'

const route = useRoute()

// --- Categoría ---
// La lista ya la pidió el header: useCategorias la comparte, no se vuelve a pedir.
const {
  categorias,
  loading: categoriasLoading,
  error: categoriasError,
  retry: retryCategorias,
} = useCategorias()

// computed: se recalcula solo cuando cambia el slug de la URL o llega la lista.
const categoria = computed(() => categorias.value.find((c) => c.slug === route.params.slug) ?? null)
const notFound = computed(() => !categoriasLoading.value && !categoriasError.value && !categoria.value)

// Título de la pestaña: el nombre llega con la API, así que el router no lo puede fijar de antemano.
// Al salir hacia otra ruta el slug queda vacío justo antes de desmontar la vista:
// sin el chequeo de route.name, la página siguiente recibiría "Categoría no encontrada".
watch(
  [categoria, notFound],
  () => {
    if (route.name !== 'category') return
    if (categoria.value) setPageTitle(categoria.value.nombre)
    else if (notFound.value) setPageTitle('Categoría no encontrada')
  },
  { immediate: true },
)

// --- Productos ---
const productos = ref([])
const productosLoading = ref(true)
const productosError = ref(null)

// Si el usuario pasa rápido de Sillería a Escritorios, la respuesta de Sillería puede
// llegar después. Cada petición lleva un número y solo se usa la última.
let lastRequest = 0
async function loadProductos() {
  const slug = route.params.slug
  // Al salir hacia otra ruta (p. ej. un producto), el watch puede dispararse con slug
  // undefined justo antes de que la vista se desmonte: no hay nada que cargar.
  if (!slug) return

  const request = ++lastRequest
  productosLoading.value = true
  productosError.value = null
  try {
    const data = await obtenerProductos({ categoriaSlug: slug })
    if (request === lastRequest) productos.value = data
  } catch (err) {
    if (request === lastRequest) productosError.value = err
  } finally {
    if (request === lastRequest) productosLoading.value = false
  }
}

// Vue Router reutiliza esta misma instancia al ir de /categoria/silleria a /categoria/escritorios
// (misma ruta, otro parámetro): no se vuelve a montar. Por eso se observa el parámetro;
// immediate: true hace también la primera carga al entrar.
watch(() => route.params.slug, loadProductos, { immediate: true })

// "1 producto" / "12 productos", con el número formateado.
const countFormat = new Intl.NumberFormat('es-VE')
const conteo = computed(() => {
  const n = productos.value.length
  return `${countFormat.format(n)} ${n === 1 ? 'producto' : 'productos'}`
})

</script>

<template>
  <!-- Error al cargar las categorías: no se puede saber si el slug existe -->
  <div v-if="categoriasError" class="container-page py-12">
    <BaseErrorState title="No pudimos cargar esta categoría" @retry="retryCategorias" />
  </div>

  <!-- El slug no corresponde a ninguna categoría -->
  <section v-else-if="notFound" aria-labelledby="not-found-title" class="container-page py-12 md:py-16">
    <div class="flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center md:py-16">
      <SearchX class="size-10 text-ink-muted" :stroke-width="1.5" aria-hidden="true" />
      <h1 id="not-found-title" class="mt-4 text-headline text-balance">Categoría no encontrada</h1>
      <p class="mt-2 max-w-[45ch] text-ink-muted">
        La dirección que abriste no corresponde a ninguna de nuestras categorías. Puede que haya cambiado de nombre.
      </p>
      <BaseButton to="/" class="mt-6 max-sm:w-full">
        <template #icon-left><ArrowLeft /></template>
        Volver al inicio
      </BaseButton>

      <template v-if="categorias.length">
        <p class="mt-8 text-label text-ink-muted uppercase">O mira estas categorías</p>
        <ul class="mt-3 flex flex-wrap justify-center gap-2">
          <li v-for="c in categorias" :key="c.id">
            <RouterLink
              :to="`/categoria/${c.slug}`"
              class="inline-flex min-h-11 items-center rounded-sm border border-line px-3 font-semibold text-brand-deep transition-colors duration-200 ease-out hover:border-brand-deep hover:bg-brand-tint"
            >
              {{ c.nombre }}
            </RouterLink>
          </li>
        </ul>
      </template>
    </div>
  </section>

  <template v-else>
    <!-- Encabezado: ruta, nombre, descripción y cantidad -->
    <section aria-labelledby="category-title" class="border-b border-line bg-surface">
      <div class="container-page flex items-end justify-between gap-8 py-6 md:py-8">
        <div class="min-w-0">
          <nav aria-label="Ruta de navegación">
            <ol class="flex items-center gap-1 text-small text-ink-muted">
              <li>
                <!-- before: amplía el área táctil (~50×40px) sin mover el texto -->
                <RouterLink
                  to="/"
                  class="relative rounded-sm before:absolute before:-inset-x-2 before:-inset-y-3 hover:text-brand-deep hover:underline"
                >
                  Inicio
                </RouterLink>
              </li>
              <li aria-hidden="true"><ChevronRight class="size-3.5" /></li>
              <li aria-current="page" class="truncate text-ink">
                <span v-if="categoria">{{ categoria.nombre }}</span>
                <span v-else class="inline-block h-3.5 w-20 animate-pulse rounded-sm bg-line align-middle" />
              </li>
            </ol>
          </nav>

          <!-- Mientras llega la lista de categorías, el encabezado reserva su espacio -->
          <div v-if="!categoria" role="status" class="mt-3" aria-label="Cargando categoría">
            <div class="h-8 w-48 animate-pulse rounded-sm bg-line md:h-9" />
            <div class="mt-3 h-4 w-72 max-w-full animate-pulse rounded-sm bg-line" />
          </div>
          <template v-else>
            <h1 id="category-title" class="mt-2 text-headline text-balance">{{ categoria.nombre }}</h1>
            <p v-if="categoria.descripcion" class="mt-2 max-w-[60ch] text-ink-muted">{{ categoria.descripcion }}</p>
          </template>

          <!-- aria-live: al cambiar de categoría, el lector de pantalla anuncia la nueva cantidad -->
          <p class="mt-4 min-h-5 text-small font-semibold text-ink tabular-nums" aria-live="polite">
            <template v-if="!productosLoading && !productosError">{{ conteo }}</template>
          </p>
        </div>

        <!-- La silueta del mueble, la misma de la tarjeta de categoría (solo decorativa) -->
        <CategorySilhouette
          v-if="categoria"
          :slug="categoria.slug"
          floor
          class="hidden w-40 shrink-0 text-ink-muted md:block lg:w-48"
        />
      </div>
    </section>

    <!-- Productos de la categoría -->
    <section aria-labelledby="products-title" class="container-page py-8 md:py-10">
      <!-- Título solo para lectores de pantalla: une el h1 de la categoría con los h3 de las tarjetas -->
      <h2 id="products-title" class="sr-only">Productos de {{ categoria?.nombre ?? 'esta categoría' }}</h2>
      <BaseErrorState v-if="productosError" title="No pudimos cargar los productos" @retry="loadProductos" />
      <ProductGrid v-else :productos="productos" :loading="productosLoading">
        <template #empty>
          <p class="text-card-title">Todavía no hay productos en {{ categoria?.nombre ?? 'esta categoría' }}</p>
          <p class="mt-1 text-small text-ink-muted">Pronto publicaremos más piezas. Mientras, mira otras categorías.</p>
        </template>
      </ProductGrid>
    </section>
  </template>
</template>
