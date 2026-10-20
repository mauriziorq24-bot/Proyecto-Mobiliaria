// Formateadores compartidos de la interfaz.

// Se crea una sola vez: construir un Intl.NumberFormat en cada llamada es costoso.
// 'es-VE' da el formato venezolano (punto de miles, coma decimal).
// narrowSymbol muestra "$" en vez de "USD"; los decimales solo aparecen si el precio no es entero:
// 1250 → "$1.250" · 99.5 → "$99,50"
const usdFormatter = new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  trailingZeroDisplay: 'stripIfInteger',
})

// El precio es referencial (API.md): quien lo muestre debe acompañarlo de "Precio referencial".
export function formatearPrecio(usd) {
  if (usd === null || usd === undefined || Number.isNaN(Number(usd))) return 'Consultar precio'
  return usdFormatter.format(Number(usd))
}

// Valores de tipoEspacio según API.md → texto para la UI.
export const ETIQUETAS_TIPO_ESPACIO = {
  OFICINA: 'Oficina',
  HOGAR: 'Hogar',
  SALON_BELLEZA: 'Salón de belleza',
  CONSULTORIO: 'Consultorio',
}

// Lista ordenada para pintar filtros: [{ valor: 'OFICINA', etiqueta: 'Oficina' }, ...]
export const OPCIONES_TIPO_ESPACIO = Object.entries(ETIQUETAS_TIPO_ESPACIO).map(
  ([valor, etiqueta]) => ({ valor, etiqueta }),
)

// Si el backend agrega un valor nuevo, se muestra el valor crudo en vez de nada.
export function etiquetaTipoEspacio(valor) {
  return ETIQUETAS_TIPO_ESPACIO[valor] ?? valor ?? ''
}
