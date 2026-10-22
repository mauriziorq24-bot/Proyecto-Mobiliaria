// Guardar un valor en localStorage sin que un fallo rompa la app, para los stores de Pinia
// (cotización, favoritos).
//
// La clave lleva la versión del formato ('...:v1'). Si algún día cambia la forma de lo guardado,
// se pasa a ':v2' y lo de ':v1' simplemente se ignora, en vez de leerse con la forma equivocada.
//
// localStorage puede fallar (modo privado de Safari, almacenamiento bloqueado o lleno) o tener
// JSON roto o editado a mano. Leer nunca lanza: devuelve vacio(). Escribir tampoco: si no se
// puede, el valor sigue en memoria (en el store) hasta recargar.
//
// - clave: la clave de localStorage, con versión.
// - validar(guardado): recibe lo que se leyó (ya parseado; null si no había nada) y devuelve el
//   valor limpio. Puede lanzar: se trata igual que un JSON roto.
// - vacio(): el valor inicial. Es una función para que cada lectura devuelva una copia nueva.
export function crearAlmacenamiento(clave, { validar, vacio }) {
  function leer() {
    try {
      return validar(JSON.parse(localStorage.getItem(clave)))
    } catch {
      return vacio()
    }
  }

  function escribir(valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor))
    } catch {
      // Sin almacenamiento disponible: el valor sigue en memoria hasta recargar.
    }
  }

  // Sincronización entre pestañas. El evento 'storage' solo llega a las OTRAS pestañas del
  // mismo sitio cuando una cambia localStorage (nunca a la que hizo el cambio).
  // e.key es null cuando otra pestaña llamó a localStorage.clear().
  // alCambiar recibe el valor ya leído y validado. Devuelve una función para dejar de escuchar;
  // un store se crea una sola vez por pestaña, así que normalmente no hace falta llamarla.
  function escucharOtrasPestanas(alCambiar) {
    if (typeof window === 'undefined') return () => {}
    const onStorage = (event) => {
      if (event.key === clave || event.key === null) alCambiar(leer())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }

  return { leer, escribir, escucharOtrasPestanas }
}
