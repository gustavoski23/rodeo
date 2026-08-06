/* ¿Cuánto hilo principal cuesta pasar una página?

   La mediana de «ms por captura» engaña cuando lo que cambia es el NÚMERO de
   capturas: si dejan de hacerse las baratas, la mediana de las que quedan sube
   aunque el trabajo total baje. Lo que hay que comparar es el coste POR VOLTEO.

   Mide los dos ritmos de lectura, que dan números muy distintos:
   - LINEAL: siempre hacia adelante. Cada volteo estrena una hoja, así que la
     caché no puede ayudar; es el peor caso honesto.
   - IDA Y VUELTA: ‹ y › alternados sobre las mismas caras, que es lo que hace
     quien relee. Ahí la caché lo es todo.

   Y lo hace con el fork Y sin él: parchea el import del <Book> en la vista para
   apuntar al paquete original, construye, mide, y lo deja como estaba.

     node tests/perf/coste-rasterizado.mjs */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { RAIZ, abrirLibro, abrirNavegador, dormir, esperarQuietas, servir, tocar, tocarBoton } from './libro-harness.mjs';

const SALIDA = path.join(RAIZ, 'tests/perf/resultados');
const VISTA = path.join(RAIZ, 'src/views/libro/index.tsx');
const VOLTEOS = 8;

const original = await readFile(VISTA, 'utf8');
if (!original.includes("from '@/vendor/mantine-book'")) throw new Error('la vista no importa el fork');

/* La versión SIN fork: el <Book> del paquete y sin las invalidaciones, que solo
   existen en el fork. Es exactamente el código de antes de esta rama. */
const sinFork = original
  .replace("import { Book } from '@/vendor/mantine-book';", "import { Book } from '@gfazioli/mantine-book';")
  .replace("import { invalidarCaras } from '@/vendor/mantine-book/curl-cache';", 'const invalidarCaras = () => {};');

await mkdir(SALIDA, { recursive: true });
const filas = [];

async function medir(fuente, etiqueta) {
  process.stdout.write(`\n--- ${etiqueta} ---\n`);
  await writeFile(VISTA, fuente);
  const build = spawnSync('npx', ['vite', 'build', '--config', 'tests/perf/vite.perf.config.mjs'], {
    cwd: RAIZ,
    encoding: 'utf8',
  });
  if (build.status !== 0) throw new Error(`build falló (${etiqueta}): ${build.stderr?.slice(0, 400)}`);

  const servidor = await servir({ dist: 'dist-perf', puerto: 4179 });
  const browser = await abrirNavegador();
  try {
    const { page } = await abrirLibro(browser, servidor.url, { throttle: 1 });
    await tocar(page, 0.5, 0.4);
    await dormir(1500);
    await esperarQuietas(page);

    const tanda = async (nombre, siguiente) => {
      await page.evaluate(() => window.__reset());
      for (let i = 0; i < VOLTEOS; i++) {
        await tocarBoton(page, siguiente(i));
        await dormir(1500);
        await esperarQuietas(page);
      }
      const r = await page.evaluate(
        (n) => ({
          capturas: Math.round((window.__perf.caps.length / n) * 100) / 100,
          ms: Math.round(window.__perf.caps.reduce((s, c) => s + Math.max(0, c.ms), 0) / n),
        }),
        VOLTEOS,
      );
      filas.push({ version: etiqueta, ritmo: nombre, ...r });
      process.stdout.write(`${nombre.padEnd(14)} ${r.capturas} capturas/volteo · ${r.ms} ms/volteo\n`);
    };

    await tanda('lineal', () => 'siguiente');
    // Volver al principio antes del ida y vuelta, para no acabar en el cierre.
    for (let i = 0; i < VOLTEOS; i++) {
      await tocarBoton(page, 'anterior');
      await dormir(1200);
    }
    await esperarQuietas(page);
    await tanda('ida y vuelta', (i) => (i % 2 === 0 ? 'siguiente' : 'anterior'));
  } finally {
    await browser.close();
    servidor.cerrar();
  }
}

try {
  await medir(sinFork, 'sin fork (paquete 1.0.5)');
  await medir(original, 'con fork');
} finally {
  await writeFile(VISTA, original);
}
if ((await readFile(VISTA, 'utf8')) !== original) throw new Error('¡la vista NO volvió a su estado original!');

await writeFile(path.join(SALIDA, 'coste-rasterizado.json'), JSON.stringify(filas, null, 2));
process.stdout.write(`\n${JSON.stringify(filas, null, 2)}\n`);
