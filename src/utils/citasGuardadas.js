// Citas creadas desde este navegador. No hay GET de citas en el backend, así que la única
// copia de los datos de una cita (para mostrar la confirmación y, en el paso 6F, reprogramarla
// con PUT, que pide el CitaRequest completo) es la que se guarda aquí al crearla.
//
// localStorage y no sessionStorage: la persona puede volver días después a cambiar su cita.
// Como en el store de auth, el almacenamiento puede fallar (modo privado, bloqueado). Por eso
// también hay una copia en memoria: la confirmación se ve igual en esta visita, aunque al
// recargar ya no esté.

const STORAGE_KEY = 'mobiliario.citas'

// La confirmación solo se muestra para una cita recién creada. Pasado este tiempo, entrar a la
// confirmación lleva al formulario: ya no es "tu visita quedó agendada", es una cita vieja.
const VIGENCIA_CONFIRMACION_MS = 24 * 60 * 60 * 1000

// Copia en memoria por si localStorage no funciona.
let enMemoria = []

// Solo se aceptan objetos con un código: lo guardado pudo editarse a mano o venir de otra versión.
function esCitaGuardada(valor) {
  return typeof valor === 'object' && valor !== null && typeof valor.codigoCita === 'string'
}

function leerAlmacenamiento() {
  try {
    const lista = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(lista) ? lista.filter(esCitaGuardada) : []
  } catch {
    return []
  }
}

// Todas las citas guardadas, la más reciente primero.
export function leerCitasGuardadas() {
  const guardadas = leerAlmacenamiento()
  return guardadas.length ? guardadas : enMemoria
}

// cita: { codigoCita, nombreCliente, empresa, telefono, email, fechaHora, tipoAsesoria, notas },
// los mismos campos (y el mismo formato) que se enviaron al backend.
export function guardarCita(cita) {
  const nueva = { ...cita, guardadaEn: Date.now() }
  // Si el código ya estaba (no debería), se reemplaza en vez de duplicarse.
  const lista = [nueva, ...leerCitasGuardadas().filter((c) => c.codigoCita !== cita.codigoCita)]
  enMemoria = lista
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
  } catch {
    // Sin almacenamiento disponible: queda solo la copia en memoria.
  }
}

export function buscarCitaGuardada(codigoCita) {
  return leerCitasGuardadas().find((cita) => cita.codigoCita === codigoCita) ?? null
}

// La cita con ese código si se creó hace menos de VIGENCIA_CONFIRMACION_MS; si no, null.
export function buscarCitaReciente(codigoCita) {
  const cita = buscarCitaGuardada(codigoCita)
  if (!cita || typeof cita.guardadaEn !== 'number') return null
  return Date.now() - cita.guardadaEn < VIGENCIA_CONFIRMACION_MS ? cita : null
}
