// Ayudas para las URLs de las fotos de productos (formulario del panel /admin).

// El CDN de Instagram firma sus enlaces y caducan en días: la foto desaparecería de la tienda (CLAUDE.md).
const HOSTS_INSTAGRAM = /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com)$/i

// Revisa lo que escribió la persona. Devuelve { url } lista para guardar, o { error } con qué corregir.
// Se aceptan enlaces https:// y rutas del mismo sitio (/uploads/productos/…, la forma que prevé API.md).
export function revisarUrlImagen(texto) {
  const valor = String(texto ?? '').trim()
  if (!valor) return { error: 'Pega la URL de la imagen.' }
  if (/\s/.test(valor)) return { error: 'La URL no puede tener espacios. Revisa que la copiaste completa.' }

  // Ruta del mismo sitio ("//otro-sitio.com" no cuenta: es un enlace a otro dominio).
  if (valor.startsWith('/') && !valor.startsWith('//')) return { url: valor }

  let url
  try {
    url = new URL(valor)
  } catch {
    return { error: 'No parece una URL. Debe empezar con https://' }
  }
  if (HOSTS_INSTAGRAM.test(url.hostname)) {
    return { error: 'Los enlaces de Instagram caducan. Sube la foto al repositorio de imágenes y usa su enlace de jsDelivr.' }
  }
  // Una imagen http:// no carga dentro de una página https:// (el navegador la bloquea).
  if (url.protocol !== 'https:') return { error: 'Usa un enlace que empiece con https://' }
  return { url: url.href }
}

// Un enlace de GitHub (raw.githubusercontent.com o la página del archivo en github.com) → el mismo
// archivo servido por jsDelivr. Devuelve null si no es un enlace de GitHub a un archivo.
//   https://raw.githubusercontent.com/usuario/repo/main/silla-oficina/foto.webp
//   https://github.com/usuario/repo/blob/main/silla-oficina/foto.webp
//   → https://cdn.jsdelivr.net/gh/usuario/repo@main/silla-oficina/foto.webp
export function aJsDelivr(texto) {
  let url
  try {
    url = new URL(String(texto ?? '').trim())
  } catch {
    return null
  }
  const partes = url.pathname.split('/').filter(Boolean)

  if (url.hostname === 'raw.githubusercontent.com' && partes.length >= 4) {
    const [usuario, repo, rama, ...archivo] = partes
    return `https://cdn.jsdelivr.net/gh/${usuario}/${repo}@${rama}/${archivo.join('/')}`
  }
  if (url.hostname === 'github.com' && partes.length >= 5 && ['blob', 'raw'].includes(partes[2])) {
    const [usuario, repo, , rama, ...archivo] = partes
    return `https://cdn.jsdelivr.net/gh/${usuario}/${repo}@${rama}/${archivo.join('/')}`
  }
  return null
}

// Intenta cargar la imagen en el navegador. Resuelve true si carga y false si falla o tarda más
// de `timeoutMs` (un enlace que no responde también se ve roto en la tienda). Nunca rechaza.
export function comprobarImagen(url, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => terminar(false), timeoutMs)

    function terminar(carga) {
      clearTimeout(timer)
      img.onload = img.onerror = null
      resolve(carga)
    }

    // Una imagen de 0×0 (p. ej. una página de error que el servidor manda con tipo de imagen) no sirve.
    img.onload = () => terminar(img.naturalWidth > 0)
    img.onerror = () => terminar(false)
    img.src = url
  })
}
