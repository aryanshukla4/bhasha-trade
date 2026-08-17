import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend's .env pins CORS_ORIGINS to http://localhost:3000, so we never
// call it cross-origin. Everything goes through this proxy as a same-origin
// request instead, which means no preflight and no backend change.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
