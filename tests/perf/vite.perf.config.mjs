/* Build SOLO para medir. Es el build de producción de siempre más una cosa:
   '@zumer/snapdom' aliaseado al cronómetro de tests/perf/snapdom-timed.mjs.
   Todo lo demás (plugins, alias '@', minificado) es idéntico a vite.config.ts,
   para que los números no vengan de un bundle distinto al que se despliega.

   Se usa así:
     npx vite build --config tests/perf/vite.perf.config.mjs
     npx vite preview --config tests/perf/vite.perf.config.mjs --port 4173 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  root: raiz,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(raiz, 'src'),
      '@zumer/snapdom': path.resolve(raiz, 'tests/perf/snapdom-timed.mjs'),
    },
  },
  build: { outDir: path.resolve(raiz, 'dist-perf'), emptyOutDir: true },
});
