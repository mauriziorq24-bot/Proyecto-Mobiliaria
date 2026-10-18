import axios from 'axios'

// En desarrollo la URL base queda vacía: axios usa rutas relativas (/api/v1/...)
// y el proxy de Vite las reenvía al backend. En producción viene de VITE_API_URL.
const api = axios.create({
  baseURL: import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
