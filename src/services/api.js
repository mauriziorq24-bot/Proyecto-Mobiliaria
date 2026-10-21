import axios from 'axios'

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
    return Promise.reject(error)
  },
)

export default api
