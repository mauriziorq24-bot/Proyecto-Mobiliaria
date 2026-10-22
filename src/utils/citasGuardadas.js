import { crearRegistrosPorCuenta } from './almacenamiento'

// Citas creadas desde este navegador. No hay GET de citas en el backend, así que la única
// copia de los datos de una cita (para mostrar la confirmación y reprogramarla con PUT, que pide
// el CitaRequest completo) es la que se guarda aquí al crearla.
//
// localStorage y no sessionStorage: la persona puede volver días después a cambiar su cita.
// Cada cita lleva el username de la sesión con que se agendó: /mi-cita y /perfil muestran solo
// las de la cuenta con sesión (ver crearRegistrosPorCuenta en almacenamiento.js).

// :v2 desde que cada cita guarda su username. Lo de la clave sin versión se migra al abrir la app.
const STORAGE_KEY = 'mobiliario.citas:v2'
const CLAVE_SIN_CUENTA = 'mobiliario.citas'

// La confirmación solo se muestra para una cita recién creada. Pasado este tiempo, entrar a la
// confirmación lleva al formulario: ya no es "tu visita quedó agendada", es una cita vieja.
const VIGENCIA_CONFIRMACION_MS = 24 * 60 * 60 * 1000

const citas = crearRegistrosPorCuenta(STORAGE_KEY, {
  idDe: (cita) => cita.codigoCita,
  // Solo se aceptan objetos con un código: lo guardado pudo editarse a mano o venir de otra versión.
  esValido: (valor) => typeof valor === 'object' && valor !== null && typeof valor.codigoCita === 'string',
})

// Las citas de esa cuenta, la más reciente primero. Sin username, ninguna.
export function leerCitasGuardadas(username) {
  return citas.leerDe(username)
}

// cita: { codigoCita, nombreCliente, empresa, telefono, email, fechaHora, tipoAsesoria, notas },
// los mismos campos (y el mismo formato) que se enviaron al backend.
export function guardarCita(cita, username) {
  citas.guardar({ ...cita, guardadaEn: Date.now() }, username)
}

// Tras reprogramar con PUT: se guardan los datos nuevos (p. ej. { fechaHora }) en la misma cita.
// guardadaEn no cambia: sigue diciendo cuándo se creó.
export function actualizarCitaGuardada(codigoCita, cambios) {
  citas.actualizar(codigoCita, cambios)
}

// Tras cancelarla, o si el backend dice que ya no existe.
export function quitarCitaGuardada(codigoCita) {
  citas.quitar(codigoCita)
}

// La cita con ese código si se creó hace menos de VIGENCIA_CONFIRMACION_MS; si no, null.
export function buscarCitaReciente(codigoCita) {
  const cita = citas.buscar(codigoCita)
  if (!cita || typeof cita.guardadaEn !== 'number') return null
  return Date.now() - cita.guardadaEn < VIGENCIA_CONFIRMACION_MS ? cita : null
}

// Si otra pestaña agenda, cambia o cancela una cita. Devuelve la función para dejar de escuchar.
export function escucharCitasGuardadas(alCambiar) {
  return citas.escucharOtrasPestanas(alCambiar)
}

// Lo guardado antes de separar las citas por cuenta: pasa a la sesión actual o se descarta.
export function migrarCitasSinCuenta(username) {
  citas.migrarDesde(CLAVE_SIN_CUENTA, username)
}
