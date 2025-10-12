import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Usar rutas relativas para aplicaciones empaquetadas
  server: {
    watch: {
      // Ignorar carpeta resources para evitar recargas durante instalaciones
      ignored: ['**/resources/**', '**/dist-electron/**', '**/node_modules/**']
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
