import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  envDir: path.resolve(__dirname, '.'),
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['@chatscope/chat-ui-kit-react', 'framer-motion', 'recharts'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components/ui': path.resolve(__dirname, './src/components/ui'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['electron'],
  },
});
