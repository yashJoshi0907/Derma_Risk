import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all API calls to the FastAPI backend during development.
      // This also eliminates any CORS issues in the browser.
      '/auth': {
        target: 'https://derma-risk.onrender.com',
        changeOrigin: true,
      },
      '/predict': {
        target: 'https://derma-risk.onrender.com',
        changeOrigin: true,
      },
      '/history': {
        target: 'https://derma-risk.onrender.com',
        changeOrigin: true,
      },
      '/chat': {
        target: 'https://derma-risk.onrender.com',
        changeOrigin: true,
      },
      '/health': {
        target: 'https://derma-risk.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
