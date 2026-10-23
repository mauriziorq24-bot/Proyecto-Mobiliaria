import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { trackSlowLoad } from '../composables/useAsync'
import * as authService from '../services/authService'
import { decodeJwtPayload, isTokenExpired } from '../utils/jwt'

const STORAGE_KEY = 'mobiliario.token'

// localStorage puede fallar (modo privado de Safari, almacenamiento bloqueado o lleno):
// si falla, la sesión sigue funcionando en memoria, solo que no sobrevive a la recarga.
function readStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento disponible: nada que hacer.
  }
}

// Al arrancar la app: un token guardado pero vencido (o ilegible) se descarta.
// Así no se manda a la API un token que el backend rechazaría (hoy con un 500, ver API.md).
function initialToken() {
  const stored = readStoredToken()
  if (stored && isTokenExpired(stored)) {
    writeStoredToken(null)
    return null
  }
  return stored
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(initialToken())

  // Perfil de GET /auth/v1/me: { nombre, email, role }. null mientras no llega o si falló.
  const perfil = ref(null)
  let perfilPromise = null

  // El rol se busca primero en el JWT (hoy no lo trae: solo sub, iss y exp) y después en /auth/v1/me.
  // Se aceptan "rol" y "role" en el token porque el backend todavía no decidió el nombre del claim;
  // /me ya lo llama "role" (Swagger). Ver "Perfil y rol" en API.md.
  const usuario = computed(() => {
    const payload = decodeJwtPayload(token.value)
    if (!payload) return null
    return { username: payload.sub, rol: payload.rol ?? payload.role ?? perfil.value?.role ?? null }
  })

  const estaSesionIniciada = computed(() => Boolean(token.value) && !isTokenExpired(token.value))

  // Solo sirve para mostrar u ocultar opciones en la interfaz: el backend vuelve a comprobar
  // el rol en cada petición y responde 403 si no alcanza (ver errorMessages.js).
  const esAdmin = computed(() => estaSesionIniciada.value && usuario.value?.rol === 'ADMIN')

  // Pide el perfil una vez por sesión; varias llamadas a la vez esperan la misma petición.
  // Nunca lanza: si falla (sin conexión, o el 500 de hoy, pendiente 30), devuelve null y la persona
  // queda como usuario normal. Ante la duda, sin permisos: el panel no se abre.
  function cargarPerfil() {
    if (!estaSesionIniciada.value) return Promise.resolve(null)
    if (perfilPromise) return perfilPromise

    const tokenPedido = token.value
    const sigueVigente = () => token.value === tokenPedido // ¿la sesión cambió mientras esperábamos?

    const promise = trackSlowLoad(authService.obtenerPerfil())
      .then((data) => {
        if (!sigueVigente()) return null
        perfil.value = data
        return data
      })
      .catch(() => {
        // Sin guardar el fallo: la próxima vez que haga falta (p. ej. al volver a /admin) se reintenta.
        if (perfilPromise === promise) perfilPromise = null
        return null
      })
    perfilPromise = promise
    return promise
  }

  // Al iniciar o cerrar sesión, el perfil anterior ya no vale. Se pide el nuevo de una vez para que
  // el menú de cuenta sepa si mostrar "Panel de administración". (Al abrir la app con sesión lo pide
  // main.js, después de conectar axios con la sesión: antes, la petición saldría sin token.)
  watch(token, () => {
    perfil.value = null
    perfilPromise = null
    cargarPerfil()
  })

  function setToken(newToken) {
    token.value = newToken
    writeStoredToken(newToken)
  }

  // Las acciones no atrapan errores: la vista que las llame decide qué mensaje mostrar.
  async function login(credentials) {
    setToken(await authService.login(credentials))
  }

  async function registro(datos) {
    setToken(await authService.register(datos))
  }

  async function loginConGoogle(googleIdToken) {
    setToken(await authService.loginConGoogle(googleIdToken))
  }

  function logout() {
    setToken(null)
  }

  return { token, perfil, usuario, estaSesionIniciada, esAdmin, cargarPerfil, login, registro, loginConGoogle, logout }
})
