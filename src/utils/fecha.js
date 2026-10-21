import { company } from '../config/empresa'

// Fechas y horas de las citas. Es el ÚNICO lugar del proyecto que las maneja.
//
// Regla: todo se calcula en hora de Caracas, sin importar la zona del dispositivo.
// Por eso aquí casi no se usan objetos Date "locales". Una cita se representa con dos textos:
//   fecha: 'AAAA-MM-DD'  (p. ej. '2026-11-20')
//   hora:  'HH:MM' en 24 h, hora de Caracas  (p. ej. '14:30')
// Son "hora de pared": lo que marca un reloj en el showroom, no un instante universal.
// Cuando hace falta un Date (para Intl o para el .ics), se construye en UTC con Date.UTC,
// que no depende de la zona del dispositivo ni tiene horario de verano.

export const ZONA_HORARIA = 'America/Caracas'

// Cada cuántos minutos se ofrece un turno.
const INTERVALO_MINUTOS = 30

// Cuántos días con turnos libres se ofrecen hacia adelante (unas cuatro semanas).
const DIAS_A_OFRECER = 24

const FECHA_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const HORA_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

const dosDigitos = (n) => String(n).padStart(2, '0')

// '14:30' → 870 (minutos desde la medianoche)
function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

// 870 → '14:30'
function aHora(minutos) {
  return `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`
}

// '2026-11-20' → [2026, 11, 20]
function partesDeFecha(fecha) {
  const match = FECHA_RE.exec(fecha ?? '')
  if (!match) throw new Error(`Fecha inválida: "${fecha}" (se espera AAAA-MM-DD)`)
  return match.slice(1).map(Number)
}

// Un Date cuyos campos UTC son la fecha y hora de pared dadas. NO es el instante real
// de la cita: solo sirve para hacer cuentas de calendario y formatear con timeZone 'UTC'.
function fechaUtc(fecha, hora = '00:00') {
  const [anio, mes, dia] = partesDeFecha(fecha)
  const [h, m] = hora.split(':').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia, h, m))
}

function aTextoFecha(date) {
  return `${date.getUTCFullYear()}-${dosDigitos(date.getUTCMonth() + 1)}-${dosDigitos(date.getUTCDate())}`
}

// '2026-11-20' + 3 → '2026-11-23'. En UTC no hay horario de verano: un día siempre son 24 h.
export function sumarDias(fecha, dias) {
  const date = fechaUtc(fecha)
  date.setUTCDate(date.getUTCDate() + dias)
  return aTextoFecha(date)
}

// Día ISO de la semana: 1 = lunes … 7 = domingo.
export function diaDeLaSemana(fecha) {
  return fechaUtc(fecha).getUTCDay() || 7
}

// Se crea una sola vez. en-CA da números con ceros a la izquierda; hourCycle h23 evita
// que la medianoche salga como "24".
const relojCaracas = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// Qué fecha y hora marca ahora un reloj en Caracas: { fecha: '2026-10-21', hora: '12:46' }.
// Recibe `instante` para poder probarlo con cualquier momento.
export function ahoraEnCaracas(instante = new Date()) {
  const p = Object.fromEntries(relojCaracas.formatToParts(instante).map(({ type, value }) => [type, value]))
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }
}

// Turnos de un día: ['08:30', '09:00', …, '16:00']. Vacío si ese día no hay atención o ya pasó.
// El último turno es la hora de cierre menos la duración de la cita (la cita termina al cerrar).
// Si la fecha es hoy, solo se ofrecen los turnos que aún no empezaron.
export function horariosDelDia(fecha, ahora = ahoraEnCaracas()) {
  if (fecha < ahora.fecha) return [] // 'AAAA-MM-DD' se puede comparar como texto

  const horario = company.showroom.openingHours[diaDeLaSemana(fecha)]
  if (!horario) return []

  const inicio = aMinutos(horario.open)
  const ultimo = aMinutos(horario.close) - company.showroom.duracionCitaMinutos
  const desde = fecha === ahora.fecha ? aMinutos(ahora.hora) : -1

  const turnos = []
  for (let minutos = inicio; minutos <= ultimo; minutos += INTERVALO_MINUTOS) {
    if (minutos > desde) turnos.push(aHora(minutos))
  }
  return turnos
}

// Próximos días con al menos un turno libre, empezando por hoy: ['2026-10-21', '2026-10-22', …].
// Salta domingos y, si hoy ya no quedan turnos, también hoy.
export function diasDisponibles(cantidad = DIAS_A_OFRECER, ahora = ahoraEnCaracas()) {
  const dias = []
  // Tope de vueltas por si el horario quedara vacío (no habría ningún día que ofrecer).
  for (let i = 0; dias.length < cantidad && i < cantidad * 2; i++) {
    const fecha = sumarDias(ahora.fecha, i)
    if (horariosDelDia(fecha, ahora).length) dias.push(fecha)
  }
  return dias
}

// Comprobación final antes de enviar: el formulario pudo quedar abierto y el turno ya pasó.
export function esHorarioDisponible(fecha, hora, ahora = ahoraEnCaracas()) {
  if (!FECHA_RE.test(fecha ?? '') || !HORA_RE.test(hora ?? '')) return false
  return horariosDelDia(fecha, ahora).includes(hora)
}

// fecha + hora → formato que espera el backend: hora de Caracas sin zona ('2026-11-20T14:30:00').
// Se arma a mano y NUNCA con toISOString(): eso convierte a UTC y la cita quedaría 4 h más tarde
// (ver "Zonas horarias en fechaHora" en API.md).
export function aFechaHoraBackend(fecha, hora) {
  partesDeFecha(fecha) // lanza si la fecha no tiene el formato correcto
  if (!HORA_RE.test(hora ?? '')) throw new Error(`Hora inválida: "${hora}" (se espera HH:MM)`)
  return `${fecha}T${hora}:00`
}

// El camino inverso: '2026-11-20T14:30:00' → { fecha: '2026-11-20', hora: '14:30' }.
// Si llegara con Z u offset, se ignoran: el backend siempre guarda hora de Caracas.
export function desdeFechaHoraBackend(fechaHora) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(fechaHora ?? '')
  if (!match) throw new Error(`fechaHora inválida: "${fechaHora}"`)
  return { fecha: match[1], hora: match[2] }
}

// El instante real (UTC) en que empieza, o termina, una cita. Lo usa el .ics: los calendarios
// necesitan un instante para mostrar la hora correcta en la zona de cada dispositivo.
// Se le pide a Intl el desfase de Caracas en esa fecha (hoy −4 h) en vez de escribirlo fijo.
export function instanteCaracas(fecha, hora, minutosDespues = 0) {
  const pared = fechaUtc(fecha, hora).getTime() + minutosDespues * 60_000
  const reloj = ahoraEnCaracas(new Date(pared))
  const desfase = fechaUtc(reloj.fecha, reloj.hora).getTime() - pared // −4 h → −14 400 000 ms
  return new Date(pared - desfase)
}

// "viernes 20 de noviembre, 2:30 p. m."
// Se formatea en timeZone 'UTC' a propósito: fechaUtc ya trae la hora de Caracas en sus campos UTC,
// así el texto sale igual en un teléfono de Caracas que en uno de Madrid.
const formatoDiaSemana = new Intl.DateTimeFormat('es-VE', { timeZone: 'UTC', weekday: 'long' })
const formatoDiaMes = new Intl.DateTimeFormat('es-VE', { timeZone: 'UTC', day: 'numeric', month: 'long' })
const formatoHora = new Intl.DateTimeFormat('es-VE', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true })

export function formatearFechaHora(fecha, hora) {
  const date = fechaUtc(fecha, hora)
  return `${formatoDiaSemana.format(date)} ${formatoDiaMes.format(date)}, ${formatoHora.format(date)}`
}
