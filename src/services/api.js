import axios from 'axios'

// La URL base queda vacía en todos los entornos: axios usa rutas relativas
// (/api/v1/...). En desarrollo las reenvía el proxy de Vite y en producción
// los rewrites de vercel.json.
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    // Evita la página de advertencia de ngrok gratuito. Vercel reenvía los
    // headers del navegador, así que también funciona en producción.
    'ngrok-skip-browser-warning': 'true',
  },
})

const HTML_RESPONSE_MESSAGE = 'El backend no respondió JSON: revisa que ngrok esté activo'

// Si ngrok está caído o muestra su página de advertencia, llega HTML en vez de JSON.
function isHtmlResponse(response) {
  const contentType = response?.headers?.['content-type'] ?? ''
  return contentType.includes('text/html')
}

api.interceptors.response.use(
  (response) => {
    if (isHtmlResponse(response)) {
      return Promise.reject(new Error(HTML_RESPONSE_MESSAGE))
    }
    return response
  },
  (error) => {
    // ngrok también responde con HTML cuando el túnel está apagado (p. ej. 404).
    if (isHtmlResponse(error.response)) {
      return Promise.reject(new Error(HTML_RESPONSE_MESSAGE))
    }
    return Promise.reject(error)
  },
)

export default api
