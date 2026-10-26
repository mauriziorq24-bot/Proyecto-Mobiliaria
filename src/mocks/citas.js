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
// Forma real (curl, 26/10/2026): `CitaResponse` = { codigoCita, nombreCliente, email, empresa,
// telefono, fechaHora, tipoAsesoria, estado, notas, creadoEn }. Hoy `creadoEn` llega en null
// (pendiente 36 de API.md); el mock lo trae con fecha para ver cómo se muestra cuando se arregle.
// Datos FICTICIOS. Las fechas se calculan desde hoy (hora de Caracas) para que la agenda tenga
// citas de hoy, de los próximos días y alguna pasada.

// Con mocks, cambiar el estado de esta cita siempre falla (500): sirve para ver la reversión.
export const MOCK_CITA_FALLA = 'CITA-FA1100'

function crearCitasAdmin() {
  const hoy = ahoraEnCaracas().fecha
  const dia = (n, hora) => `${sumarDias(hoy, n)}T${hora}:00`
  const cita = (codigoCita, [nombreCliente, email], fechaHora, tipoAsesoria, estado, extra = {}) => ({
    codigoCita,
    nombreCliente,
    email,
    empresa: null,
    telefono: '+584120000000',
    fechaHora,
    tipoAsesoria,
    estado,
    notas: null,
    creadoEn: dia(-3, '10:15'),
    ...extra,
  })
  const carla = ['Carla Méndez', 'carla@ejemplo.com']
  const luis = ['Luis Herrera', 'luis@ejemplo.com']
  const ana = ['Ana Rivas', 'ana@ejemplo.com']

  return [
    cita('CITA-3B9A01', carla, dia(0, '09:30'), 'VISITA_SHOWROOM', 'CONFIRMADA', { empresa: 'Consultorio Méndez', notas: 'Me interesa: Silla Ejecutiva Malla Transpirable.' }),
    cita('CITA-7C2D44', luis, dia(0, '15:00'), 'COTIZACION_GENERAL', 'PENDIENTE'),
    cita('CITA-A1E5F2', ana, dia(1, '10:00'), 'DISENO_DE_ESPACIOS', 'PENDIENTE', { notas: 'Es para el cuarto de estudio de la casa.' }),
    cita('CITA-0D4C88', carla, dia(2, '11:30'), 'RETIRO_DE_COMPRA', 'CONFIRMADA'),
    cita('CITA-5E6F70', luis, dia(4, '14:00'), 'PROYECTO_CORPORATIVO', 'CANCELADA', { empresa: 'Herrera & Asociados' }),
    cita(MOCK_CITA_FALLA, ['Prueba de error', 'error@ejemplo.com'], dia(3, '09:00'), 'VISITA_SHOWROOM', 'PENDIENTE', { notas: 'Con mocks, cambiar el estado de esta cita siempre falla.' }),
    cita('CITA-9F0B12', ana, dia(-2, '16:00'), 'VISITA_SHOWROOM', 'COMPLETADA'),
    cita('CITA-2C7E9D', carla, dia(-1, '08:30'), 'COTIZACION_GENERAL', 'PENDIENTE'),
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
