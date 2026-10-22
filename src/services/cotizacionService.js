import { mockCotizacionCreada } from '../mocks/cotizaciones'
import { normalizarTelefono } from '../utils/telefono'
import api from './api'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// POST /api/v1/cotizaciones es una propuesta del frontend que el backend todavía está desarrollando
// (ver API.md). Mientras no exista, VITE_COTIZACION_API=false oculta el formulario y WhatsApp es el
// único envío. Con true, la página muestra el formulario y WhatsApp queda como alternativa.
// TODO: cuando el backend publique el endpoint, probarlo con curl, quitar la nota de "propuesta" en
// API.md y poner VITE_COTIZACION_API=true en .env y en las variables de entorno de Vercel.
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
