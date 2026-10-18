import { categorias as mockCategorias } from '../mocks/categorias'
import api from './api'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// Simula la demora de la red para poder ver el estado "cargando" con los mocks.
function fakeDelay(data, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

// GET /api/v1/categorias → [{ id, nombre, slug, descripcion }]
export async function getCategorias() {
  if (useMocks) return fakeDelay(mockCategorias)

  const { data } = await api.get('/api/v1/categorias')
  return data
}
