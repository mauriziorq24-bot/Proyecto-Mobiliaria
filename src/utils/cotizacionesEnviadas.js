// Solicitudes de cotización enviadas desde este navegador, con el mismo patrón que
// citasGuardadas.js: la confirmación (/carrito/confirmacion?codigo=…) lee de aquí, así que
// recargarla no reenvía nada. Al enviar, la cotización del store se vacía: esta es la única copia
// de lo que se pidió.
//
// Como en los otros almacenamientos, localStorage puede fallar (modo privado, bloqueado). Por eso
// hay una copia en memoria: la confirmación se ve en esta visita aunque al recargar ya no esté.

const STORAGE_KEY = 'mobiliario.cotizacionesEnviadas'

// La confirmación solo se muestra para una solicitud recién enviada.
const VIGENCIA_CONFIRMACION_MS = 24 * 60 * 60 * 1000

let enMemoria = []

function esCotizacionEnviada(valor) {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof valor.codigoCotizacion === 'string' &&
    typeof valor.enviadaEn === 'number' &&
    Array.isArray(valor.items)
  )
}

function leerAlmacenamiento() {
  try {
    const lista = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(lista) ? lista.filter(esCotizacionEnviada) : []
  } catch {
    return []
  }
}

function leerCotizacionesEnviadas() {
  const guardadas = leerAlmacenamiento()
  return guardadas.length ? guardadas : enMemoria
}

// cotizacion: { codigoCotizacion, items: [{ productoId, nombre, cantidad, precioReferencialUsd }],
// totalReferencial }. El total es el que vio la persona: el precio final lo da la empresa.
export function guardarCotizacionEnviada(cotizacion) {
  const nueva = { ...cotizacion, enviadaEn: Date.now() }
  const lista = [nueva, ...leerCotizacionesEnviadas().filter((c) => c.codigoCotizacion !== cotizacion.codigoCotizacion)]
  enMemoria = lista
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
  } catch {
    // Sin almacenamiento disponible: queda solo la copia en memoria.
  }
}

// La solicitud con ese código si se envió hace menos de VIGENCIA_CONFIRMACION_MS; si no, null.
export function buscarCotizacionReciente(codigoCotizacion) {
  const cotizacion = leerCotizacionesEnviadas().find((c) => c.codigoCotizacion === codigoCotizacion)
  if (!cotizacion) return null
  return Date.now() - cotizacion.enviadaEn < VIGENCIA_CONFIRMACION_MS ? cotizacion : null
}
