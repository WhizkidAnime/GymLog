import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    return {
      // Relative base для GitHub Pages (работает при публикации в сабдиректории)
      base: isProduction ? '/GymLog/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: 3000,
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Оптимизация бандла
        cssMinify: 'esbuild',
        minify: 'esbuild',
        rollupOptions: {
          output: {
            // Разделение кода на чанки для параллельной загрузки
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
              supabase: ['@supabase/supabase-js'],
              charts: ['recharts'],
            }
          }
        }
      }
    };
});
