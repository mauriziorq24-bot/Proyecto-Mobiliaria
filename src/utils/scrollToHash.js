// Lleva a la sección de un enlace con #ancla (p. ej. /terminos#privacidad).
// Usa scrollIntoView para respetar el scroll-margin-top de la sección: así el header fijo no la tapa.
// Si la sección tiene tabindex="-1" también recibe el foco, para que el teclado y el lector
// de pantalla sigan desde ahí y no desde el enlace que se tocó.
// Devuelve false si en la página no hay un elemento con ese id.
export function scrollToHash(hash, { smooth = false } = {}) {
  const target = document.getElementById(decodeURIComponent(hash.slice(1)))
  if (!target) return false

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto', block: 'start' })
  if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true })
  return true
}
