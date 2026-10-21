import { etiquetaTipoEspacio, formatearPrecio } from './formato'

// Los filtros elegidos, uno por grupo, listos para pintar como chips.
// Lo usan los chips activos, el contador "Filtros (N)" y la sugerencia del estado vacío.
// El texto buscado y el orden no son filtros: nunca aparecen aquí.
//
// [{ clave: 'tipoEspacio', etiqueta: 'Ambiente: Hogar', nombre: 'Hogar', quitar: { tipoEspacio: null } }, …]
//   clave   → la misma de contarOpciones().sinFiltro (para saber cuántos habría sin él)
//   etiqueta → texto del chip
//   nombre  → para "Quitar filtro Hogar" (lectores de pantalla)
//   quitar  → los cambios que lo quitan, para aplicarFiltros()
export function filtrosActivos(filtros, categorias = []) {
  const activos = []

  if (filtros.categoria) {
    const nombre = categorias.find((c) => c.slug === filtros.categoria)?.nombre ?? filtros.categoria
    activos.push({ clave: 'categoria', etiqueta: nombre, nombre, quitar: { categoria: null } })
  }

  if (filtros.tipoEspacio) {
    const nombre = etiquetaTipoEspacio(filtros.tipoEspacio)
    activos.push({ clave: 'tipoEspacio', etiqueta: `Ambiente: ${nombre}`, nombre, quitar: { tipoEspacio: null } })
  }

  if (filtros.enShowroom) {
    activos.push({ clave: 'enShowroom', etiqueta: 'En showroom', nombre: 'En showroom', quitar: { enShowroom: false } })
  }

  const etiquetaPrecio = rangoPrecio(filtros.precioMin, filtros.precioMax)
  if (etiquetaPrecio) {
    activos.push({
      clave: 'precio',
      etiqueta: etiquetaPrecio,
      nombre: `precio ${etiquetaPrecio}`,
      quitar: { precioMin: null, precioMax: null },
    })
  }

  return activos
}

// "$100 – $400", "Desde $100", "Hasta $400" o '' si no hay precio (o si Desde > Hasta, que no filtra).
function rangoPrecio(min, max) {
  if (min != null && max != null) return min > max ? '' : `${formatearPrecio(min)} – ${formatearPrecio(max)}`
  if (min != null) return `Desde ${formatearPrecio(min)}`
  if (max != null) return `Hasta ${formatearPrecio(max)}`
  return ''
}
