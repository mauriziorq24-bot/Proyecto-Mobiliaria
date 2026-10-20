// Datos de contacto de la empresa. Es el único lugar donde se escriben:
// header, footer y cualquier vista que los necesite los importan desde aquí.
// Un valor en null significa "pendiente": la interfaz no lo muestra.

export const company = {
  name: 'Mobiliario de Oficina',
  tagline: 'Mobiliario para oficinas, negocios y hogares, con showroom en Carabobo.',

  // Números en formato internacional sin espacios (para tel: y wa.me) y con formato para mostrarlos.
  phones: [
    { display: '+58 424-4343284', value: '+584244343284' },
    { display: '+58 412-5074777', value: '+584125074777' },
  ],

  // wa.me abre WhatsApp directo al chat; el número va sin "+" ni guiones.
  whatsapp: {
    number: '584244343284',
    display: '+58 424-4343284',
  },

  email: null, // pendiente

  instagram: {
    handle: '@mobiliariodeoficina',
    url: 'https://www.instagram.com/mobiliariodeoficina/',
  },

  showroom: {
    address: 'San Diego, Edo. Carabobo, Venezuela',
    // Enlace a Google Maps con la ubicación exacta del showroom. Pendiente: hoy solo hay ciudad.
    mapsUrl: null,
    // Foto del showroom para el inicio. Mientras sea null, el inicio muestra las siluetas de los muebles.
    photoUrl: null,
    schedule: [
      { days: 'Lunes a viernes', hours: '8:30 a. m. – 5:00 p. m.' },
      { days: 'Sábados', hours: '8:30 a. m. – 1:30 p. m.' },
    ],
  },
}

// Enlace de WhatsApp con un mensaje opcional ya escrito.
export function whatsappUrl(message = '') {
  const base = `https://wa.me/${company.whatsapp.number}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
