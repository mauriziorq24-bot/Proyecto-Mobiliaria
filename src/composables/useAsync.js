import { ref, shallowRef } from 'vue'

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
    try {
      const result = await asyncFn(...args)
      if (call === lastCall) data.value = result
      return result
    } catch (err) {
      if (call === lastCall) error.value = err
    } finally {
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
