import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // In development the frontend runs on 5173 and the API on 3000, so requests are proxied.
    // In production (and in CI) a single Express process serves both, and no proxy is needed.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
