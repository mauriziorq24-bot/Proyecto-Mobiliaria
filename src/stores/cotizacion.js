import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { crearAlmacenamiento } from '../utils/almacenamiento'

// La cotización en curso (el "carrito"). No hay endpoints de carrito (pendiente 1 de API.md):
// vive en Pinia y se guarda en localStorage (con la utilidad de utils/almacenamiento.js).
const STORAGE_KEY = 'mobiliario.cotizacion:v1'

export const CANTIDAD_MINIMA = 1
export const CANTIDAD_MAXIMA = 99

function limitarCantidad(cantidad) {
  const entero = Math.trunc(Number(cantidad))
  if (!Number.isFinite(entero)) return CANTIDAD_MINIMA
  return Math.min(CANTIDAD_MAXIMA, Math.max(CANTIDAD_MINIMA, entero))
}

// Solo lo necesario para mostrar la línea sin pedir el producto otra vez al backend.
// Los nombres de campo son los de la API, tal cual.
function copiarProducto(producto) {
  return {
    nombre: producto.nombre,
    precioReferencialUsd: producto.precioReferencialUsd,
    imagen: producto.imagenes?.[0] ?? null,
    categoriaNombre: producto.categoriaNombre ?? null,
  }
}

// Lo guardado pudo editarse a mano o quedar a medias: cada item se revisa y los inválidos se descartan.
function esItemValido(item) {
  return (
    typeof item === 'object' &&
    item !== null &&
    Number.isInteger(item.productoId) &&
    typeof item.producto === 'object' &&
    item.producto !== null &&
    typeof item.producto.nombre === 'string' &&
    typeof item.producto.precioReferencialUsd === 'number'
  )
}

function normalizarItem(item) {
  return {
    productoId: item.productoId,
    cantidad: limitarCantidad(item.cantidad),
    producto: item.producto,
    disponible: item.disponible !== false,
  }
}

// Se guarda como { items: [...] }. Si lo leído no tiene esa forma (o no se puede leer), se
// empieza con la cotización vacía, sin romper la app.
const almacenamiento = crearAlmacenamiento(STORAGE_KEY, {
  validar(guardado) {
    if (!Array.isArray(guardado?.items)) return []
    return guardado.items.filter(esItemValido).map(normalizarItem)
  },
  vacio: () => [],
})

export const useCotizacionStore = defineStore('cotizacion', () => {
  const items = ref(almacenamiento.leer())

  // Los productos que ya no existen no suman: no se pueden cotizar.
  const itemsDisponibles = computed(() => items.value.filter((item) => item.disponible))

  const totalUnidades = computed(() =>
    itemsDisponibles.value.reduce((total, item) => total + item.cantidad, 0),
  )

  const totalReferencial = computed(() =>
    itemsDisponibles.value.reduce(
      (total, item) => total + item.cantidad * item.producto.precioReferencialUsd,
      0,
    ),
  )

  // Getter que devuelve una función: cotizacion.cantidadDe(5).
  const cantidadDe = computed(
    () => (productoId) => items.value.find((item) => item.productoId === productoId)?.cantidad ?? 0,
  )

  // Se guarda al final de cada acción (y no con un watch) para que aplicar un cambio que llega
  // de otra pestaña no lo vuelva a escribir.
  function guardar() {
    almacenamiento.escribir({ items: items.value })
  }

  function buscarItem(productoId) {
    return items.value.find((item) => item.productoId === productoId)
  }

  // Si el producto ya está, la cantidad se suma (3 + 2 = 5), hasta el máximo.
  function agregar(producto, cantidad = 1) {
    const existente = buscarItem(producto.id)
    if (existente) {
      existente.cantidad = limitarCantidad(existente.cantidad + limitarCantidad(cantidad))
      // Se acaba de agregar desde una vista con datos frescos: se actualiza la copia.
      existente.producto = copiarProducto(producto)
      existente.disponible = true
    } else {
      items.value.push({
        productoId: producto.id,
        cantidad: limitarCantidad(cantidad),
        producto: copiarProducto(producto),
        disponible: true,
      })
    }
    guardar()
  }

  function cambiarCantidad(productoId, cantidad) {
    const item = buscarItem(productoId)
    if (!item) return
    item.cantidad = limitarCantidad(cantidad)
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

  // "Deshacer": vuelve a poner el item en el lugar que tenía. Si mientras tanto se agregó otra
  // vez (p. ej. desde otra pestaña), no se duplica: se deja el que ya está.
  function restaurar({ item, indice }) {
    if (buscarItem(item.productoId)) return
    items.value.splice(Math.min(indice, items.value.length), 0, item)
    guardar()
  }

  function vaciar() {
    items.value = []
    guardar()
  }

  // Pone al día la copia de cada producto con el catálogo actual del backend.
  // Hay que pasarle el catálogo COMPLETO (productoService.obtenerCatalogo()), no una lista
  // filtrada: lo que no aparezca se marca como no disponible.
  // Los que ya no existen no se borran: quedan marcados para que la interfaz avise y la persona
  // decida quitarlos. Devuelve los items que pasaron a "no disponible" en esta llamada.
  function reconciliar(productosActuales) {
    if (!Array.isArray(productosActuales)) return []

    const porId = new Map(productosActuales.map((producto) => [producto.id, producto]))
    const recienNoDisponibles = []

    for (const item of items.value) {
      const actual = porId.get(item.productoId)
      if (actual) {
        item.producto = copiarProducto(actual)
        item.disponible = true
      } else {
        if (item.disponible) recienNoDisponibles.push(item)
        item.disponible = false
      }
    }

    guardar()
    return recienNoDisponibles
  }

  // Si otra pestaña cambia la cotización, esta se pone al día.
  almacenamiento.escucharOtrasPestanas((guardados) => {
    items.value = guardados
  })

  return {
    items,
    itemsDisponibles,
    totalUnidades,
    totalReferencial,
    cantidadDe,
    agregar,
    cambiarCantidad,
    quitar,
    restaurar,
    vaciar,
    reconciliar,
  }
})
