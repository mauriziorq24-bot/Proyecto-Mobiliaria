import { onBeforeUnmount, onMounted } from 'vue'

// Las barras fijas de abajo en móvil (la de la cotización y la del producto) publican su altura
// como variable CSS, igual que el header con --header-h. Así los avisos flotantes (AppToast,
// ServerWakeNotice) se colocan encima con bottom-[calc(1rem+var(--bottom-bar-h,0px))] y no la tapan.
// Desde tablet las barras tienen display: none: miden 0 y la variable vuelve a 0.
//
// Uso: const bar = ref(null); useBottomBarHeight(bar)  →  <div ref="bar">…</div>
export function useBottomBarHeight(elementRef) {
  let resizeObserver = null

  function publish(height) {
    document.documentElement.style.setProperty('--bottom-bar-h', `${height}px`)
  }

  onMounted(() => {
    resizeObserver = new ResizeObserver(() => publish(elementRef.value?.offsetHeight ?? 0))
    if (elementRef.value) resizeObserver.observe(elementRef.value)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    publish(0)
  })
}
