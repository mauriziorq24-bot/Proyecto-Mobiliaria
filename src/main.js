import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { configureAuth } from './services/api'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Crear el store aquí descarta un token guardado que ya esté vencido, antes de cualquier petición.
const authStore = useAuthStore()

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

app.mount('#app')
