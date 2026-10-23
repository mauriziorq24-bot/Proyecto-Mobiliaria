// Repositorio de GitHub con las fotos de los productos (las de Instagram, descargadas).
// El backend hoy las guarda como enlaces de raw.githubusercontent.com; para productos nuevos
// se usa jsDelivr, que sirve el mismo archivo desde un CDN con caché:
//   https://cdn.jsdelivr.net/gh/{usuario}/{repo}@{rama}/{carpeta}/{archivo}
// Si el repositorio cambia de dueño o de nombre, solo hay que cambiarlo aquí.
export const repositorioImagenes = {
  usuario: 'manuelperoza-prog',
  repo: 'asets-mobiliario',
  rama: 'main',
  // Carpetas que ya existen en el repositorio (para el ejemplo de la ayuda).
  carpetas: ['silla-oficina', 'silla-barberia', 'silla-barra', 'escritorio', 'comedor', 'peinadora', 'camilla', 'accesorios'],
}

export const BASE_JSDELIVR = `https://cdn.jsdelivr.net/gh/${repositorioImagenes.usuario}/${repositorioImagenes.repo}@${repositorioImagenes.rama}/`

// Cuántas fotos admite un producto en el formulario (la galería de la ficha se pensó para pocas).
export const MAX_IMAGENES = 10
