/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  const isProduction = mode === 'production';
  const isStaging = mode === 'staging';
  const isDevelopment = mode === 'development';

  // Health endpoint plugin
  const healthEndpointPlugin = {
    name: 'health-endpoint',
    configureServer(server: any) {
      server.middlewares.use('/api/health', (req: any, res: any, next: any) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          if (req.method === 'GET') {
            res.end(JSON.stringify({
              status: 'healthy',
              timestamp: new Date().toISOString(),
              services: {
                frontend: 'operational',
                vite: 'operational',
              },
            }));
          } else {
            res.end();
          }
        } else {
          next();
        }
      });
    },
  };

  return {
    plugins: [
      react(),
      healthEndpointPlugin,
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'ClinicBoost',
          short_name: 'ClinicBoost',
          description: 'Modern Dental Clinic Management System',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        devOptions: {
          enabled: isDevelopment,
          type: 'module',
        },
      }),
    ],

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
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_SHA__: JSON.stringify(env.GITHUB_SHA || 'unknown'),
    },

    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      chunkSizeWarningLimit: 1000, // Increase chunk size warning limit to 1MB

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
            performance: [
              'src/lib/performance/advanced-monitoring.ts',
              'src/lib/performance/real-time-alerts.ts',
              'src/lib/performance/regression-detection.ts',
              'src/lib/performance/mobile-cache-strategies.ts',
              'src/lib/performance/performance-integration.ts'
            ],
            mobile: [
              'src/lib/mobile/performance-optimizer.ts',
              'src/lib/mobile/device-detection.ts'
            ]
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
