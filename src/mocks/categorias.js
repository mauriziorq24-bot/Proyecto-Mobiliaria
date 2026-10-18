// Respuesta simulada de GET /api/v1/categorias (misma forma que en API.md).
// "Sillería Ergonómica" y "Estaciones Operativas" aparecen en los datos del backend;
// el resto son de ejemplo y se reemplazan cuando el backend entregue la lista completa.

export const categorias = [
  {
    id: 1,
    nombre: 'Escritorios Gerenciales',
    slug: 'escritorios-gerenciales',
    descripcion: 'Escritorios para oficinas de dirección y gerencia.',
  },
  {
    id: 2,
    nombre: 'Sillería Ergonómica',
    slug: 'silleria-ergonomica',
    descripcion: 'Sillas operativas, gerenciales y de visita.',
  },
  {
    id: 3,
    nombre: 'Estaciones Operativas',
    slug: 'estaciones-operativas',
    descripcion: 'Escritorios tipo bench y puestos de trabajo para equipos.',
  },
  {
    id: 4,
    nombre: 'Mesas de Reunión',
    slug: 'mesas-de-reunion',
    descripcion: 'Mesas para salas de juntas y reuniones.',
  },
  {
    id: 5,
    nombre: 'Comedores',
    slug: 'comedores',
    descripcion: 'Mesas y sillas para comedores de empresa.',
  },
]
