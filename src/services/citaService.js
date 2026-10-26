import { MOCK_SIN_PERMISO_COTIZACIONES } from '../mocks/auth'
import {
  CODIGO_INEXISTENTE,
  MOCK_CITA_FALLA,
  mockCambiarEstadoCita,
  mockCitaCreada,
  mockCitaEliminada,
  mockCitaModificada,
  mockCitasAdmin,
} from '../mocks/citas'
import { aFechaHoraBackend, desdeFechaHoraBackend, esHorarioDisponible } from '../utils/fecha'
import { ESTADOS_CITA, TIPOS_ASESORIA } from '../utils/formato'
import { decodeJwtPayload } from '../utils/jwt'
import { normalizarTelefono } from '../utils/telefono'
import api, { getSessionToken } from './api'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// Sección Citas del panel /admin (GET y PATCH /api/v1/citas, publicados el 26/10/2026; ver API.md).
// false: la sección y su contador no aparecen · true: aparecen. Se lee al compilar.
export const citasAdminActiva = import.meta.env.VITE_ADMIN_CITAS_API === 'true'

// Simula la demora de la red para poder ver el estado "enviando" con los mocks.
function fakeDelay(data, ms = 400) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

// Los tres errores esperados de citas. La vista mira error.code para decidir qué hacer
// (p. ej. llevar al login) y muestra error.message tal cual.
export const ERRORES_CITA = {
  DATOS_INVALIDOS: 'DATOS_INVALIDOS',
  SESION_VENCIDA: 'SESION_VENCIDA',
  CITA_NO_ENCONTRADA: 'CITA_NO_ENCONTRADA',
}

const MENSAJES = {
  DATOS_INVALIDOS: 'Algunos datos de la cita no son válidos. Revísalos e inténtalo de nuevo.',
  SESION_VENCIDA: 'Tu sesión venció. Inicia sesión de nuevo para continuar.',
  CITA_NO_ENCONTRADA: 'No encontramos una cita con ese código. Revisa que esté bien escrito.',
}

// `campos` (opcional) dice qué campos fallaron, cuando se sabe: el backend responde 400 sin decirlo.
function citaError(code, { cause, campos } = {}) {
  const error = new Error(MENSAJES[code], { cause })
  error.code = code
  if (campos) error.campos = campos
  return error
}

// Traduce la respuesta del backend a uno de los tres errores. Lo demás (sin conexión, 5xx,
// backend que responde HTML) se relanza sin tocar para que submitErrorMessage lo explique.
function traducirError(error, { conCodigo = false } = {}) {
  const status = error?.response?.status
  if (status === 400) return citaError(ERRORES_CITA.DATOS_INVALIDOS, { cause: error })
  // 403: el backend lo da cuando no llega token, y api.js no envía un token vencido (lo quita y
  // cierra la sesión). Para la persona es lo mismo que el 401: tiene que volver a entrar.
  if (status === 401 || status === 403) return citaError(ERRORES_CITA.SESION_VENCIDA, { cause: error })
  if (status === 404) return citaError(ERRORES_CITA.CITA_NO_ENCONTRADA, { cause: error })
  // TODO: quitar cuando el backend responda 404 (pendiente 12-bis de API.md). Hoy un código
  // inexistente en PUT/DELETE da 500, así que en esas dos rutas 500 se toma como "no encontrada".
  if (status === 500 && conCodigo) return citaError(ERRORES_CITA.CITA_NO_ENCONTRADA, { cause: error })
  return error
}

// 'cita-728bf4 ' → 'CITA-728BF4'. Un código con otro formato nunca existe: se responde
// "no encontrada" sin llamar al backend (que además daría 500, no 404).
function normalizarCodigo(codigoCita) {
  const codigo = String(codigoCita ?? '').trim().toUpperCase()
  if (!/^CITA-[0-9A-F]{6}$/.test(codigo)) throw citaError(ERRORES_CITA.CITA_NO_ENCONTRADA)
  return codigo
}

const textoOpcional = (texto) => String(texto ?? '').trim() || undefined // undefined no viaja en el JSON

// Datos del formulario → CitaRequest de API.md. Revisa lo que el backend no valida (horario de
// atención, tipoAsesoria) y normaliza el teléfono. Si algo falla, no se envía nada.
function armarCitaRequest({ nombreCliente, empresa, telefono, email, fecha, hora, tipoAsesoria, notas }) {
  const campos = []
  const telefonoNormalizado = normalizarTelefono(telefono)

  if (!textoOpcional(nombreCliente)) campos.push('nombreCliente')
  if (!telefonoNormalizado) campos.push('telefono')
  if (!textoOpcional(email)) campos.push('email')
  if (!esHorarioDisponible(fecha, hora)) campos.push('fechaHora')
  if (!TIPOS_ASESORIA[tipoAsesoria]) campos.push('tipoAsesoria')
  if (campos.length) throw citaError(ERRORES_CITA.DATOS_INVALIDOS, { campos })

  return {
    nombreCliente: nombreCliente.trim(),
    empresa: textoOpcional(empresa),
    telefono: telefonoNormalizado,
    email: email.trim(),
    fechaHora: aFechaHoraBackend(fecha, hora), // '2026-11-20T14:30:00', hora de Caracas sin Z
    tipoAsesoria,
    notas: textoOpcional(notas),
  }
}

// POST /api/v1/citas (exige token) → 201 { codigoCita, mensaje }
// `datos` trae fecha ('AAAA-MM-DD') y hora ('HH:MM') por separado, como los da src/utils/fecha.js.
// La vista debe mostrar y guardar el codigoCita: es la única forma de modificar o cancelar la cita.
// Además de la respuesta devuelve `enviada`, el CitaRequest tal como se envió: es lo que se guarda
// para reprogramar con PUT (que pide el CitaRequest completo).
export async function crearCita(datos) {
  const body = armarCitaRequest(datos)
  if (useMocks) return fakeDelay({ ...mockCitaCreada(), enviada: body })

  try {
    const { data } = await api.post('/api/v1/citas', body)
    return { ...data, enviada: body }
  } catch (error) {
    throw traducirError(error)
  }
}

// PUT /api/v1/citas/{codigoCita} (exige token) con el mismo CitaRequest → 200 { mensaje }
export async function modificarCita(codigoCita, datos) {
  const codigo = normalizarCodigo(codigoCita)
  const body = armarCitaRequest(datos)
  if (useMocks) {
    if (codigo === CODIGO_INEXISTENTE) throw citaError(ERRORES_CITA.CITA_NO_ENCONTRADA)
    return fakeDelay(mockCitaModificada)
  }

  try {
    const { data } = await api.put(`/api/v1/citas/${codigo}`, body)
    return data
  } catch (error) {
    throw traducirError(error, { conCodigo: true })
  }
}

// DELETE /api/v1/citas/{codigoCita} (exige token) → 200 { mensaje }
export async function cancelarCita(codigoCita) {
  const codigo = normalizarCodigo(codigoCita)
  if (useMocks) {
    if (codigo === CODIGO_INEXISTENTE) throw citaError(ERRORES_CITA.CITA_NO_ENCONTRADA)
    return fakeDelay(mockCitaEliminada)
  }

  try {
    const { data } = await api.delete(`/api/v1/citas/${codigo}`)
    return data
  } catch (error) {
    throw traducirError(error, { conCodigo: true })
  }
}

// --- Panel de administración (solo ADMIN) ---
// Aquí los errores NO se traducen a los de arriba: un 403 es "sin permiso" (el panel lo muestra con
// isForbidden), no una sesión vencida.

function mockHttpError(status, error) {
  return Object.assign(new Error(error), { response: { status, data: { status, error } } })
}

// Con mocks, "admin.limitado" tampoco tiene permiso para las citas (ver mocks/auth.js).
async function mockComprobarPermiso() {
  if (MOCK_SIN_PERMISO_COTIZACIONES.includes(decodeJwtPayload(getSessionToken())?.sub)) {
    await fakeDelay(null, 400)
    throw mockHttpError(403, 'Forbidden')
  }
}

const textoONull = (texto) => String(texto ?? '').trim() || null

// Sin fecha válida, la cita no entra en la agenda, pero sí en la lista.
function partesDeFechaHora(fechaHora) {
  try {
    return desdeFechaHoraBackend(fechaHora)
  } catch {
    return { fecha: null, hora: null }
  }
}

// CitaResponse del backend → la cita que usa el panel: los mismos campos, más fecha y hora de
// Caracas separadas (src/utils/fecha.js) para la agenda. Se arma campo por campo: si el backend
// agregara algo, no entra al estado de la app sin que lo decidamos (ver pendiente 33 de API.md).
function aCitaAdmin(cita) {
  const { fecha, hora } = partesDeFechaHora(cita.fechaHora)
  return {
    codigoCita: cita.codigoCita,
    nombreCliente: textoONull(cita.nombreCliente),
    email: textoONull(cita.email),
    empresa: textoONull(cita.empresa),
    telefono: textoONull(cita.telefono),
    fechaHora: cita.fechaHora ?? null,
    fecha,
    hora,
    tipoAsesoria: cita.tipoAsesoria ?? null,
    estado: cita.estado ?? null,
    notas: textoONull(cita.notas),
    creadoEn: cita.creadoEn ?? null,
  }
}

// GET /api/v1/citas (solo ADMIN) → [CitaResponse] → [cita del panel] (ver aCitaAdmin).
export async function obtenerCitasAdmin() {
  if (useMocks) {
    await mockComprobarPermiso()
    return (await fakeDelay(mockCitasAdmin(), 500)).map(aCitaAdmin)
  }

  const { data } = await api.get('/api/v1/citas')
  return Array.isArray(data) ? data.map(aCitaAdmin) : []
}

// PATCH /api/v1/citas/{codigoCita} (solo ADMIN) con { estado } → 200 { mensaje }.
// Errores tal cual: 403 sin permiso, 400 estado inválido, 404 si el código no existe (26/10/2026).
export async function cambiarEstadoCita(codigoCita, estado) {
  if (!ESTADOS_CITA[estado]) throw new Error(`Estado de cita inválido: "${estado}"`)

  if (useMocks) {
    await mockComprobarPermiso()
    await fakeDelay(null, 500)
    if (codigoCita === MOCK_CITA_FALLA) throw mockHttpError(500, 'Internal Server Error')
    const respuesta = mockCambiarEstadoCita(codigoCita, estado)
    if (!respuesta) throw mockHttpError(404, 'Not Found')
    return respuesta
  }

  const { data } = await api.patch(`/api/v1/citas/${encodeURIComponent(codigoCita)}`, { estado })
  return data
}
