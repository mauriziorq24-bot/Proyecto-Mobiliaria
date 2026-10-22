// Respuesta simulada de POST /api/v1/cotizaciones (misma forma que la respuesta real de API.md).

// 'COT-' + 4 caracteres hexadecimales en mayúsculas, como el ejemplo de API.md ("COT-XXXX").
export function createMockCodigoCotizacion() {
  const hex = Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0')
  return `COT-${hex}`
}

export const mockCotizacionCreada = () => ({ codigoCotizacion: createMockCodigoCotizacion() })
