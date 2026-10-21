import { computed } from 'vue'
import { getCategorias } from '../services/categoriaService'
import { useAsync } from './useAsync'

// El estado vive fuera de la función: así el header y el footer comparten
// la misma lista y la petición se hace una sola vez, aunque ambos llamen a useCategorias().
// useAsync pone loading/error (y el aviso de servidor lento) igual que en el resto de vistas.
const { data, loading, error, execute } = useAsync(getCategorias, { immediate: false })
const categorias = computed(() => data.value ?? [])
let request = null

function load() {
  // Si ya hay una petición en curso (o ya cargó bien), se reutiliza en vez de lanzar otra.
  if (request) return request

  request = execute().then(() => {
    if (error.value) request = null // permite reintentar
  })
  return request
}

export function useCategorias() {
  load()
  // computed ya es de solo lectura; loading y error se envuelven para que nadie los cambie desde fuera.
  return {
    categorias,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    retry: load,
  }
}
