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
