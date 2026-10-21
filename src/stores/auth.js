import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
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

  // TODO: cuando exista GET /auth/v1/me (pendiente 5 de API.md), pedir ahí
  // { id, username, email, rol }. Hoy el JWT solo trae sub (username), iss y exp.
  const usuario = computed(() => {
    const payload = decodeJwtPayload(token.value)
    if (!payload) return null
    return { username: payload.sub, rol: payload.rol ?? null }
  })

  const estaSesionIniciada = computed(() => Boolean(token.value) && !isTokenExpired(token.value))

  // Solo sirve para mostrar u ocultar opciones en la interfaz; el backend vuelve a comprobarlo.
  // Hoy siempre es false: el JWT no trae rol (pendiente 8 de API.md).
  const esAdmin = computed(() => estaSesionIniciada.value && usuario.value?.rol === 'ADMIN')

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

  return { token, usuario, estaSesionIniciada, esAdmin, login, registro, loginConGoogle, logout }
})
