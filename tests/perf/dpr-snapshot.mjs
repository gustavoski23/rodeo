/* T3 — ¿se nota bajar el dpr del snapshot?

   La textura de la cara que gira se rasteriza al mismo dpr que el render
   (`min(devicePixelRatio, 2)`), y no tiene por qué: se ve ~400 ms, deformada
   sobre un cilindro, y nadie lee ahí. Bajarla a 1,5 quita el 44 % de los
   píxeles de cada captura.

   Lo que este script produce es lo que decide: la cara CURVADA quieta a 2 y a
   1,5, lado a lado, y de paso la cara PLANA de las dos (que tiene que verse
   idéntica — el render no cambia). Si la pérdida se nota en la plana, el cambio
   se revierte.

     node tests/perf/dpr-snapshot.mjs

   Parchea `TOPE_DPR_SNAPSHOT` del fork, construye, captura y DEJA EL ARCHIVO
   COMO ESTABA, también si revienta. */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  RAIZ,
  abrirLibro,
  abrirNavegador,
  deslizarYSostener,
  dormir,
  marco,
  servir,
  tocar,
  tocarBoton,
} from './libro-harness.mjs';

const SALIDA = path.join(RAIZ, 'tests/perf/resultados');
const CAPA = path.join(RAIZ, 'src/vendor/mantine-book/Curl/webgl/CurlWebglLayer.mjs');
const VALORES = [2, 1.5];

const original = await readFile(CAPA, 'utf8');
const RE = /const TOPE_DPR_SNAPSHOT = [\d.]+;/;
if (!RE.test(original)) throw new Error('no encontré TOPE_DPR_SNAPSHOT en el fork');

await mkdir(SALIDA, { recursive: true });
const tomas = [];

try {
  for (const dpr of VALORES) {
    process.stdout.write(`\n--- snapshot a dpr ${dpr} ---\n`);
    await writeFile(CAPA, original.replace(RE, `const TOPE_DPR_SNAPSHOT = ${dpr};`));
    const build = spawnSync('npx', ['vite', 'build', '--config', 'tests/perf/vite.perf.config.mjs'], {
      cwd: RAIZ,
      encoding: 'utf8',
    });
    if (build.status !== 0) throw new Error(`build falló para dpr ${dpr}: ${build.stderr?.slice(0, 400)}`);

    const servidor = await servir({ dist: 'dist-perf', puerto: 4177 });
    const browser = await abrirNavegador();
    try {
      const { page } = await abrirLibro(browser, servidor.url, { throttle: 1 });
      await tocar(page, 0.5, 0.4);
      await dormir(1400);
      await tocarBoton(page, 'siguiente'); // hasta una cara de TEXTO
      await dormir(2500);

      const caja = await marco(page);
      const recorte = {
        x: Math.round(caja.x),
        y: Math.round(caja.y),
        width: Math.round(caja.w),
        height: Math.round(caja.h),
      };

      // Cara PLANA: el render no cambia, así que tiene que salir igual.
      const plana = await page.screenshot({ clip: recorte, encoding: 'base64' });

      // Cara CURVADA, con el dedo apoyado a mitad de camino: es la textura.
      const soltar = await deslizarYSostener(page, -1, { hasta: 0.42 });
      await dormir(700);
      const curva = await page.screenshot({ clip: recorte, encoding: 'base64' });
      await soltar();
      await dormir(1500);

      await page.evaluate(() => window.__reset());
      // Coste: una tanda de volteos, contando toda la rasterización.
      const TANDA = 4;
      for (let i = 0; i < TANDA; i++) {
        await tocarBoton(page, i % 2 === 0 ? 'siguiente' : 'anterior');
        await dormir(2200);
      }
      const coste = await page.evaluate(
        (t) => ({
          capturas: window.__perf.caps.length,
          msPorVolteo: Math.round(window.__perf.caps.reduce((s, c) => s + Math.max(0, c.ms), 0) / t),
          png: window.__perf.png.filter((p) => p.w > 8).at(-1) ?? null,
        }),
        TANDA,
      );
      tomas.push({ dpr, plana, curva, coste });
      process.stdout.write(
        `${coste.capturas} capturas · ${coste.msPorVolteo} ms de rasterización por volteo · ` +
          `PNG ${coste.png ? `${coste.png.w}×${coste.png.h} ${Math.round(coste.png.bytes / 1024)} kB` : '—'}\n`,
      );
    } finally {
      await browser.close();
      servidor.cerrar();
    }
  }
} finally {
  await writeFile(CAPA, original);
}

if ((await readFile(CAPA, 'utf8')) !== original) throw new Error('¡el fork NO volvió a su estado original!');

const fila = (titulo, cual) => `
  <h2>${titulo}</h2>
  <div class="par">${tomas
    .map(
      (t) =>
        `<figure><figcaption>dpr ${t.dpr} — ${t.coste.msPorVolteo} ms/volteo · ${
          t.coste.png ? `${t.coste.png.w}×${t.coste.png.h}` : '—'
        }</figcaption><img src="data:image/png;base64,${t[cual]}"></figure>`,
    )
    .join('')}</div>`;

const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#14161a;color:#e8e2d6;font:13px/1.5 ui-monospace,monospace;padding:18px}
  h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin:18px 0 8px}
  .par{display:flex;gap:14px}figure{margin:0}figcaption{opacity:.7;padding:0 0 5px}
  img{display:block;width:380px;border:1px solid #3a3630}
</style>${fila('Cara curvada (es la textura: aquí se vería la pérdida)', 'curva')}
${fila('Cara plana (el render no cambia: tiene que ser idéntica)', 'plana')}`;

const hoja = path.join(SALIDA, 'dpr-snapshot.html');
await writeFile(hoja, html);
const browser = await abrirNavegador();
const page = await browser.newPage();
await page.setViewport({ width: 830, height: 1400 });
await page.goto(`file://${hoja}`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: path.join(SALIDA, 'dpr-snapshot.png'), fullPage: true });
await browser.close();
process.stdout.write(`\nComparación en ${path.join(SALIDA, 'dpr-snapshot.png')}\n`);
