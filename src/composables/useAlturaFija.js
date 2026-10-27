import { onBeforeUnmount, watch } from 'vue'

// Lo que queda fijo en pantalla (header, barra "Filtros / Ordenar", barras de abajo en móvil) publica
// su altura como variable CSS en <html>:
//   --altura-header            lo fijo arriba (header de la tienda o barra superior del panel)
//   --altura-subbarra          la barra "Filtros / Ordenar" de /buscar, debajo del header
//   --altura-barra-inferior    la barra de cotización, la del producto o la de Mi cotización
// style.css las usa en scroll-padding para que RePag/AvPag, los #anclas y el foco no queden tapados,
// y los avisos flotantes (AppToast, ServerWakeNotice) se colocan encima de la barra inferior.
//
// Solo cuenta si de verdad está fija: con position: static (pantallas bajas, variante `short`) o
// display: none (la barra móvil en escritorio) no tapa nada y vale 0.
// Se redondea hacia arriba: offsetHeight redondea 97,5 a 97 y ese medio píxel tapaba el borde del foco.
//
// Si dos elementos publican la misma variable a la vez (al cambiar de página se monta uno antes de que
// se quite el otro), vale la del más alto: así ninguno deja la variable en 0 mientras el otro se ve.
//
// Uso: const barra = ref(null); useAlturaFija(barra, '--altura-barra-inferior')  →  <div ref="barra">…</div>
const alturas = new Map() // variable → Map(elemento → altura)

function publicar(variable) {
  const maxima = Math.max(0, ...(alturas.get(variable)?.values() ?? []))
  document.documentElement.style.setProperty(variable, `${maxima}px`)
}

function medir(el) {
  const estilo = getComputedStyle(el)
  const fija = estilo.position === 'sticky' || estilo.position === 'fixed'
  return fija && estilo.display !== 'none' ? Math.ceil(el.getBoundingClientRect().height) : 0
}

export function useAlturaFija(elementRef, variable) {
  if (!alturas.has(variable)) alturas.set(variable, new Map())
  const porElemento = alturas.get(variable)
  let actual = null

  function actualizar() {
    if (actual) porElemento.set(actual, medir(actual))
    publicar(variable)
  }

  const resizeObserver = new ResizeObserver(actualizar)

  function soltar() {
    resizeObserver.disconnect()
    if (actual) porElemento.delete(actual)
    actual = null
  }

  // watch y no onMounted: el elemento puede aparecer después (la barra del producto espera a que llegue
  // el producto) o quitarse con v-if. flush 'post': el elemento ya está en el DOM.
  watch(
    elementRef,
    (el) => {
      soltar()
      actual = el ?? null
      if (actual) resizeObserver.observe(actual)
      actualizar()
    },
    { immediate: true, flush: 'post' },
  )

  // Pasar a pantalla baja cambia position (sticky → static) sin cambiar el tamaño: el observer no se entera.
  window.addEventListener('resize', actualizar)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', actualizar)
    soltar()
    publicar(variable)
  })
}
