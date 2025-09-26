import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env file, if present.
  // The third parameter '' allows loading all variables, not just those prefixed with VITE_.
  // FIX: Cast 'process' to 'any' to resolve TypeScript error due to missing/incorrect Node.js types.
  const env = loadEnv(mode, (process as any).cwd(), '');
  const port = env.PORT || 8080;

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${port}`,
          changeOrigin: true,
        },
        '/twilio-webhook-handler': {
          target: `http://127.0.0.1:${port}`,
          changeOrigin: true,
        },
        '/twilio-voice-app': {
          target: `http://127.0.0.1:${port}`,
          changeOrigin: true,
        }
      }
    }
  }
})
