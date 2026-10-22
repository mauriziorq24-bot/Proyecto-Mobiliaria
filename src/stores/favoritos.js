import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { crearAlmacenamiento } from '../utils/almacenamiento'

// Los productos que la persona guardó como favoritos. No hay endpoints de favoritos (pendiente 1
// de API.md): viven en Pinia y se guardan en localStorage, como la cotización.
// VITE_FAVORITOS_API queda reservada para cuando el backend los publique (ver CLAUDE.md).
//
// Solo se guarda el id: para mostrarlos, la vista pide los productos al backend. Así nunca se
// muestra un precio o un nombre viejo.
const STORAGE_KEY = 'mobiliario.favoritos:v1'

function esItemValido(item) {
  return typeof item === 'object' && item !== null && Number.isInteger(item.productoId)
}

// Se guarda como { items: [{ productoId, disponible }] }. Si lo leído no tiene esa forma (o no
// se puede leer), se empieza sin favoritos. Un id repetido (editado a mano) se cuenta una vez.
const almacenamiento = crearAlmacenamiento(STORAGE_KEY, {
  validar(guardado) {
    if (!Array.isArray(guardado?.items)) return []
    const vistos = new Set()
    return guardado.items.filter(esItemValido).flatMap((item) => {
      if (vistos.has(item.productoId)) return []
      vistos.add(item.productoId)
      return [{ productoId: item.productoId, disponible: item.disponible !== false }]
    })
  },
  vacio: () => [],
})

export const useFavoritosStore = defineStore('favoritos', () => {
  const items = ref(almacenamiento.leer())

  // Los que ya no existen en el catálogo no cuentan (igual que en la cotización).
  const itemsDisponibles = computed(() => items.value.filter((item) => item.disponible))

  const cantidad = computed(() => itemsDisponibles.value.length)

  // Getter que devuelve una función: favoritos.esFavorito(5).
  const esFavorito = computed(
    () => (productoId) => items.value.some((item) => item.productoId === productoId),
  )

  // Se guarda al final de cada acción (y no con un watch) para que aplicar un cambio que llega
  // de otra pestaña no lo vuelva a escribir.
  function guardar() {
    almacenamiento.escribir({ items: items.value })
  }

  // Lo agrega si no estaba y lo quita si estaba. Devuelve true si quedó como favorito, para que
  // la vista pueda avisar ("Guardado en favoritos" / "Quitado de favoritos").
  function alternar(productoId) {
    if (!Number.isInteger(productoId)) return false
    if (esFavorito.value(productoId)) {
      quitar(productoId)
      return false
    }
    items.value.push({ productoId, disponible: true })
    guardar()
    return true
  }

  function quitar(productoId) {
    const indice = items.value.findIndex((item) => item.productoId === productoId)
    if (indice === -1) return
    items.value.splice(indice, 1)
    guardar()
  }

  function vaciar() {
    items.value = []
    guardar()
  }

  // Como en la cotización: hay que pasarle el catálogo COMPLETO (productoService.obtenerCatalogo()),
  // no una lista filtrada, porque lo que no aparezca se marca como no disponible.
  // No se borran: quedan marcados para que la interfaz avise y la persona decida quitarlos.
  // Devuelve los items que pasaron a "no disponible" en esta llamada.
  function reconciliar(productosActuales) {
    if (!Array.isArray(productosActuales)) return []

    const idsActuales = new Set(productosActuales.map((producto) => producto.id))
    const recienNoDisponibles = []

    for (const item of items.value) {
      const existe = idsActuales.has(item.productoId)
      if (!existe && item.disponible) recienNoDisponibles.push(item)
      item.disponible = existe
    }

    guardar()
    return recienNoDisponibles
  }

  // Si otra pestaña cambia los favoritos, esta se pone al día.
  almacenamiento.escucharOtrasPestanas((guardados) => {
    items.value = guardados
  })

  return {
    items,
    itemsDisponibles,
    cantidad,
    esFavorito,
    alternar,
    quitar,
    vaciar,
    reconciliar,
  }
})
