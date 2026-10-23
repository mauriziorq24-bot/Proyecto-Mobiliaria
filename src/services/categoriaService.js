import { categorias as mockCategorias } from '../mocks/categorias'
import { productos as mockProductos } from '../mocks/productos'
import api from './api'
import { leerErroresDeCampos } from './erroresDeCampos'

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

// ---------------------------------------------------------------------------
// Administración de categorías (panel /admin › Categorías)
//
// POST /api/v1/categorias, PUT y DELETE /api/v1/categorias/{id}: solo ADMIN. El body es
// CategoriaRequest: { nombre, descripcion }. El slug NO se envía: lo genera el backend.
// No hay GET /api/v1/categorias/{id} (da 405): para editar se busca en la lista.
// ---------------------------------------------------------------------------

export const CAMPOS_CATEGORIA = ['nombre', 'descripcion']

export const ERRORES_CATEGORIA = {
  DATOS_INVALIDOS: 'DATOS_INVALIDOS',
  TIENE_PRODUCTOS: 'TIENE_PRODUCTOS',
}

// La misma regla con la que el backend arma el slug (API.md): minúsculas, sin tildes y
// espacios → guiones. "Sillería Ergonómica" → "silleria-ergonomica".
// Es solo una vista previa: el slug que vale es el que devuelve el backend.
export function generarSlug(nombre) {
  return String(nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
}

const textoOpcional = (texto) => String(texto ?? '').trim()

function armarCategoriaRequest(form) {
  return { nombre: form.nombre.trim(), descripcion: textoOpcional(form.descripcion) }
}

function conRespuesta(status, data) {
  return Object.assign(new Error(data?.message ?? `Error ${status}`), { response: { status, data } })
}

function datosInvalidos({ cause, campos = {}, message } = {}) {
  const error = new Error(message || 'Algún dato no pasó la revisión del servidor.', { cause })
  error.code = ERRORES_CATEGORIA.DATOS_INVALIDOS
  error.campos = campos
  return error
}

const mensajeDe = (error) => String(error?.response?.data?.message ?? '')

// Al guardar: un 400 trae errores por campo (o ninguno). Un 409 es un nombre repetido
// (pendiente 14 de API.md: es lo que pedimos; hoy no sabemos qué responde): va junto al nombre.
function traducirErrorDeGuardado(error) {
  const status = error?.response?.status
  const data = error?.response?.data
  if (status === 400) {
    throw datosInvalidos({ cause: error, campos: leerErroresDeCampos(data, CAMPOS_CATEGORIA), message: data?.message })
  }
  if (status === 409) {
    const nombre = mensajeDe(error) || 'Ya existe una categoría con ese nombre.'
    throw datosInvalidos({ cause: error, campos: { nombre }, message: nombre })
  }
  throw error
}

// Al eliminar una categoría con productos, el backend no dice qué responde (pendiente 32 de API.md).
// Se reconocen: un 409 (lo que pedimos), o un 400/500 cuyo mensaje hable de productos o de la
// clave foránea (lo que suele dar Spring si la base de datos rechaza el borrado).
function tieneProductosSegunBackend(error) {
  const status = error?.response?.status
  if (status === 409) return true
  if (status !== 400 && status !== 500) return false
  return /producto|asociad|constraint|foreign|integridad|integrity/i.test(mensajeDe(error))
}

// Una categoría que no existe: 404, o 500 con "no encontrada" (como los productos, pendiente 20).
export function esCategoriaNoEncontrada(error) {
  const status = error?.response?.status
  if (status === 404) return true
  return status === 500 && /no encontrad/i.test(mensajeDe(error))
}

// --- Mocks: el "servidor" es el arreglo de src/mocks/categorias.js, así la tienda ve los cambios ---

// El mock rechaza un slug repetido con 409, para poder ver el error junto al nombre.
function mockValidar(body, id = null) {
  const slug = generarSlug(body.nombre)
  if (mockCategorias.some((c) => c.id !== id && c.slug === slug)) {
    throw conRespuesta(409, { message: 'Ya existe una categoría con ese nombre.' })
  }
}

// POST /api/v1/categorias → CategoriaResponse
export async function crearCategoria(form) {
  const body = armarCategoriaRequest(form)
  try {
    if (useMocks) {
      await fakeDelay(null, 500)
      mockValidar(body)
      const creada = { id: Math.max(0, ...mockCategorias.map((c) => c.id)) + 1, ...body, slug: generarSlug(body.nombre) }
      mockCategorias.push(creada)
      return structuredClone(creada)
    }
    const { data } = await api.post('/api/v1/categorias', body)
    return data
  } catch (error) {
    traducirErrorDeGuardado(error)
  }
}

// PUT /api/v1/categorias/{id} → CategoriaResponse
export async function actualizarCategoria(id, form) {
  const body = armarCategoriaRequest(form)
  try {
    if (useMocks) {
      await fakeDelay(null, 500)
      const index = mockCategorias.findIndex((c) => c.id === Number(id))
      if (index === -1) throw conRespuesta(404, { message: 'Categoría no encontrada' })
      mockValidar(body, Number(id))
      // El mock regenera el slug con el nombre nuevo; no sabemos si el backend lo hace (pendiente 32).
      mockCategorias[index] = { ...mockCategorias[index], ...body, slug: generarSlug(body.nombre) }
      // Los productos traen categoriaNombre: con el nombre nuevo, también cambia ahí.
      for (const p of mockProductos) if (p.categoriaId === Number(id)) p.categoriaNombre = body.nombre
      return structuredClone(mockCategorias[index])
    }
    const { data } = await api.put(`/api/v1/categorias/${id}`, body)
    return data
  } catch (error) {
    traducirErrorDeGuardado(error)
  }
}

// DELETE /api/v1/categorias/{id} → 200 con un mapa de textos (el Swagger no dice cuáles).
// Si el backend la rechaza por tener productos, el error lleva code TIENE_PRODUCTOS
// y conserva el mensaje del backend (si lo trae) en error.message.
export async function eliminarCategoria(id) {
  try {
    if (useMocks) {
      await fakeDelay(null, 500)
      const index = mockCategorias.findIndex((c) => c.id === Number(id))
      if (index === -1) throw conRespuesta(404, { message: 'Categoría no encontrada' })
      if (mockProductos.some((p) => p.categoriaId === Number(id))) {
        throw conRespuesta(409, { message: 'No se puede eliminar la categoría porque tiene productos asociados.' })
      }
      mockCategorias.splice(index, 1)
      return
    }
    await api.delete(`/api/v1/categorias/${id}`)
  } catch (error) {
    if (tieneProductosSegunBackend(error)) {
      throw Object.assign(new Error(mensajeDe(error), { cause: error }), {
        code: ERRORES_CATEGORIA.TIENE_PRODUCTOS,
        response: error.response,
      })
    }
    throw error
  }
}
