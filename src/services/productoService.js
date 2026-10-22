import { productos as mockProductos } from '../mocks/productos'
import api from './api'
import { ETIQUETAS_TIPO_ESPACIO } from '../utils/formato'
import { getCategorias } from './categoriaService'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// Simula la demora de la red para poder ver el estado "cargando" con los mocks.
function fakeDelay(data, ms = 400) {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

// Minúsculas y sin tildes: así "silleria" encuentra "Sillería".
function normalize(text) {
  return (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// Error con la misma forma que lanza axios, para que las vistas lo traten igual en ambos modos.
function notFoundError(message) {
  const error = new Error(message)
  error.response = { status: 404, data: { message } }
  return error
}

// Imita en los mocks los filtros que el backend ya hace: buscar, tipoEspacio y enShowroom.
// Como el backend, buscar mira solo el nombre y como una sola frase (ver API.md).
function applyBackendFilters(list, { buscar, tipoEspacio, enShowroom }) {
  const term = normalize(buscar)
  return list.filter((p) => {
    if (term && !normalize(p.nombre).includes(term)) return false
    if (tipoEspacio && p.tipoEspacio !== tipoEspacio) return false
    if (enShowroom !== undefined && enShowroom !== null && p.enShowroom !== enShowroom) return false
    return true
  })
}

// TODO: reemplazar por ?categoria=slug cuando el backend lo soporte (pendiente 2 de API.md).
// Mientras tanto se busca la categoría por slug y se compara por categoriaId
// (categoriaNombre queda solo de respaldo, por si algún producto llegara sin categoriaId).
async function filterByCategory(list, categoriaSlug) {
  const categorias = await getCategorias()
  const categoria = categorias.find((c) => c.slug === categoriaSlug)
  if (!categoria) return []

  return list.filter((p) =>
    p.categoriaId != null
      ? p.categoriaId === categoria.id
      : normalize(p.categoriaNombre) === normalize(categoria.nombre),
  )
}

// GET /api/v1/productos?buscar=&tipoEspacio=&enShowroom= → [ProductoResponse]
// Todos los filtros son opcionales. categoriaSlug se resuelve aquí (el backend aún no lo acepta).
export async function obtenerProductos({ buscar, tipoEspacio, enShowroom, categoriaSlug } = {}) {
  let productos

  if (useMocks) {
    productos = applyBackendFilters(await fakeDelay(mockProductos), { buscar, tipoEspacio, enShowroom })
  } else {
    // axios omite los parámetros undefined, así que solo viajan los filtros que se usen.
    const { data } = await api.get('/api/v1/productos', {
      params: { buscar: buscar || undefined, tipoEspacio: tipoEspacio || undefined, enShowroom },
    })
    productos = data
  }

  return categoriaSlug ? filterByCategory(productos, categoriaSlug) : productos
}

// GET /api/v1/productos/{id} → ProductoResponse
export async function obtenerProductoPorId(id) {
  // Un id que no es un entero (p. ej. /producto/abc) nunca existe. Además el backend responde
  // a eso con 401 "Credenciales invalidas" (ver API.md), que se confundiría con una sesión vencida.
  if (!/^\d+$/.test(String(id))) throw notFoundError('Producto no encontrado')

  if (useMocks) {
    const producto = mockProductos.find((p) => p.id === Number(id))
    await fakeDelay(null)
    if (!producto) throw notFoundError('Producto no encontrado')
    return structuredClone(producto)
  }

  const { data } = await api.get(`/api/v1/productos/${id}`)
  return data
}

// ---------------------------------------------------------------------------
// Búsqueda y filtros de /buscar (DESIGN.md › Página de búsqueda)
//
// Decisión (20/10/2026, ver API.md): se pide GET /api/v1/productos UNA sola vez, sin
// parámetros, y todo lo demás (texto, categoría, tipoEspacio, enShowroom, precio y
// orden) se resuelve aquí, en el navegador. Motivos:
// - El catálogo es pequeño (15 productos) y la API no pagina: ya llega completo.
// - Render gratuito duerme el servidor; con una sola petición, el cold start se espera
//   una vez y luego cada tecla o filtro responde al instante.
// - ?buscar= solo mira el nombre y como frase exacta ("silla malla" no encuentra nada);
//   aquí se busca palabra por palabra en nombre, descripción, material y categoría.
// Si el catálogo crece y el backend agrega paginación y filtros, buscarProductos pasará
// a enviarlos a la API (y la API tendrá que devolver los conteos), sin cambiar las vistas:
// ellas solo llaman a buscarProductos(filtros).
// ---------------------------------------------------------------------------

// Valores válidos de ?orden=. 'relevancia' es el de por defecto y no se escribe en la URL.
export const ORDENES = ['relevancia', 'precio-asc', 'precio-desc', 'nombre']

// Filtros sin nada elegido. Mismos nombres que los query params de la URL.
export const FILTROS_VACIOS = Object.freeze({
  q: '',
  categoria: null, // slug
  tipoEspacio: null,
  enShowroom: false,
  precioMin: null,
  precioMax: null,
  orden: 'relevancia',
})

// Productos y categorías del catálogo, pedidos una sola vez y compartidos por todas las
// búsquedas. Si dos llamadas llegan mientras la petición está en curso, ambas esperan
// la misma promesa (no se lanza una segunda petición).
let catalogoPromise = null

export function obtenerCatalogo() {
  if (!catalogoPromise) {
    const productos = useMocks ? fakeDelay(mockProductos) : api.get('/api/v1/productos').then(({ data }) => data)
    catalogoPromise = Promise.all([productos, getCategorias()])
      .then(([listaProductos, categorias]) => ({ productos: listaProductos, categorias }))
      .catch((error) => {
        catalogoPromise = null // si falló, "Reintentar" vuelve a pedirlo
        throw error
      })
  }
  return catalogoPromise
}

// "  Silla   MALLA " → ['silla', 'malla']
function palabrasDe(texto) {
  return normalize(texto).split(/\s+/).filter(Boolean)
}

function contieneTodas(texto, palabras) {
  return palabras.every((palabra) => texto.includes(palabra))
}

// Todo el texto en el que se busca un producto, ya normalizado.
function textoBuscable(p) {
  return [p.nombre, p.descripcion, p.material, p.categoriaNombre].map(normalize).join(' ')
}

// El precio como número, o null si no tiene (o no es un número).
function precioDe(p) {
  if (p.precioReferencialUsd === null || p.precioReferencialUsd === undefined) return null
  const precio = Number(p.precioReferencialUsd)
  return Number.isFinite(precio) ? precio : null
}

function perteneceACategoria(p, categoria) {
  // Por categoriaId; categoriaNombre queda solo de respaldo, por si algún producto llegara sin él.
  return p.categoriaId != null
    ? p.categoriaId === categoria.id
    : normalize(p.categoriaNombre) === normalize(categoria.nombre)
}

// Una condición por filtro activo; los filtros sin valor (o con un slug que no existe) quedan en null.
// Van separadas por nombre para poder contar "qué pasaría sin este filtro".
function crearCondiciones(filtros, categorias) {
  const palabras = palabrasDe(filtros.q)
  const categoria = filtros.categoria ? categorias.find((c) => c.slug === filtros.categoria) : null
  const { precioMin: min, precioMax: max } = filtros
  // "Desde" mayor que "Hasta": la vista muestra el error y no se filtra (DESIGN.md).
  const precioValido = (min != null || max != null) && !(min != null && max != null && min > max)

  return {
    texto: palabras.length ? (p) => contieneTodas(textoBuscable(p), palabras) : null,
    categoria: categoria ? (p) => perteneceACategoria(p, categoria) : null,
    tipoEspacio: filtros.tipoEspacio ? (p) => p.tipoEspacio === filtros.tipoEspacio : null,
    enShowroom: filtros.enShowroom ? (p) => p.enShowroom === true : null,
    // Con un filtro de precio activo, los productos sin precio quedan fuera.
    precio: precioValido
      ? (p) => {
          const precio = precioDe(p)
          return precio !== null && (min == null || precio >= min) && (max == null || precio <= max)
        }
      : null,
  }
}

// Aplica todas las condiciones menos la de `excepto` (para los conteos).
function filtrarCon(productos, condiciones, excepto = null) {
  const activas = Object.entries(condiciones)
    .filter(([nombre, condicion]) => condicion && nombre !== excepto)
    .map(([, condicion]) => condicion)
  return productos.filter((p) => activas.every((condicion) => condicion(p)))
}

const collator = new Intl.Collator('es')

// Devuelve una copia ordenada. sort de JS es estable: los empates conservan el orden de la API.
function ordenar(productos, orden, palabras) {
  const lista = [...productos]

  if (orden === 'precio-asc' || orden === 'precio-desc') {
    const signo = orden === 'precio-asc' ? 1 : -1
    return lista.sort((a, b) => {
      const pa = precioDe(a)
      const pb = precioDe(b)
      // Sin precio, siempre al final (en ambos sentidos).
      if (pa === null || pb === null) return (pa === null) - (pb === null)
      return (pa - pb) * signo
    })
  }

  if (orden === 'nombre') return lista.sort((a, b) => collator.compare(a.nombre ?? '', b.nombre ?? ''))

  // Relevancia: el backend no da puntuación. Primero los que tienen todo el texto en el
  // nombre, luego los que lo tienen en otros campos. Sin texto, el orden de la API.
  if (!palabras.length) return lista
  const enNombre = (p) => contieneTodas(normalize(p.nombre), palabras)
  return lista.sort((a, b) => enNombre(b) - enNombre(a))
}

// Función pura: no pide nada ni modifica `productos`. Devuelve los que cumplen los filtros, ya ordenados.
export function filtrarProductos(productos, filtros, categorias = []) {
  const f = { ...FILTROS_VACIOS, ...filtros }
  const resultado = filtrarCon(productos, crearCondiciones(f, categorias))
  return ordenar(resultado, f.orden, palabrasDe(f.q))
}

// Función pura: cuántos productos habría con cada opción de filtro, contando con los
// demás filtros ya aplicados (DESIGN.md: "Hogar (3)"). También da el "Ver X resultados"
// del borrador móvil: basta pasarle los filtros del borrador y leer `total`.
//
// {
//   total: 4,                                     // resultados con todos los filtros
//   categorias: { silleria: 3, escritorios: 0 },  // si se elige cada categoría
//   tiposEspacio: { OFICINA: 2, HOGAR: 1, … },    // si se elige cada ambiente
//   enShowroom: 2,                                // si se activa "Solo en showroom"
//   sinFiltro: { categoria, tipoEspacio, enShowroom, precio },
//     // si se quita ese filtro: es el conteo de "Todas"/"Todos" y sirve para sugerir
//     // "Si quitas «Solo en showroom» verás 4 productos"
// }
export function contarOpciones(productos, filtros, categorias = []) {
  const f = { ...FILTROS_VACIOS, ...filtros }
  const condiciones = crearCondiciones(f, categorias)

  const sinCategoria = filtrarCon(productos, condiciones, 'categoria')
  const sinTipoEspacio = filtrarCon(productos, condiciones, 'tipoEspacio')
  const sinEnShowroom = filtrarCon(productos, condiciones, 'enShowroom')

  const porCategoria = Object.fromEntries(
    categorias.map((c) => [c.slug, sinCategoria.filter((p) => perteneceACategoria(p, c)).length]),
  )

  // Los cuatro ambientes de API.md siempre aparecen (con 0 si no hay); uno nuevo del backend también.
  const porTipoEspacio = Object.fromEntries(Object.keys(ETIQUETAS_TIPO_ESPACIO).map((valor) => [valor, 0]))
  for (const p of sinTipoEspacio) {
    if (p.tipoEspacio) porTipoEspacio[p.tipoEspacio] = (porTipoEspacio[p.tipoEspacio] ?? 0) + 1
  }

  return {
    total: filtrarCon(productos, condiciones).length,
    categorias: porCategoria,
    tiposEspacio: porTipoEspacio,
    enShowroom: sinEnShowroom.filter((p) => p.enShowroom === true).length,
    sinFiltro: {
      categoria: sinCategoria.length,
      tipoEspacio: sinTipoEspacio.length,
      enShowroom: sinEnShowroom.length,
      precio: filtrarCon(productos, condiciones, 'precio').length,
    },
  }
}

// Punto de entrada de la página de búsqueda: { productos, conteos } para unos filtros.
// La primera llamada espera al backend; las siguientes reutilizan el catálogo y responden al instante.
// Se llama a través de useAsync, que descarta las respuestas viejas (ver useAsync.js).
export async function buscarProductos(filtros) {
  const { productos, categorias } = await obtenerCatalogo()
  return {
    productos: filtrarProductos(productos, filtros, categorias),
    conteos: contarOpciones(productos, filtros, categorias),
  }
}
