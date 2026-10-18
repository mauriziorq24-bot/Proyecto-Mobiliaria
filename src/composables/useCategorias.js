import { readonly, ref } from 'vue'
import { getCategorias } from '../services/categoriaService'

// El estado vive fuera de la función: así el header y el footer comparten
// la misma lista y la petición se hace una sola vez, aunque ambos llamen a useCategorias().
const categorias = ref([])
const loading = ref(false)
const error = ref(null)
let request = null

async function load() {
  // Si ya hay una petición en curso, se reutiliza en vez de lanzar otra.
  if (request) return request

  loading.value = true
  error.value = null
  request = getCategorias()
    .then((data) => {
      categorias.value = data
    })
    .catch((err) => {
      error.value = err
      request = null // permite reintentar
    })
    .finally(() => {
      loading.value = false
    })
  return request
}

export function useCategorias() {
  load()
  return {
    categorias: readonly(categorias),
    loading: readonly(loading),
    error: readonly(error),
    retry: load,
  }
}
