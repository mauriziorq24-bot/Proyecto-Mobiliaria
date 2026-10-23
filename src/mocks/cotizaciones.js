import { categorias } from './categorias'
import { productos } from './productos'

// Respuesta simulada de POST /api/v1/cotizaciones (misma forma que la respuesta real de API.md).

// 'COT-' + 4 caracteres hexadecimales en mayúsculas, como el ejemplo de API.md ("COT-XXXX").
export function createMockCodigoCotizacion() {
  const hex = Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0')
  return `COT-${hex}`
}

export const mockCotizacionCreada = () => ({ codigoCotizacion: createMockCodigoCotizacion() })

// Respuesta simulada de GET /api/v1/cotizaciones (solo ADMIN): lista de `Cotizacion` del Swagger.
// Ojo: no es ProductoResponse. Cada detalle trae el `Producto` como entidad (con `categoria` anidada
// e `imagenes` como { id, urlImagen }), y el precio unitario con el que se calculó `totalUsd`.
// Datos FICTICIOS: nombres y teléfonos inventados para desarrollo. Ver "Cotizaciones" en API.md.

function productoEntidad(id) {
  const { categoriaId, categoriaNombre, imagenes, ...resto } = productos.find((p) => p.id === id)
  return {
    ...resto,
    categoria: categorias.find((c) => c.id === categoriaId),
    imagenes: imagenes.map((urlImagen, i) => ({ id: id * 10 + i, urlImagen })),
  }
}

function detalles(lineas) {
  return lineas.map(([productoId, cantidad], i) => {
    const producto = productoEntidad(productoId)
    return { id: productoId * 100 + i, producto, cantidad, precioUnitario: producto.precioReferencialUsd }
  })
}

function cotizacion({ id, codigo, nombreCliente, empresa, fechaCreacion, estado, lineas }) {
  const lista = detalles(lineas)
  return {
    id,
    codigoCotizacion: codigo,
    nombreCliente,
    empresa,
    telefono: '+584120000000',
    email: 'cliente@ejemplo.com',
    notas: null,
    totalUsd: lista.reduce((total, d) => total + d.cantidad * (d.precioUnitario ?? 0), 0),
    fechaCreacion,
    estado,
    detalles: lista,
  }
}

export const mockCotizacionesAdmin = () => [
  cotizacion({ id: 1, codigo: 'COT-1A2B', nombreCliente: 'Carla Méndez', empresa: 'Consultorio Méndez', fechaCreacion: '2026-10-23T14:12:00', estado: 'PENDIENTE', lineas: [[1, 2]] }),
  cotizacion({ id: 2, codigo: 'COT-3C4D', nombreCliente: 'Luis Herrera', empresa: null, fechaCreacion: '2026-10-22T10:40:00', estado: 'PENDIENTE', lineas: [[2, 1]] }),
  cotizacion({ id: 3, codigo: 'COT-5E6F', nombreCliente: 'Barbería El Corte', empresa: 'Barbería El Corte', fechaCreacion: '2026-10-21T16:05:00', estado: 'CONTACTADO', lineas: [[1, 1], [2, 1]] }),
  cotizacion({ id: 4, codigo: 'COT-7A8B', nombreCliente: 'Ana Rivas', empresa: null, fechaCreacion: '2026-10-20T09:30:00', estado: 'CANCELADA', lineas: [[2, 2]] }),
]
