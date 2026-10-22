<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { START_LOCATION, useRouter } from 'vue-router'

// Al cambiar de página (WCAG 2.4.3 y 4.1.3), como pasa en un sitio de varias páginas:
// - el foco va al título principal (h1) de la nueva página, así Tab sigue desde ahí
//   y no desde el enlace del header que se tocó;
// - el lector de pantalla anuncia el título de la pestaña ("Sillería · Mobiliario de Oficina").
// Si la vista todavía está cargando sus datos (producto, categoría), aún no hay h1: el foco espera
// en <main> y pasa al título cuando aparece. Si la carga falla, el bloque de error (role="alert")
// se anuncia solo y el foco se queda en <main>.
// No hace nada en la primera carga (el navegador ya anuncia la página), ni cuando solo cambia la query
// (un filtro de /buscar es la misma página). Con #ancla, el foco lo maneja scrollToHash.

// Lo que tarda como máximo una carga: el timeout de 60 s de api.js, con margen.
const MAX_WAIT_MS = 65000

const router = useRouter()
const message = ref('')
let stopWaiting = () => {}
let announceTimer = null

function focusElement(el) {
  // tabindex="-1": el h1 puede recibir el foco por código sin entrar en el orden de Tab.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

function announce() {
  // Vaciar y escribir un momento después: así se anuncia aunque el texto sea el mismo de antes.
  message.value = ''
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => {
    message.value = document.title
  }, 100)
}

const removeHook = router.afterEach(async (to, from, failure) => {
  if (failure || from === START_LOCATION || to.path === from.path) return
  stopWaiting()

  // Esperar a que Vue dibuje la nueva vista.
  await nextTick()
  const main = document.getElementById('contenido')
  if (!main) return

  // Un #ancla que existe en la página se lleva el foco (scrollToHash); aquí solo se anuncia.
  const hashTarget = to.hash && document.getElementById(decodeURIComponent(to.hash.slice(1)))

  const heading = main.querySelector('h1')
  if (heading) {
    if (!hashTarget) focusElement(heading)
    announce()
    return
  }

  if (!hashTarget) focusElement(main)
  const observer = new MutationObserver(() => {
    const loadedHeading = main.querySelector('h1')
    if (!loadedHeading) return
    stopWaiting()
    // Si mientras cargaba la persona movió el foco (p. ej. al buscador), no se lo quitamos.
    if (!hashTarget && document.activeElement === main) focusElement(loadedHeading)
    announce()
  })
  observer.observe(main, { childList: true, subtree: true })
  const timer = setTimeout(() => stopWaiting(), MAX_WAIT_MS)
  stopWaiting = () => {
    observer.disconnect()
    clearTimeout(timer)
    stopWaiting = () => {}
  }
})

onBeforeUnmount(() => {
  removeHook()
  stopWaiting()
  clearTimeout(announceTimer)
})
</script>

<template>
  <!-- Siempre en el DOM: los lectores solo anuncian cambios en una región que ya existía. -->
  <p class="sr-only" aria-live="polite" aria-atomic="true">{{ message }}</p>
</template>
