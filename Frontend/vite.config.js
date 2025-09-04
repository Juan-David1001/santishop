import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // permite acceso desde la red local
    port: 5173, // opcional, el puerto que quieras usar
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
