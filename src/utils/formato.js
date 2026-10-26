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

// Valores de tipoAsesoria confirmados por el backend (API.md) → texto para la UI.
// El orden es el de las opciones del formulario de citas.
export const TIPOS_ASESORIA = {
  VISITA_SHOWROOM: {
    etiqueta: 'Visita al showroom',
    descripcion: 'Ven a ver y probar los muebles en persona.',
  },
  COTIZACION_GENERAL: {
    etiqueta: 'Cotización',
    descripcion: 'Te ayudamos a armar una cotización con los muebles que necesitas.',
  },
  PROYECTO_CORPORATIVO: {
    etiqueta: 'Proyecto corporativo',
    descripcion: 'Para equipar una oficina completa o varias áreas de tu empresa.',
  },
  DISENO_DE_ESPACIOS: {
    etiqueta: 'Diseño de espacios',
    descripcion: 'Te orientamos sobre la distribución y los muebles que mejor encajan en tu espacio.',
  },
  RETIRO_DE_COMPRA: {
    etiqueta: 'Retiro de compra',
    descripcion: 'Elige el momento para retirar en el showroom un pedido que ya compraste.',
  },
}

// Lista para pintar opciones: [{ valor: 'VISITA_SHOWROOM', etiqueta, descripcion }, ...]
export const OPCIONES_TIPO_ASESORIA = Object.entries(TIPOS_ASESORIA).map(([valor, tipo]) => ({ valor, ...tipo }))

export function etiquetaTipoAsesoria(valor) {
  return TIPOS_ASESORIA[valor]?.etiqueta ?? valor ?? ''
}

// Estados de cotizaciones y citas según el backend (API.md) → texto y tono de BaseBadge.
// El orden es el de los botones para cambiar el estado en el panel.
// `filtro` es el texto de la pestaña que filtra la lista ("Pendientes").
export const ESTADOS_COTIZACION = {
  PENDIENTE: { etiqueta: 'Pendiente', filtro: 'Pendientes', tono: 'warning' },
  CONTACTADO: { etiqueta: 'Contactado', filtro: 'Contactados', tono: 'success' },
  CANCELADA: { etiqueta: 'Cancelada', filtro: 'Canceladas', tono: 'error' },
}

export const ESTADOS_CITA = {
  PENDIENTE: { etiqueta: 'Pendiente', filtro: 'Pendientes', tono: 'warning' },
  CONFIRMADA: { etiqueta: 'Confirmada', filtro: 'Confirmadas', tono: 'info' },
  COMPLETADA: { etiqueta: 'Completada', filtro: 'Completadas', tono: 'success' },
  CANCELADA: { etiqueta: 'Cancelada', filtro: 'Canceladas', tono: 'error' },
}

// Un estado nuevo del backend se muestra con su valor crudo y tono neutro, en vez de nada.
export function describirEstado(estados, valor) {
  return estados[valor] ?? { etiqueta: valor ?? '', filtro: valor ?? '', tono: 'info' }
}
