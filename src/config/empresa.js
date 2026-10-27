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

  // Fotos del carrusel del inicio (src/components/home/HeroCarousel.vue), en este orden.
  // Para cambiarlas basta con editar esta lista. Si una foto no carga, ese paso muestra
  // la ilustración de los muebles; si no carga ninguna, el inicio muestra solo la ilustración.
  heroPhotos: [
    {
      url: 'https://www.bkmoffice.com/wp-content/uploads/2024/01/BKM-Commerce-3.jpg',
      alt: 'Escritorios y muebles de oficina',
    },
    {
      url: 'https://www.tablakala.com/cdn/shop/collections/sillas-de-oficina-4078100.jpg?v=1784947035',
      alt: 'Sillas de oficina',
    },
    {
      url: 'https://www.calligaris.com.do/cdn/shop/files/3008_n_yoroi-2.jpg?v=1714742803&width=1500',
      alt: 'Comedor de hogar',
    },
  ],

  instagram: {
    handle: '@mobiliariodeoficina',
    url: 'https://www.instagram.com/mobiliariodeoficina/',
  },

  showroom: {
    address: 'San Diego, Edo. Carabobo, Venezuela',
    // Enlace a Google Maps con la ubicación exacta del showroom. Pendiente: hoy solo hay ciudad.
    mapsUrl: null,
    schedule: [
      { days: 'Lunes a viernes', hours: '8:30 a. m. – 5:00 p. m.' },
      { days: 'Sábados', hours: '8:30 a. m. – 1:30 p. m.' },
    ],
    // El mismo horario, en datos, para calcular los turnos de las citas (src/utils/fecha.js).
    // Si cambia, actualizar también `schedule`. La clave es el día ISO: 1 = lunes … 7 = domingo.
    // Un día que no aparece (el domingo) no tiene atención. Horas en 24 h, hora de Caracas.
    openingHours: {
      1: { open: '08:30', close: '17:00' },
      2: { open: '08:30', close: '17:00' },
      3: { open: '08:30', close: '17:00' },
      4: { open: '08:30', close: '17:00' },
      5: { open: '08:30', close: '17:00' },
      6: { open: '08:30', close: '13:30' },
    },
    // Cuánto dura una cita. El backend aún no lo define (pendiente 11-ter de API.md):
    // el último turno ofrecido es la hora de cierre menos esta duración.
    duracionCitaMinutos: 60,
    // Con cuánta anticipación se puede agendar: se ofrecen los días con atención dentro de
    // los próximos N días, contando hoy (src/utils/fecha.js › diasDisponibles).
    diasAnticipacionCita: 30,
  },
}
