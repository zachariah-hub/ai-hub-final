import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/twilio-webhook-handler': 'http://localhost:8080',
      '/twilio-voice-app': 'http://localhost:8080'
    }
  }
})
