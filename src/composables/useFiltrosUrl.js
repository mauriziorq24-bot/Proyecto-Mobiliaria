import { computed, toValue, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FILTROS_VACIOS, ORDENES } from '../services/productoService'
import { ETIQUETAS_TIPO_ESPACIO } from '../utils/formato'

// Los filtros de /buscar viven en la URL (?q=silla&tipoEspacio=HOGAR&orden=precio-asc):
// así se pueden compartir, recargar y volver "Atrás" sin perderlos. La URL es la única
// fuente de verdad: `filtros` se lee de ella y aplicarFiltros() la cambia.

const CLAVES = Object.keys(FILTROS_VACIOS)
const FORMATO_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const FORMATO_PRECIO = /^\d+(?:\.\d+)?$/ // sin negativos, sin "1e3" ni "0x10"

// ?tipoEspacio=A&tipoEspacio=B llega como arreglo: se toma solo el primero (un valor por grupo).
function primerValor(valor) {
  return Array.isArray(valor) ? valor[0] : valor
}

// Recorta y une espacios repetidos: "  silla   ejecutiva " → "silla ejecutiva".
function leerTexto(valor) {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : ''
}

function leerPrecio(valor) {
  return typeof valor === 'string' && FORMATO_PRECIO.test(valor.trim()) ? Number(valor) : null
}

// query de la URL → filtros válidos. Lo que no es válido se ignora (queda como en FILTROS_VACIOS).
// slugsValidos: slugs de GET /api/v1/categorias; mientras no llegan (null o []), se acepta
// cualquier slug bien formado y se valida cuando estén.
export function leerFiltros(query, slugsValidos = null) {
  const valor = (clave) => primerValor(query[clave])
  const categoria = valor('categoria')
  const tipoEspacio = valor('tipoEspacio')
  const orden = valor('orden')
  const categoriaValida =
    typeof categoria === 'string' &&
    FORMATO_SLUG.test(categoria) &&
    (!slugsValidos?.length || slugsValidos.includes(categoria))

  return {
    q: leerTexto(valor('q')),
    categoria: categoriaValida ? categoria : null,
    tipoEspacio: Object.hasOwn(ETIQUETAS_TIPO_ESPACIO, tipoEspacio) ? tipoEspacio : null,
    enShowroom: valor('enShowroom') === 'true',
    precioMin: leerPrecio(valor('precioMin')),
    precioMax: leerPrecio(valor('precioMax')),
    orden: ORDENES.includes(orden) ? orden : FILTROS_VACIOS.orden,
  }
}

// filtros → query. Los valores vacíos o por defecto no se escriben: /buscar?q=silla, no
// /buscar?q=silla&categoria=&enShowroom=false&orden=relevancia.
export function filtrosAQuery(filtros) {
  const query = {}
  for (const clave of CLAVES) {
    const valor = clave === 'q' ? leerTexto(filtros.q) : filtros[clave]
    if (valor === null || valor === undefined || valor === '' || valor === FILTROS_VACIOS[clave]) continue
    query[clave] = String(valor)
  }
  return query
}

// Parámetros que no son filtros (p. ej. ?utm_source=instagram): se conservan tal cual.
function otrosParametros(query) {
  return Object.fromEntries(Object.entries(query).filter(([clave]) => !CLAVES.includes(clave)))
}

// Uso (en SearchView):
//   const { categorias } = useCategorias()
//   const { filtros, aplicarFiltros } = useFiltrosUrl({
//     slugsValidos: () => categorias.value.map((c) => c.slug),
//   })
//   aplicarFiltros({ tipoEspacio: 'HOGAR' })   // cambia solo ese filtro
//   aplicarFiltros({ tipoEspacio: null })      // lo quita
export function useFiltrosUrl({ slugsValidos = null } = {}) {
  const route = useRoute()
  const router = useRouter()
  // La ruta donde se creó el composable (/buscar). Al salir de ella no se toca la URL de la otra página.
  const nombreRuta = route.name

  const filtros = computed(() => leerFiltros(route.query, toValue(slugsValidos)))

  function reemplazarQuery(nuevosFiltros) {
    // replace y no push: cambiar un filtro no agrega una entrada al historial
    // (si no, "Atrás" recorrería cada clic). La búsqueda nueva desde el header sí usa push.
    return router.replace({ query: { ...otrosParametros(route.query), ...filtrosAQuery(nuevosFiltros) } })
  }

  // Cambia solo los filtros indicados y conserva los demás.
  function aplicarFiltros(cambios) {
    return reemplazarQuery({ ...filtros.value, ...cambios })
  }

  // "Limpiar filtros": quita los filtros pero conserva el texto buscado y el orden (no es un filtro).
  function limpiarFiltros() {
    return reemplazarQuery({ ...FILTROS_VACIOS, q: filtros.value.q, orden: filtros.value.orden })
  }

  // "Borrar búsqueda": quita el texto y conserva los filtros.
  function borrarBusqueda() {
    return aplicarFiltros({ q: '' })
  }

  // Si la URL trae valores inválidos (?orden=xyz, ?tipoEspacio=INVENTADO, ?precioMin=-5) o
  // escritos de otra forma ("  silla "), se reescribe con los válidos. También corre cuando
  // llegan las categorías, para limpiar un slug que no existe.
  watch(
    [() => route.query, filtros],
    () => {
      if (route.name !== nombreRuta) return
      const limpio = filtrosAQuery(filtros.value)
      const distinto = CLAVES.some((clave) => route.query[clave] !== limpio[clave])
      if (distinto) reemplazarQuery(filtros.value)
    },
    { immediate: true },
  )

  return { filtros, aplicarFiltros, limpiarFiltros, borrarBusqueda }
}
