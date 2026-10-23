import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { configureAuth } from './services/api'
import { useAuthStore } from './stores/auth'
import { migrarCitasSinCuenta } from './utils/citasGuardadas'
import { migrarCotizacionesSinCuenta } from './utils/cotizacionesEnviadas'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Crear el store aquí descarta un token guardado que ya esté vencido, antes de cualquier petición.
const authStore = useAuthStore()

// Citas y cotizaciones guardadas antes de separarlas por cuenta (eran datos de prueba): pasan a la
// sesión con que se abre la app o, sin sesión, se descartan. Solo hace algo la primera vez.
migrarCitasSinCuenta(authStore.usuario?.username)
migrarCotizacionesSinCuenta(authStore.usuario?.username)

// Conecta axios con la sesión: de dónde sale el token y qué hacer si el backend lo rechaza.
configureAuth({
  getToken: () => authStore.token,
  onTokenExpired: () => authStore.logout(),
  onUnauthorized: () => {
    if (!authStore.token) return // otra petición ya cerró la sesión
    authStore.logout()

    // Al login, recordando dónde estaba la persona para volver después.
    const current = router.currentRoute.value
    if (current.name !== 'login') {
      router.push({ name: 'login', query: { redirect: current.fullPath } })
    }
  },
})

// Con la sesión ya conectada a axios: el perfil (con el rol) para el menú de cuenta y el guard de /admin.
authStore.cargarPerfil()

app.mount('#app')
