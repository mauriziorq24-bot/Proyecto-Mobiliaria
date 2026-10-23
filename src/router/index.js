import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { buscarCitaReciente } from '../utils/citasGuardadas'
import { buscarCotizacionReciente } from '../utils/cotizacionesEnviadas'
import { setPageTitle } from '../utils/pageTitle'
import { getSafeRedirect } from '../utils/redirect'
import { setNoIndex } from '../utils/robots'
import { scrollToHash } from '../utils/scrollToHash'
import HomeView from '../views/HomeView.vue'

// meta.title: título de la pestaña. Sin él (inicio) se muestra solo la marca;
// categoría, producto y búsqueda lo fijan desde su vista: dependen de la API o de la URL.
// meta.requiereSesion / meta.soloInvitados / meta.requiereAdmin: los revisa el guard de abajo.
// meta.ocultarBarraCotizacion: AppLayout no muestra la barra de cotización móvil en esa ruta.
// meta.layout: 'admin' hace que App.vue dibuje el panel en vez de la tienda (sin header ni footer).
// meta.noIndex: la página lleva <meta name="robots" content="noindex"> (ver utils/robots.js).
// Las meta de una ruta padre también valen para sus hijas: vue-router las combina en to.meta.
const routes = [
  { path: '/', name: 'home', component: HomeView },
  // Las demás vistas se cargan bajo demanda (lazy loading): solo se descargan al visitarlas.
  { path: '/categoria/:slug', name: 'category', component: () => import('../views/CategoryView.vue') },
  { path: '/producto/:id', name: 'product', component: () => import('../views/ProductView.vue'), meta: { ocultarBarraCotizacion: true } },
  { path: '/buscar', name: 'search', component: () => import('../views/SearchView.vue') },
  // Sin meta.title: la vista lo fija ("Mi cotización (3)") porque cambia con la cantidad de productos.
  { path: '/carrito', name: 'cart', component: () => import('../views/CartView.vue'), meta: { ocultarBarraCotizacion: true } },
  // Confirmación de una solicitud enviada: lee la copia guardada en este navegador (?codigo=COT-…),
  // nunca la vuelve a enviar. Sin una solicitud reciente con ese código, a la cotización.
  {
    path: '/carrito/confirmacion',
    name: 'quote-confirmation',
    component: () => import('../views/QuoteConfirmationView.vue'),
    meta: { title: 'Solicitud enviada', ocultarBarraCotizacion: true },
    beforeEnter: (to) => {
      if (!buscarCotizacionReciente(to.query.codigo)) return { name: 'cart', replace: true }
    },
  },
  // Sin meta.title: la vista lo fija ("Mis favoritos (3)"). No exige sesión: se guardan en este navegador.
  { path: '/favoritos', name: 'favorites', component: () => import('../views/FavoritesView.vue') },
  { path: '/agendar-cita', name: 'appointment', component: () => import('../views/AppointmentView.vue'), meta: { title: 'Agendar visita', requiereSesion: true, ocultarBarraCotizacion: true } },
  // Confirmación: lee la cita guardada en este navegador (?codigo=CITA-…), nunca la vuelve a enviar.
  // No exige sesión: solo muestra datos locales. Sin una cita reciente con ese código, al formulario.
  {
    path: '/agendar-cita/confirmacion',
    name: 'appointment-confirmation',
    component: () => import('../views/AppointmentConfirmationView.vue'),
    meta: { title: 'Visita agendada', ocultarBarraCotizacion: true },
    beforeEnter: (to) => {
      if (!buscarCitaReciente(to.query.codigo)) return { name: 'appointment', replace: true }
    },
  },
  // Reprogramar o cancelar las citas guardadas en este navegador. Exige sesión: PUT y DELETE piden token.
  { path: '/mi-cita', name: 'my-appointments', component: () => import('../views/MyAppointmentsView.vue'), meta: { title: 'Mis visitas', requiereSesion: true } },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: 'Ingresar', soloInvitados: true, ocultarBarraCotizacion: true } },
  { path: '/registro', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { title: 'Crear cuenta', soloInvitados: true, ocultarBarraCotizacion: true } },
  { path: '/perfil', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { title: 'Mi perfil', requiereSesion: true } },
  // Términos y condiciones + política de privacidad, en una sola página. /privacidad lleva a su sección.
  { path: '/terminos', name: 'terms', component: () => import('../views/TerminosView.vue'), meta: { title: 'Términos y condiciones' } },
  { path: '/privacidad', redirect: { name: 'terms', hash: '#privacidad' } },
  // Panel de administración. Todo se carga bajo demanda: AdminLayout y cada sección son archivos
  // aparte que el navegador solo descarga al entrar a /admin, y el guard corre antes de descargarlos,
  // así que quien no es admin no baja ni una línea del panel.
  {
    path: '/admin',
    component: () => import('../components/layout/AdminLayout.vue'),
    meta: { requiereAdmin: true, layout: 'admin', noIndex: true },
    children: [
      { path: '', name: 'admin-summary', component: () => import('../views/admin/AdminSummaryView.vue'), meta: { title: 'Resumen · Panel' } },
    ],
  },
  // Guía de estilo: muestra los tokens y componentes base del sistema de diseño.
  // Solo en desarrollo: en el build import.meta.env.DEV es false, la ruta no existe (da 404)
  // y Vite ni siquiera empaqueta StyleGuideView.
  ...(import.meta.env.DEV
    ? [{ path: '/guia-estilo', name: 'style-guide', component: () => import('../views/StyleGuideView.vue'), meta: { title: 'Guía de estilo' } }]
    : []),
  // Cualquier ruta que no coincida con las anteriores muestra la página 404.
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Página no encontrada' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Al cambiar de página (también de un producto a otro relacionado), volver arriba.
  // Con "Atrás"/"Adelante" del navegador, savedPosition trae dónde estaba la persona: se respeta.
  // Con #ancla (/terminos#privacidad) va a esa sección; dentro de la misma página, con desplazamiento suave.
  // Si solo cambia la query (un filtro de /buscar, el texto buscado) es la misma página: no se mueve.
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition
    // scrollToHash ya hizo el scroll: false le dice al router que no haga otro.
    if (to.hash && scrollToHash(to.hash, { smooth: to.path === from.path })) return false
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

// Guard de acceso: corre antes de cada navegación. Devolver una ruta redirige; no devolver nada deja pasar.
// Ojo: esto solo cuida la interfaz. Quien protege los datos de verdad es el backend (revisa el JWT en cada petición).
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Sin sesión: al login, recordando a dónde quería ir para volver después de ingresar.
  if ((to.meta.requiereSesion || to.meta.requiereAdmin) && !auth.estaSesionIniciada) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Con sesión pero sin rol de admin: al inicio. El rol llega con el perfil (GET /auth/v1/me):
  // si todavía no llegó, se espera; si falla, cuenta como "no es admin". Hoy en producción /me da 500
  // (pendiente 30 de API.md), así que nadie entra hasta que el backend lo arregle.
  if (to.meta.requiereAdmin) {
    await auth.cargarPerfil()
    if (!auth.esAdmin) return { name: 'home' }
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
  setNoIndex(Boolean(to.meta.noIndex))
})

export default router
