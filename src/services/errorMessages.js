import { BACKEND_NOT_JSON } from './api'

// Mensajes para los errores de carga, en un solo lugar: BaseErrorState los usa,
// así todas las vistas dicen lo mismo ante el mismo tipo de fallo.

// Sin respuesta: el navegador está sin conexión, el servidor no contestó o se agotó
// el tiempo de espera (timeout de api.js). axios marca estos casos con error.request
// pero sin error.response.
export function isNetworkError(error) {
  if (!error || error.response) return false
  if (error.code === BACKEND_NOT_JSON) return false // sí hubo respuesta, pero HTML y no JSON del backend
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return Boolean(error.request) || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code)
}

// Texto que acompaña al título del error. "subject" dice qué no cargó: "este producto",
// "las categorías"… Cualquier fallo que no sea de red (5xx, una página HTML o algo
// inesperado) es un problema nuestro, no de la persona: se le pide volver en unos minutos.
export function loadErrorMessage(error, subject = 'esta sección') {
  if (isNetworkError(error)) return 'Revisa tu conexión e inténtalo de nuevo.'
  return `Tuvimos un problema al cargar ${subject}. Inténtalo en unos minutos.`
}

// Lo mismo para un envío (ingresar, crear la cuenta…). "action" dice qué no se pudo hacer.
// Los errores esperados (contraseña incorrecta, usuario repetido) los maneja cada vista antes.
export function submitErrorMessage(error, action = 'completar la operación') {
  if (isNetworkError(error)) return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'
  return `Tuvimos un problema al ${action}. Inténtalo en unos minutos.`
}

// 403 con la sesión iniciada: el backend sabe quién es la persona, pero su rol no alcanza para eso.
// No es una sesión vencida (esa da 401 y la maneja api.js), así que no se cierra la sesión:
// solo se avisa. Lo usa el panel de administración.
export const FORBIDDEN_MESSAGE = 'No tienes permiso para esta acción.'

export function isForbidden(error) {
  return error?.response?.status === 403
}

// Igual que loadErrorMessage, pero un 403 da el aviso de permisos.
export function adminErrorMessage(error, subject) {
  return isForbidden(error) ? FORBIDDEN_MESSAGE : loadErrorMessage(error, subject)
}
