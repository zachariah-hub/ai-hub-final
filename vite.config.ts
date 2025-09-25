import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/twilio-webhook-handler': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/twilio-voice-app': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
