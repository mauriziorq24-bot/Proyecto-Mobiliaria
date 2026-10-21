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
