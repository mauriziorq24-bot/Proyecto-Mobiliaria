// Lee los errores por campo de un 400 del backend. Lo comparten productos y categorías.
//
// La forma de esos 400 no está confirmada (pendiente 31 de API.md). Se aceptan:
// - la que propusimos: { "message": "…", "errores": { "nombre": "…" } }
// - un mapa plano: { "nombre": "…" }
// - la de Spring con detalle de validación: { "errors": [{ "field": "nombre", "defaultMessage": "…" }] }
//
// `campos`: los campos del formulario. "imagenes[2]" o "imagenes.2" cuentan como "imagenes".
// Devuelve { nombre: '…' } solo con esos campos (puede quedar vacío).
export function leerErroresDeCampos(data, campos) {
  const resultado = {}
  if (!data || typeof data !== 'object') return resultado

  const agregar = (campo, mensaje) => {
    const base = String(campo ?? '').split(/[[.]/)[0]
    if (!campos.includes(base)) return
    if (typeof mensaje === 'string' && mensaje.trim() && !resultado[base]) resultado[base] = mensaje.trim()
  }

  if (Array.isArray(data.errors)) {
    for (const item of data.errors) agregar(item?.field, item?.defaultMessage ?? item?.message)
  }
  const mapa = data.errores && typeof data.errores === 'object' ? data.errores : data
  for (const [campo, mensaje] of Object.entries(mapa)) agregar(campo, mensaje)
  return resultado
}
