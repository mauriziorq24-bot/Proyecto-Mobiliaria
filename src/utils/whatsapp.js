import { company } from '../config/empresa'
import { formatearPrecio } from './formato'

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

// Favoritos: un producto guardado que salió del catálogo. Sin enlace: su ficha ya no existe.
export function favoritoNoDisponibleUrl(nombre) {
  return whatsappUrl(
    [
      'Hola, guardé este producto en favoritos y ya no aparece en la página web:',
      `• ${nombre}`,
      '¿Todavía lo tienen o algo parecido?',
    ].join('\n'),
  )
}

// Cotización completa (página Mi cotización y barra móvil): una línea por producto con su cantidad
// y su precio referencial, el total referencial y el enlace a la tienda.
// `items` son los del store de la cotización que siguen disponibles; `total` ya viene formateado.
// El enlace es a la tienda y no a /carrito: la cotización vive en el navegador de quien la arma,
// así que en otro teléfono /carrito estaría vacío.
export function cotizacionUrl(items, total, tiendaUrl = window.location.origin) {
  const lines = [
    'Hola, vengo de la página web y quiero cotizar estos productos:',
    ...items.map(
      (item) =>
        `• ${item.cantidad} × ${item.producto.nombre} (ref. ${formatearPrecio(item.producto.precioReferencialUsd)} c/u)`,
    ),
    `Total referencial: ${total}`,
    tiendaUrl,
  ]
  return whatsappUrl(lines.join('\n'))
}

// Confirmación de una solicitud de cotización ya enviada por el formulario.
export function cotizacionEnviadaUrl(codigoCotizacion) {
  return whatsappUrl(
    `Hola, acabo de enviar una solicitud de cotización desde la página web. Mi código es ${codigoCotizacion}.`,
  )
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

// /mi-cita: para una cita que no aparece en este navegador. La persona completa el código.
export function consultarCitaUrl() {
  return whatsappUrl('Hola, quiero cambiar o cancelar mi cita. Mi código es: ')
}

// /mi-cita: el backend dijo que la cita ya no existe.
export function citaNoEncontradaUrl({ codigoCita, cuando }) {
  return whatsappUrl(`Hola, quise cambiar mi cita ${codigoCita} (${cuando}) desde la web y dice que ya no existe.`)
}

// Perfil: consultar por una solicitud de cotización enviada antes.
export function consultarCotizacionUrl(codigoCotizacion) {
  return whatsappUrl(
    `Hola, quiero consultar por mi solicitud de cotización ${codigoCotizacion}, enviada desde la página web.`,
  )
}
