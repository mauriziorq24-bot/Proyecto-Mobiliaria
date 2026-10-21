<script setup>
import { ArrowUpDown, ChevronDown, MessageCircle, SearchX, SlidersHorizontal, X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ActiveFilterChips from '../components/product/ActiveFilterChips.vue'
import ProductGrid from '../components/product/ProductGrid.vue'
import SearchFilters from '../components/product/SearchFilters.vue'
import BaseBottomSheet from '../components/ui/BaseBottomSheet.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseErrorState from '../components/ui/BaseErrorState.vue'
import { useAsync } from '../composables/useAsync'
import { useFiltrosUrl } from '../composables/useFiltrosUrl'
import { contarOpciones, FILTROS_VACIOS, filtrarProductos, obtenerCatalogo } from '../services/productoService'
import { filtrosActivos } from '../utils/filtrosActivos'
import { setPageTitle } from '../utils/pageTitle'
import { whatsappUrl } from '../utils/whatsapp'

// Página de búsqueda (DESIGN.md › Página de búsqueda). Llegan desde el buscador del
// header (?q=), desde "Ver todos los de [ambiente]" (?tipoEspacio=) y desde "En showroom".
// El texto se escribe en el buscador del header: en esta página actualiza ?q= con debounce.

const route = useRoute()

// --- Catálogo ---
// Se pide una sola vez (ver la decisión en productoService.js) y pasa por useAsync:
// si Render está dormido, a los 5 s aparece "Estamos despertando el servidor…".
// Luego cada filtro se resuelve aquí, al instante, con las funciones puras del servicio:
// así la grilla no vuelve a "cargando" en cada clic y el borrador móvil puede contar en vivo.
const { data: catalogo, loading, error, retry } = useAsync(obtenerCatalogo)
const productosCatalogo = computed(() => catalogo.value?.productos ?? [])
const categorias = computed(() => catalogo.value?.categorias ?? [])

// --- Filtros (la URL es la fuente de verdad) ---
const { filtros, aplicarFiltros, limpiarFiltros, borrarBusqueda } = useFiltrosUrl({
  slugsValidos: () => categorias.value.map((c) => c.slug),
})

const resultados = computed(() => filtrarProductos(productosCatalogo.value, filtros.value, categorias.value))
const conteos = computed(() =>
  catalogo.value ? contarOpciones(productosCatalogo.value, filtros.value, categorias.value) : null,
)
const chips = computed(() => filtrosActivos(filtros.value, categorias.value))

// Mínimo y máximo del catálogo: placeholders de "Desde" y "Hasta".
const rangoPrecio = computed(() => {
  // Number(null) es 0: con "> 0" quedan fuera los productos sin precio.
  const precios = productosCatalogo.value
    .map((p) => Number(p.precioReferencialUsd))
    .filter((precio) => Number.isFinite(precio) && precio > 0)
  return precios.length ? { min: Math.floor(Math.min(...precios)), max: Math.ceil(Math.max(...precios)) } : { min: null, max: null }
})

// --- Encabezado y título de la pestaña ---
const texto = computed(() => filtros.value.q)
const titulo = computed(() => (texto.value ? `Resultados para «${texto.value}»` : 'Todos los productos'))

const countFormat = new Intl.NumberFormat('es-VE')
function cantidadProductos(n) {
  return `${countFormat.format(n)} ${n === 1 ? 'producto' : 'productos'}`
}

// El router pone su título en cada navegación, también al cambiar un filtro (replace).
// flush: 'post' hace que este se aplique después y sea el que queda.
watch(
  [() => route.fullPath, texto],
  () => {
    if (route.name !== 'search') return
    setPageTitle(texto.value ? `Resultados para «${texto.value}»` : 'Catálogo')
  },
  { immediate: true, flush: 'post' },
)

// --- Orden ---
const opcionesOrden = [
  { valor: 'relevancia', etiqueta: 'Relevancia' },
  { valor: 'precio-asc', etiqueta: 'Precio: menor a mayor' },
  { valor: 'precio-desc', etiqueta: 'Precio: mayor a menor' },
  { valor: 'nombre', etiqueta: 'Nombre A–Z' },
]
function cambiarOrden(event) {
  aplicarFiltros({ orden: event.target.value })
}

// --- Escritorio: los filtros de la barra lateral se aplican al momento ---
// Al limpiar, los campos de precio se vuelven a montar: si tenían un rango inválido
// (que nunca llegó a la URL), la URL no cambia y no se enterarían de otra forma.
const priceKey = ref(0)

function onPriceDesktop({ precioMin, precioMax, valid }) {
  // "Desde" mayor que "Hasta": el campo muestra el error y no se filtra.
  if (valid) aplicarFiltros({ precioMin, precioMax })
}

function quitarChip(chip) {
  if (chip.clave === 'precio') priceKey.value++
  aplicarFiltros(chip.quitar)
}

function limpiarTodo() {
  priceKey.value++
  limpiarFiltros()
}

// --- Móvil: panel inferior con borrador ---
// El panel no toca la URL hasta "Ver X resultados". Cerrar sin aplicar descarta el borrador.
const CLAVES_FILTRO = ['categoria', 'tipoEspacio', 'enShowroom', 'precioMin', 'precioMax']
function soloFiltros(origen) {
  return Object.fromEntries(CLAVES_FILTRO.map((clave) => [clave, origen[clave]]))
}

const sheetOpen = ref(false)
const draft = ref(soloFiltros(FILTROS_VACIOS))
const draftPriceValid = ref(true)
// Cambia en cada apertura: el contenido del panel se vuelve a montar con el borrador nuevo.
const sheetSession = ref(0)

function abrirFiltros() {
  draft.value = soloFiltros(filtros.value)
  draftPriceValid.value = true
  sheetSession.value++
  sheetOpen.value = true
}

function cerrarFiltros() {
  sheetOpen.value = false
}

function cambiarBorrador(cambios) {
  draft.value = { ...draft.value, ...cambios }
}

function onPriceDraft({ precioMin, precioMax, valid }) {
  draftPriceValid.value = valid
  cambiarBorrador({ precioMin, precioMax })
}

// "Limpiar" del panel: solo limpia el borrador, la página sigue igual hasta aplicar.
function limpiarBorrador() {
  draft.value = soloFiltros(FILTROS_VACIOS)
  draftPriceValid.value = true
}

// Conteos del borrador: cada opción del panel y el botón "Ver X resultados" cuentan en vivo.
const draftConteos = computed(() =>
  catalogo.value && sheetOpen.value
    ? contarOpciones(productosCatalogo.value, { ...filtros.value, ...draft.value }, categorias.value)
    : null,
)

const botonAplicar = computed(() => {
  if (!draftPriceValid.value) return { texto: 'Revisa el precio', disabled: true }
  if (!draftConteos.value) return { texto: 'Ver resultados', disabled: false }
  const total = draftConteos.value.total
  if (total === 0) return { texto: 'Sin resultados', disabled: true }
  return { texto: `Ver ${countFormat.format(total)} ${total === 1 ? 'resultado' : 'resultados'}`, disabled: false }
})

function aplicarBorrador() {
  aplicarFiltros(draft.value)
  sheetOpen.value = false
}

// Si se llega a otra búsqueda (Atrás, header) con el panel abierto, se cierra sin aplicar.
watch(
  () => route.fullPath,
  () => {
    sheetOpen.value = false
  },
)

// --- Estados vacíos ---
// Sin resultados por el texto: ni quitando todos los filtros aparece algo.
const sinResultadosPorTexto = computed(
  () => Boolean(texto.value) && filtrarProductos(productosCatalogo.value, { q: texto.value }, categorias.value).length === 0,
)

// El filtro que, quitado solo, recupera más productos: "Si quitas «En showroom» verás 4 productos".
const mejorSugerencia = computed(() => {
  if (!conteos.value) return null
  let mejor = null
  for (const chip of chips.value) {
    const cantidad = conteos.value.sinFiltro[chip.clave]
    if (cantidad > 0 && (!mejor || cantidad > mejor.cantidad)) mejor = { chip, cantidad }
  }
  return mejor
})

const mensajeWhatsapp = computed(() =>
  texto.value
    ? `Hola, busqué «${texto.value}» en la web y no lo encontré.`
    : 'Hola, busqué en la web y no encontré lo que necesito.',
)

const linkClass = 'font-semibold text-brand-deep underline hover:text-brand-deeper'

const selectClass =
  'h-[46px] w-full cursor-pointer appearance-none rounded-md border border-line bg-surface pr-9 text-small font-semibold text-ink transition-colors duration-200 ease-out hover:border-ink-muted/50 focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none focus-visible:outline-none'
</script>

<template>
  <!-- Encabezado: título, cantidad y "Borrar búsqueda" -->
  <section aria-labelledby="search-title" class="border-b border-line bg-surface">
    <div class="container-page py-6 md:py-8">
      <h1 id="search-title" class="text-headline text-balance break-words">{{ titulo }}</h1>
      <div class="mt-3 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1">
        <!-- aria-live: al cambiar un filtro, el lector de pantalla anuncia la nueva cantidad -->
        <p class="text-small font-semibold text-ink tabular-nums" aria-live="polite">
          <template v-if="catalogo">{{ cantidadProductos(resultados.length) }}</template>
        </p>
        <button
          v-if="texto"
          type="button"
          class="relative inline-flex items-center gap-1 text-small font-semibold text-brand-deep before:absolute before:-inset-x-1 before:-inset-y-3 hover:underline"
          @click="borrarBusqueda"
        >
          <X class="size-4" aria-hidden="true" />
          Borrar búsqueda
        </button>
      </div>
    </div>
  </section>

  <!-- Móvil y tablet: barra fija bajo el header con "Filtros (N)" y "Ordenar" -->
  <div class="sticky top-[var(--header-h,0px)] z-30 border-b border-line bg-surface lg:hidden">
    <div class="container-page flex items-center gap-2 py-2.5">
      <BaseButton
        variant="secondary"
        class="flex-1 px-3"
        aria-haspopup="dialog"
        :aria-expanded="sheetOpen"
        @click="abrirFiltros"
      >
        <template #icon-left><SlidersHorizontal /></template>
        Filtros<span v-if="chips.length" class="-ml-1 tabular-nums">({{ chips.length }})</span>
      </BaseButton>
      <div class="relative flex-1">
        <label for="orden-movil" class="sr-only">Ordenar por</label>
        <ArrowUpDown
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <select id="orden-movil" :value="filtros.orden" :class="selectClass" class="pl-9" @change="cambiarOrden">
          <option v-for="opcion in opcionesOrden" :key="opcion.valor" :value="opcion.valor">{{ opcion.etiqueta }}</option>
        </select>
        <ChevronDown
          class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>

  <div class="container-page py-6 lg:flex lg:gap-8 lg:py-8">
    <!-- Escritorio: barra lateral con los filtros, se aplican al momento -->
    <aside aria-labelledby="filters-title" class="hidden w-68 shrink-0 lg:block">
      <div
        class="thin-scrollbar sticky top-[calc(var(--header-h,0px)+1.5rem)] max-h-[calc(100dvh-var(--header-h,0px)-3rem)] overflow-y-auto overscroll-contain pr-2 pb-2"
      >
        <h2 id="filters-title" class="mb-5 text-title">Filtros</h2>
        <SearchFilters
          :key="priceKey"
          :filtros="filtros"
          :categorias="categorias"
          :conteos="conteos"
          :rango-precio="rangoPrecio"
          :price-debounce="300"
          @change="aplicarFiltros"
          @price="onPriceDesktop"
        />
      </div>
    </aside>

    <section aria-labelledby="results-title" class="min-w-0 flex-1">
      <h2 id="results-title" class="sr-only">Resultados</h2>

      <!-- Móvil: chips en una fila con scroll horizontal -->
      <ActiveFilterChips :chips="chips" scroll class="mb-4 lg:hidden" @remove="quitarChip" @clear="limpiarTodo" />

      <!-- Escritorio: chips a la izquierda, "Ordenar por" a la derecha -->
      <div class="mb-6 hidden items-start justify-between gap-6 lg:flex">
        <ActiveFilterChips :chips="chips" class="min-w-0 flex-1" @remove="quitarChip" @clear="limpiarTodo" />
        <div class="ml-auto flex shrink-0 items-center gap-3">
          <label for="orden-escritorio" class="text-small font-semibold whitespace-nowrap text-ink-muted">Ordenar por</label>
          <div class="relative w-56">
            <select id="orden-escritorio" :value="filtros.orden" :class="selectClass" class="pl-3" @change="cambiarOrden">
              <option v-for="opcion in opcionesOrden" :key="opcion.valor" :value="opcion.valor">{{ opcion.etiqueta }}</option>
            </select>
            <ChevronDown
              class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <BaseErrorState
        v-if="error"
        title="No pudimos cargar los productos"
        :error="error"
        subject="los productos"
        @retry="retry"
      />

      <ProductGrid v-else-if="loading || resultados.length" :productos="resultados" :loading="loading" :skeleton-count="6" with-sidebar />

      <!-- Catálogo vacío: la empresa todavía no publicó productos -->
      <div
        v-else-if="!productosCatalogo.length"
        class="flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center"
      >
        <SearchX class="size-10 text-ink-muted" :stroke-width="1.5" aria-hidden="true" />
        <p class="mt-4 text-card-title">Todavía no hay productos publicados</p>
        <p class="mt-1 max-w-[45ch] text-small text-ink-muted">Pronto publicaremos el catálogo. Mientras, escríbenos y te ayudamos.</p>
      </div>

      <!-- Sin resultados -->
      <div v-else class="rounded-md border border-line bg-surface px-6 py-10 md:px-10 md:py-12">
        <div class="mx-auto flex max-w-[52ch] flex-col items-center text-center">
          <SearchX class="size-10 text-ink-muted" :stroke-width="1.5" aria-hidden="true" />

          <!-- Por el texto: no hay nada que lo contenga, con o sin filtros -->
          <template v-if="sinResultadosPorTexto">
            <p class="mt-4 text-title text-balance break-words">No encontramos «{{ texto }}»</p>
            <ul class="mt-4 space-y-1.5 text-ink-muted">
              <li>Revisa que esté bien escrito.</li>
              <li>
                Prueba con
                <RouterLink :to="{ name: 'search', query: { q: 'silla' } }" :class="linkClass">«silla»</RouterLink>
                o
                <RouterLink :to="{ name: 'search', query: { q: 'escritorio' } }" :class="linkClass">«escritorio»</RouterLink>.
              </li>
            </ul>
            <BaseButton variant="secondary" class="mt-6 max-sm:w-full" @click="borrarBusqueda">
              Ver todo el catálogo
            </BaseButton>
          </template>

          <!-- Por los filtros: se sugiere el que más resultados recupera -->
          <template v-else>
            <p class="mt-4 text-title text-balance">Ningún producto cumple todos los filtros</p>
            <p v-if="mejorSugerencia" class="mt-2 text-ink-muted">
              Si quitas «{{ mejorSugerencia.chip.etiqueta }}» verás
              <span class="font-semibold text-ink tabular-nums">{{ cantidadProductos(mejorSugerencia.cantidad) }}</span>.
            </p>
            <p v-else class="mt-2 text-ink-muted">Prueba a quitar algunos filtros.</p>
            <div class="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
              <BaseButton v-if="mejorSugerencia" @click="quitarChip(mejorSugerencia.chip)">
                Quitar «{{ mejorSugerencia.chip.etiqueta }}»
              </BaseButton>
              <BaseButton variant="secondary" @click="limpiarTodo">Limpiar filtros</BaseButton>
            </div>
          </template>
        </div>

        <!-- WhatsApp: el mensaje ya lleva lo que se buscó -->
        <div class="mx-auto mt-8 flex max-w-[52ch] flex-col items-center gap-4 border-t border-line pt-8 text-center">
          <p class="font-semibold text-balance">¿No encuentras lo que buscas? Escríbenos por WhatsApp</p>
          <BaseButton :href="whatsappUrl(mensajeWhatsapp)" target="_blank" rel="noopener" variant="whatsapp" class="max-sm:w-full">
            <template #icon-left><MessageCircle /></template>
            Escribir por WhatsApp
          </BaseButton>
        </div>
      </div>
    </section>
  </div>

  <!-- Móvil y tablet: panel inferior con los filtros en borrador -->
  <BaseBottomSheet :open="sheetOpen" title="Filtros" close-label="Cerrar filtros" @close="cerrarFiltros">
    <template #actions>
      <BaseButton variant="ghost" size="sm" @click="limpiarBorrador">Limpiar</BaseButton>
    </template>

    <SearchFilters
      :key="sheetSession"
      :filtros="draft"
      :categorias="categorias"
      :conteos="draftConteos"
      :rango-precio="rangoPrecio"
      @change="cambiarBorrador"
      @price="onPriceDraft"
    />

    <template #footer>
      <!-- aria-live: el lector de pantalla anuncia "Ver 4 resultados" al cambiar el borrador -->
      <div aria-live="polite">
        <BaseButton block :disabled="botonAplicar.disabled" class="tabular-nums" @click="aplicarBorrador">
          {{ botonAplicar.texto }}
        </BaseButton>
      </div>
    </template>
  </BaseBottomSheet>
</template>
