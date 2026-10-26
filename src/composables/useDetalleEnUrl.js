import { computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Lista + detalle en una misma página del panel (cotizaciones, citas), con el elemento abierto
// en la URL: /admin/cotizaciones?codigo=COT-0001.
// - Abrir un elemento agrega una entrada al historial: en el teléfono, "Atrás" vuelve a la lista.
// - Los filtros (?estado=, ?vista=) se cambian con replace: filtrar no llena el historial.
// - Foco: al abrir, va al título del detalle (en el teléfono la lista desaparece); al volver,
//   a la fila que estaba abierta. Los ids los pone la vista: `idTitulo` y `idFila(codigo)`.
//   La primera carga con ?codigo= no mueve el foco: de eso se encarga RouteAnnouncer.
export function useDetalleEnUrl({ idTitulo, idFila }) {
  const route = useRoute()
  const router = useRouter()

  const codigo = computed(() => (typeof route.query.codigo === 'string' ? route.query.codigo : null))

  // Para el :to de cada fila: la URL actual (con sus filtros) más el código.
  function rutaDetalle(nuevo) {
    return { query: { ...route.query, codigo: nuevo } }
  }

  function volver() {
    const { codigo: _, ...query } = route.query
    const destino = router.resolve({ query }).fullPath
    // Si se llegó desde la lista, el botón hace lo mismo que "Atrás" (no duplica el historial).
    if (window.history.state?.back === destino) router.back()
    else router.replace({ query })
  }

  // Cambia un parámetro de la URL sin tocar los demás. null lo quita.
  function ponerQuery(nombre, valor) {
    router.replace({ query: { ...route.query, [nombre]: valor ?? undefined } })
  }

  watch(codigo, async (nuevo, anterior) => {
    await nextTick()
    if (nuevo) {
      document.getElementById(idTitulo)?.focus({ preventScroll: true })
      // En el teléfono el detalle reemplaza a la lista: se empieza a leer desde arriba. Desde lg
      // están lado a lado (el detalle es fijo): la lista se queda donde estaba.
      if (!window.matchMedia('(min-width: 64rem)').matches) window.scrollTo({ top: 0 })
    } else if (anterior) {
      document.getElementById(idFila(anterior))?.focus()
    }
  })

  return { codigo, rutaDetalle, volver, ponerQuery }
}
