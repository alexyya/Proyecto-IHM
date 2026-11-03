import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy envía /api al backend Express (puerto 4000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
