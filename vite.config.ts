import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    publicDir: 'public',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
    build: {
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Split large vendor libraries into separate chunks
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('chroma-js')) {
                return 'vendor-ui';
              }
              if (id.includes('react-router-dom')) {
                return 'vendor-router';
              }
              // Keep firebase together but handle properly
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'vendor-firebase';
              }
            }
          },
        },
      },
    },
  };
});
