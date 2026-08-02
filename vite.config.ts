import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // RODEO_DEMO=1: el empaquetador del demo (un solo HTML) no puede resolver
  // import() de chunks relativos, así que todo va en un único bundle. El
  // build normal mantiene el chunk 3D del gate separado (lazy).
  build: process.env.RODEO_DEMO
    ? { rollupOptions: { output: { inlineDynamicImports: true } } }
    : undefined,
  server: {
    port: 5173,
    // En Windows, el navegador de pruebas puede resolver el directorio por su
    // alias 8.3; sin esta excepción Vite responde 403 aunque sea este proyecto.
    fs: { strict: false },
    // Las funciones serverless viven en /api (Vercel). En dev las sirve
    // dev-server.mjs en el 4870 (npm run api en otra terminal).
    proxy: { '/api': 'http://localhost:4870' },
  },
});
