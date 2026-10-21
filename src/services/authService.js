import { createMockToken } from '../mocks/auth'
import api from './api'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// Simula la demora de la red para poder ver el estado "cargando" con los mocks.
function fakeDelay(data, ms = 400) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

// Las tres funciones devuelven solo el token (string). La contraseña se manda tal cual
// al backend y no se guarda ni se registra en ningún lado.

// POST /auth/v1/register { username, password, email } → 201 { token }
// El registro ya deja la sesión iniciada: no hace falta llamar a login después.
export async function register({ username, password, email }) {
  if (useMocks) return fakeDelay(createMockToken(username))

  const { data } = await api.post('/auth/v1/register', { username, password, email })
  return data.token
}

// POST /auth/v1/login { username, password } → 200 { token }
// "username" puede ser el nombre de usuario o el correo: el backend acepta ambos (API.md).
export async function login({ username, password }) {
  if (useMocks) return fakeDelay(createMockToken(username))

  const { data } = await api.post('/auth/v1/login', { username, password })
  return data.token
}

// POST /auth/v1/google { token: <ID token de Google> } → 200 { token: <JWT del backend> }
export async function loginConGoogle(googleIdToken) {
  if (useMocks) return fakeDelay(createMockToken('usuario_google'))

  const { data } = await api.post('/auth/v1/google', { token: googleIdToken })
  return data.token
}

// Login fallido: contraseña incorrecta, usuario inexistente o campos vacíos dan todos 403
// sin mensaje (API.md). No se puede saber cuál fue, y está bien: un solo mensaje para todos.
export function isInvalidCredentials(error) {
  return error?.response?.status === 403
}

// Registro con un usuario o correo que ya existe. Devuelve 'username', 'email' o null.
// TODO: cuando el backend devuelva 409 con JSON (pendiente 10-bis de API.md), leer el campo
// del cuerpo en vez de buscar palabras en el texto. Hoy responde 401 en texto plano:
//   "Credenciales invalidas El nombre de usuario ya está en uso."
//   "Credenciales invalidas El correo electrónico ya está registrado."
// Es la única función que depende de esos textos: si cambian, solo se toca aquí.
export function getRegisterConflict(error) {
  const { status, data } = error?.response ?? {}
  if (status !== 401 && status !== 409) return null

  const text = typeof data === 'string' ? data.toLowerCase() : ''
  if (text.includes('correo')) return 'email'
  if (text.includes('usuario')) return 'username'
  return null
}
