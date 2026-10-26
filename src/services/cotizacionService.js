import { MOCK_SIN_PERMISO_COTIZACIONES } from '../mocks/auth'
import {
  MOCK_COTIZACION_FALLA,
  mockCambiarEstadoCotizacion,
  mockCotizacionCreada,
  mockCotizacionesAdmin,
} from '../mocks/cotizaciones'
import { ESTADOS_COTIZACION } from '../utils/formato'
import { decodeJwtPayload } from '../utils/jwt'
import { normalizarTelefono } from '../utils/telefono'
import api, { getSessionToken } from './api'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// POST /api/v1/cotizaciones ya está publicado (ver API.md). Con VITE_COTIZACION_API=true la página
// muestra el formulario y WhatsApp queda como alternativa; con false, WhatsApp es el único envío.
export const cotizacionApiActiva = import.meta.env.VITE_COTIZACION_API === 'true'

// Simula la demora de la red para poder ver el estado "enviando" con los mocks.
function fakeDelay(data, ms = 600) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

export const ERRORES_COTIZACION = {
  DATOS_INVALIDOS: 'DATOS_INVALIDOS',
}

// El backend responde 400 sin decir qué falló: puede ser un dato del formulario o un producto que
// ya no existe. La vista lo averigua (vuelve a revisar el catálogo y los campos) y dice cuál; este
// mensaje queda para cuando no logra saberlo.
const MENSAJE_DATOS_INVALIDOS =
  'No pudimos enviar tu solicitud: algún dato no pasó la revisión. Revisa tus datos y vuelve a intentarlo.'

function datosInvalidos({ cause, campos } = {}) {
  const error = new Error(MENSAJE_DATOS_INVALIDOS, { cause })
  error.code = ERRORES_COTIZACION.DATOS_INVALIDOS
  if (campos) error.campos = campos
  return error
}

const textoOpcional = (texto) => String(texto ?? '').trim() || undefined // undefined no viaja en el JSON

// Datos del formulario + items del store → CotizacionRequest de API.md.
// Nunca se envían precios: el backend los calcula con el productoId.
function armarCotizacionRequest({ nombreCliente, empresa, telefono, email, notas }, items) {
  const campos = []
  const telefonoNormalizado = normalizarTelefono(telefono)

  if (!textoOpcional(nombreCliente)) campos.push('nombreCliente')
  if (!telefonoNormalizado) campos.push('telefono')
  if (!textoOpcional(email)) campos.push('email')
  if (!items.length) campos.push('items')
  if (campos.length) throw datosInvalidos({ campos })

  return {
    nombreCliente: nombreCliente.trim(),
    empresa: textoOpcional(empresa),
    telefono: telefonoNormalizado,
    email: email.trim(),
    notas: textoOpcional(notas),
    items: items.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
  }
}

// POST /api/v1/cotizaciones (público, sin token) → 201 { codigoCotizacion }
// `items` son los del store que siguen disponibles ({ productoId, cantidad, … }).
// Además de la respuesta devuelve `enviada`, el body tal como se envió.
// Errores: DATOS_INVALIDOS (con `campos` si lo detectó antes de enviar) o el error de axios tal cual.
export async function solicitarCotizacion(datos, items) {
  const body = armarCotizacionRequest(datos, items)
  if (useMocks) return fakeDelay({ ...mockCotizacionCreada(), enviada: body })

  try {
    const { data } = await api.post('/api/v1/cotizaciones', body)
    return { ...data, enviada: body }
  } catch (error) {
    if (error?.response?.status === 400) throw datosInvalidos({ cause: error })
    // Lo demás (sin conexión, 5xx, HTML en vez de JSON) lo explica submitErrorMessage en la vista.
    throw error
  }
}

// Errores simulados con la forma de los de axios (error.response.status), para que el panel
// los trate igual que los reales.
function mockHttpError(status, error) {
  return Object.assign(new Error(error), { response: { status, data: { status, error } } })
}

// Con mocks, la cuenta "admin.limitado" recibe 403 en todo lo de cotizaciones para administración.
async function mockComprobarPermiso() {
  const username = decodeJwtPayload(getSessionToken())?.sub
  if (MOCK_SIN_PERMISO_COTIZACIONES.includes(username)) {
    await fakeDelay(null, 400)
    throw mockHttpError(403, 'Forbidden')
  }
}

// GET /api/v1/cotizaciones (solo ADMIN) → [Cotizacion] con estado PENDIENTE | CONTACTADO | CANCELADA.
// Cada detalle trae el Producto como entidad (ver API.md). Se devuelve tal cual, con sus nombres de campo.
// Un usuario normal recibe 403: lo decide el backend con el token, no el frontend.
export async function obtenerCotizaciones() {
  if (useMocks) {
    await mockComprobarPermiso()
    return fakeDelay(mockCotizacionesAdmin(), 500)
  }

  const { data } = await api.get('/api/v1/cotizaciones')
  return data
}

// PATCH /api/v1/cotizaciones/{codigo} (solo ADMIN) con { estado } → 200 { mensaje }.
// No devuelve la cotización: el panel ya la cambió en pantalla (actualización optimista).
// Errores tal cual los da axios: 403 sin permiso, 400 con un estado inválido y 500 si el código
// no existe (debería ser 404: pendiente 35 de API.md).
export async function cambiarEstadoCotizacion(codigoCotizacion, estado) {
  if (!ESTADOS_COTIZACION[estado]) throw new Error(`Estado de cotización inválido: "${estado}"`)

  if (useMocks) {
    await mockComprobarPermiso()
    await fakeDelay(null, 500)
    const respuesta = codigoCotizacion === MOCK_COTIZACION_FALLA ? null : mockCambiarEstadoCotizacion(codigoCotizacion, estado)
    if (!respuesta) throw mockHttpError(500, 'Internal Server Error')
    return respuesta
  }

  const { data } = await api.patch(`/api/v1/cotizaciones/${encodeURIComponent(codigoCotizacion)}`, { estado })
  return data
}
