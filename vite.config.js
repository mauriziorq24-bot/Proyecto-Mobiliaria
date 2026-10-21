import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // vite.config.js corre en Node, donde import.meta.env no existe todavía:
  // loadEnv lee los archivos .env a mano para obtener VITE_PROXY_TARGET.
  const env = loadEnv(mode, process.cwd())
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  // Misma configuración para /auth y /api.
  const backendProxy = {
    target: proxyTarget,
    // Reescribe el header Host al del backend: Render decide a qué servicio
    // mandar la petición según ese header.
    changeOrigin: true,
  }

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      // En desarrollo, Vite reenvía /auth y /api al backend de Spring Boot.
      // Así el navegador ve un solo origen (localhost:5173) y no hay problemas de CORS.
      proxy: {
        '/auth': backendProxy,
        '/api': backendProxy,
      },
    },
  }
})
