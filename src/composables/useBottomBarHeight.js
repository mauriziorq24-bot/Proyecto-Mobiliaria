import { onBeforeUnmount, watch } from 'vue'

// Las barras fijas de abajo en móvil (la de la cotización y la del producto) publican su altura
// como variable CSS, igual que el header con --header-h. Así los avisos flotantes (AppToast,
// ServerWakeNotice) se colocan encima con bottom-[calc(1rem+var(--bottom-bar-h,0px))] y no la tapan,
// y el scroll-padding-bottom de style.css evita que tape lo que tiene el foco de teclado.
// Desde tablet las barras tienen display: none: miden 0 y la variable vuelve a 0.
//
// Uso: const bar = ref(null); useBottomBarHeight(bar)  →  <div ref="bar">…</div>
export function useBottomBarHeight(elementRef) {
  const resizeObserver = new ResizeObserver(() => publish(elementRef.value?.offsetHeight ?? 0))

  function publish(height) {
    document.documentElement.style.setProperty('--bottom-bar-h', `${height}px`)
  }

  // watch y no onMounted: la barra puede aparecer después (la del producto espera a que llegue
  // el producto) o quitarse con v-if. flush 'post': el elemento ya está en el DOM.
  watch(
    elementRef,
    (el) => {
      resizeObserver.disconnect()
      if (el) resizeObserver.observe(el)
      else publish(0)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => {
    resizeObserver.disconnect()
    publish(0)
  })
}
