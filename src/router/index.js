import { createRouter, createWebHistory } from 'vue-router'
import { setPageTitle } from '../utils/pageTitle'
import HomeView from '../views/HomeView.vue'

// meta.title: título de la pestaña. Sin él (inicio) se muestra solo la marca;
// categoría y producto lo fijan desde su vista, porque el nombre llega con la API.
const routes = [
  { path: '/', name: 'home', component: HomeView },
  // Las demás vistas se cargan bajo demanda (lazy loading): solo se descargan al visitarlas.
  { path: '/categoria/:slug', name: 'category', component: () => import('../views/CategoryView.vue') },
  { path: '/producto/:id', name: 'product', component: () => import('../views/ProductView.vue') },
  { path: '/buscar', name: 'search', component: () => import('../views/SearchView.vue'), meta: { title: 'Buscar' } },
  { path: '/carrito', name: 'cart', component: () => import('../views/CartView.vue'), meta: { title: 'Mi cotización' } },
  { path: '/favoritos', name: 'favorites', component: () => import('../views/FavoritesView.vue'), meta: { title: 'Favoritos' } },
  { path: '/agendar-cita', name: 'appointment', component: () => import('../views/AppointmentView.vue'), meta: { title: 'Agendar visita' } },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: 'Ingresar' } },
  { path: '/registro', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { title: 'Crear cuenta' } },
  { path: '/perfil', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { title: 'Mi cuenta' } },
  // Guía de estilo: muestra los tokens y componentes base del sistema de diseño.
  { path: '/guia-estilo', name: 'style-guide', component: () => import('../views/StyleGuideView.vue'), meta: { title: 'Guía de estilo' } },
  // Cualquier ruta que no coincida con las anteriores muestra la página 404.
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Página no encontrada' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Al cambiar de página, volver arriba (como en cualquier tienda online).
  scrollBehavior: () => ({ top: 0 }),
})

// Título de la pestaña: las rutas con meta.title lo fijan aquí. Las que dependen de datos (categoría, producto)
// lo fijan desde su vista con setPageTitle cuando llega la respuesta.
router.afterEach((to) => {
  setPageTitle(to.meta.title)
})

export default router
