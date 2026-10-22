<script setup>
import { ArrowRight, CalendarCheck, MessageCircle } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ShowroomInfo from '../components/layout/ShowroomInfo.vue'
import CategoryCard from '../components/product/CategoryCard.vue'
import CategoryCardSkeleton from '../components/product/CategoryCardSkeleton.vue'
import CategorySilhouette from '../components/product/CategorySilhouette.vue'
import ProductGrid from '../components/product/ProductGrid.vue'
import SpaceTypeSwatches from '../components/product/SpaceTypeSwatches.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseErrorState from '../components/ui/BaseErrorState.vue'
import { useAsync } from '../composables/useAsync'
import { useCategorias } from '../composables/useCategorias'
import { categoryImages } from '../config/categorias'
import { company } from '../config/empresa'
import { whatsappUrl } from '../utils/whatsapp'
import { estiloTipoEspacio } from '../config/tiposEspacio'
import { obtenerProductos } from '../services/productoService'
import { useCotizacionStore } from '../stores/cotizacion'

// --- Hero ---
// Siluetas de la vitrina: son ilustración (no datos), por eso la lista es fija.
// Cuando exista company.showroom.photoUrl, la foto del showroom las reemplaza.
const VITRINE_SLUGS = ['escritorios', 'silleria', 'comedores', 'peinadores', 'camillas']

// "Explorar categorías" baja a la sección de categorías ("Ver catálogo" va a /buscar).
// Con movimiento reducido el salto es instantáneo. El foco pasa al título de la sección
// para que quien navega con teclado o lector de pantalla siga desde ahí.
const categoriasTitle = ref(null)

// El botón de cierre ("Pide una cotización") cambia según haya o no productos en la cotización.
const cotizacion = useCotizacionStore()
function scrollToCategorias(event) {
  event.preventDefault()
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('categorias')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  categoriasTitle.value?.focus({ preventScroll: true })
}

// --- Categorías ---
// useCategorias comparte la lista con el header y el footer: la petición se hace una sola vez.
const {
  categorias,
  loading: categoriasLoading,
  error: categoriasError,
  retry: retryCategorias,
} = useCategorias()

// --- Compra por ambiente (productos en showroom) ---
const MAX_PRODUCTOS = 4
const tipoEspacio = ref(null)
// useAsync descarta la respuesta de un filtro viejo si el usuario cambia de ambiente rápido.
const {
  data: productosData,
  loading: productosLoading,
  error: productosError,
  execute: loadProductos,
} = useAsync(
  () => obtenerProductos({ enShowroom: true, tipoEspacio: tipoEspacio.value ?? undefined }),
  { immediate: false },
)
const productos = computed(() => (productosData.value ?? []).slice(0, MAX_PRODUCTOS))
// El watch pasa (nuevo, viejo) como argumentos: se ignoran, la función lee tipoEspacio directo.
watch(tipoEspacio, () => loadProductos(), { immediate: true })

const tipoActivo = computed(() => (tipoEspacio.value ? estiloTipoEspacio(tipoEspacio.value) : null))

// Enlace bajo la grilla: al buscador con el ambiente elegido (el filtro llega en la Fase 4).
const verTodos = computed(() =>
  tipoActivo.value
    ? { to: { name: 'search', query: { tipoEspacio: tipoActivo.value.valor } }, text: `Ver todos los de ${tipoActivo.value.etiqueta}` }
    : { to: { name: 'search', query: { enShowroom: 'true' } }, text: 'Ver todos los productos en showroom' },
)

// Aviso para lectores de pantalla cuando cambia el filtro.
const resumenFiltro = computed(() => {
  if (productosLoading.value) return ''
  return tipoActivo.value ? `Mostrando piezas de ${tipoActivo.value.etiqueta} en el showroom` : 'Mostrando piezas en el showroom'
})

// --- Cierre ---
const whatsappLink = whatsappUrl('Hola, vengo de la página web y quiero información sobre sus muebles.')

</script>

<template>
  <!-- ① HERO: la empresa y su showroom -->
  <section aria-labelledby="hero-title" class="border-b border-line bg-surface">
    <div
      class="container-page grid gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14 lg:py-16"
    >
      <div>
        <h1 id="hero-title" class="max-w-[17ch] text-display text-balance">
          Muebles para tu oficina, tu negocio y tu casa
        </h1>
        <p class="mt-4 max-w-[52ch] text-ink-muted">
          Sillas, escritorios, comedores, peinadores y camillas que puedes ver y probar en nuestro showroom antes de
          cotizar.
        </p>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <BaseButton :to="{ name: 'search' }" class="max-sm:w-full">
            Ver catálogo
            <template #icon-right><ArrowRight /></template>
          </BaseButton>
          <BaseButton variant="visit" to="/agendar-cita" class="max-sm:w-full">
            <template #icon-left><CalendarCheck /></template>
            Agendar visita
          </BaseButton>
        </div>

        <ShowroomInfo class="mt-8 border-t border-line pt-6" />
      </div>

      <!--
        Vitrina: los muebles de cada categoría sobre el piso del showroom.
        Está lista para recibir la foto real: basta con llenar company.showroom.photoUrl.
      -->
      <div class="relative overflow-hidden rounded-md border border-line bg-ground">
        <img
          v-if="company.showroom.photoUrl"
          :src="company.showroom.photoUrl"
          alt="Showroom de Mobiliario de Oficina en San Diego, Carabobo"
          class="aspect-[2/1] w-full object-cover object-center md:aspect-[5/2] lg:aspect-[16/9]"
        />
        <div v-else class="relative aspect-[2/1] md:aspect-[5/2] lg:aspect-[16/9]" aria-hidden="true">
          <!-- El piso: una franja más clara con su borde como línea de suelo -->
          <div class="absolute inset-x-0 bottom-0 h-[24%] border-t border-line bg-surface/70" />
          <!--
            Las siluetas tienen el piso dibujado en y = 104 de 120: les sobra un 13% abajo.
            Cada una mide el 24% del ancho, así que ese 13% de su alto (¾ del ancho) es ~2.4% del ancho:
            el margen negativo las apoya exactamente sobre la línea. Se montan 2.5% por lado sobre la vecina:
            los dibujos no llenan su lienzo, así que solo se cruzan los márgenes vacíos.
          -->
          <div class="absolute inset-x-0 bottom-[24%] -mb-[2.4%] flex items-end justify-center">
            <CategorySilhouette
              v-for="slug in VITRINE_SLUGS"
              :key="slug"
              :slug="slug"
              class="-mx-[2.5%] w-[24%] text-ink-muted"
            />
          </div>
        </div>
        <BaseBadge variant="showroom" class="absolute top-3 left-3">Showroom en San Diego</BaseBadge>
      </div>
    </div>
  </section>

  <!-- ② CATEGORÍAS -->
  <section id="categorias" aria-labelledby="categorias-title" class="scroll-mt-[136px] md:scroll-mt-24">
    <div class="container-page pt-12 md:pt-16">
      <h2 id="categorias-title" ref="categoriasTitle" tabindex="-1" class="text-title focus:outline-none">
        Explora por categoría
      </h2>

      <div class="mt-5">
        <div v-if="categoriasLoading" role="status">
          <span class="sr-only">Cargando categorías…</span>
          <ul class="grid gap-3 md:grid-cols-5 md:gap-4 lg:gap-6" aria-hidden="true">
            <li v-for="n in 5" :key="n"><CategoryCardSkeleton /></li>
          </ul>
        </div>

        <BaseErrorState
          v-else-if="categoriasError"
          title="No pudimos cargar las categorías"
          :error="categoriasError"
          subject="las categorías"
          @retry="retryCategorias"
        />

        <p
          v-else-if="!categorias.length"
          class="rounded-md border border-line bg-surface px-6 py-10 text-center text-ink-muted"
        >
          Todavía no hay categorías publicadas.
        </p>

        <ul v-else class="grid gap-3 md:grid-cols-5 md:gap-4 lg:gap-6">
          <li v-for="categoria in categorias" :key="categoria.id">
            <CategoryCard :categoria="categoria" :imagen-url="categoryImages[categoria.slug] ?? null" />
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ③ COMPRA POR AMBIENTE + EN SHOWROOM -->
  <section aria-labelledby="ambientes-title">
    <div class="container-page pt-12 md:pt-16">
      <h2 id="ambientes-title" class="text-title">Compra por ambiente</h2>
      <p class="mt-1 text-ink-muted">Piezas que puedes ver y probar en nuestro showroom.</p>

      <SpaceTypeSwatches v-model="tipoEspacio" class="mt-4" />
      <p class="sr-only" aria-live="polite">{{ resumenFiltro }}</p>

      <BaseErrorState
        v-if="productosError"
        title="No pudimos cargar los productos"
        :error="productosError"
        subject="los productos"
        @retry="loadProductos"
      />
      <!--
        Máximo 4 productos. En tablet la grilla tiene 3 columnas: el 4.º se oculta
        para no dejar una tarjeta sola en la segunda fila.
      -->
      <ProductGrid
        v-else
        :productos="productos"
        :loading="productosLoading"
        :skeleton-count="MAX_PRODUCTOS"
        class="md:max-lg:[&_li:nth-child(4)]:hidden"
      >
        <template #empty>
          <template v-if="tipoActivo">
            <p class="text-card-title">Todavía no tenemos piezas de {{ tipoActivo.etiqueta }} en el showroom</p>
            <p class="mt-1 text-small text-ink-muted">Mira en el catálogo todo lo que tenemos para este ambiente.</p>
          </template>
          <template v-else>
            <p class="text-card-title">Todavía no hay productos en el showroom</p>
            <p class="mt-1 text-small text-ink-muted">Pronto publicaremos las piezas que puedes ver en persona.</p>
          </template>
        </template>
      </ProductGrid>

      <RouterLink
        :to="verTodos.to"
        class="group mt-3.5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-deep hover:underline"
      >
        {{ verTodos.text }}
        <ArrowRight
          class="size-[18px] transition-transform duration-200 ease-out group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </RouterLink>
    </div>
  </section>

  <!-- ④ CIERRE: visita, cotización y WhatsApp -->
  <section aria-labelledby="visita-title">
    <div class="container-page py-12 md:py-16">
      <div
        class="grid overflow-hidden rounded-md border border-line bg-surface lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
      >
        <div class="p-6 md:p-8 lg:p-10">
          <h2 id="visita-title" class="text-title">Ven a verlos en persona</h2>
          <p class="mt-2 max-w-[50ch] text-ink-muted">
            Siéntate en las sillas, mide los escritorios y mira los materiales de cerca antes de decidir.
          </p>
          <ShowroomInfo class="mt-6" />
          <BaseButton variant="visit" to="/agendar-cita" class="mt-7 max-sm:w-full">
            <template #icon-left><CalendarCheck /></template>
            Agendar visita
          </BaseButton>
        </div>

        <div class="divide-y divide-line border-t border-line lg:border-t-0 lg:border-l">
          <div class="p-6 md:p-8">
            <h3 class="text-card-title">Pide una cotización</h3>
            <p class="mt-1 max-w-[45ch] text-small text-ink-muted">
              Agrega a tu cotización los productos que te interesan y envíanos la lista: te respondemos con el precio
              final.
            </p>
            <!-- Con productos en la cotización, el siguiente paso es enviarla; si no, elegir productos. -->
            <BaseButton v-if="cotizacion.totalUnidades > 0" to="/carrito" class="mt-4 max-sm:w-full">
              Solicitar cotización
            </BaseButton>
            <BaseButton
              v-else
              variant="secondary"
              href="#categorias"
              class="mt-4 max-sm:w-full"
              @click="scrollToCategorias"
            >
              Explorar categorías
            </BaseButton>
          </div>

          <div class="p-6 md:p-8">
            <h3 class="text-card-title">¿Prefieres escribirnos?</h3>
            <p class="mt-1 max-w-[45ch] text-small text-ink-muted">
              Escríbenos por WhatsApp al
              <span class="whitespace-nowrap tabular-nums">{{ company.whatsapp.display }}</span> y te ayudamos a
              elegir.
            </p>
            <BaseButton
              variant="whatsapp"
              :href="whatsappLink"
              target="_blank"
              rel="noopener"
              class="mt-4 max-sm:w-full"
            >
              <template #icon-left><MessageCircle /></template>
              Escribir por WhatsApp
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
