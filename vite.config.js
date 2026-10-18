import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // En desarrollo, Vite reenvía /auth y /api al backend de Spring Boot.
    // Así el navegador ve un solo origen (localhost:5173) y no hay problemas de CORS.
    proxy: {
      '/auth': 'http://localhost:8080',
      '/api': 'http://localhost:8080',
    },
  },
})
