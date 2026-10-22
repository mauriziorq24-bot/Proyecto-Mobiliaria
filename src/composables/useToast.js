import { readonly, ref } from 'vue'

// Cuánto se ve un aviso antes de irse solo.
const DEFAULT_DURATION_MS = 4000

// Un solo aviso a la vez para toda la app. Vive fuera de la función para que lo compartan
// quien lo muestra (p. ej. useLogout) y AppToast, que lo dibuja en AppLayout.
// tone: 'neutral' (píldora Tinta) o 'success' (fondo Éxito).
// action: enlace opcional dentro del aviso, { label, to }.
const toast = ref({ message: '', tone: 'neutral', action: null })
let hideTimer = null
let currentDuration = DEFAULT_DURATION_MS

// Uso:
//   const toast = useToast()
//   toast.show('Cerraste sesión.')
//   toast.show('Tu sesión venció…', 6000)
//   toast.show('Agregado a tu cotización', { tone: 'success', action: { label: 'Ver mi cotización', to: '/carrito' } })
export function useToast() {
  function show(text, options = {}) {
    // Se acepta también solo la duración como número (así lo usaban las primeras llamadas).
    const { duration = DEFAULT_DURATION_MS, tone = 'neutral', action = null } =
      typeof options === 'number' ? { duration: options } : options
    toast.value = { message: text, tone, action }
    currentDuration = duration
    startTimer()
  }

  function hide() {
    clearTimeout(hideTimer)
    toast.value = { message: '', tone: 'neutral', action: null }
  }

  function startTimer() {
    clearTimeout(hideTimer)
    hideTimer = setTimeout(hide, currentDuration)
  }

  // Un aviso con enlace no debe irse mientras la persona apunta o llega a él con el teclado:
  // AppToast llama a pause() al entrar y a resume() al salir (el conteo vuelve a empezar).
  function pause() {
    clearTimeout(hideTimer)
  }

  function resume() {
    if (toast.value.message) startTimer()
  }

  return { toast: readonly(toast), show, hide, pause, resume }
}
