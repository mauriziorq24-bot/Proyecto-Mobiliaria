// Valida el ?redirect= del login para evitar un "open redirect": solo se aceptan
// rutas internas de esta app. Cualquier otra cosa devuelve el inicio ('/').
//
// Se rechaza:
// - lo que no empieza con '/' ('https://otro-sitio.com', 'javascript:...').
// - '//otro-sitio.com': el navegador lo lee como "mismo protocolo, otro dominio".
// - '/\otro-sitio.com': los navegadores tratan '\' como '/', así que equivale a lo anterior.
// - espacios y caracteres de control: el navegador los borra de las URLs ('/\t/otro.com' → '//otro.com').
export function getSafeRedirect(value) {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return '/'
  return value
}
