import { company } from '../config/empresa'

// Enlace de WhatsApp con un mensaje opcional ya escrito.
// wa.me abre el chat con el número de la empresa; el texto va codificado en ?text=.
export function whatsappUrl(message = '') {
  const base = `https://wa.me/${company.whatsapp.number}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

// Mensaje para consultar por un producto desde su ficha.
// Lleva el enlace a la página para que quien responda vea exactamente de qué pieza se habla.
export function productInquiryMessage({ nombre, cantidad = 1, url }) {
  const lines = [
    'Hola, vengo de la página web y quiero consultar por este producto:',
    `• ${nombre}`,
    `• Cantidad: ${cantidad}`,
  ]
  if (url) lines.push(url)
  return lines.join('\n')
}

export function productInquiryUrl(producto, cantidad, url) {
  return whatsappUrl(productInquiryMessage({ nombre: producto.nombre, cantidad, url }))
}

// Mensajes de la confirmación de cita. `cuando` es la fecha y hora ya en texto
// ("viernes 20 de noviembre, 2:30 p. m."), para que diga lo mismo que la pantalla.
export function citaAgendadaUrl({ codigoCita, tipo, cuando }) {
  return whatsappUrl(
    [
      'Hola, acabo de agendar una cita desde la página web:',
      `• Código: ${codigoCita}`,
      `• ${tipo}`,
      `• ${cuando}`,
    ].join('\n'),
  )
}

export function cambiarCitaUrl({ codigoCita, cuando }) {
  return whatsappUrl(`Hola, quiero cambiar o cancelar mi cita ${codigoCita} (${cuando}).`)
}
