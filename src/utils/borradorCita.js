// Borrador del formulario de citas: lo que la persona escribió cuando su sesión venció.
// Se guarda justo antes de mandarla al login y se recupera (una sola vez) al volver.
//
// sessionStorage y no localStorage: vive solo en esta pestaña y se borra al cerrarla,
// así los datos de contacto no quedan guardados en un computador compartido.
// Como en el store de auth, el almacenamiento puede fallar (modo privado, bloqueado):
// en ese caso no se guarda nada y el formulario simplemente vuelve vacío.

const STORAGE_KEY = 'mobiliario.borradorCita'

// Un borrador más viejo que esto ya no se recupera: la persona probablemente cambió de planes.
const VIGENCIA_MS = 2 * 60 * 60 * 1000

// usuario: el username de la sesión que venció. Solo esa misma cuenta recupera el borrador.
export function guardarBorradorCita(usuario, datos) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ usuario, datos, guardadoEn: Date.now() }))
  } catch {
    // Sin almacenamiento disponible: nada que hacer.
  }
}

export function borrarBorradorCita() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento disponible: nada que hacer.
  }
}

// Devuelve los datos guardados y los borra, o null si no hay un borrador válido para este usuario.
export function tomarBorradorCita(usuario) {
  let guardado = null
  try {
    guardado = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
  } catch {
    guardado = null
  }
  borrarBorradorCita()

  if (!guardado || typeof guardado.datos !== 'object' || guardado.datos === null) return null
  if (!usuario || guardado.usuario !== usuario) return null
  if (Date.now() - guardado.guardadoEn > VIGENCIA_MS) return null
  return guardado.datos
}
