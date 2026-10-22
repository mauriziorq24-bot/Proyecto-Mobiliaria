<script setup>
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, MessageCircle, PackageX, Plus } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ProductGallery from '../components/product/ProductGallery.vue'
import ProductGrid from '../components/product/ProductGrid.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseErrorState from '../components/ui/BaseErrorState.vue'
import BaseQuantityInput from '../components/ui/BaseQuantityInput.vue'
import { useAsync } from '../composables/useAsync'
import { useBottomBarHeight } from '../composables/useBottomBarHeight'
import { useCategorias } from '../composables/useCategorias'
import { estiloTipoEspacio } from '../config/tiposEspacio'
import { useToast } from '../composables/useToast'
import { obtenerProductoPorId, obtenerProductos } from '../services/productoService'
import { CANTIDAD_MAXIMA, useCotizacionStore } from '../stores/cotizacion'
import { formatearPrecio } from '../utils/formato'
import { setPageTitle } from '../utils/pageTitle'
import { productInquiryUrl } from '../utils/whatsapp'

const RELATED_LIMIT = 4

const route = useRoute()
const router = useRouter()

// Cantidad elegida: la comparten el selector, la barra móvil y el mensaje de WhatsApp.
// Se declara antes del watch del id porque ese watch la reinicia al cambiar de producto.
const cantidad = ref(1)

// Unidades que sumó el último clic en "Agregar a la cotización" (null = el botón muestra su
// texto normal). También se reinicia al cambiar de producto, por eso va aquí arriba.
const justAdded = ref(null)
let addedTimer = null

function resetAdded() {
  clearTimeout(addedTimer)
  justAdded.value = null
}
onBeforeUnmount(resetAdded)

// --- Producto ---
// useAsync guarda data/loading/error; aquí solo se dice QUÉ pedir.
// immediate: false porque la primera carga la hace el watch de abajo.
const {
  data: producto,
  loading,
  error,
  execute: loadProducto,
  retry,
} = useAsync((id) => obtenerProductoPorId(id), { immediate: false })

// Vue Router reutiliza esta vista al ir de /producto/4 a /producto/7 (misma ruta, otro id):
// no se vuelve a montar. Por eso se observa el id; immediate: true hace la primera carga.
// Al salir hacia otra ruta el id queda undefined justo antes de desmontar: no se pide nada.
watch(
  () => route.params.id,
  (id) => {
    if (!id) return
    cantidad.value = 1
    resetAdded()
    loadProducto(id)
  },
  { immediate: true },
)

// 404 = "no encontrado". Hoy el backend responde 500 a un id inexistente (pendiente en API.md),
// así que ese caso cae en el estado de error genérico hasta que lo corrijan.
// Los id que no son números ya los descarta el servicio con un 404 propio.
const notFound = computed(() => error.value?.response?.status === 404)

// Título de la pestaña: el nombre llega con la API, así que el router no lo puede fijar de antemano.
// El chequeo de route.name evita pisar el título de la página siguiente al salir.
watch(
  [producto, notFound],
  () => {
    if (route.name !== 'product') return
    if (notFound.value) setPageTitle('Producto no encontrado')
    else if (producto.value) setPageTitle(producto.value.nombre)
  },
  { immediate: true },
)

// --- Categoría (para las migas de pan) ---
// La lista ya la pidió el header: useCategorias la comparte, no se vuelve a pedir.
const { categorias } = useCategorias()

function normalize(text) {
  // Minúsculas y sin tildes: así "Silleria" coincide con "Sillería".
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Se busca por categoriaId; si llega null (pendiente 3 de API.md), por nombre.
const categoria = computed(() => {
  const p = producto.value
  if (!p) return null
  return (
    categorias.value.find((c) =>
      p.categoriaId != null ? c.id === p.categoriaId : normalize(c.nombre) === normalize(p.categoriaNombre),
    ) ?? null
  )
})

// --- Precio y acciones ---
const hasPrice = computed(() => producto.value?.precioReferencialUsd != null)
const tipoEspacio = computed(() => (producto.value?.tipoEspacio ? estiloTipoEspacio(producto.value.tipoEspacio) : null))

// Enlace absoluto a esta ficha, para que quien responda por WhatsApp vea el producto.
const whatsappLink = computed(() => {
  if (!producto.value) return null
  const pageUrl = window.location.origin + router.resolve({ name: 'product', params: { id: producto.value.id } }).href
  return productInquiryUrl(producto.value, cantidad.value, pageUrl)
})

const appointmentLink = computed(() => ({ name: 'appointment', query: { producto: producto.value?.id } }))

// --- Agregar a la cotización (DESIGN.md › Agregar a la cotización) ---
// La persona no sale de la página: el botón pasa un momento a "✓ Agregado (N)", aparece el aviso
// con "Ver mi cotización" y junto al selector se ve cuántas lleva. Si ya estaba, la cantidad se suma.
const ADDED_FEEDBACK_MS = 2000

const cotizacion = useCotizacionStore()
const toast = useToast()

const enCotizacion = computed(() => (producto.value ? cotizacion.cantidadDe(producto.value.id) : 0))

function addToQuote() {
  const antes = enCotizacion.value
  cotizacion.agregar(producto.value, cantidad.value)
  // El store no pasa de CANTIDAD_MAXIMA: lo sumado puede ser menos de lo pedido, o nada.
  const sumadas = enCotizacion.value - antes

  if (sumadas === 0) {
    toast.show(`Ya tienes el máximo (${CANTIDAD_MAXIMA}) de este producto en tu cotización.`, {
      action: { label: 'Ver mi cotización', to: '/carrito' },
    })
    return
  }

  justAdded.value = sumadas
  clearTimeout(addedTimer)
  addedTimer = setTimeout(resetAdded, ADDED_FEEDBACK_MS)

  toast.show('Agregado a tu cotización', {
    tone: 'success',
    action: { label: 'Ver mi cotización', to: '/carrito' },
  })
}

// La barra del producto publica su altura para que el aviso aparezca encima de ella.
const productBar = ref(null)
useBottomBarHeight(productBar)

// --- Productos relacionados ---
// Hasta 4 de la misma categoría, sin el actual. Se pide 1 de más por si el actual viene en la lista.
const {
  data: relacionados,
  loading: relacionadosLoading,
  execute: loadRelacionados,
} = useAsync(
  async (slug, currentId) => {
    const lista = await obtenerProductos({ categoriaSlug: slug })
    return lista.filter((p) => p.id !== currentId).slice(0, RELATED_LIMIT)
  },
  { immediate: false },
)

// Se cargan cuando ya se conocen el producto y el slug de su categoría.
watch(
  () => [categoria.value?.slug, producto.value?.id],
  ([slug, id]) => {
    if (slug && id) loadRelacionados(slug, id)
  },
  { immediate: true },
)

// Son contenido secundario: si fallan o no hay, la sección simplemente no aparece.
const showRelacionados = computed(() => relacionadosLoading.value || relacionados.value?.length > 0)
</script>

<template>
  <div>
    <!-- Cargando: la misma forma que la ficha, para que nada salte al llegar los datos -->
    <div v-if="loading" role="status" class="container-page py-4 md:py-6">
      <span class="sr-only">Cargando producto…</span>
      <div aria-hidden="true">
        <div class="flex h-5 items-center gap-2">
          <div class="h-3 w-12 animate-pulse rounded-sm bg-line" />
          <div class="h-3 w-20 animate-pulse rounded-sm bg-line" />
          <div class="h-3 w-32 animate-pulse rounded-sm bg-line" />
        </div>
        <div class="mt-4 lg:mt-6 lg:grid lg:grid-cols-12 lg:gap-12">
          <!-- Mismo tamaño que ProductGallery: 4:5 y con el ancho limitado en escritorio -->
          <div
            class="aspect-[4/5] w-full animate-pulse rounded-md bg-line/60 lg:col-span-7 lg:mx-auto lg:max-w-[max(20rem,calc((100svh-12rem)*4/5))]"
          />
          <div class="mt-6 lg:col-span-5 lg:mt-0">
            <div class="h-3.5 w-24 animate-pulse rounded-sm bg-line" />
            <div class="mt-3 h-7 w-full animate-pulse rounded-sm bg-line md:h-8" />
            <div class="mt-2 h-7 w-2/3 animate-pulse rounded-sm bg-line md:h-8" />
            <div class="mt-8 h-3.5 w-28 animate-pulse rounded-sm bg-line" />
            <div class="mt-2 h-8 w-32 animate-pulse rounded-sm bg-line" />
            <div class="mt-8 h-[46px] w-full animate-pulse rounded-md bg-line" />
            <div class="mt-3 h-[46px] w-full animate-pulse rounded-md bg-line" />
          </div>
        </div>
      </div>
    </div>

    <!-- El id no corresponde a ningún producto -->
    <section v-else-if="notFound" aria-labelledby="not-found-title" class="container-page py-12 md:py-16">
      <div class="flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center md:py-16">
        <PackageX class="size-10 text-ink-muted" :stroke-width="1.5" aria-hidden="true" />
        <h1 id="not-found-title" class="mt-4 text-headline text-balance">Producto no encontrado</h1>
        <p class="mt-2 max-w-[45ch] text-ink-muted">
          Puede que ya no esté en el catálogo o que el enlace esté incompleto. En el inicio encuentras todas
          nuestras categorías.
        </p>
        <BaseButton to="/" class="mt-6 max-sm:w-full">
          <template #icon-left><ArrowLeft /></template>
          Volver al inicio
        </BaseButton>
      </div>
    </section>

    <!-- Error de red o del servidor -->
    <div v-else-if="error" class="container-page py-12">
      <BaseErrorState title="No pudimos cargar este producto" :error="error" subject="este producto" @retry="retry" />
    </div>

    <template v-else-if="producto">
      <article aria-labelledby="product-title" class="container-page py-4 md:py-6">
        <!-- Migas de pan: Inicio › Categoría › Producto -->
        <nav aria-label="Ruta de navegación">
          <ol class="flex min-w-0 items-center gap-1 text-small text-ink-muted">
            <li class="shrink-0">
              <!-- before: amplía el área táctil sin mover el texto -->
              <RouterLink
                to="/"
                class="relative rounded-sm before:absolute before:-inset-x-2 before:-inset-y-3 hover:text-brand-deep hover:underline"
              >
                Inicio
              </RouterLink>
            </li>
            <template v-if="producto.categoriaNombre">
              <li aria-hidden="true" class="shrink-0"><ChevronRight class="size-3.5" /></li>
              <li class="shrink-0">
                <RouterLink
                  v-if="categoria"
                  :to="`/categoria/${categoria.slug}`"
                  class="relative rounded-sm before:absolute before:-inset-x-2 before:-inset-y-3 hover:text-brand-deep hover:underline"
                >
                  {{ categoria.nombre }}
                </RouterLink>
                <!-- Sin slug no hay a dónde enlazar: se muestra el nombre como texto -->
                <span v-else>{{ producto.categoriaNombre }}</span>
              </li>
            </template>
            <li aria-hidden="true" class="shrink-0"><ChevronRight class="size-3.5" /></li>
            <li aria-current="page" class="truncate text-ink">{{ producto.nombre }}</li>
          </ol>
        </nav>

        <div class="mt-4 lg:mt-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
          <ProductGallery :imagenes="producto.imagenes ?? []" :nombre="producto.nombre" class="lg:col-span-7" />

          <!-- En escritorio la información acompaña a la galería al hacer scroll -->
          <div class="mt-6 lg:sticky lg:top-24 lg:col-span-5 lg:mt-0">
            <p v-if="producto.categoriaNombre" class="text-small text-ink-muted">{{ producto.categoriaNombre }}</p>
            <h1 id="product-title" class="mt-1 text-headline text-balance">{{ producto.nombre }}</h1>
            <BaseBadge v-if="producto.enShowroom" variant="showroom" class="mt-3">En showroom</BaseBadge>

            <!-- Precio: siempre referencial (PRODUCT.md › Cotizar, no cobrar) -->
            <div class="mt-6 border-t border-line pt-5">
              <template v-if="hasPrice">
                <p class="text-small text-ink-muted">Precio referencial</p>
                <p class="mt-0.5 text-price-large tabular-nums">{{ formatearPrecio(producto.precioReferencialUsd) }}</p>
              </template>
              <p v-else class="text-title">Consultar precio</p>
              <p class="mt-1 text-small text-ink-muted">El precio final se confirma al responder tu cotización.</p>
            </div>

            <!-- Cantidad + cotización (desde tablet; en móvil van en la barra inferior) -->
            <div class="mt-6 hidden md:block">
              <div class="flex items-end gap-3">
                <BaseQuantityInput v-model="cantidad" show-label />
                <BaseButton class="flex-1" @click="addToQuote">
                  <template #icon-left>
                    <Check v-if="justAdded" />
                    <Plus v-else />
                  </template>
                  {{ justAdded ? `Agregado (${justAdded})` : 'Agregar a la cotización' }}
                </BaseButton>
              </div>
              <p v-if="enCotizacion" class="mt-2 text-small text-ink-muted">
                Ya tienes <span class="tabular-nums">{{ enCotizacion }}</span> en tu cotización
              </p>
            </div>

            <div class="mt-3 grid gap-3 max-md:mt-6">
              <BaseButton :href="whatsappLink" target="_blank" rel="noopener" variant="whatsapp" block>
                <template #icon-left><MessageCircle /></template>
                Consultar por WhatsApp
              </BaseButton>

              <!-- Dorado solo si lleva a ver el mueble en persona (La regla del dorado) -->
              <BaseButton v-if="producto.enShowroom" :to="appointmentLink" variant="visit" block>
                <template #icon-left><CalendarDays /></template>
                Agendar visita para verlo
              </BaseButton>
              <BaseButton v-else :to="appointmentLink" variant="secondary" block>
                <template #icon-left><CalendarDays /></template>
                Agendar una asesoría
              </BaseButton>
            </div>

            <p v-if="producto.enShowroom" class="mt-3 flex items-center gap-2 text-small text-ink-muted">
              <span class="size-1.5 shrink-0 rounded-full bg-showroom-gold" aria-hidden="true" />
              Puedes verlo y probarlo en nuestro showroom.
            </p>

            <!-- Descripción y ficha técnica -->
            <section v-if="producto.descripcion" aria-labelledby="description-title" class="mt-8">
              <h2 id="description-title" class="text-label text-ink-muted uppercase">Descripción</h2>
              <p class="mt-2 max-w-[65ch] text-pretty">{{ producto.descripcion }}</p>
            </section>

            <section aria-labelledby="specs-title" class="mt-8">
              <h2 id="specs-title" class="text-label text-ink-muted uppercase">Ficha técnica</h2>
              <dl class="mt-2 divide-y divide-line border-y border-line">
                <div v-if="producto.material" class="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt class="text-small text-ink-muted">Material</dt>
                  <dd>{{ producto.material }}</dd>
                </div>
                <div v-if="producto.dimensionesEstandar" class="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt class="text-small text-ink-muted">Dimensiones estándar</dt>
                  <dd class="tabular-nums">{{ producto.dimensionesEstandar }}</dd>
                </div>
                <div v-if="tipoEspacio" class="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt class="text-small text-ink-muted">Tipo de espacio</dt>
                  <dd class="flex items-center gap-2">
                    <component :is="tipoEspacio.icon" class="size-4 text-ink-muted" aria-hidden="true" />
                    {{ tipoEspacio.etiqueta }}
                  </dd>
                </div>
                <div v-if="producto.categoriaNombre" class="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt class="text-small text-ink-muted">Categoría</dt>
                  <dd>{{ producto.categoriaNombre }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </article>

      <!-- Relacionados: hasta 4 de la misma categoría -->
      <section
        v-if="showRelacionados"
        aria-labelledby="related-title"
        class="container-page pb-12 md:pb-16"
      >
        <!-- El borde va aquí (dentro del padding del contenedor) para que no sobresalga de la grilla -->
        <div class="mt-6 mb-4 flex items-baseline justify-between gap-4 border-t border-line pt-8 md:mt-10 md:mb-6 md:pt-10">
          <h2 id="related-title" class="text-title">Más de {{ producto.categoriaNombre }}</h2>
          <RouterLink
            v-if="categoria"
            :to="`/categoria/${categoria.slug}`"
            class="group relative inline-flex shrink-0 items-center gap-1 font-semibold text-brand-deep before:absolute before:-inset-y-3 before:-inset-x-2 hover:underline"
          >
            Ver todos
            <ArrowRight
              class="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
        <ProductGrid :productos="relacionados ?? []" :loading="relacionadosLoading" :skeleton-count="RELATED_LIMIT" />
      </section>

      <!--
        Barra del producto (solo móvil): cantidad + "Agregar a la cotización" siempre a mano.
        sticky bottom-0 al final de la vista: flota sobre el contenido mientras se lee la ficha
        y se detiene antes del footer, así nunca lo tapa (no hace falta reservar espacio).
      -->
      <div
        ref="productBar"
        class="sticky bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgb(20_23_28/0.14)] md:hidden"
      >
        <p v-if="enCotizacion" class="mb-2 text-small text-ink-muted">
          Ya tienes <span class="tabular-nums">{{ enCotizacion }}</span> en tu cotización
        </p>
        <div class="flex items-center gap-3">
          <BaseQuantityInput v-model="cantidad" />
          <BaseButton class="min-w-0 flex-1" @click="addToQuote">
            <template v-if="justAdded" #icon-left><Check /></template>
            {{ justAdded ? `Agregado (${justAdded})` : 'Agregar a la cotización' }}
          </BaseButton>
        </div>
      </div>
    </template>
  </div>
</template>
