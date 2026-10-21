import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSafeRedirect } from '../utils/redirect'

// Login y registro comparten el ?redirect=: la ruta a la que volver después de ingresar.
// El guard del router ya quita uno externo de la URL; aquí se vuelve a validar por si acaso.
//
// Uso:
//   const { goToRedirect, linkTo } = useAuthRedirect()
//   await goToRedirect()            // tras iniciar sesión
//   <RouterLink :to="linkTo('register')">  // conserva el redirect al cambiar de pantalla
export function useAuthRedirect() {
  const route = useRoute()
  const router = useRouter()

  const redirect = computed(() => {
    const value = route.query.redirect
    return typeof value === 'string' && getSafeRedirect(value) === value ? value : null
  })

  // replace y no push: "Atrás" no debe volver al login con la sesión ya iniciada.
  function goToRedirect() {
    return router.replace(redirect.value ?? { name: 'home' })
  }

  function linkTo(name) {
    return redirect.value ? { name, query: { redirect: redirect.value } } : { name }
  }

  return { goToRedirect, linkTo }
}
