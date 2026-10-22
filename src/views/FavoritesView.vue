<script setup>
import { CalendarCheck, Check, Heart, Plus, Trash2, TriangleAlert, Undo2 } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProductCard from '../components/product/ProductCard.vue'
import ProductGrid from '../components/product/ProductGrid.vue'
import UnavailableFavoriteCard from '../components/product/UnavailableFavoriteCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseErrorState from '../components/ui/BaseErrorState.vue'
import { company } from '../config/empresa'
import { useAsync } from '../composables/useAsync'
import { useToast } from '../composables/useToast'
import { favoritosApiActiva } from '../services/favoritoService'
import { obtenerProductos } from '../services/productoService'
import { useAuthStore } from '../stores/auth'
import { CANTIDAD_MAXIMA, useCotizacionStore } from '../stores/cotizacion'
import { useFavoritosStore } from '../stores/favoritos'
import { setPageTitle } from '../utils/pageTitle'

// Mis favoritos: los productos guardados con el corazón (DESIGN.md › Favoritos).
// Viven en este navegador (store de favoritos); no hace falta sesión. Con VITE_FAVORITOS_API=true
// y sesión iniciada, además se guardan en la cuenta.

const favoritos = useFavoritosStore()
const auth = useAuthStore()
const cotizacion = useCotizacionStore()
const toast = useToast()
const route = useRoute()
const heading = useTemplateRef('heading')

// --- Título de la pestaña: "Mis favoritos (3)" (solo los disponibles, como el contador del header) ---
watch(
  () => favoritos.cantidad,
  (cantidad) => {
    if (route.name !== 'favorites') return
    setPageTitle(cantidad ? `Mis favoritos (${cantidad})` : 'Mis favoritos')
  },
  { immediate: true },
)

// --- Productos al día ---
// Una sola petición (GET /api/v1/productos, sin filtros: el catálogo completo, como pide reconciliar).
// El store solo guarda ids y una copia de respaldo: nombre y precio salen siempre de esta respuesta.
const {
  data: catalogo,
  loading,
  error,
  execute: cargarCatalogo,
} = useAsync(() => obtenerProductos(), { immediate: false })

async function cargar() {
  const productos = await cargarCatalogo()
  if (productos) favoritos.reconciliar(productos)
}

// Sin favoritos no se pide nada. Si llega uno desde otra pestaña, ahí se carga.
watch(
  () => favoritos.items.length,
  (cantidad) => {
    if (cantidad && !catalogo.value && !loading.value && !error.value) cargar()
  },
  { immediate: true },
)

// Si llegan favoritos nuevos con el catálogo ya cargado (los de la cuenta al iniciar sesión, o de
// otra pestaña), se reconcilian otra vez: así se completa su copia y se marca el que ya no exista.
watch(
  () => favoritos.items.length,
  () => {
    if (catalogo.value) favoritos.reconciliar(catalogo.value)
  },
)

// Dónde se guardan: lo dicen el encabezado y el estado vacío.
const dondeSeGuardan = computed(() => {
  if (!favoritosApiActiva) return 'Se guardan en este navegador, no necesitas cuenta.'
  return auth.estaSesionIniciada
    ? 'Se guardan en tu cuenta: los verás en cualquier dispositivo donde entres.'
    : 'Se guardan en este navegador. Si entras a tu cuenta, también los verás en otros dispositivos.'
})

// Hasta que llega la respuesta, la grilla muestra skeletons (uno por favorito, máximo 8).
const cargando = computed(() => !catalogo.value && !error.value && favoritos.items.length > 0)

const productosPorId = computed(() => new Map((catalogo.value ?? []).map((producto) => [producto.id, producto])))

// Celdas de la grilla: primero los disponibles (el más reciente primero, como los guarda el store)
// y al final los que salieron del catálogo y tienen copia para mostrarlos.
const celdasBase = computed(() => {
  const disponibles = []
  const noDisponibles = []
  for (const item of favoritos.items) {
    if (item.disponible) {
      const producto = productosPorId.value.get(item.productoId)
      if (producto) disponibles.push({ key: `producto-${producto.id}`, tipo: 'producto', producto })
    } else if (item.copia) {
      noDisponibles.push({ key: `no-disponible-${item.productoId}`, tipo: 'noDisponible', item })
    }
  }
  return [...disponibles, ...noDisponibles]
})

// Salieron del catálogo sin copia guardada (ids de la versión anterior del store): no sabemos
// cuáles eran, así que van en un solo aviso, sin tarjeta.
const sinCopia = computed(() =>
  catalogo.value ? favoritos.items.filter((item) => !item.disponible && !item.copia) : [],
)

const productosDisponibles = computed(() =>
  celdasBase.value.filter((celda) => celda.tipo === 'producto').map((celda) => celda.producto),
)
const cantidadNoDisponibles = computed(() => favoritos.items.length - favoritos.cantidad)

function productos(n) {
  return n === 1 ? '1 producto' : `${n} productos`
}

const conteo = computed(() => {
  if (!catalogo.value) return ''
  const texto = productos(favoritos.cantidad)
  if (!cantidadNoDisponibles.value) return texto
  const noDisp = cantidadNoDisponibles.value
  return `${texto} · ${noDisp} ya no ${noDisp === 1 ? 'está disponible' : 'están disponibles'}`
})

// --- Quitar con "Deshacer" (como en Mi cotización) ---
// El favorito sale del store al instante (baja el contador del header) y su celda queda unos
// segundos como "Quitado de favoritos · Deshacer", en el mismo lugar: la grilla no se reacomoda
// hasta que se va. Mientras el puntero o el foco de teclado están en ella, no se va.
const DESHACER_MS = 6000

const quitados = ref([]) // [{ id, quitado: { item, indice }, nombre, posicion }], por posición
const timers = new Map() // id → timeout
let ultimoId = 0

// Lo que lee el lector de pantalla tras quitar, deshacer o agregar todos.
const anuncio = ref('')

// Cada quitado ocupa la posición que tenía su celda en la grilla.
// Si el producto vuelve a estar en favoritos sin "Deshacer" (no se pudo quitar en la cuenta y el
// store lo devolvió, o se guardó desde otra pestaña), su celda "Quitado" ya no se muestra.
const celdas = computed(() => {
  const lista = [...celdasBase.value]
  for (const quitado of quitados.value) {
    if (favoritos.esFavorito(quitado.quitado.item.productoId)) continue
    lista.splice(Math.min(quitado.posicion, lista.length), 0, { key: `quitado-${quitado.id}`, tipo: 'quitado', quitado })
  }
  return lista
})

function programarCierre(id) {
  clearTimeout(timers.get(id))
  timers.set(id, setTimeout(() => cerrarQuitado(id), DESHACER_MS))
}

function pausarCierre(id) {
  clearTimeout(timers.get(id))
}

// Al quitar, el foco pasa a "Deshacer" también si se usó el mouse. Solo el foco de teclado
// (:focus-visible) detiene el cierre: con el mouse la celda se va a los 6 s, como se espera.
function pausarSiEsTeclado(event, id) {
  if (event.target.matches(':focus-visible')) pausarCierre(id)
}

// Saca la celda "Quitado" de la lista. Si se cierra sola, las que venían después se corren un
// lugar (ya no hay nada en ese hueco); al deshacer, no: el producto vuelve a ocupar ese lugar.
function sacarQuitado(id, { correrSiguientes }) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  const quitado = quitados.value.find((q) => q.id === id)
  if (!quitado) return
  quitados.value = quitados.value
    .filter((q) => q.id !== id)
    .map((q) => (correrSiguientes && q.posicion > quitado.posicion ? { ...q, posicion: q.posicion - 1 } : q))
}

function cerrarQuitado(id) {
  // Si el foco estaba en esa celda, no se pierde: pasa al título.
  const teniaFoco = document.getElementById(`quitado-${id}`)?.contains(document.activeElement)
  sacarQuitado(id, { correrSiguientes: true })
  // preventScroll: la celda se cierra sola; mover la página hacia el título sorprendería.
  if (teniaFoco) nextTick(() => heading.value?.focus({ preventScroll: true }))
}

// `quitado` es lo que devuelve favoritos.quitar(); `posicion`, el índice de la celda en la grilla.
function registrarQuitado(quitado, posicion, nombre) {
  if (!quitado) return
  const id = ++ultimoId
  quitados.value = [...quitados.value, { id, quitado, nombre, posicion }].sort((a, b) => a.posicion - b.posicion)
  programarCierre(id)
  anuncio.value = `Quitaste ${nombre} de tus favoritos.`
  nextTick(() => document.getElementById(`deshacer-${id}`)?.focus())
}

function quitarNoDisponible(item, posicion) {
  registrarQuitado(favoritos.quitar(item.productoId), posicion, item.copia.nombre)
}

function deshacer(q) {
  sacarQuitado(q.id, { correrSiguientes: false })
  favoritos.restaurar(q.quitado)
  anuncio.value = `Volviste a guardar ${q.nombre} en favoritos.`
  const { productoId, disponible } = q.quitado.item
  // El foco vuelve al corazón de la tarjeta (o al nombre, si ya no está disponible).
  nextTick(() => {
    const destino = disponible
      ? document.querySelector(`[data-favorito-de="${productoId}"]`)
      : document.getElementById(`favorito-nd-${productoId}`)
    destino?.focus()
  })
}

onBeforeUnmount(() => timers.forEach(clearTimeout))

// Los que no tienen copia no se pueden deshacer uno por uno (no sabemos cuáles eran): se quitan juntos.
function quitarSinCopia() {
  const cantidad = sinCopia.value.length
  for (const item of sinCopia.value) favoritos.quitar(item.productoId)
  toast.show(
    cantidad === 1
      ? 'Quitamos el favorito que ya no estaba en el catálogo.'
      : `Quitamos los ${cantidad} favoritos que ya no estaban en el catálogo.`,
  )
  nextTick(() => heading.value?.focus())
}

// --- Agregar a la cotización ---
// Uno por uno: suma 1 unidad, igual que en la ficha (si ya estaba, 3 + 1 = 4).
// El producto se queda en favoritos: la lista sirve para recordar; la cotización, para pedir.
const AGREGADO_MS = 2000
const recienAgregado = ref(null) // id del último agregado: su botón muestra "Agregado" un momento
let agregadoTimer = null

onBeforeUnmount(() => clearTimeout(agregadoTimer))

const verCotizacion = { label: 'Ver mi cotización', to: '/carrito' }

function agregarUno(producto) {
  const antes = cotizacion.cantidadDe(producto.id)
  cotizacion.agregar(producto, 1)
  // El store no pasa de CANTIDAD_MAXIMA: puede que no se haya sumado nada.
  if (cotizacion.cantidadDe(producto.id) === antes) {
    toast.show(`Ya tienes el máximo (${CANTIDAD_MAXIMA}) de este producto en tu cotización.`, { action: verCotizacion })
    return
  }
  recienAgregado.value = producto.id
  clearTimeout(agregadoTimer)
  agregadoTimer = setTimeout(() => (recienAgregado.value = null), AGREGADO_MS)
  toast.show('Agregado a tu cotización', { tone: 'success', action: verCotizacion })
}

// Todos: solo los que todavía no están en la cotización (los que ya están no se tocan: no se
// sube una cantidad sin que la persona lo vea). Los no disponibles nunca se agregan.
const faltantes = computed(() => productosDisponibles.value.filter((producto) => !cotizacion.cantidadDe(producto.id)))

const accionesEncabezado = useTemplateRef('accionesEncabezado')

function agregarTodos() {
  const agregados = faltantes.value.length
  const yaEstaban = productosDisponibles.value.length - agregados
  for (const producto of faltantes.value) cotizacion.agregar(producto, 1)

  const mensaje = yaEstaban
    ? `Agregamos ${agregados} a tu cotización · ${yaEstaban} ya ${yaEstaban === 1 ? 'estaba' : 'estaban'}`
    : `Agregamos ${productos(agregados)} a tu cotización`
  toast.show(mensaje, { tone: 'success', action: verCotizacion })
  // El botón se convierte en "Ver mi cotización": el foco pasa a ese enlace para no perderse.
  nextTick(() => accionesEncabezado.value?.querySelector('a')?.focus())
}

const sinFavoritos = computed(() => !favoritos.items.length && !quitados.value.length)
</script>

<template>
  <!-- Encabezado: título, de dónde salen los favoritos, cantidad y "Agregar todos" -->
  <section aria-labelledby="favoritos-title" class="border-b border-line bg-surface">
    <div class="container-page flex flex-col gap-4 py-6 sm:flex-row sm:items-end sm:justify-between md:py-8">
      <div class="min-w-0">
        <h1 id="favoritos-title" ref="heading" tabindex="-1" class="text-headline text-balance focus:outline-none">
          Mis favoritos
        </h1>
        <p v-if="!sinFavoritos" class="mt-2 max-w-[60ch] text-ink-muted">
          {{ dondeSeGuardan }}
        </p>
        <!-- aria-live: al quitar uno, el lector de pantalla anuncia la nueva cantidad -->
        <p v-if="!sinFavoritos" class="mt-4 min-h-5 text-small font-semibold text-ink tabular-nums" aria-live="polite">
          {{ conteo }}
        </p>
      </div>

      <!-- Con 2 o más por agregar: "Agregar todos". Si ya están todos: "Ver mi cotización".
           Con uno solo por agregar basta el botón de su tarjeta. -->
      <div v-if="catalogo" ref="accionesEncabezado" class="shrink-0">
        <BaseButton
          v-if="faltantes.length >= 2"
          variant="secondary"
          class="max-sm:w-full"
          @click="agregarTodos"
        >
          <template #icon-left><Plus /></template>
          Agregar todos a mi cotización
        </BaseButton>
        <BaseButton
          v-else-if="productosDisponibles.length && !faltantes.length"
          variant="secondary"
          to="/carrito"
          class="max-sm:w-full"
        >
          Ver mi cotización
        </BaseButton>
      </div>
    </div>
  </section>

  <section aria-labelledby="favoritos-lista-title" class="container-page py-8 md:py-10">
    <h2 id="favoritos-lista-title" class="sr-only">Productos guardados</h2>

    <!-- Vacío: cómo se guarda un favorito -->
    <div v-if="sinFavoritos" class="max-w-3xl rounded-md border border-line bg-surface px-5 py-8 sm:px-8 sm:py-10">
      <Heart class="size-10 text-ink-muted" :stroke-width="1.5" aria-hidden="true" />
      <h3 class="mt-4 text-title text-ink">Aún no tienes favoritos</h3>
      <p class="mt-2 max-w-[55ch] text-ink-muted">
        Toca el
        <Heart class="inline size-[1.1em] -translate-y-px align-middle text-ink" :stroke-width="2" aria-hidden="true" /><span
          class="sr-only"
          >corazón</span
        >
        de cualquier producto para guardarlo aquí y encontrarlo después. {{ dondeSeGuardan }}
      </p>
      <BaseButton to="/buscar" class="mt-6 max-sm:w-full">Ver catálogo</BaseButton>

      <div class="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-card-title text-ink">¿Prefieres verlos en persona?</p>
          <p class="mt-1 text-small text-ink-muted">Ven a nuestro showroom en {{ company.showroom.address }}.</p>
        </div>
        <BaseButton to="/agendar-cita" variant="visit" class="max-sm:w-full">
          <template #icon-left><CalendarCheck /></template>
          Agendar visita
        </BaseButton>
      </div>
    </div>

    <!-- Error: sin la respuesta no tenemos nombres ni precios que mostrar. Los favoritos siguen guardados. -->
    <BaseErrorState
      v-else-if="error && !catalogo"
      title="No pudimos cargar tus favoritos"
      :error="error"
      subject="tus favoritos"
      @retry="cargar"
    />

    <template v-else>
      <!-- Salieron del catálogo sin copia guardada: un solo aviso, sin tarjeta -->
      <div
        v-if="sinCopia.length"
        class="mb-6 flex max-w-[70ch] flex-col items-start gap-3 rounded-md bg-warning-bg px-3.5 py-3 text-small text-ink sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="flex items-start gap-2">
          <TriangleAlert class="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
          <template v-if="sinCopia.length === 1">Un favorito ya no está en el catálogo.</template>
          <template v-else>{{ sinCopia.length }} favoritos ya no están en el catálogo.</template>
        </p>
        <BaseButton variant="secondary" size="sm" class="shrink-0" @click="quitarSinCopia">
          <template #icon-left><Trash2 /></template>
          {{ sinCopia.length === 1 ? 'Quitarlo' : 'Quitarlos' }}
        </BaseButton>
      </div>

      <ProductGrid
        v-if="cargando || celdas.length"
        :productos="celdas"
        :loading="cargando"
        :skeleton-count="Math.min(favoritos.items.length, 8)"
        :item-key="(celda) => celda.key"
      >
        <template #card="{ item: celda, index }">
          <ProductCard
            v-if="celda.tipo === 'producto'"
            :producto="celda.producto"
            @favorito-quitado="registrarQuitado($event, index, celda.producto.nombre)"
          >
            <template #actions>
              <div class="relative z-10 mt-3">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  block
                  wrap
                  :aria-label="`Agregar ${celda.producto.nombre} a mi cotización`"
                  @click="agregarUno(celda.producto)"
                >
                  <template #icon-left>
                    <Check v-if="recienAgregado === celda.producto.id" />
                    <Plus v-else />
                  </template>
                  {{ recienAgregado === celda.producto.id ? 'Agregado' : 'Agregar a mi cotización' }}
                </BaseButton>
                <!-- La línea reserva su alto aunque esté vacía: así las tarjetas de una fila quedan alineadas -->
                <p class="mt-1.5 min-h-[1.4em] text-small text-ink-muted">
                  <template v-if="cotizacion.cantidadDe(celda.producto.id)">
                    En tu cotización (<span class="tabular-nums">{{ cotizacion.cantidadDe(celda.producto.id) }}</span>)
                  </template>
                </p>
              </div>
            </template>
          </ProductCard>

          <UnavailableFavoriteCard
            v-else-if="celda.tipo === 'noDisponible'"
            :item="celda.item"
            @remove="quitarNoDisponible(celda.item, index)"
          />

          <!-- "Quitado de favoritos · Deshacer", en el lugar que tenía la tarjeta -->
          <div
            v-else
            :id="`quitado-${celda.quitado.id}`"
            class="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-line bg-ground px-3 py-6 text-center motion-safe:animate-fade-in"
            @mouseenter="pausarCierre(celda.quitado.id)"
            @mouseleave="programarCierre(celda.quitado.id)"
            @focusin="pausarSiEsTeclado($event, celda.quitado.id)"
            @focusout="programarCierre(celda.quitado.id)"
          >
            <p class="text-small">
              <span class="block font-semibold text-ink">Quitado de favoritos</span>
              <span class="mt-1 line-clamp-2 text-ink-muted">{{ celda.quitado.nombre }}</span>
            </p>
            <BaseButton
              :id="`deshacer-${celda.quitado.id}`"
              variant="ghost"
              size="sm"
              :aria-label="`Deshacer: volver a guardar ${celda.quitado.nombre}`"
              @click="deshacer(celda.quitado)"
            >
              <template #icon-left><Undo2 /></template>
              Deshacer
            </BaseButton>
          </div>
        </template>
      </ProductGrid>

      <!-- Solo quedaban favoritos sin copia y se ven en el aviso de arriba -->
      <p v-else-if="sinCopia.length" class="text-ink-muted">
        Busca otros productos en el
        <RouterLink to="/buscar" class="font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper">
          catálogo</RouterLink
        >.
      </p>
    </template>

    <!-- Lo anuncia el lector de pantalla al quitar o deshacer -->
    <p role="status" class="sr-only">{{ anuncio }}</p>
  </section>
</template>
