/* ¿La caché de texturas gasta más memoria o menos?

   Esta pregunta ya se contestó mal una vez. Se leía `performance.memory` tal
   cual después de recorrer el libro, y ese número dice cuánta basura queda sin
   recoger —o sea CUÁNDO pasó el recolector—, no cuánto hay retenido. En once
   corridas dio entre 17 y 54 MB para configuraciones que deberían ordenarse al
   revés (el baseline con la CPU más frenada marcó la lectura MÁS BAJA de
   todas). Con esos rangos solapados no se podía afirmar nada, y se afirmó.

   Aquí se hace bien: se recorren los 10 capítulos ida y vuelta, se fuerza la
   recolección con `HeapProfiler.collectGarbage` de CDP y solo entonces se lee.
   Y se repite varias veces, con fork y sin él, porque una sola pasada de un
   número ruidoso no es una medición.

     node tests/perf/memoria.mjs                # 3 pasadas de cada
     node tests/perf/memoria.mjs --pasadas 5

   Parchea la vista para construir la variante sin fork y la deja como estaba. */
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { RAIZ, abrirLibro, abrirNavegador, dormir, memoriaMb, servir, tocar, tocarBoton } from './libro-harness.mjs';

const SALIDA = path.join(RAIZ, 'tests/perf/resultados');
const VISTA = path.join(RAIZ, 'src/views/libro/index.tsx');
const arg = (n) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : null);
const PASADAS = Number(arg('pasadas') ?? 3);
const CAPITULOS = 20;

await mkdir(SALIDA, { recursive: true });
const original = await readFile(VISTA, 'utf8');
const sinFork = original
  .replace("import { Book } from '@/vendor/mantine-book';", "import { Book } from '@gfazioli/mantine-book';")
  .replace("import { invalidarCaras } from '@/vendor/mantine-book/curl-cache';", 'const invalidarCaras = () => {};');

const filas = [];

async function medir(fuente, etiqueta) {
  await writeFile(VISTA, fuente);
  const build = spawnSync('npx', ['vite', 'build', '--config', 'tests/perf/vite.perf.config.mjs'], {
    cwd: RAIZ,
    encoding: 'utf8',
  });
  await writeFile(VISTA, original);
  if (build.status !== 0) throw new Error(`build falló (${etiqueta}): ${build.stderr?.slice(0, 400)}`);

  const servidor = await servir({ dist: 'dist-perf', puerto: 4182 });
  const browser = await abrirNavegador();
  try {
    for (let p = 0; p < PASADAS; p++) {
      const { page, cdp } = await abrirLibro(browser, servidor.url, { throttle: 1 });
      const inicio = await memoriaMb(page, cdp);
      await tocar(page, 0.5, 0.4);
      await dormir(900);
      for (let i = 0; i < CAPITULOS; i++) {
        await tocarBoton(page, 'siguiente');
        await dormir(700);
      }
      for (let i = 0; i < CAPITULOS; i++) {
        await tocarBoton(page, 'anterior');
        await dormir(700);
      }
      await dormir(1500);
      const fin = await memoriaMb(page, cdp);
      const caras = await page.evaluate(() => window.__curlCache?.carasGuardadas() ?? null);
      filas.push({ version: etiqueta, pasada: p + 1, inicio, fin, caras });
      process.stdout.write(`${etiqueta.padEnd(22)} pasada ${p + 1}: ${inicio} → ${fin} MB · caché ${caras ?? '—'}\n`);
      await page.close();
    }
  } finally {
    await browser.close();
    servidor.cerrar();
  }
}

try {
  await medir(sinFork, 'sin fork (1.0.5)');
  await medir(original, 'con fork');
} finally {
  await writeFile(VISTA, original);
}
if ((await readFile(VISTA, 'utf8')) !== original) throw new Error('¡la vista NO volvió a su estado original!');

const resumen = {};
for (const f of filas) (resumen[f.version] ??= []).push(f.fin);
process.stdout.write('\n=== heap tras los 10 capítulos ida y vuelta, con GC forzado ===\n');
for (const [v, xs] of Object.entries(resumen)) {
  const ord = [...xs].sort((a, b) => a - b);
  process.stdout.write(
    `${v.padEnd(22)} ${xs.join(', ')} MB · mediana ${ord[Math.floor(ord.length / 2)]} MB\n`,
  );
}
await writeFile(path.join(SALIDA, 'memoria.json'), JSON.stringify(filas, null, 2));
