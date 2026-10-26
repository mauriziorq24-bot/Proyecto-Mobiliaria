import { reactive } from 'vue'
import { FORBIDDEN_MESSAGE, isForbidden, isNetworkError } from '../services/errorMessages'
import { useToast } from './useToast'

// Cambiar el estado de una cotización o una cita del panel, con actualización optimista
// (la misma idea que los favoritos, src/stores/favoritos.js):
// 1. La lista cargada con useAsync se cambia al instante: la persona ve el estado nuevo de una vez.
// 2. Después se envía el PATCH. Las peticiones de un mismo elemento van en fila, una tras otra,
//    para que el servidor las reciba en el orden en que se tocaron.
// 3. Si falla la última, se vuelve al último estado que el servidor sí confirmó y se avisa.
//    Si falla una vieja, no se toca nada: decide la más reciente.
//
// Uso:
//   const { cambiar, guardando } = useCambioDeEstado({
//     carga,                      // el useAsync de la lista (su data es un arreglo)
//     clave: 'codigoCita',        // el campo que identifica a cada elemento
//     enviar: cambiarEstadoCita,  // (codigo, estado) => promesa del servicio
//     etiqueta: (estado) => '…',  // texto del estado para el aviso de error
//   })
//   cambiar(cita, 'CONFIRMADA')
//   guardando.has('CITA-…')      // true mientras haya un envío en curso
export function useCambioDeEstado({ carga, clave, enviar, etiqueta }) {
  const toast = useToast()
  // codigo → { version, confirmado, cola }. Solo existe mientras haya envíos en curso.
  const enCurso = new Map()
  const guardando = reactive(new Set())

  // carga.data es un shallowRef: se reemplaza el arreglo entero para que Vue se entere.
  function ponerEstado(codigo, estado) {
    const lista = carga.data.value
    if (!Array.isArray(lista)) return
    carga.data.value = lista.map((item) => (item[clave] === codigo ? { ...item, estado } : item))
  }

  function motivo(error) {
    if (isForbidden(error)) return FORBIDDEN_MESSAGE
    if (isNetworkError(error)) return 'Revisa tu conexión e inténtalo de nuevo.'
    // El backend da 500 (no 404) con un código que no existe (pendiente 35 de API.md).
    const status = error?.response?.status
    if (status === 404 || status === 500) return 'Puede que ya no exista: actualiza la lista.'
    return 'Inténtalo en unos minutos.'
  }

  function cambiar(item, estado) {
    const codigo = item[clave]
    if (item.estado === estado) return

    let entrada = enCurso.get(codigo)
    if (!entrada) {
      // Sin nada en curso, el servidor tiene lo que se ve ahora.
      entrada = { version: 0, confirmado: item.estado, cola: Promise.resolve() }
      enCurso.set(codigo, entrada)
    }
    const version = ++entrada.version
    ponerEstado(codigo, estado)
    guardando.add(codigo)

    // .catch: si la anterior falló, esta sale igual.
    const actual = entrada.cola.catch(() => {}).then(() => enviar(codigo, estado))
    entrada.cola = actual

    actual
      .then(
        () => {
          entrada.confirmado = estado
        },
        (error) => {
          if (entrada.version !== version) return // hubo otro cambio después: decide ese
          if (entrada.confirmado === estado) return // el servidor ya tiene lo que se ve
          ponerEstado(codigo, entrada.confirmado)
          toast.show(`No pudimos marcar ${codigo} como «${etiqueta(estado)}». ${motivo(error)}`, 6000)
        },
      )
      .finally(() => {
        if (entrada.version !== version) return
        enCurso.delete(codigo)
        guardando.delete(codigo)
      })
  }

  return { cambiar, guardando }
}
