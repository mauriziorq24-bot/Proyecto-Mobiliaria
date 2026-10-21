// Respuestas simuladas de /api/v1/citas (misma forma que en API.md).
// No hay GET de citas, así que los mocks no guardan nada: aceptan cualquier código con el
// formato correcto, salvo CODIGO_INEXISTENTE, que sirve para probar "Cita no encontrada".

export const CODIGO_INEXISTENTE = 'CITA-000000'

// 'CITA-' + 6 hexadecimales en mayúsculas, como el backend.
export function createMockCodigoCita() {
  const hex = Math.floor(Math.random() * 0x1000000).toString(16).toUpperCase().padStart(6, '0')
  return `CITA-${hex}`
}

export const mockCitaCreada = () => ({ codigoCita: createMockCodigoCita(), mensaje: 'Cita agendada con éxito' })
export const mockCitaModificada = { mensaje: 'Cita modificada con éxito' }
export const mockCitaEliminada = { mensaje: 'Cita eliminada con éxito' }
