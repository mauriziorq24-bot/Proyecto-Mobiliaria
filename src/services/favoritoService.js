import { mockFavoritosServidor } from '../mocks/favoritos'
import api from './api'

// Las variables de entorno siempre llegan como texto: hay que comparar con 'true'.
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

// Con VITE_FAVORITOS_API=true y sesión iniciada, el store de favoritos se sincroniza con la cuenta
// (ver CLAUDE.md). Con false, o sin sesión, los favoritos viven solo en este navegador.
export const favoritosApiActiva = import.meta.env.VITE_FAVORITOS_API === 'true'

// --- Mocks ---
// Lo "guardado en el servidor" vive en memoria: se reinicia al recargar la página.
// Con el navegador sin conexión (DevTools › Network › Offline) las peticiones fallan como un error
// de red, para poder probar que la interfaz revierte el cambio.
const mockGuardados = new Set(mockFavoritosServidor())

function fakeRequest(responder, ms = 400) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const error = new Error('Network Error')
        error.code = 'ERR_NETWORK'
        reject(error)
        return
      }
      resolve(responder())
    }, ms),
  )
}

// --- API ---
// Las tres exigen token: sin él el backend responde 403 (y 401 si lo rechaza, ver API.md).

// GET /api/v1/favoritos → [1, 4, 7] (ids de productos). Lo que no sea un id entero se descarta.
export async function obtenerFavoritos() {
  if (useMocks) return fakeRequest(() => [...mockGuardados])
  const { data } = await api.get('/api/v1/favoritos')
  return Array.isArray(data) ? data.filter(Number.isInteger) : []
}

// POST /api/v1/favoritos/{productoId} → 200 sin cuerpo. Idempotente: repetirlo no duplica.
export async function agregarFavorito(productoId) {
  if (useMocks) return fakeRequest(() => void mockGuardados.add(productoId))
  await api.post(`/api/v1/favoritos/${productoId}`)
}

// DELETE /api/v1/favoritos/{productoId} → 200 sin cuerpo. Idempotente: quitar uno que no está no falla.
export async function quitarFavorito(productoId) {
  if (useMocks) return fakeRequest(() => void mockGuardados.delete(productoId))
  await api.delete(`/api/v1/favoritos/${productoId}`)
}
