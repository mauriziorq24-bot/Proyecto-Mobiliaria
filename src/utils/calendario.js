import { company } from '../config/empresa'
import { instanteCaracas } from './fecha'
import { etiquetaTipoAsesoria } from './formato'

// Archivo .ics (iCalendar, RFC 5545) con una cita, para agregarla al calendario del teléfono
// o de la computadora (Google Calendar, Calendario de Apple, Outlook).
//
// Las horas van en UTC (terminan en Z): así cada calendario la muestra en la zona de su
// dispositivo y no hace falta describir la zona de Caracas dentro del archivo.

// Date → '20261120T183000Z'
function aFechaIcs(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// En los textos, la coma, el punto y coma, la barra invertida y el salto de línea son especiales.
function escaparTexto(texto) {
  return String(texto)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Ninguna línea puede pasar de 75 bytes: las largas se parten y la continuación empieza con
// un espacio. Se cuentan bytes y no letras porque "é" ocupa 2 bytes en UTF-8.
const encoder = new TextEncoder()
function plegarLinea(linea) {
  const partes = []
  let actual = ''
  let bytes = 0
  for (const caracter of linea) {
    const tamano = encoder.encode(caracter).length
    const limite = partes.length ? 74 : 75 // la continuación ya gasta 1 byte en el espacio
    if (bytes + tamano > limite) {
      partes.push(actual)
      actual = ''
      bytes = 0
    }
    actual += caracter
    bytes += tamano
  }
  partes.push(actual)
  return partes.join('\r\n ')
}

// cita: { codigoCita, fecha: 'AAAA-MM-DD', hora: 'HH:MM', tipoAsesoria }
export function generarIcs({ codigoCita, fecha, hora, tipoAsesoria }) {
  const { address, duracionCitaMinutos } = company.showroom
  const telefono = company.phones[0]?.display
  const descripcion = [
    `Código de tu cita: ${codigoCita}.`,
    'Lo necesitas para modificarla o cancelarla.',
    telefono ? `Teléfono: ${telefono}.` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mobiliario de Oficina//Citas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // UID identifica el evento: si se importa dos veces la misma cita, el calendario la actualiza.
    `UID:${codigoCita}@mobiliariodeoficina`,
    `DTSTAMP:${aFechaIcs(new Date())}`,
    `DTSTART:${aFechaIcs(instanteCaracas(fecha, hora))}`,
    `DTEND:${aFechaIcs(instanteCaracas(fecha, hora, duracionCitaMinutos))}`,
    `SUMMARY:${escaparTexto(`${etiquetaTipoAsesoria(tipoAsesoria)} · ${company.name}`)}`,
    `LOCATION:${escaparTexto(address)}`,
    `DESCRIPTION:${escaparTexto(descripcion)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  // El estándar exige CRLF (\r\n) como fin de línea.
  return lineas.map(plegarLinea).join('\r\n') + '\r\n'
}

// Descarga el .ics. Al abrirlo, el teléfono ofrece agregar la cita a su calendario.
export function descargarIcs(cita) {
  const blob = new Blob([generarIcs(cita)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `cita-${cita.codigoCita}.ics`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Se libera después: Safari cancela la descarga si la URL desaparece en el mismo instante.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
