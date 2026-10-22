import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useToast } from '../composables/useToast'
import { isNetworkError } from '../services/errorMessages'
import { agregarFavorito, favoritosApiActiva, obtenerFavoritos, quitarFavorito } from '../services/favoritoService'
import { crearAlmacenamiento } from '../utils/almacenamiento'
import { useAuthStore } from './auth'

// Los productos que la persona guardó como favoritos. Viven en Pinia y se guardan en localStorage,
// como la cotización. Con VITE_FAVORITOS_API=true y sesión iniciada, además se sincronizan con la
// cuenta (/api/v1/favoritos, ver API.md):
// - Al iniciar sesión (o al abrir la app con la sesión ya iniciada) se unen los del navegador con
//   los de la cuenta: los que faltan en el servidor se suben.
// - Cada cambio se ve al instante y después se envía (actualización optimista). Si falla, se
//   revierte y se avisa.
// - Al cerrar sesión se borran de este navegador: la computadora puede ser compartida. Siguen
//   guardados en la cuenta.
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

// Cómo sigue el aviso cuando falla una petición de favoritos.
function sugerencia(error) {
  return isNetworkError(error) ? 'Revisa tu conexión e inténtalo de nuevo.' : 'Inténtalo en unos minutos.'
}

const nombreDe = (item) => item.copia?.nombre ?? 'el producto'

export const useFavoritosStore = defineStore('favoritos', () => {
  const auth = useAuthStore()
  const toast = useToast()
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

  // --- Sincronización con la cuenta (solo con VITE_FAVORITOS_API=true) ---
  const conCuenta = () => favoritosApiActiva && auth.estaSesionIniciada

  // Peticiones en curso, por producto: productoId → { version, confirmado, cola }.
  // - cola: la última petición. Las de un mismo producto salen en orden (cada una espera a la
  //   anterior), así "guardar" y "quitar" tocados rápido no llegan al revés al servidor.
  // - version: cuenta los cambios. Si falla uno viejo, no se revierte: decide el más reciente.
  // - confirmado: si el servidor lo tiene guardado, según la última respuesta correcta.
  const enCurso = new Map()

  // Envía el cambio que la interfaz ya muestra. deseado: true = guardar, false = quitar.
  // Si falla el más reciente y el servidor quedó distinto de la interfaz, llama a revertir() y
  // avisa con `accion` ("guardar X en tus favoritos"). Sin revertir, solo devuelve la promesa
  // (la unión al iniciar sesión cuenta los fallos ella misma).
  function enviar(productoId, deseado, { revertir, accion } = {}) {
    if (!conCuenta()) return Promise.resolve()

    let entrada = enCurso.get(productoId)
    if (!entrada) {
      // Sin nada en curso, el servidor tiene lo que había antes de este cambio.
      entrada = { version: 0, confirmado: !deseado, cola: Promise.resolve() }
      enCurso.set(productoId, entrada)
    }
    const version = ++entrada.version
    const peticion = deseado ? agregarFavorito : quitarFavorito
    // .catch: si la anterior falló, esta sale igual.
    const actual = entrada.cola.catch(() => {}).then(() => peticion(productoId))
    entrada.cola = actual

    actual
      .then(
        () => {
          entrada.confirmado = deseado
        },
        (error) => {
          // Se cerró la sesión mientras tanto (ya se borró todo) o hubo otro cambio después.
          const esLaUltima = enCurso.get(productoId) === entrada && entrada.version === version
          if (!revertir || !esLaUltima || !auth.estaSesionIniciada) return
          if (entrada.confirmado === deseado) return // el servidor ya tiene lo que se ve
          revertir()
          toast.show(`No pudimos ${accion}. ${sugerencia(error)}`)
        },
      )
      .finally(() => {
        if (enCurso.get(productoId) === entrada && entrada.version === version) enCurso.delete(productoId)
      })

    return actual
  }

  // Une los favoritos de este navegador con los de la cuenta. Los de la cuenta que no estaban van
  // al final (no sabemos cuándo se guardaron) y sin copia: reconciliar() la completa cuando la
  // página de Favoritos carga el catálogo. Los del navegador que faltan en la cuenta se suben;
  // si alguno falla, sigue aquí y se vuelve a intentar la próxima vez que se una.
  let uniendo = null

  function unirConCuenta() {
    uniendo ??= (async () => {
      let enCuenta
      try {
        enCuenta = await obtenerFavoritos()
      } catch (error) {
        // Un 401 ya cerró la sesión: no hay nada que avisar aquí.
        if (conCuenta()) toast.show(`No pudimos traer los favoritos de tu cuenta. ${sugerencia(error)}`)
        return
      }
      if (!conCuenta()) return // se cerró la sesión mientras llegaba la respuesta

      const ids = new Set(enCuenta)
      const porSubir = items.value.map((item) => item.productoId).filter((id) => !ids.has(id))
      for (const productoId of ids) {
        if (!esFavorito.value(productoId)) items.value.push({ productoId, disponible: true, copia: null })
      }
      guardar()

      const resultados = await Promise.allSettled(porSubir.map((productoId) => enviar(productoId, true)))
      const fallidos = resultados.filter((resultado) => resultado.status === 'rejected').length
      if (fallidos && conCuenta()) {
        toast.show(
          fallidos === 1
            ? 'No pudimos guardar 1 favorito en tu cuenta. Sigue en este navegador y lo intentaremos otra vez la próxima vez que entres.'
            : `No pudimos guardar ${fallidos} favoritos en tu cuenta. Siguen en este navegador y lo intentaremos otra vez la próxima vez que entres.`,
        )
      }
    })().finally(() => {
      uniendo = null
    })
    return uniendo
  }

  // --- Cambios locales (sin servidor): los usan las acciones y las reversiones ---
  function agregarLocal(item, indice = 0) {
    if (esFavorito.value(item.productoId)) return false
    items.value.splice(Math.min(indice, items.value.length), 0, item)
    guardar()
    return true
  }

  function quitarLocal(productoId) {
    const indice = items.value.findIndex((item) => item.productoId === productoId)
    if (indice === -1) return null
    const [item] = items.value.splice(indice, 1)
    guardar()
    return { item, indice }
  }

  // --- Acciones ---
  // Recibe el producto (no solo el id) para guardar su copia. Va al principio: el más reciente primero.
  function agregar(producto) {
    if (!Number.isInteger(producto?.id)) return
    const item = { productoId: producto.id, disponible: true, copia: copiarProducto(producto) }
    if (!agregarLocal(item)) return
    enviar(producto.id, true, {
      revertir: () => quitarLocal(producto.id),
      accion: `guardar ${producto.nombre} en tus favoritos`,
    })
  }

  // Devuelve { item, indice } para poder deshacerlo con restaurar(), o null si no estaba.
  function quitar(productoId) {
    const quitado = quitarLocal(productoId)
    if (!quitado) return null
    enviar(productoId, false, {
      revertir: () => agregarLocal(quitado.item, quitado.indice),
      accion: `quitar ${nombreDe(quitado.item)} de tus favoritos`,
    })
    return quitado
  }

  // "Deshacer": vuelve a poner el item en el lugar que tenía. Si mientras tanto se guardó otra
  // vez (p. ej. desde otra pestaña), no se duplica.
  function restaurar({ item, indice }) {
    if (!agregarLocal(item, indice)) return
    enviar(item.productoId, true, {
      revertir: () => quitarLocal(item.productoId),
      accion: `volver a guardar ${nombreDe(item)} en tus favoritos`,
    })
  }

  // Solo este navegador: no toca los favoritos guardados en la cuenta.
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
  // No se envía nada al servidor: la pestaña que hizo el cambio ya lo envió.
  almacenamiento.escucharOtrasPestanas((guardados) => {
    items.value = guardados ?? []
  })

  // Con la API activa, los favoritos siguen a la sesión. immediate: si la app abre con la sesión
  // ya iniciada, también se une (así aparece lo guardado desde otro dispositivo).
  // Sin sesión al abrir no se borra nada: son los favoritos de quien usa el navegador sin cuenta.
  if (favoritosApiActiva) {
    watch(
      () => auth.estaSesionIniciada,
      (sesion, habiaSesion) => {
        if (sesion) {
          unirConCuenta()
        } else if (habiaSesion) {
          enCurso.clear() // lo que responda después ya no revierte nada
          vaciar()
        }
      },
      { immediate: true },
    )
  }

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

