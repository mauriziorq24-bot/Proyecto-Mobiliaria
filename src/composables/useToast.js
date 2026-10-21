import { readonly, ref } from 'vue'

// Cuánto se ve un aviso antes de irse solo.
const DEFAULT_DURATION_MS = 4000

// Un solo aviso a la vez para toda la app. Vive fuera de la función para que lo compartan
// quien lo muestra (p. ej. useLogout) y AppToast, que lo dibuja en AppLayout.
const message = ref('')
let hideTimer = null

// Uso:
//   const toast = useToast()
//   toast.show('Cerraste sesión.')
export function useToast() {
  function show(text, durationMs = DEFAULT_DURATION_MS) {
    clearTimeout(hideTimer)
    message.value = text
    hideTimer = setTimeout(hide, durationMs)
  }

  function hide() {
    clearTimeout(hideTimer)
    message.value = ''
  }

  return { message: readonly(message), show, hide }
}
