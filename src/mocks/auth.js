// Respuestas simuladas de /auth/v1 (misma forma que en API.md: { token }).
// El token imita al del backend: mismo payload { sub, iss, exp } y una hora de duración.
// La firma es falsa: con mocks no hay backend que la verifique.

const ONE_HOUR_SECONDS = 60 * 60

function encodeBase64Url(object) {
  const bytes = new TextEncoder().encode(JSON.stringify(object))
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createMockToken(username) {
  const header = { alg: 'HS384' }
  const payload = {
    // El backend no distingue mayúsculas en el username y lo guarda en minúsculas.
    sub: username.trim().toLowerCase(),
    iss: 'mobiliariodeoficina-api',
    exp: Math.floor(Date.now() / 1000) + ONE_HOUR_SECONDS,
  }
  return `${encodeBase64Url(header)}.${encodeBase64Url(payload)}.firma-de-prueba`
}

// Respuesta simulada de GET /auth/v1/me: PerfilResponse del Swagger, { nombre, email, role }.
// Ojo: el campo se llama "role" (en inglés), no "rol". Ver "Perfil y rol" en API.md.
// Con mocks, el rol sale del nombre de usuario (cualquier contraseña sirve):
// - "admin": ADMIN, puede todo.
// - "admin.limitado": ADMIN para el frontend, pero el "servidor" le niega las cotizaciones (403).
//   Sirve para ver que el panel muestra "No tienes permiso para esta acción" sin cerrar la sesión,
//   y para recordar que quien decide los permisos es el backend, no el menú.
// - Cualquier otro: USER.
export const MOCK_ADMINS = ['admin', 'admin.limitado']
export const MOCK_SIN_PERMISO_COTIZACIONES = ['admin.limitado']

export function mockPerfil(username) {
  return {
    nombre: username,
    email: username.includes('@') ? username : null,
    role: MOCK_ADMINS.includes(username) ? 'ADMIN' : 'USER',
  }
}
