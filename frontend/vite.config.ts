import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
/// <reference types="vitest/config" />

// Plugin to return 404 for image/thumbnail API routes
// This allows Wails to forward these requests to the Go AssetHandler
function wailsImageHandlerPlugin(): Plugin {
  return {
    name: 'wails-image-handler',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Return 404 for /images and /thumbnails routes
        // Wails will then forward these to the Go AssetHandler
        if (req.url?.startsWith('/images') || req.url?.startsWith('/thumbnails')) {
          res.statusCode = 404;
          res.end();
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), wailsImageHandlerPlugin()],
  esbuild: mode === 'production' ? {
    drop: ['console', 'debugger'],
  } : {},
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@services': path.resolve(__dirname, './src/services'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@components': path.resolve(__dirname, './src/components'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@themes': path.resolve(__dirname, './src/themes'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
  server: {
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    coverage: {
      exclude: [
        'wailsjs/**',
        'src/test/**',
      ],
    },
  },
}))
