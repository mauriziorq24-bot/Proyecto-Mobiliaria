<script setup>
import { LayoutDashboard, LogOut, Package, Store } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import logoUrl from '../../assets/logo-80.png'
import { useLogout } from '../../composables/useLogout'
import { useAuthStore } from '../../stores/auth'
import BaseIconButton from '../ui/BaseIconButton.vue'
import AppToast from './AppToast.vue'
import RouteAnnouncer from './RouteAnnouncer.vue'
import ServerWakeNotice from './ServerWakeNotice.vue'

// Marco del panel /admin: reemplaza al de la tienda (sin header azul, footer ni barra de cotización).
// Escritorio (≥lg): barra lateral fija con las secciones, "Ver la tienda" y la cuenta.
// Móvil y tablet: barra superior con la marca y, debajo, las secciones como pestañas subrayadas
// (el mismo gesto que la fila de categorías de la tienda).
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { logout } = useLogout()

// Secciones del panel. Cada fase agrega la suya aquí y su ruta hija en router/index.js.
// rutas: las páginas donde la sección se marca como activa (Productos también en su formulario).
const secciones = [
  { name: 'admin-summary', label: 'Resumen', icon: LayoutDashboard, rutas: ['admin-summary'] },
  { name: 'admin-products', label: 'Productos', icon: Package, rutas: ['admin-products', 'admin-product-new', 'admin-product-edit'] },
]

function esActiva(seccion) {
  return seccion.rutas.includes(route.name)
}

const username = computed(() => auth.usuario?.username ?? '')
const initial = computed(() => [...username.value][0]?.toUpperCase() ?? '')

// Si el token vence con el panel abierto, api.js cierra la sesión sin mover de página.
// Aquí no tiene sentido quedarse: al login, para volver a esta misma sección después.
watch(
  () => auth.estaSesionIniciada,
  (iniciada) => {
    if (!iniciada && route.meta.layout === 'admin') {
      router.replace({ name: 'login', query: { redirect: route.fullPath } })
    }
  },
)

// Alto de la barra superior móvil, publicado como --header-h igual que AppHeader: <html> lo usa en
// scroll-padding-top para que lo fijo no tape el foco. En escritorio la barra no existe y vale 0.
const topBar = ref(null)
let resizeObserver = null

function publishHeaderHeight() {
  document.documentElement.style.setProperty('--header-h', `${topBar.value?.offsetHeight ?? 0}px`)
}

onMounted(() => {
  resizeObserver = new ResizeObserver(publishHeaderHeight)
  resizeObserver.observe(topBar.value)
  publishHeaderHeight()
})
onBeforeUnmount(() => resizeObserver?.disconnect())

const sideLink =
  'flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-ink transition-colors duration-200 ease-out hover:bg-ground [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-ink-muted'
const sideLinkActive = 'bg-brand-tint font-bold text-brand-deep hover:bg-brand-tint [&>svg]:text-brand-deep'
</script>

<template>
  <div class="min-h-dvh bg-ground lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
    <a
      href="#contenido"
      class="sr-only z-50 rounded-md bg-surface font-semibold text-brand-deep shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:min-h-11 focus:items-center focus:px-4"
    >
      Saltar al contenido
    </a>

    <!-- Escritorio: barra lateral -->
    <aside
      class="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-3 pt-5 pb-4 lg:flex short:static short:h-auto short:min-h-dvh"
    >
      <div class="flex items-center gap-3 px-2">
        <img :src="logoUrl" alt="" width="40" height="40" class="size-10 shrink-0 rounded-md" />
        <p class="min-w-0 leading-tight">
          <span class="block font-bold text-ink">Mobiliario de Oficina</span>
          <span class="block text-small text-ink-muted">Panel de administración</span>
        </p>
      </div>

      <nav aria-label="Secciones del panel" class="mt-8 flex-1">
        <ul class="space-y-1">
          <li v-for="seccion in secciones" :key="seccion.name">
            <RouterLink
              :to="{ name: seccion.name }"
              :class="[sideLink, esActiva(seccion) && sideLinkActive]"
              :aria-current="esActiva(seccion) ? 'page' : undefined"
            >
              <component :is="seccion.icon" :stroke-width="1.75" aria-hidden="true" />
              {{ seccion.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <RouterLink to="/" :class="sideLink">
        <Store :stroke-width="1.75" aria-hidden="true" />
        Ver la tienda
      </RouterLink>

      <div class="mt-3 flex items-center gap-3 border-t border-line px-2 pt-4">
        <span
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-bold text-brand-deep"
          aria-hidden="true"
        >
          {{ initial }}
        </span>
        <p class="min-w-0 flex-1">
          <span class="block truncate font-bold text-ink" :title="username">{{ username }}</span>
          <span class="block text-small text-ink-muted">Administrador</span>
        </p>
        <BaseIconButton :icon="LogOut" label="Cerrar sesión" @click="logout" />
      </div>
    </aside>

    <!-- Móvil y tablet: barra superior fija con las secciones como pestañas -->
    <header ref="topBar" class="sticky top-0 z-30 border-b border-line bg-surface lg:hidden short:static">
      <div class="flex h-14 items-center gap-3 pr-2 pl-4 sm:pl-6">
        <img :src="logoUrl" alt="" width="32" height="32" class="size-8 shrink-0 rounded-md" />
        <p class="min-w-0 flex-1 truncate font-bold text-ink">Panel de administración</p>
        <BaseIconButton :icon="Store" label="Ver la tienda" to="/" />
        <BaseIconButton :icon="LogOut" label="Cerrar sesión" @click="logout" />
      </div>
      <nav aria-label="Secciones del panel" class="thin-scrollbar overflow-x-auto px-4 sm:px-6">
        <ul class="flex gap-6">
          <li v-for="seccion in secciones" :key="seccion.name">
            <RouterLink
              :to="{ name: seccion.name }"
              class="inline-flex h-11 items-center border-b-2 font-semibold whitespace-nowrap transition-colors duration-200 ease-out focus-visible:-outline-offset-2"
              :class="esActiva(seccion) ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'"
              :aria-current="esActiva(seccion) ? 'page' : undefined"
            >
              {{ seccion.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </header>

    <main id="contenido" tabindex="-1" class="min-w-0 focus:outline-none">
      <!-- key: crear y editar usan el mismo componente; sin la clave, pasar de uno a otro reutilizaría
           el formulario sin recargarlo ni preguntar por los cambios sin guardar. -->
      <RouterView v-slot="{ Component, route: vista }">
        <component :is="Component" :key="vista.path" />
      </RouterView>
    </main>

    <ServerWakeNotice />
    <AppToast />
    <RouteAnnouncer />
  </div>
</template>
