// Teléfonos venezolanos: validación y un único formato para enviarlos al backend.
//
// Un número venezolano tiene 10 dígitos "propios" (sin el 0 inicial ni el +58):
//   móvil: 4XX + 7 dígitos   → 0424-4343284  /  +58 424 4343284
//   fijo:  2XX + 7 dígitos   → 0241-8765432  /  +58 241 8765432  (02XX es el código de área)
// Se normaliza a formato internacional sin espacios, '+584244343284', el mismo que usa
// src/config/empresa.js para tel: y wa.me.

// Prefijos de operadoras móviles (Movilnet, Movistar, Digitel). Si aparece uno nuevo, se agrega aquí.
const PREFIJOS_MOVILES = ['412', '414', '416', '422', '424', '426']

// Lo que queda tras quitar el +58, el 0058 o el 0 inicial: los 10 dígitos propios, o null.
function digitosNacionales(texto) {
  // Se aceptan espacios, guiones, puntos y paréntesis: "(0424) 434.32.84".
  const limpio = String(texto ?? '').trim().replace(/[\s\-.()]/g, '')
  if (!/^\+?\d+$/.test(limpio)) return null

  const digitos = limpio.replace('+', '')
  if (digitos.length === 12 && digitos.startsWith('58')) return digitos.slice(2) // +58… o 58…
  if (digitos.length === 14 && digitos.startsWith('0058')) return digitos.slice(4)
  if (digitos.length === 11 && digitos.startsWith('0')) return digitos.slice(1) // 0424…
  if (digitos.length === 10 && !limpio.startsWith('+')) return digitos // 424… (sin el 0)
  return null
}

// 'movil', 'fijo' o null si no es un teléfono venezolano válido.
export function tipoDeTelefono(texto) {
  const digitos = digitosNacionales(texto)
  if (!digitos) return null
  if (PREFIJOS_MOVILES.includes(digitos.slice(0, 3))) return 'movil'
  if (digitos.startsWith('2')) return 'fijo'
  return null
}

export function esTelefonoValido(texto) {
  return tipoDeTelefono(texto) !== null
}

// '0424-434.32.84' → '+584244343284'. null si no es válido.
export function normalizarTelefono(texto) {
  return esTelefonoValido(texto) ? `+58${digitosNacionales(texto)}` : null
}
