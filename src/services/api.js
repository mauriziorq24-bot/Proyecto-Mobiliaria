import axios from 'axios'
import { isTokenExpired } from '../utils/jwt'

// La URL base queda vacía en todos los entornos: axios usa rutas relativas
// (/api/v1/...). En desarrollo las reenvía el proxy de Vite y en producción
// los rewrites de vercel.json.
const api = axios.create({
  baseURL: '',
  // Render gratuito apaga el servidor tras un rato sin uso y la primera petición
  // puede tardar hasta un minuto mientras arranca (cold start). Se le da ese margen;
  // pasado el minuto axios la corta y se muestra el error con "Reintentar".
  // El aviso de "despertando el servidor" lo muestra useAsync a los 5 s.
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const HTML_RESPONSE_MESSAGE = 'El backend no respondió JSON: revisa que el servidor de Render esté activo'
// Código para reconocer ese error en errorMessages.js (no es un error de conexión de la persona).
export const BACKEND_NOT_JSON = 'BACKEND_NOT_JSON'

function backendNotJsonError() {
  const error = new Error(HTML_RESPONSE_MESSAGE)
  error.code = BACKEND_NOT_JSON
  return error
}

// Si la petición no llega al backend (p. ej. un rewrite mal configurado devuelve
// index.html, o Render responde con su página de error), llega HTML en vez de JSON.
function isHtmlResponse(response) {
  const contentType = response?.headers?.['content-type'] ?? ''
  return contentType.includes('text/html')
}

// Sesión: api.js no importa el store ni el router (se crearía un ciclo
// api → store → authService → api). main.js los conecta con configureAuth().
// - onTokenExpired: el token venció antes de enviarse (basta con cerrar la sesión).
// - onUnauthorized: el backend respondió 401 a una petición con token.
let auth = {
  getToken: () => null,
  onTokenExpired: () => {},
  onUnauthorized: () => {},
}

export function configureAuth(handlers) {
  auth = { ...auth, ...handlers }
}

// El token de la sesión actual, para los mocks que imitan lo que el backend lee del token
// (quién es la persona y qué rol tiene). Los servicios reales no lo necesitan: lo pone el interceptor.
export function getSessionToken() {
  return auth.getToken()
}

// Las rutas de /auth/v1 no usan la sesión: su 401 significa "usuario o correo ya
// registrado" (API.md), no "sesión vencida". La excepción es /auth/v1/me, que pregunta
// "¿quién soy?" y por eso necesita el token como cualquier endpoint protegido.
function isAuthEndpoint(config) {
  const url = config?.url ?? ''
  return url.startsWith('/auth/') && url !== '/auth/v1/me'
}

api.interceptors.request.use((config) => {
  const token = auth.getToken()
  if (!token || isAuthEndpoint(config)) return config

  // Un token vencido no se envía: el backend respondería 500 incluso en GET públicos
  // (pendiente 21-bis de API.md). Se cierra la sesión y la petición sale sin token;
  // si era un endpoint protegido, el backend responderá 403 y la vista lo manejará.
  if (isTokenExpired(token)) {
    auth.onTokenExpired()
    return config
  }

  config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => {
    if (isHtmlResponse(response)) {
      return Promise.reject(backendNotJsonError())
    }
    return response
  },
  (error) => {
    // Las páginas de error de Render (502, 503…) también son HTML.
    if (isHtmlResponse(error.response)) {
      return Promise.reject(backendNotJsonError())
    }
    // 401 = sesión vencida, pero solo si la petición llevaba token: el backend también
    // da 401 en GET públicos con un id no numérico (pendiente 21 de API.md) y eso
    // no debe echar a nadie de su sesión.
    // Una petición puede pedir que su 401 no cierre la sesión (keepSessionOn401): p. ej. favoritos,
    // que hoy responde 401 con un token válido (pendiente 27 de API.md) y echaba a la persona
    // apenas iniciaba sesión.
    const sentToken = Boolean(error.config?.headers?.Authorization)
    const keepSession = Boolean(error.config?.keepSessionOn401)
    if (error.response?.status === 401 && sentToken && !keepSession && !isAuthEndpoint(error.config)) {
      auth.onUnauthorized()
    }
    return Promise.reject(error)
  },
)

export default api
