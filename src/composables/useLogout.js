import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Cerrar sesión desde cualquier parte (menú de cuenta, menú lateral, perfil).
// Si la persona está en una página que exige sesión (p. ej. /perfil), se la lleva al inicio:
// quedarse ahí mostraría datos de una sesión que ya no existe.
export function useLogout() {
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  async function logout() {
    auth.logout()
    if (route.meta.requiereSesion || route.meta.requiereAdmin) {
      await router.push({ name: 'home' })
    }
  }

  return { logout }
}
