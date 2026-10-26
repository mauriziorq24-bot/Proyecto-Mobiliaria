<script setup>
import { ChevronDown, Package, Pencil, Plus, Search, SearchX, Trash2 } from 'lucide-vue-next'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseBadge from '../../components/ui/BaseBadge.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseConfirmDialog from '../../components/ui/BaseConfirmDialog.vue'
import BaseErrorState from '../../components/ui/BaseErrorState.vue'
import BaseFormError from '../../components/ui/BaseFormError.vue'
import BaseIconButton from '../../components/ui/BaseIconButton.vue'
import BaseInput from '../../components/ui/BaseInput.vue'
import { useAsync } from '../../composables/useAsync'
import { useDebounce } from '../../composables/useDebounce'
import { useToast } from '../../composables/useToast'
import { estiloTipoEspacio, TIPOS_ESPACIO } from '../../config/tiposEspacio'
import { getCategorias } from '../../services/categoriaService'
import { FORBIDDEN_MESSAGE, isForbidden, submitErrorMessage } from '../../services/errorMessages'
import { eliminarProducto, esProductoNoEncontrado, filtrarProductos, obtenerProductos } from '../../services/productoService'
import { formatearPrecio } from '../../utils/formato'

// Lista de productos del panel. La búsqueda y los filtros son los de /buscar (filtrarProductos,
// Fase 4): texto palabra por palabra sin tildes en nombre, descripción, material y categoría.
// Los filtros viven en la URL (?q=&categoria=&tipoEspacio=&enShowroom=true): al volver del
// formulario con "Atrás" se conservan.
const route = useRoute()
const router = useRouter()
const toast = useToast()

const carga = useAsync(() => Promise.all([obtenerProductos(), getCategorias()]))
const productos = computed(() => carga.data.value?.[0] ?? [])
const categorias = computed(() => carga.data.value?.[1] ?? [])

// --- Filtros ---
const texto = (valor) => (typeof valor === 'string' ? valor : '')
const filtros = reactive({
  q: texto(route.query.q),
  categoria: texto(route.query.categoria) || null,
  tipoEspacio: TIPOS_ESPACIO.some((t) => t.valor === route.query.tipoEspacio) ? route.query.tipoEspacio : null,
  enShowroom: route.query.enShowroom === 'true',
})

// Los valores por defecto no se escriben en la URL. replace: filtrar no llena el historial.
watch(filtros, () => {
  const query = {}
  if (filtros.q.trim()) query.q = filtros.q
  if (filtros.categoria) query.categoria = filtros.categoria
  if (filtros.tipoEspacio) query.tipoEspacio = filtros.tipoEspacio
  if (filtros.enShowroom) query.enShowroom = 'true'
  router.replace({ query })
})

const hayFiltros = computed(() => Boolean(filtros.q.trim() || filtros.categoria || filtros.tipoEspacio || filtros.enShowroom))

function limpiarFiltros() {
  Object.assign(filtros, { q: '', categoria: null, tipoEspacio: null, enShowroom: false })
}

// Con texto, por relevancia (como /buscar). Sin texto, los más nuevos primero: así lo recién
// creado aparece arriba al volver del formulario.
const resultado = computed(() => {
  const lista = filtrarProductos(productos.value, filtros, categorias.value)
  return filtros.q.trim() ? lista : [...lista].sort((a, b) => b.id - a.id)
})

const numero = new Intl.NumberFormat('es-VE')
const resumen = computed(() => {
  const total = productos.value.length
  const enShowroom = productos.value.filter((p) => p.enShowroom === true).length
  const base = `${numero.format(total)} ${total === 1 ? 'producto' : 'productos'} · ${numero.format(enShowroom)} en showroom`
  return hayFiltros.value ? `Mostrando ${numero.format(resultado.value.length)} de ${base}` : base
})

// Al filtrar, el lector de pantalla dice cuántos coinciden, una sola vez y cuando la persona
// deja de escribir. El resumen visible no lleva aria-live: la búsqueda filtra con cada tecla y
// se leería "Mostrando 12 de 41 productos · 12 en showroom" por cada letra.
// null = nada que anunciar (sin filtros o sin datos todavía).
const coincidencias = useDebounce(() => (carga.data.value && hayFiltros.value ? resultado.value.length : null), 600)
const anuncioFiltro = computed(() => {
  const n = coincidencias.value
  if (n === null) return ''
  if (n === 0) return 'Ningún producto coincide.'
  return `${numero.format(n)} ${n === 1 ? 'producto coincide' : 'productos coinciden'}.`
})

// --- Eliminar ---
const aEliminar = ref(null)
const eliminacion = useAsync((id) => eliminarProducto(id), { immediate: false })

const errorEliminar = computed(() => {
  const error = eliminacion.error.value
  if (!error) return ''
  if (isForbidden(error)) return FORBIDDEN_MESSAGE
  return submitErrorMessage(error, 'eliminar el producto')
})

function pedirEliminar(producto) {
  eliminacion.error.value = null
  aEliminar.value = producto
}

function quitarDeLaLista(id) {
  carga.data.value = [productos.value.filter((p) => p.id !== id), categorias.value]
}

async function confirmarEliminar() {
  const producto = aEliminar.value
  await eliminacion.execute(producto.id)
  const error = eliminacion.error.value
  // Si ya no existía, el resultado es el mismo que se buscaba: sale de la lista.
  if (error && !esProductoNoEncontrado(error)) return

  eliminacion.error.value = null
  aEliminar.value = null
  quitarDeLaLista(producto.id)
  toast.show(error ? `«${producto.nombre}» ya no estaba en el catálogo.` : `Eliminamos «${producto.nombre}».`, { tone: 'success' })
  // El botón que abrió el diálogo ya no existe: el foco va al título.
  await nextTick()
  document.getElementById('productos-titulo')?.focus()
}

// --- Estilos ---
const selectClass =
  'h-[46px] w-full cursor-pointer appearance-none rounded-md border border-line-strong bg-surface pr-9 pl-3.5 text-base text-ink transition-[border-color,box-shadow] duration-200 ease-out hover:border-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none focus-visible:outline-none'

function imagenDe(producto) {
  return producto.imagenes?.[0] || '/placeholder-producto.svg'
}

function onImageError(event) {
  if (!event.target.src.endsWith('/placeholder-producto.svg')) event.target.src = '/placeholder-producto.svg'
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 pt-8 pb-12 sm:px-6 lg:px-10 lg:pt-10">
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 id="productos-titulo" tabindex="-1" class="text-headline text-ink focus:outline-none">Productos</h1>
        <p class="mt-1 text-ink-muted tabular-nums">
          <template v-if="carga.data.value">{{ resumen }}</template>
          <template v-else>El catálogo de la tienda.</template>
        </p>
      </div>
      <BaseButton :to="{ name: 'admin-product-new' }">
        <template #icon-left><Plus /></template>
        Nuevo producto
      </BaseButton>
    </div>

    <!-- Buscar y filtrar -->
    <div class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]">
      <div class="col-span-2 md:col-span-1">
        <BaseInput
          v-model="filtros.q"
          label="Buscar productos"
          hide-label
          type="search"
          autocomplete="off"
          placeholder="Buscar por nombre, material o categoría"
        >
          <template #leading><Search /></template>
        </BaseInput>
      </div>
      <div class="relative">
        <label for="productos-categoria" class="sr-only">Categoría</label>
        <select id="productos-categoria" v-model="filtros.categoria" :class="selectClass">
          <option :value="null">Todas las categorías</option>
          <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.slug">{{ categoria.nombre }}</option>
        </select>
        <ChevronDown class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      </div>
      <div class="relative">
        <label for="productos-ambiente" class="sr-only">Ambiente</label>
        <select id="productos-ambiente" v-model="filtros.tipoEspacio" :class="selectClass">
          <option :value="null">Todos los ambientes</option>
          <option v-for="tipo in TIPOS_ESPACIO" :key="tipo.valor" :value="tipo.valor">{{ tipo.etiqueta }}</option>
        </select>
        <ChevronDown class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      </div>
      <label
        class="col-span-2 flex h-[46px] cursor-pointer items-center gap-2.5 rounded-md border px-3.5 font-semibold whitespace-nowrap transition-colors duration-200 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand md:col-span-1"
        :class="filtros.enShowroom ? 'border-brand-deep bg-brand-tint text-brand-deep' : 'border-line-strong bg-surface text-ink hover:bg-ground'"
      >
        <input v-model="filtros.enShowroom" type="checkbox" class="size-4 accent-brand-deep" />
        <span class="size-2.5 shrink-0 rounded-full bg-showroom-gold" aria-hidden="true" />
        Solo en showroom
      </label>
    </div>

    <!-- Cargando -->
    <ul v-if="carga.loading.value" class="mt-4 divide-y divide-line rounded-md border border-line bg-surface" aria-busy="true">
      <li class="sr-only">Cargando los productos…</li>
      <li v-for="n in 6" :key="n" class="flex items-center gap-3 px-3 py-3 sm:px-4" aria-hidden="true">
        <div class="aspect-[4/5] w-12 shrink-0 animate-pulse rounded-sm bg-line" />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-3.5 w-3/5 animate-pulse rounded-sm bg-line" />
          <div class="h-3 w-2/5 animate-pulse rounded-sm bg-ground" />
        </div>
        <div class="h-4 w-14 animate-pulse rounded-sm bg-line" />
      </li>
    </ul>

    <div v-else-if="carga.error.value" class="mt-4">
      <BaseErrorState title="No pudimos cargar los productos" :error="carga.error.value" subject="los productos" @retry="carga.retry()" />
    </div>

    <!-- Catálogo vacío -->
    <div v-else-if="!productos.length" class="mt-4 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center">
      <Package class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <p class="mt-3 text-card-title text-ink">Aún no hay productos</p>
      <p class="mt-1 max-w-[45ch] text-small text-ink-muted">Crea el primero: aparece en la tienda apenas lo guardas.</p>
      <BaseButton class="mt-5" :to="{ name: 'admin-product-new' }">
        <template #icon-left><Plus /></template>
        Nuevo producto
      </BaseButton>
    </div>

    <!-- Sin resultados -->
    <div v-else-if="!resultado.length" class="mt-4 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center">
      <SearchX class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <p class="mt-3 text-card-title text-ink">Ningún producto coincide</p>
      <p class="mt-1 max-w-[45ch] text-small text-ink-muted">Revisa lo que escribiste o quita algún filtro.</p>
      <BaseButton variant="secondary" class="mt-5" @click="limpiarFiltros">Limpiar filtros</BaseButton>
    </div>

    <template v-else>
      <div v-if="hayFiltros" class="mt-3 flex justify-end">
        <!-- El ::before lleva el área de toque a 44px sin separar más la lista (como BaseButton sm) -->
        <button
          type="button"
          class="relative min-h-9 text-small font-semibold text-brand-deep underline underline-offset-2 before:absolute before:inset-x-0 before:-inset-y-1 hover:text-brand-deeper"
          @click="limpiarFiltros"
        >
          Limpiar filtros
        </button>
      </div>

      <!-- Escritorio y tablet: tabla -->
      <div class="mt-4 hidden overflow-hidden rounded-md border border-line bg-surface md:block">
        <table class="w-full text-left">
          <caption class="sr-only">Productos del catálogo</caption>
          <thead class="border-b border-line bg-ground">
            <tr class="text-label text-ink-muted uppercase">
              <th scope="col" class="px-4 py-3">Producto</th>
              <th scope="col" class="px-4 py-3">Ambiente</th>
              <th scope="col" class="px-4 py-3 text-right">Precio ref.</th>
              <th scope="col" class="px-4 py-3">Showroom</th>
              <th scope="col" class="px-4 py-3 text-right"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="producto in resultado" :key="producto.id" class="transition-colors duration-200 ease-out hover:bg-ground/60">
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-3">
                  <img :src="imagenDe(producto)" alt="" width="40" height="50" loading="lazy" class="aspect-[4/5] w-10 shrink-0 rounded-sm bg-ground object-cover object-center" @error="onImageError" />
                  <div class="min-w-0">
                    <RouterLink
                      :to="{ name: 'admin-product-edit', params: { id: producto.id } }"
                      class="line-clamp-2 font-semibold text-ink hover:text-brand-deep hover:underline hover:underline-offset-2"
                    >
                      {{ producto.nombre }}
                    </RouterLink>
                    <p class="text-small text-ink-muted">{{ producto.categoriaNombre || 'Sin categoría' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-2.5">
                <span v-if="producto.tipoEspacio" class="inline-flex items-center gap-2 text-small text-ink whitespace-nowrap">
                  <span class="grid size-5 place-items-center rounded-sm" :class="estiloTipoEspacio(producto.tipoEspacio).swatchClass" aria-hidden="true">
                    <component :is="estiloTipoEspacio(producto.tipoEspacio).icon" class="size-3" :stroke-width="2" />
                  </span>
                  {{ estiloTipoEspacio(producto.tipoEspacio).etiqueta }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right font-semibold whitespace-nowrap text-ink tabular-nums">
                {{ formatearPrecio(producto.precioReferencialUsd) }}
              </td>
              <td class="px-4 py-2.5">
                <BaseBadge v-if="producto.enShowroom" variant="showroom">En showroom</BaseBadge>
                <span v-else class="text-small text-ink-muted">No</span>
              </td>
              <td class="px-2 py-2.5">
                <div class="flex justify-end">
                  <BaseIconButton :icon="Pencil" :label="`Editar ${producto.nombre}`" :to="{ name: 'admin-product-edit', params: { id: producto.id } }" />
                  <BaseIconButton :icon="Trash2" :label="`Eliminar ${producto.nombre}`" class="hover:bg-error-bg! hover:text-error!" @click="pedirEliminar(producto)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Móvil: tarjetas -->
      <ul class="mt-4 divide-y divide-line rounded-md border border-line bg-surface md:hidden">
        <li v-for="producto in resultado" :key="producto.id" class="relative flex gap-3 p-3">
          <img :src="imagenDe(producto)" alt="" width="64" height="80" loading="lazy" class="aspect-[4/5] w-16 shrink-0 rounded-sm bg-ground object-cover object-center" @error="onImageError" />
          <div class="flex min-w-0 flex-1 flex-col">
            <!-- Enlace estirado: toda la tarjeta lleva a editar -->
            <RouterLink
              :to="{ name: 'admin-product-edit', params: { id: producto.id } }"
              class="line-clamp-2 font-semibold text-ink after:absolute after:inset-0 after:content-['']"
            >
              {{ producto.nombre }}
            </RouterLink>
            <p class="text-small text-ink-muted">
              {{ producto.categoriaNombre || 'Sin categoría' }}<template v-if="producto.tipoEspacio"> · {{ estiloTipoEspacio(producto.tipoEspacio).etiqueta }}</template>
            </p>
            <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5">
              <span class="font-bold text-ink tabular-nums">{{ formatearPrecio(producto.precioReferencialUsd) }}</span>
              <BaseBadge v-if="producto.enShowroom" variant="showroom">En showroom</BaseBadge>
            </div>
          </div>
          <BaseIconButton
            :icon="Trash2"
            :label="`Eliminar ${producto.nombre}`"
            class="relative z-10 -mr-1 self-start hover:bg-error-bg! hover:text-error!"
            @click="pedirEliminar(producto)"
          />
        </li>
      </ul>
    </template>

    <BaseConfirmDialog
      :open="aEliminar !== null"
      :title="aEliminar ? `¿Eliminar «${aEliminar.nombre}»?` : ''"
      confirm-label="Sí, eliminar producto"
      cancel-label="No, mantenerlo"
      :loading="eliminacion.loading.value"
      @confirm="confirmarEliminar"
      @close="aEliminar = null"
    >
      <p>Sale del catálogo de la tienda y no se puede deshacer. Quien lo tenga en su cotización o en favoritos lo verá como «Ya no está disponible».</p>
      <template #error>
        <div v-if="errorEliminar" class="mt-4"><BaseFormError>{{ errorEliminar }}</BaseFormError></div>
      </template>
    </BaseConfirmDialog>

    <p class="sr-only" role="status">{{ anuncioFiltro }}</p>
  </div>
</template>
