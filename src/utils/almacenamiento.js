// Guardar un valor en localStorage sin que un fallo rompa la app, para los stores de Pinia
// (cotización, favoritos) y las listas por cuenta (citas, cotizaciones enviadas).
//
// La clave lleva la versión del formato ('...:v1'). Si algún día cambia la forma de lo guardado,
// se pasa a ':v2' y lo de ':v1' se ignora (o el store lo migra una vez y lo quita con borrar()),
// en vez de leerse con la forma equivocada.
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

  // Para migraciones: quita la clave de una versión vieja después de pasar sus datos a la nueva.
  function borrar() {
    try {
      localStorage.removeItem(clave)
    } catch {
      // Sin almacenamiento disponible: no hay nada que quitar.
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

  return { leer, escribir, borrar, escucharOtrasPestanas }
}

// Listas de registros que pertenecen a una cuenta: citas agendadas y cotizaciones enviadas.
// No hay GET de ninguna de las dos en el backend, así que la única copia es la de este navegador.
// Cada registro lleva el `username` de la sesión con la que se hizo (null si se hizo sin sesión):
// así, si dos personas usan la misma computadora, cada una ve solo lo suyo. El filtro vive aquí
// para que citas y cotizaciones lo apliquen igual.
//
// Además de localStorage hay una copia en memoria: si el almacenamiento falla (modo privado,
// bloqueado), lo recién guardado se ve en esta visita aunque al recargar ya no esté.
//
// - clave: la clave de localStorage, con versión.
// - idDe(registro): el código que lo identifica (codigoCita, codigoCotizacion).
// - esValido(registro): si lo leído tiene la forma esperada (sin contar `username`).
// - maximoPorCuenta: cuántos se guardan por cuenta; al pasarse se descartan los más viejos.
//
// Las listas se guardan con el más reciente primero.
export function crearRegistrosPorCuenta(clave, { idDe, esValido, maximoPorCuenta = Infinity }) {
  const tieneDueno = (r) => r.username === null || typeof r.username === 'string'

  const almacenamiento = crearAlmacenamiento(clave, {
    validar: (guardado) => (Array.isArray(guardado) ? guardado.filter((r) => esValido(r) && tieneDueno(r)) : []),
    vacio: () => [],
  })

  let enMemoria = []

  function leerTodos() {
    const guardados = almacenamiento.leer()
    return guardados.length ? guardados : enMemoria
  }

  // Deja como máximo `maximoPorCuenta` registros de cada cuenta, los primeros (los más recientes).
  function recortar(lista) {
    if (maximoPorCuenta === Infinity) return lista
    const porCuenta = new Map()
    return lista.filter((r) => {
      const n = (porCuenta.get(r.username) ?? 0) + 1
      porCuenta.set(r.username, n)
      return n <= maximoPorCuenta
    })
  }

  function escribir(lista) {
    enMemoria = recortar(lista)
    almacenamiento.escribir(enMemoria)
  }

  // Los de esa cuenta. Sin sesión no hay "tuyos": lista vacía.
  function leerDe(username) {
    if (!username) return []
    return leerTodos().filter((r) => r.username === username)
  }

  // Si el código ya estaba (no debería), se reemplaza en vez de duplicarse.
  function guardar(registro, username) {
    const nuevo = { ...registro, username: username ?? null }
    escribir([nuevo, ...leerTodos().filter((r) => idDe(r) !== idDe(nuevo))])
  }

  function actualizar(id, cambios) {
    escribir(leerTodos().map((r) => (idDe(r) === id ? { ...r, ...cambios } : r)))
  }

  function quitar(id) {
    escribir(leerTodos().filter((r) => idDe(r) !== id))
  }

  // Por código, de cualquier cuenta: las confirmaciones se ven aunque se haya enviado sin sesión.
  function buscar(id) {
    return leerTodos().find((r) => idDe(r) === id) ?? null
  }

  // Una sola vez: lo guardado con el formato anterior (sin `username`, en `claveVieja`) pasa a la
  // cuenta con sesión al abrir la app, o se descarta si no hay sesión. Después se borra la clave vieja.
  function migrarDesde(claveVieja, username) {
    const vieja = crearAlmacenamiento(claveVieja, {
      validar: (guardado) => (Array.isArray(guardado) ? guardado.filter(esValido) : []),
      vacio: () => [],
    })
    const viejos = vieja.leer()
    if (username && viejos.length) {
      const actuales = leerTodos()
      const ids = new Set(actuales.map(idDe))
      // Los viejos van al final: son anteriores a todo lo guardado con el formato nuevo.
      escribir([...actuales, ...viejos.filter((r) => !ids.has(idDe(r))).map((r) => ({ ...r, username }))])
    }
    vieja.borrar()
  }

  // alCambiar no recibe nada: quien escucha vuelve a leer lo suyo con leerDe().
  function escucharOtrasPestanas(alCambiar) {
    return almacenamiento.escucharOtrasPestanas(() => alCambiar())
  }

  return { leerDe, guardar, actualizar, quitar, buscar, migrarDesde, escucharOtrasPestanas }
}
