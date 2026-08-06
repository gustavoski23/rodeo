/* El libro en ESCRITORIO — que el fork no lo haya roto.

   El móvil es el caso principal del repo, pero escritorio es otro libro: plana
   de dos páginas, 62 caras en 31 hojas, dos caras de CONTENIDO por hoja (en el
   móvil el dorso va en blanco) y `withCover`, que centra la tapa. Todo eso pasa
   por los mismos caminos del fork —el intercambio de caras al voltear, la
   caché, el dpr del snapshot— así que merece su propia comprobación.

     node tests/perf/escritorio.mjs

   Deja capturas en tests/perf/resultados/escritorio-*.png. */
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { RAIZ, abrirNavegador, dormir, esperarCache, servir } from './libro-harness.mjs';
import { sonda } from './instrumentacion.mjs';

const SALIDA = path.join(RAIZ, 'tests/perf/resultados');
await mkdir(SALIDA, { recursive: true });

/* `--sin-fork` construye la vista apuntando al <Book> del paquete original y
   corre exactamente la misma comprobación. Es la única forma honesta de decir
   si un fallo de escritorio lo trajo el fork o ya estaba: sin la comparación,
   «no dibujó curl» es una acusación sin pruebas. Deja el archivo como estaba. */
const VISTA = path.join(RAIZ, 'src/views/libro/index.tsx');
const SIN_FORK = process.argv.includes('--sin-fork');
const fuenteOriginal = await readFile(VISTA, 'utf8');
if (SIN_FORK) {
  await writeFile(
    VISTA,
    fuenteOriginal
      .replace("import { Book } from '@/vendor/mantine-book';", "import { Book } from '@gfazioli/mantine-book';")
      .replace("import { invalidarCaras } from '@/vendor/mantine-book/curl-cache';", 'const invalidarCaras = () => {};'),
  );
  const build = spawnSync('npx', ['vite', 'build', '--config', 'tests/perf/vite.perf.config.mjs'], {
    cwd: RAIZ,
    encoding: 'utf8',
  });
  await writeFile(VISTA, fuenteOriginal);
  if (build.status !== 0) throw new Error(`build sin fork falló: ${build.stderr?.slice(0, 400)}`);
}

const servidor = await servir({ dist: 'dist-perf', puerto: 4181 });
const browser = await abrirNavegador();
const informe = {};

try {
  const page = await browser.newPage();
  // Portátil, sin táctil: aquí NO va `emulate` con isMobile.
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(sonda);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('rodeo_onboarding', '"1"');
    localStorage.setItem('rodeo_nombre', '"Gus"');
    localStorage.setItem('rodeo_nivel', '"B2-C1"');
    localStorage.setItem('rodeo_idioma', '"es"');
  });
  await page.goto(`${servidor.url}/#/libro`, { waitUntil: 'domcontentloaded' });
  await page
    .waitForFunction(
      () =>
        document.querySelector('.libro-marco') ||
        [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Skip'),
      { timeout: 20_000 },
    )
    .catch(() => {});
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'Skip')?.click();
  });
  await page.waitForSelector('.libro-marco', { timeout: 120_000 });
  await dormir(2500);

  const estado = () =>
    page.evaluate(() => ({
      cara: document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent?.trim() ?? '',
      // En escritorio el marco NO recorta: se ve la plana entera.
      marcoRecorta: !!document.querySelector('.libro-marco')?.getAttribute('style'),
      // Y las dos caras de la hoja llevan contenido, no papel en blanco.
      carasConTexto: document.querySelectorAll('.libro-pergamino .libro-cuerpo').length,
      folios: [...document.querySelectorAll('.libro-es b')].map((b) => b.textContent),
    }));

  informe.alAbrir = await estado();
  await page.screenshot({ path: path.join(SALIDA, 'escritorio-portada.png') });

  /* UNA HOJA SON DOS CARAS, y en la plana las dos se ven a la vez. Así que ›
     una sola vez NO voltea nada: cambia la cara "actual" a la otra mitad de la
     misma plana, que ya estaba delante. Para voltear hoja hay que avanzar DOS.
     (La primera versión de esta comprobación pulsaba una vez y concluía que el
     libro no se movía y que el curl no dibujaba. Ni una cosa ni la otra: el
     libro estaba bien y la prueba estaba mal.) */
  const voltearHoja = async (etiqueta) => {
    /* Esperar a la caché ANTES de pulsar, no un tiempo fijo. En escritorio cada
       hoja lleva DOS caras de contenido (en el móvil el dorso va en blanco), o
       sea el doble de rasterización, y con un `sleep` de 2,4 s la prueba pasaba
       página antes de que la textura estuviera: daba «no dibujó curl» sobre un
       libro que estaba bien. Se vio porque el volteo hacia ATRÁS —cuya textura
       ya estaba en caché— sí dibujaba. */
    // Sin fork no hay caché que mirar: allí se espera por el cronómetro.
    if (!SIN_FORK) await esperarCache(page);
    else await dormir(6000);
    await page.evaluate(() => window.__reset());
    await page.click(`button[aria-label="${etiqueta}"]`);
    await dormir(120);
    await page.click(`button[aria-label="${etiqueta}"]`);
    await dormir(2400);
    return page.evaluate(() => ({ draws: window.__perf.draws.length, capturas: window.__perf.caps.length }));
  };

  /* La TAPA es aparte: con `withCover` la primera y la última hoja son `hard`
     —cartón rígido con rotateY— y ahí la librería NO usa el curl WebGL a
     propósito (`webglActive = rounded && folding && hard !== true`). Que no
     dibuje curl al abrir es lo correcto, no un fallo. */
  informe.abrirTapa = await voltearHoja('Página siguiente');
  informe.trasAbrir = await estado();
  informe.adelante1 = await voltearHoja('Página siguiente');
  informe.trasAdelante1 = await estado();
  informe.adelante2 = await voltearHoja('Página siguiente');
  informe.trasAdelante2 = await estado();
  await page.screenshot({ path: path.join(SALIDA, 'escritorio-plana.png') });
  informe.atras = await voltearHoja('Página anterior');
  informe.trasAtras = await estado();

  // Y el A−/A+, que tira la caché de texturas.
  informe.generacionAntes = await page.evaluate(() => window.__curlCache?.generacionActual() ?? -1);
  await page.click('button[aria-label="Letra más grande"]');
  await dormir(600);
  informe.generacionDespues = await page.evaluate(() => window.__curlCache?.generacionActual() ?? -1);
  informe.escala = await page.evaluate(
    () => document.querySelector('[aria-live="polite"]:not([aria-atomic])')?.textContent ?? '',
  );
  await dormir(2500);
  await page.screenshot({ path: path.join(SALIDA, 'escritorio-escala.png') });
  informe.carasTrasEscala = await page.evaluate(() => window.__curlCache?.carasGuardadas() ?? -1);

  await page.close();
} finally {
  await browser.close();
  servidor.cerrar();
}

await writeFile(
  path.join(SALIDA, SIN_FORK ? 'escritorio-sin-fork.json' : 'escritorio.json'),
  JSON.stringify(informe, null, 2),
);
console.log(JSON.stringify(informe, null, 2));

const fallos = [];
const cara = (a, b) => a.cara !== b.cara;
if (!/Portada/.test(informe.alAbrir.cara)) fallos.push('no arrancó en la portada');
if (!cara(informe.trasAbrir, informe.alAbrir)) fallos.push('la tapa no abrió');
// La tapa es `hard` a propósito: ahí NO se le pide curl.
if (informe.adelante1.draws === 0) fallos.push('el volteo de hoja hacia adelante no dibujó curl');
if (informe.adelante2.draws === 0) fallos.push('el segundo volteo de hoja no dibujó curl');
if (informe.atras.draws === 0) fallos.push('el volteo hacia atrás no dibujó curl');
if (!cara(informe.trasAdelante1, informe.trasAbrir)) fallos.push('adelante no movió el libro');
if (!cara(informe.trasAdelante2, informe.trasAdelante1)) fallos.push('el segundo adelante no movió el libro');
if (informe.trasAtras.cara !== informe.trasAdelante1.cara) fallos.push('atrás no volvió a la plana anterior');
if (!SIN_FORK && informe.generacionDespues <= informe.generacionAntes) fallos.push('A+ no invalidó las texturas');
if (informe.trasAdelante2.carasConTexto < 2) fallos.push('la plana no muestra dos caras de texto');
console.log(`\n${SIN_FORK ? '[SIN FORK] ' : ''}${fallos.length ? `FALLOS: ${fallos.join(' · ')}` : 'Escritorio OK'}`);
process.exitCode = fallos.length ? 1 : 0;
