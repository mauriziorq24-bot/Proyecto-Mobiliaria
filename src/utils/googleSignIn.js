// "Continuar con Google" con Google Identity Services (GIS): el script oficial de Google
// dibuja su propio botón y, al elegir una cuenta, entrega un ID token (credential).
// Ese token se manda a POST /auth/v1/google y el backend devuelve su propio JWT.

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

// Sin Client ID (pendiente 7 de API.md) no hay botón de Google: login y registro lo ocultan.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// Botón simulado: solo con mocks y solo en desarrollo (npm run dev). En un build de
// producción import.meta.env.DEV es false y Vite elimina ese código del bundle,
// aunque VITE_USE_MOCKS quede en true por error.
export const SHOW_MOCK_GOOGLE_BUTTON =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true' && !GOOGLE_CLIENT_ID

// El script se descarga una sola vez y solo cuando una pantalla lo necesita
// (no va en index.html: el resto de la tienda no lo usa).
let scriptPromise = null

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GSI_SCRIPT_URL
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        scriptPromise = null // permite reintentar al volver a la pantalla
        script.remove()
        reject(new Error('No se pudo cargar el script de Google'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

// Dibuja el botón de Google dentro de `element`. onCredential recibe el ID token.
// Si la persona cierra la ventana de Google, GIS no llama a nada: no hay error que mostrar.
export async function renderGoogleButton(element, onCredential) {
  await loadScript()
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
  })
  window.google.accounts.id.renderButton(element, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with', // "Continuar con Google"
    shape: 'rectangular',
    locale: 'es',
    // GIS pide el ancho en píxeles, entre 200 y 400.
    width: Math.min(400, Math.max(200, element.clientWidth)),
  })
}
