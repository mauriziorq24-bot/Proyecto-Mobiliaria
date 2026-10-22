import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { crearAlmacenamiento } from '../utils/almacenamiento'

// Los productos que la persona guardó como favoritos. No hay endpoints de favoritos (pendiente 1
// de API.md): viven en Pinia y se guardan en localStorage, como la cotización.
// VITE_FAVORITOS_API queda reservada para cuando el backend los publique (ver CLAUDE.md).
//
// Para mostrarlos, la vista pide los productos al backend: un favorito disponible siempre se ve
// con su nombre y su precio actuales. La copia (nombre, categoría y foto) solo se usa cuando el
// producto salió del catálogo, para poder decir cuál era.
const STORAGE_KEY = 'mobiliario.favoritos:v2'
// v1 guardaba solo { productoId, disponible }, sin copia. Se migra una vez y se borra.
const STORAGE_KEY_V1 = 'mobiliario.favoritos:v1'

// Solo lo necesario para reconocer el producto si deja de existir. Nombres de campo de la API.
function copiarProducto(producto) {
  return {
    nombre: producto.nombre,
    categoriaNombre: producto.categoriaNombre ?? null,
    imagen: producto.imagenes?.[0] ?? null,
  }
}

function esCopiaValida(copia) {
  return (
    typeof copia === 'object' &&
    copia !== null &&
    typeof copia.nombre === 'string' &&
    (copia.categoriaNombre === null || typeof copia.categoriaNombre === 'string') &&
    (copia.imagen === null || typeof copia.imagen === 'string')
  )
}

function esItemValido(item) {
  return typeof item === 'object' && item !== null && Number.isInteger(item.productoId)
}

// Lo leído pudo editarse a mano: los items inválidos se descartan, un id repetido se cuenta una
// vez y una copia rota queda en null (se completa en la próxima reconciliación).
function limpiarItems(items) {
  const vistos = new Set()
  return items.filter(esItemValido).flatMap((item) => {
    if (vistos.has(item.productoId)) return []
    vistos.add(item.productoId)
    return [
      {
        productoId: item.productoId,
        disponible: item.disponible !== false,
        copia: esCopiaValida(item.copia) ? item.copia : null,
      },
    ]
  })
}

// Se guarda como { items: [{ productoId, disponible, copia }] }, el más reciente primero.
// null = no hay nada guardado con esta clave (así se sabe si hay que migrar desde v1).
const almacenamiento = crearAlmacenamiento(STORAGE_KEY, {
  validar(guardado) {
    if (guardado === null) return null
    if (!Array.isArray(guardado?.items)) return []
    return limpiarItems(guardado.items)
  },
  vacio: () => [],
})

// v1 los guardaba del más viejo al más nuevo: se invierten para dejar primero el más reciente.
const almacenamientoV1 = crearAlmacenamiento(STORAGE_KEY_V1, {
  validar: (guardado) => (Array.isArray(guardado?.items) ? limpiarItems(guardado.items).reverse() : []),
  vacio: () => [],
})

function leerGuardados() {
  const guardados = almacenamiento.leer()
  if (guardados !== null) return guardados

  const migrados = almacenamientoV1.leer()
  if (migrados.length) almacenamiento.escribir({ items: migrados })
  almacenamientoV1.borrar()
  return migrados
}

export const useFavoritosStore = defineStore('favoritos', () => {
  const items = ref(leerGuardados())

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

  // Recibe el producto (no solo el id) para guardar su copia. Va al principio: el más reciente primero.
  function agregar(producto) {
    if (!Number.isInteger(producto?.id) || esFavorito.value(producto.id)) return
    items.value.unshift({ productoId: producto.id, disponible: true, copia: copiarProducto(producto) })
    guardar()
  }

  // Devuelve { item, indice } para poder deshacerlo con restaurar(), o null si no estaba.
  function quitar(productoId) {
    const indice = items.value.findIndex((item) => item.productoId === productoId)
    if (indice === -1) return null
    const [item] = items.value.splice(indice, 1)
    guardar()
    return { item, indice }
  }

  // "Deshacer": vuelve a poner el item en el lugar que tenía. Si mientras tanto se guardó otra
  // vez (p. ej. desde otra pestaña), no se duplica.
  function restaurar({ item, indice }) {
    if (esFavorito.value(item.productoId)) return
    items.value.splice(Math.min(indice, items.value.length), 0, item)
    guardar()
  }

  function vaciar() {
    items.value = []
    guardar()
  }

  // Como en la cotización: hay que pasarle el catálogo COMPLETO (GET /api/v1/productos sin filtros),
  // no una lista filtrada, porque lo que no aparezca se marca como no disponible.
  // Los que siguen existiendo actualizan su copia; los que no, se dejan marcados (con la copia que
  // tenían) para que la interfaz avise y la persona decida quitarlos.
  // Devuelve los items que pasaron a "no disponible" en esta llamada.
  function reconciliar(productosActuales) {
    if (!Array.isArray(productosActuales)) return []

    const porId = new Map(productosActuales.map((producto) => [producto.id, producto]))
    const recienNoDisponibles = []

    for (const item of items.value) {
      const actual = porId.get(item.productoId)
      if (actual) {
        item.copia = copiarProducto(actual)
        item.disponible = true
      } else {
        if (item.disponible) recienNoDisponibles.push(item)
        item.disponible = false
      }
    }

    guardar()
    return recienNoDisponibles
  }

  // Si otra pestaña cambia los favoritos, esta se pone al día (null: otra pestaña borró todo).
  almacenamiento.escucharOtrasPestanas((guardados) => {
    items.value = guardados ?? []
  })

  return {
    items,
    itemsDisponibles,
    cantidad,
    esFavorito,
    agregar,
    quitar,
    restaurar,
    vaciar,
    reconciliar,
  }
})
