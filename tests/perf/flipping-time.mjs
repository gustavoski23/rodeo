/* T4 — ¿cuánto tiene que durar el volteo?

   `flippingTime` está en 900 ms para ESCONDER un tirón: el curl tardaba en
   arrancar y estirar la animación repartía el relevo pliegue-plano → curl sobre
   más recorrido. Quitado el tirón (ver PERF-libro.md), 900 ms sobran.

   Cuánto exactamente NO es una medición: es una decisión de tacto. Así que esto
   no elige — genera la evidencia para que la elija Gus: una tira de fotogramas
   por cada valor, todas del mismo volteo y con el instante real de cada foto.

     node tests/perf/flipping-time.mjs                 # 900, 500, 450, 400
     node tests/perf/flipping-time.mjs --valores 900,600

   Sale en tests/perf/resultados/flippingTime.png.

   OJO: para cambiar el valor hay que reconstruir, así que el script PARCHEA
   src/views/libro/index.tsx, construye, mide y lo DEJA COMO ESTABA — también si
   revienta a mitad. Al terminar comprueba que el archivo volvió a su sitio; si
   no, lo dice a gritos. */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { RAIZ, abrirLibro, abrirNavegador, dormir, marco, servir, tocar, tocarBoton } from './libro-harness.mjs';

const SALIDA = path.join(RAIZ, 'tests/perf/resultados');
const VISTA = path.join(RAIZ, 'src/views/libro/index.tsx');
const arg = (n) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : null);
const VALORES = (arg('valores') ?? '900,500,450,400').split(',').map(Number);
const FOTOS = 7;

const original = await readFile(VISTA, 'utf8');
const RE = /flippingTime=\{(\d+)\}/;
if (!RE.test(original)) throw new Error('no encontré flippingTime={...} en la vista');

await mkdir(SALIDA, { recursive: true });
const tiras = [];

try {
  for (const ms of VALORES) {
    process.stdout.write(`\n--- flippingTime ${ms} ms ---\n`);
    await writeFile(VISTA, original.replace(RE, `flippingTime={${ms}}`));
    const build = spawnSync('npx', ['vite', 'build', '--config', 'tests/perf/vite.perf.config.mjs'], {
      cwd: RAIZ,
      encoding: 'utf8',
    });
    if (build.status !== 0) throw new Error(`build falló para ${ms}: ${build.stderr?.slice(0, 400)}`);

    const servidor = await servir({ dist: 'dist-perf', puerto: 4176 });
    const browser = await abrirNavegador();
    try {
      const { page } = await abrirLibro(browser, servidor.url, { throttle: 1 });
      // Hasta una cara de TEXTO, que es donde se aprecia el tacto de la hoja.
      await tocar(page, 0.5, 0.4);
      await dormir(1400);
      await tocarBoton(page, 'siguiente');
      await dormir(2500);

      const caja = await marco(page);
      const recorte = {
        x: Math.round(caja.x),
        y: Math.round(caja.y),
        width: Math.round(caja.w),
        height: Math.round(caja.h),
      };

      const fotos = [];
      const t0 = Date.now();
      await tocarBoton(page, 'siguiente');
      for (let i = 0; i < FOTOS; i++) {
        const b64 = await page.screenshot({ clip: recorte, encoding: 'base64', optimizeForSpeed: true });
        fotos.push({ t: Date.now() - t0, b64 });
        // Sin espera: cada captura ya cuesta ~80 ms en este banco, así que el
        // muestreo lo marca el propio screenshot. Por eso cada foto lleva su
        // instante REAL medido y no el que "tocaría".
      }
      tiras.push({ ms, fotos });
      process.stdout.write(`fotos en ms: ${fotos.map((f) => f.t).join(', ')}\n`);
      await dormir(1200);
    } finally {
      await browser.close();
      servidor.cerrar();
    }
  }
} finally {
  await writeFile(VISTA, original);
}

const vuelta = await readFile(VISTA, 'utf8');
if (vuelta !== original) throw new Error('¡la vista NO volvió a su estado original! Revisá git diff.');

/* La hoja de contactos: una fila por valor, las fotos en orden, cada una con el
   milisegundo en que se tomó. Se compone en el navegador porque no hay ninguna
   herramienta de imagen instalada en el repo (y no se va a instalar una para
   esto). */
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#14161a;color:#e8e2d6;font:12px/1.4 ui-monospace,monospace;padding:16px}
  .fila{display:flex;gap:6px;align-items:flex-start;margin-bottom:14px}
  .et{width:110px;flex:none;padding-top:28px;font-weight:700;letter-spacing:.08em}
  figure{margin:0;flex:none}figcaption{opacity:.65;padding:3px 0}
  img{display:block;width:130px;border:1px solid #3a3630}
</style>
${tiras
  .map(
    (t) => `<div class="fila"><div class="et">${t.ms} ms</div>${t.fotos
      .map((f) => `<figure><figcaption>+${f.t} ms</figcaption><img src="data:image/png;base64,${f.b64}"></figure>`)
      .join('')}</div>`,
  )
  .join('')}`;

const hoja = path.join(SALIDA, 'flippingTime.html');
await writeFile(hoja, html);
const browser = await abrirNavegador();
const page = await browser.newPage();
await page.setViewport({ width: 130 * FOTOS + 160, height: 200 * VALORES.length + 60 });
await page.goto(`file://${hoja}`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: path.join(SALIDA, 'flippingTime.png'), fullPage: true });
await browser.close();
process.stdout.write(`\nHoja de contactos en ${path.join(SALIDA, 'flippingTime.png')}\n`);
