import { shallowRef } from 'vue'

// Teléfonos de cualquier país: validación, formato y un único formato para el backend (E.164).
//
// E.164 es el estándar internacional: '+', el código de país y el número sin el 0 inicial,
// sin espacios ni guiones. '0414-123.45.67' en Venezuela → '+584141234567'. Es el que se envía
// al backend y el que usan tel: y wa.me (este sin el '+').
//
// Las reglas de cada país vienen de libphonenumber-js con los metadatos "min" (~40 kB con gzip).
// Para no sumarlos a toda la tienda, se cargan con import() solo cuando una página los pide
// (BasePhoneInput, los servicios que envían teléfonos y el panel). Mientras no estén cargados,
// las funciones de abajo no adivinan: devuelven null o un aviso.

// El módulo de libphonenumber, o null mientras no ha cargado. Es reactivo: los computed que lo
// usan (formato en el panel, lista de países) se recalculan solos cuando llega.
const lib = shallowRef(null)
let cargando = null

// Carga la librería una sola vez. Devuelve true si quedó lista; nunca lanza.
// Si falla (sin conexión), se puede volver a intentar.
export function cargarTelefono() {
  if (lib.value) return Promise.resolve(true)
  cargando ??= import('libphonenumber-js/min')
    .then((modulo) => {
      lib.value = modulo
      return true
    })
    .catch(() => {
      cargando = null
      return false
    })
  return cargando
}

export const telefonoListo = () => lib.value !== null

// Si no se dice otro país, el teléfono es venezolano (también los guardados antes de este cambio).
export const PAIS_POR_DEFECTO = 'VE'

// Los más frecuentes para la empresa, en este orden, arriba en el selector. Los códigos van
// escritos porque el selector los muestra antes de que cargue la librería.
export const PAISES_FRECUENTES = [
  { pais: 'VE', codigo: '58' },
  { pais: 'CO', codigo: '57' },
  { pais: 'US', codigo: '1' },
  { pais: 'ES', codigo: '34' },
  { pais: 'PA', codigo: '507' },
  { pais: 'MX', codigo: '52' },
  { pais: 'CL', codigo: '56' },
  { pais: 'PE', codigo: '51' },
  { pais: 'AR', codigo: '54' },
  { pais: 'EC', codigo: '593' },
]

// 'CO' → 'Colombia'. Los nombres los da el navegador, en español: no hay que escribirlos.
const nombresDeRegion = new Intl.DisplayNames(['es'], { type: 'region' })

export function nombrePais(pais) {
  try {
    return nombresDeRegion.of(pais) ?? pais
  } catch {
    return pais
  }
}

export function codigoPais(pais) {
  const frecuente = PAISES_FRECUENTES.find((p) => p.pais === pais)
  if (frecuente) return frecuente.codigo
  try {
    return lib.value?.getCountryCallingCode(pais) ?? ''
  } catch {
    return '' // un código de país que la librería no conoce
  }
}

// Los demás países, en orden alfabético, para el segundo grupo del selector. [] hasta que cargue.
export function otrosPaises() {
  if (!lib.value) return []
  const frecuentes = new Set(PAISES_FRECUENTES.map((p) => p.pais))
  return lib.value
    .getCountries()
    .filter((pais) => !frecuentes.has(pais))
    .map((pais) => ({ pais, codigo: lib.value.getCountryCallingCode(pais), nombre: nombrePais(pais) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// Texto escrito + país elegido → número de libphonenumber, o null.
// Si el texto trae '+' (o '00'), su código manda sobre el país elegido.
// Sin '+', se aceptan los formatos de antes: '58424…' y '0058424…' son venezolanos.
function leer(texto, pais = PAIS_POR_DEFECTO) {
  if (!lib.value) return null
  const limpio = String(texto ?? '').trim()
  if (!limpio) return null
  const numero = lib.value.parsePhoneNumberFromString(limpio.replace(/^00/, '+'), pais)
  if (numero?.isValid()) return numero
  const digitos = limpio.replace(/\D/g, '')
  if (!limpio.startsWith('+') && /^(00)?58\d{10}$/.test(digitos)) {
    return lib.value.parsePhoneNumberFromString(`+${digitos.replace(/^00/, '')}`)
  }
  return numero
}

// '' si el teléfono es válido para el país; si no, el mensaje para mostrar bajo el campo.
// (El campo vacío lo revisa cada formulario, con su propio mensaje.)
export function validarTelefono(texto, pais = PAIS_POR_DEFECTO) {
  if (!lib.value) {
    cargarTelefono() // la próxima revisión ya la tendrá, si vuelve la conexión
    return 'No pudimos revisar el teléfono. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (leer(texto, pais)?.isValid()) return ''
  const paisEscrito = String(texto ?? '').trim().startsWith('+') ? paisDeTexto(texto) : null
  return `Este número no parece válido para ${nombrePais(paisEscrito ?? pais)}.`
}

// '0414-123.45.67' (Venezuela) → '+584141234567'. null si no es válido o no ha cargado la librería.
export function normalizarTelefono(texto, pais = PAIS_POR_DEFECTO) {
  const numero = leer(texto, pais)
  return numero?.isValid() ? numero.number : null
}

// Para mostrar un teléfono guardado (panel): { e164, internacional, pais, nombrePais }, o null.
// '+573001234567' → { internacional: '+57 300 1234567', nombrePais: 'Colombia', … }
export function describirTelefono(texto) {
  const numero = leer(texto)
  if (!numero?.isValid()) return null
  return {
    e164: numero.number,
    internacional: numero.formatInternational(),
    pais: numero.country ?? null,
    nombrePais: numero.country ? nombrePais(numero.country) : null,
  }
}

// --- Para BasePhoneInput, mientras se escribe ---

// País de un texto con '+' ('+57 300…' → 'CO'), o null si aún no se sabe.
// Algunos códigos los comparten varios países (+1: Estados Unidos, Canadá…): si el que ya está
// elegido usa ese código, se respeta; si no, el frecuente con ese código (+1 → Estados Unidos)
// o, si no hay, el primero de la lista.
export function paisDeTexto(texto, paisActual = null) {
  if (!lib.value) return null
  const formateador = new lib.value.AsYouType()
  formateador.input(String(texto ?? '').replace(/^\s*00/, '+'))
  const codigo = formateador.getCallingCode()
  if (!codigo) return null
  const detectado = formateador.getCountry()
  if (detectado) return detectado
  if (paisActual && codigoPais(paisActual) === codigo) return paisActual
  return (
    PAISES_FRECUENTES.find((p) => p.codigo === codigo)?.pais ??
    lib.value.getCountries().find((pais) => lib.value.getCountryCallingCode(pais) === codigo) ??
    null
  )
}

// Número nacional (sin el código) de un texto con '+': '+57 300 123' → '300123'.
export function digitosNacionales(texto) {
  if (!lib.value) return String(texto ?? '').replace(/\D/g, '')
  const formateador = new lib.value.AsYouType()
  formateador.input(String(texto ?? '').replace(/^\s*00/, '+'))
  return formateador.getNationalNumber()
}

// Dígitos → como se escriben en ese país: ('VE', '04141234567') → '0414-1234567'.
// Sin la librería, los dígitos tal cual.
export function formatearMientrasEscribe(digitos, pais) {
  if (!lib.value || !digitos) return digitos
  return new lib.value.AsYouType(pais).input(digitos)
}
