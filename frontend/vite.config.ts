import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/images': {
        target: 'http://localhost:34115',
        changeOrigin: true,
      }
    }
  }
})
