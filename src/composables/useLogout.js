import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from './useToast'

// Cerrar sesión desde cualquier parte (menú de cuenta, menú lateral, perfil).
// Si la persona está en una página que exige sesión (p. ej. /perfil), se la lleva al inicio:
// quedarse ahí mostraría datos de una sesión que ya no existe.
// El aviso confirma que pasó: en móvil y en el perfil no hay otra señal visible (WCAG 4.1.3).
export function useLogout() {
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  async function logout() {
    auth.logout()
    if (route.meta.requiereSesion || route.meta.requiereAdmin) {
      await router.push({ name: 'home' })
    }
    toast.show('Cerraste sesión.')
  }

  return { logout }
}
