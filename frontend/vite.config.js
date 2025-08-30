import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})