// <meta name="robots" content="noindex, nofollow"> mientras se ve una página que no debe salir en buscadores
// (el panel /admin). Google ejecuta el JavaScript antes de indexar, así que lee la etiqueta aunque la
// agregue Vue. Es la segunda capa: robots.txt (en public/) y el header X-Robots-Tag de vercel.json.
const META_ID = 'meta-robots'

export function setNoIndex(noIndex) {
  let meta = document.getElementById(META_ID)

  if (!noIndex) {
    meta?.remove()
    return
  }

  if (!meta) {
    meta = document.createElement('meta')
    meta.id = META_ID
    meta.name = 'robots'
    document.head.appendChild(meta)
  }
  meta.content = 'noindex, nofollow'
}
