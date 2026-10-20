import { productos as mockProductos } from '../mocks/productos'
import api from './api'
import { getCategorias } from './categoriaService'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// Simula la demora de la red para poder ver el estado "cargando" con los mocks.
function fakeDelay(data, ms = 400) {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

// Minúsculas y sin tildes: así "silleria" encuentra "Sillería".
function normalize(text) {
  return (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// Error con la misma forma que lanza axios, para que las vistas lo traten igual en ambos modos.
function notFoundError(message) {
  const error = new Error(message)
  error.response = { status: 404, data: { message } }
  return error
}

// Imita en los mocks los filtros que el backend ya hace: buscar, tipoEspacio y enShowroom.
function applyBackendFilters(list, { buscar, tipoEspacio, enShowroom }) {
  const term = normalize(buscar)
  return list.filter((p) => {
    if (term && !normalize(`${p.nombre} ${p.descripcion}`).includes(term)) return false
    if (tipoEspacio && p.tipoEspacio !== tipoEspacio) return false
    if (enShowroom !== undefined && enShowroom !== null && p.enShowroom !== enShowroom) return false
    return true
  })
}

// TODO: reemplazar por ?categoria=slug cuando el backend lo soporte (pendiente 2 de API.md).
// Mientras tanto se busca la categoría por slug y se compara por categoriaId;
// si el producto trae categoriaId null (pendiente 3), se usa categoriaNombre como respaldo.
async function filterByCategory(list, categoriaSlug) {
  const categorias = await getCategorias()
  const categoria = categorias.find((c) => c.slug === categoriaSlug)
  if (!categoria) return []

  return list.filter((p) =>
    p.categoriaId != null
      ? p.categoriaId === categoria.id
      : normalize(p.categoriaNombre) === normalize(categoria.nombre),
  )
}

// GET /api/v1/productos?buscar=&tipoEspacio=&enShowroom= → [ProductoResponse]
// Todos los filtros son opcionales. categoriaSlug se resuelve aquí (el backend aún no lo acepta).
export async function obtenerProductos({ buscar, tipoEspacio, enShowroom, categoriaSlug } = {}) {
  let productos

  if (useMocks) {
    productos = applyBackendFilters(await fakeDelay(mockProductos), { buscar, tipoEspacio, enShowroom })
  } else {
    // axios omite los parámetros undefined, así que solo viajan los filtros que se usen.
    const { data } = await api.get('/api/v1/productos', {
      params: { buscar: buscar || undefined, tipoEspacio: tipoEspacio || undefined, enShowroom },
    })
    productos = data
  }

  return categoriaSlug ? filterByCategory(productos, categoriaSlug) : productos
}

// GET /api/v1/productos/{id} → ProductoResponse
export async function obtenerProductoPorId(id) {
  if (useMocks) {
    const producto = mockProductos.find((p) => p.id === Number(id))
    await fakeDelay(null)
    if (!producto) throw notFoundError('Producto no encontrado')
    return structuredClone(producto)
  }

  const { data } = await api.get(`/api/v1/productos/${id}`)
  return data
}
