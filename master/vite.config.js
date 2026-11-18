import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Unified self-contained 3D design system inside src/ui3d
const ui3dRoot = fileURLToPath(new URL('./src/ui3d', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: false,
      fs: {
        // Allow the shared kit (repo-root /shared/ui3d) to be served in dev.
        allow: ['..'],
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 0
        },
        '/logs': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 0
        },
        '/events': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 0
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@ui3d': ui3dRoot,
        // shared/ui3d lives outside this app root, so bare imports must be
        // pointed at this app's own copy. Same physical module → no duplicate
        // React, and the desktop bundle stays self-contained.
        react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
        'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      },
    },
    optimizeDeps: {
      include: ['react-window', 'react-virtualized-auto-sizer'],
    },
    define: {
      'process.env': {},
      // Tells the bundle it is running inside the Windows shell.
      'import.meta.env.VITE_DESKTOP': JSON.stringify(env.VITE_DESKTOP || ''),
    },
    build: {
      chunkSizeWarningLimit: 30000,
      // The build is already fast. Rolldown's timing report is noise, not an
      // error; turn it off so a clean build prints only the result.
      rolldownOptions: {
        checks: {
          bundlerTimings: false,
          pluginTimings: false,
        },
      },
    }
  }
})
