import { computed, ref, shallowRef } from 'vue'

// Pasado este tiempo, una carga se considera "lenta": lo normal es que el servidor
// de Render esté dormido y arrancando (cold start), que puede tardar hasta un minuto.
const SLOW_AFTER_MS = 5000

// Cuántas cargas lentas hay en curso en toda la app. Vive fuera de la función para que
// lo compartan todas las vistas: así se muestra un solo aviso aunque la portada esté
// esperando categorías y productos a la vez.
const slowCount = ref(0)

// Lo lee ServerWakeNotice (en AppLayout) para mostrar "Estamos despertando el servidor…".
export function useServerWaking() {
  return computed(() => slowCount.value > 0)
}

// Para una carga que no vive en una vista (p. ej. el perfil que espera el guard de /admin):
// si la promesa tarda más de 5 s, también enciende el aviso. Devuelve la misma promesa.
export function trackSlowLoad(promise) {
  let countedAsSlow = false
  const slowTimer = setTimeout(() => {
    countedAsSlow = true
    slowCount.value++
  }, SLOW_AFTER_MS)

  return promise.finally(() => {
    clearTimeout(slowTimer)
    if (countedAsSlow) slowCount.value--
  })
}

// Envuelve una función que devuelve una promesa (p. ej. una llamada a un servicio)
// y expone su estado: data, loading y error, más execute/retry para (re)lanzarla.
// Cada vista que carga datos repetía estas mismas tres variables y el try/catch;
// ahora viven aquí una sola vez.
//
// Uso:
//   const { data, loading, error, execute, retry } = useAsync(() => obtenerAlgo(id))
//
// Opciones:
//   immediate (true por defecto): lanza la petición al crear el composable.
export function useAsync(asyncFn, { immediate = true } = {}) {
  // shallowRef: la respuesta se reemplaza entera; no hace falta que Vue observe cada campo por dentro.
  const data = shallowRef(null)
  const loading = ref(immediate)
  const error = shallowRef(null)

  // Si se llama dos veces seguidas (p. ej. al pasar rápido de un producto a otro),
  // la respuesta vieja puede llegar después de la nueva. Cada llamada lleva un número
  // y solo la última escribe el resultado.
  let lastCall = 0
  let lastArgs = []

  async function execute(...args) {
    const call = ++lastCall
    lastArgs = args
    loading.value = true
    error.value = null

    // Cada llamada lleva su propio temporizador. Si a los 5 s sigue sin responder, suma
    // al contador global; al terminar (bien, mal o por el timeout de 60 s de api.js) resta.
    // Una llamada vieja también cuenta mientras siga pendiente: es una petición real esperando.
    let countedAsSlow = false
    const slowTimer = setTimeout(() => {
      countedAsSlow = true
      slowCount.value++
    }, SLOW_AFTER_MS)

    try {
      const result = await asyncFn(...args)
      if (call === lastCall) data.value = result
      return result
    } catch (err) {
      if (call === lastCall) error.value = err
    } finally {
      clearTimeout(slowTimer)
      if (countedAsSlow) slowCount.value--
      if (call === lastCall) loading.value = false
    }
  }

  // Reintentar = volver a llamar con los mismos argumentos de la última vez.
  function retry() {
    return execute(...lastArgs)
  }

  if (immediate) execute()

  return { data, loading, error, execute, retry }
}
