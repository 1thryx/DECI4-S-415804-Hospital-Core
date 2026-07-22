import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // __API_BASE__ is compiled in at build time rather than read from import.meta.env
    // at runtime, so the same module graph loads under Jest (which has no import.meta).
    define: {
      __API_BASE__: JSON.stringify(env.VITE_API_URL || '/api')
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      // Required for hot reload to work through a Docker bind mount.
      watch: { usePolling: true, interval: 300 },
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:5000',
          changeOrigin: true
        }
      }
    },

    preview: { host: '0.0.0.0', port: 4173 },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query']
          }
        }
      }
    }
  };
});
