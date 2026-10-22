import { crearRegistrosPorCuenta } from './almacenamiento'

// Solicitudes de cotización enviadas desde este navegador, con el mismo patrón que
// citasGuardadas.js: la confirmación (/carrito/confirmacion?codigo=…) lee de aquí, así que
// recargarla no reenvía nada, y /perfil las lista. Al enviar, la cotización del store se vacía:
// esta es la única copia de lo que se pidió.
//
// Cada una lleva el username de la sesión con que se envió (null si se envió sin sesión: esas
// solo se ven en su confirmación, en el perfil de nadie).

// :v2 desde que cada solicitud guarda su username. Lo de la clave sin versión se migra al abrir la app.
const STORAGE_KEY = 'mobiliario.cotizacionesEnviadas:v2'
const CLAVE_SIN_CUENTA = 'mobiliario.cotizacionesEnviadas'

// Por cuenta se guardan las últimas 20; las más viejas se descartan.
const MAXIMO_POR_CUENTA = 20

// La confirmación solo se muestra para una solicitud recién enviada.
const VIGENCIA_CONFIRMACION_MS = 24 * 60 * 60 * 1000

const cotizaciones = crearRegistrosPorCuenta(STORAGE_KEY, {
  idDe: (cotizacion) => cotizacion.codigoCotizacion,
  esValido: (valor) =>
    typeof valor === 'object' &&
    valor !== null &&
    typeof valor.codigoCotizacion === 'string' &&
    typeof valor.enviadaEn === 'number' &&
    Array.isArray(valor.items),
  maximoPorCuenta: MAXIMO_POR_CUENTA,
})

// Las de esa cuenta, la más reciente primero. Sin username, ninguna.
export function leerCotizacionesEnviadas(username) {
  return cotizaciones.leerDe(username)
}

// cotizacion: { codigoCotizacion, items: [{ productoId, nombre, cantidad, precioReferencialUsd }],
// totalReferencial }. Precios y total son los que vio la persona: el precio final lo da la empresa.
export function guardarCotizacionEnviada(cotizacion, username) {
  cotizaciones.guardar({ ...cotizacion, enviadaEn: Date.now() }, username)
}

// La solicitud con ese código si se envió hace menos de VIGENCIA_CONFIRMACION_MS; si no, null.
export function buscarCotizacionReciente(codigoCotizacion) {
  const cotizacion = cotizaciones.buscar(codigoCotizacion)
  if (!cotizacion) return null
  return Date.now() - cotizacion.enviadaEn < VIGENCIA_CONFIRMACION_MS ? cotizacion : null
}

// Si otra pestaña envía una solicitud. Devuelve la función para dejar de escuchar.
export function escucharCotizacionesEnviadas(alCambiar) {
  return cotizaciones.escucharOtrasPestanas(alCambiar)
}

// Lo guardado antes de separar las solicitudes por cuenta: pasa a la sesión actual o se descarta.
export function migrarCotizacionesSinCuenta(username) {
  cotizaciones.migrarDesde(CLAVE_SIN_CUENTA, username)
}
