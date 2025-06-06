/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  const isProduction = mode === 'production';
  const isStaging = mode === 'staging';
  const isDevelopment = mode === 'development';

  return {
    plugins: [react()],

    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@lib': resolve(__dirname, 'src/lib'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@contexts': resolve(__dirname, 'src/contexts'),
        '@types': resolve(__dirname, 'src/types'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@test': resolve(__dirname, 'src/test'),
      },
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_SHA__: JSON.stringify(process.env.GITHUB_SHA || 'unknown'),
    },

    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,

      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['@headlessui/react', 'lucide-react'],
            forms: ['react-hook-form', '@hookform/resolvers'],
            query: ['@tanstack/react-query'],
            i18n: ['react-i18next', 'i18next'],
            charts: ['recharts'],
            utils: ['date-fns', 'clsx'],
          },
        },
      },
    },

    // Development server
    server: {
      port: 5173,
      host: true,
      open: isDevelopment,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // Preview server
    preview: {
      port: 4173,
      host: true,
    },

    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'react-i18next',
      ],
      exclude: ['lucide-react'],
    },

    // CSS configuration
    css: {
      devSourcemap: !isProduction,
      modules: {
        localsConvention: 'camelCase',
      },
    },

    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.{js,ts}',
          '**/dist/**',
          '**/build/**',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
      testTimeout: 10000,
      hookTimeout: 10000,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    },
  };
});
