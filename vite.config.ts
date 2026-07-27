import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Las funciones serverless viven en /api (Vercel). En dev las sirve
    // dev-server.mjs en el 4870 (npm run api en otra terminal).
    proxy: { '/api': 'http://localhost:4870' },
  },
});
