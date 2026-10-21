import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { setPageTitle } from '../utils/pageTitle'
import { getSafeRedirect } from '../utils/redirect'
import HomeView from '../views/HomeView.vue'

// meta.title: título de la pestaña. Sin él (inicio) se muestra solo la marca;
// categoría, producto y búsqueda lo fijan desde su vista: dependen de la API o de la URL.
// meta.requiereSesion / meta.soloInvitados / meta.requiereAdmin: los revisa el guard de abajo.
const routes = [
  { path: '/', name: 'home', component: HomeView },
  // Las demás vistas se cargan bajo demanda (lazy loading): solo se descargan al visitarlas.
  { path: '/categoria/:slug', name: 'category', component: () => import('../views/CategoryView.vue') },
  { path: '/producto/:id', name: 'product', component: () => import('../views/ProductView.vue') },
  { path: '/buscar', name: 'search', component: () => import('../views/SearchView.vue') },
  { path: '/carrito', name: 'cart', component: () => import('../views/CartView.vue'), meta: { title: 'Mi cotización' } },
  { path: '/favoritos', name: 'favorites', component: () => import('../views/FavoritesView.vue'), meta: { title: 'Favoritos' } },
  { path: '/agendar-cita', name: 'appointment', component: () => import('../views/AppointmentView.vue'), meta: { title: 'Agendar visita' } },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: 'Ingresar', soloInvitados: true } },
  { path: '/registro', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { title: 'Crear cuenta', soloInvitados: true } },
  { path: '/perfil', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { title: 'Mi cuenta', requiereSesion: true } },
  // Guía de estilo: muestra los tokens y componentes base del sistema de diseño.
  { path: '/guia-estilo', name: 'style-guide', component: () => import('../views/StyleGuideView.vue'), meta: { title: 'Guía de estilo' } },
  // Cualquier ruta que no coincida con las anteriores muestra la página 404.
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Página no encontrada' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Al cambiar de página (también de un producto a otro relacionado), volver arriba.
  // Con "Atrás"/"Adelante" del navegador, savedPosition trae dónde estaba la persona: se respeta.
  // Si solo cambia la query (un filtro de /buscar, el texto buscado) es la misma página: no se mueve.
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

// Guard de acceso: corre antes de cada navegación. Devolver una ruta redirige; no devolver nada deja pasar.
// Ojo: esto solo cuida la interfaz. Quien protege los datos de verdad es el backend (revisa el JWT en cada petición).
router.beforeEach((to) => {
  const auth = useAuthStore()

  // Sin sesión: al login, recordando a dónde quería ir para volver después de ingresar.
  if ((to.meta.requiereSesion || to.meta.requiereAdmin) && !auth.estaSesionIniciada) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Con sesión pero sin rol de admin: al inicio. (Hoy esAdmin siempre es false: el JWT no trae rol, pendiente 8 de API.md.)
  if (to.meta.requiereAdmin && !auth.esAdmin) {
    return { name: 'home' }
  }

  // Login y registro no tienen sentido con la sesión ya iniciada.
  if (to.meta.soloInvitados && auth.estaSesionIniciada) {
    return { name: 'home' }
  }

  // Un ?redirect= externo (p. ej. /login?redirect=//sitio-falso.com) se quita de la URL:
  // así la vista de login siempre recibe uno válido o ninguno.
  const { redirect, ...otherQuery } = to.query
  if (to.meta.soloInvitados && redirect !== undefined && getSafeRedirect(redirect) !== redirect) {
    return { path: to.path, query: otherQuery, hash: to.hash, replace: true }
  }
})

// Título de la pestaña: las rutas con meta.title lo fijan aquí. Las que dependen de datos (categoría, producto)
// lo fijan desde su vista con setPageTitle cuando llega la respuesta.
router.afterEach((to) => {
  setPageTitle(to.meta.title)
})

export default router
