import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Map key: env first (CI / release builds inject it as a secret). Locally it
  // comes from client/.env.local; nothing secret is committed.
  const olaMapsKey = env.VITE_OLA_MAPS_API_KEY || ''
  if (!olaMapsKey) {
    console.warn('[vite] VITE_OLA_MAPS_API_KEY is not set - map search will fall back to OSM.')
  }

  return {
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: false,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/logs': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['react-window', 'react-virtualized-auto-sizer'],
    },
    define: {
      'process.env': {},
      'import.meta.env.VITE_OLA_MAPS_API_KEY': JSON.stringify(olaMapsKey),
      // Tells the bundle it is running inside the Windows shell.
      'import.meta.env.VITE_DESKTOP': JSON.stringify(env.VITE_DESKTOP || ''),
    },
    build: {
      chunkSizeWarningLimit: 30000,
    }
  }
})
