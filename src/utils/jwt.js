// Lectura del JWT en el navegador. El payload es JSON en base64url, no está cifrado:
// se puede leer, pero su contenido es solo informativo. Quien decide los permisos
// es el backend, que verifica la firma (ver "El JWT que devuelve el backend" en API.md).

// base64url usa "-" y "_" en vez de "+" y "/", y no lleva relleno "=": se corrige antes de atob.
function decodeBase64Url(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  // atob devuelve bytes sueltos; TextDecoder los arma como UTF-8 (tildes, ñ).
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Devuelve el payload ({ sub, iss, exp }) o null si el token no tiene forma de JWT.
export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

// exp viene en segundos desde 1970; Date.now() en milisegundos.
// Un token ilegible o sin exp se trata como vencido: no se puede confiar en él.
export function isTokenExpired(token, now = Date.now()) {
  const exp = decodeJwtPayload(token)?.exp
  if (typeof exp !== 'number') return true
  return exp * 1000 <= now
}
