import { defineConfig, loadEnv, createLogger } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

let lastProxyWarnAt = 0

// Persistent keep-alive agent prevents ephemeral port exhaustion on Windows localhost
const proxyAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 15000,
  maxSockets: 300,
  maxFreeSockets: 100,
  timeout: 60000
})

function createCleanViteLogger() {
  const logger = createLogger()
  const originalError = logger.error.bind(logger)

  logger.error = (msg, options) => {
    const text = String(msg || '')
    const errDetail = String(options?.error?.message || options?.error?.code || '')
    if (
      text.includes('http proxy error') &&
      /ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT|EADDRINUSE/i.test(`${text} ${errDetail}`)
    ) {
      const now = Date.now()
      if (now - lastProxyWarnAt > 15000) {
        lastProxyWarnAt = now
        logger.warn('[proxy] Waiting for backend engine on http://127.0.0.1:5002 ... (start with "npm start" at repo root or "cd server && npm start")', { timestamp: true })
      }
      return
    }
    originalError(msg, options)
  }

  return logger
}

function releaseOnClose(proxy) {
  proxy.on('error', (err, _req, res) => {
    if (!res || res.headersSent || res.writableEnded) return;
    try {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'backend_unreachable',
        backendOffline: true,
        message: err?.message || 'Backend engine unreachable'
      }));
    } catch (e) {}
  });
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    customLogger: createCleanViteLogger(),
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
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
          timeout: 0,
          agent: proxyAgent,
          configure: releaseOnClose
        },
        '/logs': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 0,
          agent: proxyAgent,
          configure: releaseOnClose
        },
        '/events': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 0,
          agent: proxyAgent,
          configure: releaseOnClose
        },
        '/downloads': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          timeout: 0,
          agent: proxyAgent,
          configure: releaseOnClose
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
        'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      },
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
