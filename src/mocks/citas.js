import { ahoraEnCaracas, sumarDias } from '../utils/fecha'

// Respuestas simuladas de /api/v1/citas (misma forma que en API.md).
// POST, PUT y DELETE no guardan nada: aceptan cualquier código con el formato correcto, salvo
// CODIGO_INEXISTENTE, que sirve para probar "Cita no encontrada".

export const CODIGO_INEXISTENTE = 'CITA-000000'

// 'CITA-' + 6 hexadecimales en mayúsculas, como el backend.
export function createMockCodigoCita() {
  const hex = Math.floor(Math.random() * 0x1000000).toString(16).toUpperCase().padStart(6, '0')
  return `CITA-${hex}`
}

export const mockCitaCreada = () => ({ codigoCita: createMockCodigoCita(), mensaje: 'Cita agendada con éxito' })
export const mockCitaModificada = { mensaje: 'Cita modificada con éxito' }
export const mockCitaEliminada = { mensaje: 'Cita eliminada con éxito' }

// --- Panel de administración: GET /api/v1/citas y PATCH /api/v1/citas/{codigoCita} ---
// Forma real (curl, 26/10/2026): la entidad `CitaShowroom`, con `usuario` como el `User` completo y
// sin `nombreCliente` ni `email` (pendiente 33 de API.md). El mock la imita, salvo `password`:
// el backend real lo envía y no debería; aquí no se copia ni de mentira.
// Datos FICTICIOS. Las fechas se calculan desde hoy (hora de Caracas) para que la agenda tenga
// citas de hoy, de los próximos días y alguna pasada.

// Con mocks, cambiar el estado de esta cita siempre falla (500): sirve para ver la reversión.
export const MOCK_CITA_FALLA = 'CITA-FA1100'

const usuarioMock = (id, username, email) => ({
  id,
  username,
  email,
  role: 'USER',
  accountNonExpired: true,
  accountNonLocked: true,
  authorities: [{ authority: 'USER' }],
  credentialsNonExpired: true,
  enabled: true,
})

function crearCitasAdmin() {
  const hoy = ahoraEnCaracas().fecha
  const dia = (n, hora) => `${sumarDias(hoy, n)}T${hora}:00`
  const cita = (id, codigoCita, usuario, fechaHora, tipoAsesoria, estado, extra = {}) => ({
    id,
    codigoCita,
    usuario,
    empresa: null,
    telefono: '+584120000000',
    fechaHora,
    tipoAsesoria,
    estado,
    notas: null,
    creadoEn: dia(-3, '10:15'),
    ...extra,
  })
  const carla = usuarioMock(11, 'carla.mendez', 'carla@ejemplo.com')
  const luis = usuarioMock(12, 'luis.herrera', 'luis@ejemplo.com')
  const ana = usuarioMock(13, 'ana.rivas', 'ana@ejemplo.com')

  return [
    cita(1, 'CITA-3B9A01', carla, dia(0, '09:30'), 'VISITA_SHOWROOM', 'CONFIRMADA', { empresa: 'Consultorio Méndez', notas: 'Me interesa: Silla Ejecutiva Malla Transpirable.' }),
    cita(2, 'CITA-7C2D44', luis, dia(0, '15:00'), 'COTIZACION_GENERAL', 'PENDIENTE'),
    cita(3, 'CITA-A1E5F2', ana, dia(1, '10:00'), 'DISENO_DE_ESPACIOS', 'PENDIENTE', { notas: 'Es para el cuarto de estudio de la casa.' }),
    cita(4, 'CITA-0D4C88', carla, dia(2, '11:30'), 'RETIRO_DE_COMPRA', 'CONFIRMADA'),
    cita(5, 'CITA-5E6F70', luis, dia(4, '14:00'), 'PROYECTO_CORPORATIVO', 'CANCELADA', { empresa: 'Herrera & Asociados' }),
    cita(6, MOCK_CITA_FALLA, usuarioMock(14, 'prueba.error', 'error@ejemplo.com'), dia(3, '09:00'), 'VISITA_SHOWROOM', 'PENDIENTE', { notas: 'Con mocks, cambiar el estado de esta cita siempre falla.' }),
    cita(7, 'CITA-9F0B12', ana, dia(-2, '16:00'), 'VISITA_SHOWROOM', 'COMPLETADA'),
    cita(8, 'CITA-2C7E9D', carla, dia(-1, '08:30'), 'COTIZACION_GENERAL', 'PENDIENTE'),
  ]
}

// Igual que las cotizaciones: un arreglo en memoria que el PATCH cambia hasta recargar la página.
let citasAdmin = null

export function mockCitasAdmin() {
  citasAdmin ??= crearCitasAdmin()
  return structuredClone(citasAdmin)
}

// PATCH simulado → { mensaje }. null si el código no existe.
export function mockCambiarEstadoCita(codigoCita, estado) {
  citasAdmin ??= crearCitasAdmin()
  const encontrada = citasAdmin.find((c) => c.codigoCita === codigoCita)
  if (!encontrada) return null
  encontrada.estado = estado
  return { mensaje: `Estado de la cita actualizado a ${estado}` }
}
