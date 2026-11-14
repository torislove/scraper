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
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Long-lived SSE sockets can outlive the tab that opened them.
              // http-proxy does not always propagate the downstream close
              // upstream, so a dashboard tab closed mid-stream can leave a ghost
              // stream counted on the engine. Tie the upstream response to the
              // browser connection for stream paths only.
              //
              // Attach on the *downstream response*: an IncomingMessage "close"
              // fires as soon as the request body is complete, which would kill
              // a legitimate stream immediately.
              if (!req?.url || !req.url.includes('/stream')) return;
              const kill = () => {
                try { proxyRes.destroy(); } catch (e) { /* already gone */ }
              };
              res.on('close', kill);
              res.on('error', kill);
            });
            proxy.on('error', (err, req, res) => {
              // Gracefully handle expected SSE stream disconnects during server restarts
              if (req?.url?.includes('/stream') || req?.url?.includes('/logs')) {
                try {
                  if (res && !res.headersSent && typeof res.writeHead === 'function') {
                    res.writeHead(503, { 'Content-Type': 'text/event-stream' });
                    res.end('retry: 2500\n\n');
                  } else if (res && !res.writableEnded && typeof res.end === 'function') {
                    res.end();
                  }
                } catch (e) {}
                return;
              }
              try {
                if (res && typeof res.writeHead === 'function' && !res.headersSent) {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ ok: false, error: 'Server temporarily reconnecting', code: 'SERVER_RECONNECTING' }));
                } else if (res && typeof res.end === 'function' && !res.writableEnded) {
                  res.end();
                }
              } catch (e) {}
            });
          }
        },
        '/logs': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Long-lived SSE sockets can outlive the tab that opened them.
              // http-proxy does not always propagate the downstream close
              // upstream, so a dashboard tab closed mid-stream can leave a ghost
              // stream counted on the engine. Tie the upstream response to the
              // browser connection for stream paths only.
              //
              // Attach on the *downstream response*: an IncomingMessage "close"
              // fires as soon as the request body is complete, which would kill
              // a legitimate stream immediately.
              if (!req?.url || !req.url.includes('/stream')) return;
              const kill = () => {
                try { proxyRes.destroy(); } catch (e) { /* already gone */ }
              };
              res.on('close', kill);
              res.on('error', kill);
            });
            proxy.on('error', (err, req, res) => {
              // Gracefully handle expected SSE stream disconnects during server restarts
              if (req?.url?.includes('/stream') || req?.url?.includes('/logs')) {
                try {
                  if (res && !res.headersSent && typeof res.writeHead === 'function') {
                    res.writeHead(503, { 'Content-Type': 'text/event-stream' });
                    res.end('retry: 2500\n\n');
                  } else if (res && !res.writableEnded && typeof res.end === 'function') {
                    res.end();
                  }
                } catch (e) {}
                return;
              }
              try {
                if (res && typeof res.writeHead === 'function' && !res.headersSent) {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ ok: false, error: 'Server temporarily reconnecting', code: 'SERVER_RECONNECTING' }));
                } else if (res && typeof res.end === 'function' && !res.writableEnded) {
                  res.end();
                }
              } catch (e) {}
            });
          }
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
