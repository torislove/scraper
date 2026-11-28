import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';

let lastProxyWarnAt = 0;

function createCleanViteLogger() {
  const logger = createLogger();
  const originalError = logger.error.bind(logger);

  logger.error = (msg, options) => {
    const text = String(msg || '');
    const errDetail = String(options?.error?.message || options?.error?.code || '');
    if (
      text.includes('http proxy error') &&
      /ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT/i.test(`${text} ${errDetail}`)
    ) {
      const now = Date.now();
      if (now - lastProxyWarnAt > 15000) {
        lastProxyWarnAt = now;
        logger.warn('[proxy] Waiting for backend engine on http://127.0.0.1:5002 ... (start with "node dev.js")', { timestamp: true });
      }
      return;
    }
    originalError(msg, options);
  };

  return logger;
}

function releaseOnClose(proxy) {
  proxy.on('proxyRes', (proxyRes, req, res) => {
    const cleanup = () => {
      if (!res.writableEnded) {
        try { proxyRes.destroy(); } catch (e) {}
      }
    };
    req.on('aborted', cleanup);
    res.on('close', cleanup);
  });
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

export default defineConfig({
  base: './',
  customLogger: createCleanViteLogger(),
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl']
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 0,
        configure: releaseOnClose
      },
      '/logs': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 0,
        configure: releaseOnClose
      },
      '/events': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 0,
        configure: releaseOnClose
      },
      '/downloads': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
        secure: false,
        timeout: 0,
        configure: releaseOnClose
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            if (id.includes('react-router-dom') || id.includes('react-router') || id.includes('@remix-run')) {
              return 'react-router';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-core';
            }
            return 'vendor';
          }
        }
      }
    },
    rolldownOptions: {
      checks: {
        bundlerTimings: false,
        pluginTimings: false,
      },
    },
  }
});
