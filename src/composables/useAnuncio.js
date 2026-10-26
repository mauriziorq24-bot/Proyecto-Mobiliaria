import { nextTick, ref } from 'vue'

// Un mensaje para el lector de pantalla, dicho una vez, cuando la vista lo pide.
// Se pinta en un <p class="sr-only" role="status">{{ anuncio }}</p> que siempre está en el DOM.
//
// Es la alternativa a poner aria-live en un texto visible que cambia solo (un resumen como
// "5 solicitudes · 3 pendientes"): ese texto se anunciaría con cada cambio de estado, cada
// borrado o cada tecla, aunque nadie lo haya pedido.
//
// Uso:
//   const { anuncio, anunciar } = useAnuncio()
//   anunciar('Lista actualizada.')
export function useAnuncio() {
  const anuncio = ref('')

  // Se vacía y se vuelve a escribir en el siguiente tick: así un mensaje igual al anterior
  // ("Lista actualizada" dos veces seguidas) también se anuncia.
  function anunciar(texto) {
    anuncio.value = ''
    nextTick(() => (anuncio.value = texto))
  }

  return { anuncio, anunciar }
}
