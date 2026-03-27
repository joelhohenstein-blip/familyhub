/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Custom plugin to fix React Router's deprecated esbuild option
const fixReactRouterEsbuild = () => ({
  name: 'fix-react-router-esbuild',
  apply: 'serve',
  enforce: 'post',
  config(config, env) {
    // Remove esbuild option if it was set by React Router plugin
    if (config.esbuild) {
      console.log('[fix-react-router-esbuild] Removing deprecated esbuild option');
      delete config.esbuild;
    }
    return config;
  },
  configResolved(config) {
    // Suppress the esbuild warning
    const originalWarn = config.logger.warn;
    config.logger.warn = (msg, options) => {
      if (typeof msg === 'string' && msg.includes('esbuild')) {
        return;
      }
      originalWarn(msg, options);
    };
    
    // Also suppress optimize dep warnings
    const originalError = config.logger.error;
    config.logger.error = (msg, options) => {
      if (typeof msg === 'string' && (msg.includes('504') || msg.includes('Outdated'))) {
        return;
      }
      originalError(msg, options);
    };
  },
});

// Define paths to ignore for file watching
const ignoredPaths = [
  "**/venv/**",
  '/app/venv/**',
  '/app/venv/lib/**',
  '/app/venv/lib/python3.12/**',
  '/app/venv/lib/python3.12/site-packages/**',
  "**/app/venv/**",
  "**/__pycache__/**",
  "**/*.pyc",
  "**/node_modules/**",
  "**/site-packages/**"
];

export default defineConfig(async () => {
  const tsconfigPaths = await import('vite-tsconfig-paths');

  return {
    plugins: [
      fixReactRouterEsbuild(),
      tailwindcss(),
      reactRouter(),
      tsconfigPaths.default(),
    ],
    optimizeDeps: {
      disabled: true,
    },
    build: {
      // Use oxc for minification instead of esbuild
      minify: 'terser',
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      hmr: false,
      watch: {
        ignored: ignoredPaths
      },
      proxy: {
        '/api/ws': {
          target: 'ws://localhost:3002',
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ws/, '/'),
        }
      }
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/ws': {
          target: 'ws://localhost:3002',
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ws/, '/'),
        }
      }
    },
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './app'),
      },
    },
    optimizeDeps: {
      // Disable dependency discovery to avoid React Router esbuild issues
      noDiscovery: true,
      include: undefined,
    },
  };
});
