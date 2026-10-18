import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  // Las demás vistas se cargan bajo demanda (lazy loading): solo se descargan al visitarlas.
  { path: '/categoria/:slug', name: 'category', component: () => import('../views/CategoryView.vue') },
  { path: '/producto/:id', name: 'product', component: () => import('../views/ProductView.vue') },
  { path: '/buscar', name: 'search', component: () => import('../views/SearchView.vue') },
  { path: '/carrito', name: 'cart', component: () => import('../views/CartView.vue') },
  { path: '/favoritos', name: 'favorites', component: () => import('../views/FavoritesView.vue') },
  { path: '/agendar-cita', name: 'appointment', component: () => import('../views/AppointmentView.vue') },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/registro', name: 'register', component: () => import('../views/RegisterView.vue') },
  { path: '/perfil', name: 'profile', component: () => import('../views/ProfileView.vue') },
  // Guía de estilo: muestra los tokens y componentes base del sistema de diseño.
  { path: '/guia-estilo', name: 'style-guide', component: () => import('../views/StyleGuideView.vue') },
  // Cualquier ruta que no coincida con las anteriores muestra la página 404.
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Al cambiar de página, volver arriba (como en cualquier tienda online).
  scrollBehavior: () => ({ top: 0 }),
})

export default router
