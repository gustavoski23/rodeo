/* T4 — ¿cuánto tiene que durar el volteo?

   `flippingTime` está en 900 ms para ESCONDER un tirón: el curl tardaba en
   arrancar y estirar la animación repartía el relevo pliegue-plano → curl sobre
   más recorrido. Quitado el tirón (ver PERF-libro.md), 900 ms sobran.

   Cuánto exactamente NO es una medición: es una decisión de tacto. Así que esto
   no elige — genera la evidencia para que la elija Gus: una tira de fotogramas
   por cada valor, del mismo volteo, con el instante real de cada uno.

     node tests/perf/flipping-time.mjs                 # 900, 500, 450, 400
     node tests/perf/flipping-time.mjs --valores 900,600

   Sale en tests/perf/resultados/flippingTime.png.

   LOS FOTOGRAMAS VAN POR `Page.startScreencast` DE CDP, no por
   `page.screenshot`. La primera versión usaba screenshot y no servía: en este
   banco cada captura cuesta 8-9 s (SwiftShader rasterizando 1170×2532), así que
   siete fotos ocupaban 48 s y la animación de 900 ms se acababa antes de la
   segunda. El screencast entrega los frames que el compositor YA pintó, con su
   marca de tiempo — que es justo lo que hay que mirar.

   OJO: para cambiar el valor hay que reconstruir, así que el script PARCHEA
   src/views/libro/index.tsx, construye, mide y lo DEJA COMO ESTABA — también si
   revienta a mitad. Al terminar comprueba que el archivo volvió a su sitio. */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { RAIZ, abrirLibro, abrirNavegador, dormir, marco, servir, tocar, tocarBoton } from './libro-harness.mjs';

const SALIDA = path.join(RAIZ, 'tests/perf/resultados');
const VISTA = path.join(RAIZ, 'src/views/libro/index.tsx');
const arg = (n) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : null);
const VALORES = (arg('valores') ?? '900,500,450,400').split(',').map(Number);
const FOTOS = 6;

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
      const { page, cdp } = await abrirLibro(browser, servidor.url, { throttle: 1 });
      // Hasta una cara de TEXTO, que es donde se aprecia el tacto de la hoja.
      await tocar(page, 0.5, 0.4);
      await dormir(1500);
      await tocarBoton(page, 'siguiente');
      await dormir(2500);

      const caja = await marco(page);
      const crudos = [];
      cdp.on('Page.screencastFrame', ({ data, sessionId, metadata }) => {
        crudos.push({ t: metadata.timestamp * 1000, data });
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      });
      // maxWidth en px CSS del viewport: así el frame mapea 1:1 con el rect del
      // marco y se puede recortar con las mismas coordenadas.
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 390, maxHeight: 844 });
      await dormir(300);
      const marca = await page.evaluate(() => performance.timeOrigin + performance.now());
      const desdeCrudo = crudos.length;
      await tocarBoton(page, 'siguiente');
      await dormir(ms + 900);
      await cdp.send('Page.stopScreencast');

      const delVolteo = crudos.slice(desdeCrudo).map((f) => ({ ...f, off: Math.round(f.t - marca) }));
      // Se reparten FOTOS instantes por la ventana del volteo y se toma el
      // fotograma real más cercano a cada uno.
      const fotos = [];
      for (let i = 0; i < FOTOS; i++) {
        const objetivo = (ms * i) / (FOTOS - 1);
        const mejor = delVolteo.reduce(
          (a, f) => (a === null || Math.abs(f.off - objetivo) < Math.abs(a.off - objetivo) ? f : a),
          null,
        );
        if (mejor && !fotos.some((f) => f.off === mejor.off)) fotos.push(mejor);
      }
      tiras.push({ ms, caja, fotos: fotos.map((f) => ({ off: f.off, data: f.data })) });
      process.stdout.write(
        `${delVolteo.length} fotogramas del compositor · elegidos en ms: ${fotos.map((f) => f.off).join(', ')}\n`,
      );
      await dormir(800);
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

/* La hoja de contactos: una fila por valor, recortada al marco del libro. Se
   compone en el navegador porque no hay herramienta de imagen en el repo (y no
   se va a instalar una para esto). */
const ANCHO = 150;
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#14161a;color:#e8e2d6;font:12px/1.4 ui-monospace,monospace;padding:16px}
  .fila{display:flex;gap:6px;align-items:flex-start;margin-bottom:16px}
  .et{width:96px;flex:none;padding-top:26px;font-weight:700;letter-spacing:.06em}
  figure{margin:0;flex:none}figcaption{opacity:.65;padding:3px 0}
  .ventana{width:${ANCHO}px;overflow:hidden;border:1px solid #3a3630;position:relative}
  .ventana img{position:absolute;image-rendering:auto}
</style>
${tiras
  .map((t) => {
    const escala = ANCHO / t.caja.w;
    const alto = Math.round(t.caja.h * escala);
    return `<div class="fila"><div class="et">${t.ms} ms</div>${t.fotos
      .map(
        (f) =>
          `<figure><figcaption>+${f.off} ms</figcaption><div class="ventana" style="height:${alto}px">` +
          `<img src="data:image/jpeg;base64,${f.data}" style="width:${390 * escala}px;left:${-t.caja.x * escala}px;top:${-t.caja.y * escala}px"></div></figure>`,
      )
      .join('')}</div>`;
  })
  .join('')}`;

const hoja = path.join(SALIDA, 'flippingTime.html');
await writeFile(hoja, html);
const browser = await abrirNavegador();
const page = await browser.newPage();
await page.setViewport({ width: (ANCHO + 6) * FOTOS + 130, height: 320 * VALORES.length + 60 });
await page.goto(`file://${hoja}`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: path.join(SALIDA, 'flippingTime.png'), fullPage: true });
await browser.close();
process.stdout.write(`\nHoja de contactos en ${path.join(SALIDA, 'flippingTime.png')}\n`);
