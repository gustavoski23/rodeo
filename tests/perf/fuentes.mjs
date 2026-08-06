/* ¿De verdad el snapshot pierde la tipografía del libro?

   La sospecha era doble: (a) Libre Baskerville todavía en vuelo al abrir Verne
   y (b) `embedFonts: false` en snapdom, que rasteriza dentro de un
   <foreignObject> aislado sin acceso a las @font-face del documento. Las dos se
   ven igual —la cara curvada en Georgia— y las dos se comprueban aquí, con
   números y con capturas, no razonando.

     node tests/perf/fuentes.mjs                # cara curvada vs cara plana
     node tests/perf/fuentes.mjs --lenta        # además, red Slow 3G y caché fría

   Las capturas quedan en tests/perf/resultados/. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { RAIZ, abrirLibro, abrirNavegador, deslizarYSostener, dormir, servir, tocar, tocarBoton } from './libro-harness.mjs';

const SALIDA = path.join(RAIZ, 'tests/perf/resultados');
const lenta = process.argv.includes('--lenta');
const etiqueta = process.argv.includes('--etiqueta')
  ? process.argv[process.argv.indexOf('--etiqueta') + 1]
  : 'base';

await mkdir(SALIDA, { recursive: true });
const servidor = await servir({ dist: 'dist-perf', puerto: 4174 });
const browser = await abrirNavegador();
const informe = { etiqueta, lenta };

try {
  const { page, cdp } = await abrirLibro(browser, servidor.url, { throttle: 1 });

  /* Hasta una cara de TEXTO: 0 portada, 1 lámina del cap. 1, 2 el abrebocas. */
  await tocar(page, 0.5, 0.4);
  await dormir(1400);
  await tocarBoton(page, 'siguiente');
  await dormir(1600);

  /* 1. ¿Están cargadas las tres caras de Libre Baskerville? */
  informe.fuentes = await page.evaluate(() => ({
    estado: document.fonts.status,
    regular: document.fonts.check('400 1em "Libre Baskerville"'),
    negrita: document.fonts.check('700 1em "Libre Baskerville"'),
    cursiva: document.fonts.check('italic 400 1em "Libre Baskerville"'),
    caras: [...document.fonts].map((f) => `${f.family} ${f.style} ${f.weight} ${f.status}`),
  }));

  /* 2. El experimento decisivo: la MISMA cara rasterizada con embedFonts en
        false (lo que hace la librería) y en true. Si los dos PNG difieren, el
        snapshot NO está usando la fuente del documento. */
  informe.embed = await page.evaluate(async () => {
    /* OJO con el selector: en el móvil cada hoja lleva un DORSO EN BLANCO que
       también es `.libro-pergamino`, y es el que sale primero en el DOM. La
       primera versión de esta prueba comparó dos páginas vacías y dio "0% de
       diferencia" — un falso positivo de manual. Hay que exigir texto. */
    const nodo = [...document.querySelectorAll('.libro-pergamino')].find(
      (n) => (n.querySelector('.libro-cuerpo')?.textContent?.length ?? 0) > 80,
    );
    if (!nodo || !window.__snapdom) return { error: 'sin cara de texto o sin snapdom' };
    const pintar = async (embedFonts) => {
      const img = await window.__snapdom.toPng(nodo, { dpr: 2, backgroundColor: '#f3e6c8', embedFonts });
      if (!img.complete) await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return { canvas: c, url: c.toDataURL('image/png') };
    };
    const sin = await pintar(false);
    const con = await pintar(true);
    if (sin.canvas.width !== con.canvas.width || sin.canvas.height !== con.canvas.height) {
      return { distintos: true, motivo: 'tamaños distintos', sin: sin.url, con: con.url };
    }
    const a = sin.canvas.getContext('2d').getImageData(0, 0, sin.canvas.width, sin.canvas.height).data;
    const b = con.canvas.getContext('2d').getImageData(0, 0, con.canvas.width, con.canvas.height).data;
    let dif = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) > 12 || Math.abs(a[i + 1] - b[i + 1]) > 12 || Math.abs(a[i + 2] - b[i + 2]) > 12) dif++;
    }
    /* Y la otra pregunta, la que la comparación de fuentes no responde: ¿el
       snapshot reproduce la CAPITULAR? Es un ::first-letter, y los
       pseudo-elementos de primera línea/letra no viven en el DOM, así que un
       clonador que copia nodos y estilos calculados no tiene de dónde sacarlos.
       Se mide contando píxeles de tinta sepia en el rincón donde va la letra
       capital: si el snapshot no la tiene, ese rincón está casi vacío. */
    const cuerpo = nodo.querySelector('.libro-cuerpo');
    const rc = cuerpo.getBoundingClientRect();
    const rn = nodo.getBoundingClientRect();
    const esq = {
      x: Math.round((rc.left - rn.left) * 2),
      y: Math.round((rc.top - rn.top) * 2),
      w: Math.round(Math.min(70, rc.width * 0.2) * 2),
      h: Math.round(Math.min(70, rc.height * 0.12) * 2),
    };
    const tintaEn = (canvas) => {
      const d = canvas.getContext('2d').getImageData(esq.x, esq.y, esq.w, esq.h).data;
      let n = 0;
      // Sepia de la capitular: oklch(45% 0.13 42) ≈ rgb(150, 72, 40). Se cuenta
      // píxel oscuro-rojizo, que el papel (claro y neutro) nunca produce.
      for (let i = 0; i < d.length; i += 4) if (d[i] < 190 && d[i] - d[i + 2] > 30) n++;
      return n;
    };
    return {
      px: a.length / 4,
      difPx: dif,
      difPct: Math.round((dif / (a.length / 4)) * 10000) / 100,
      capitular: { rincon: esq, tintaSnapshot: tintaEn(sin.canvas), tintaSnapshotEmbed: tintaEn(con.canvas) },
      sin: sin.url,
      con: con.url,
    };
  });
  for (const cual of ['sin', 'con']) {
    const url = informe.embed?.[cual];
    if (!url) continue;
    await writeFile(path.join(SALIDA, `${etiqueta}-snapshot-embedFonts-${cual}.png`), Buffer.from(url.split(',')[1], 'base64'));
    delete informe.embed[cual];
  }

  /* 3. La captura que manda (regla #1): la cara CURVADA, quieta, con el dedo
        todavía apoyado a mitad del recorrido. */
  const soltar = await deslizarYSostener(page, -1, { hasta: 0.5 });
  await dormir(500);
  await page.screenshot({ path: path.join(SALIDA, `${etiqueta}-curl-a-mitad.png`) });
  await soltar();
  await dormir(1600);
  await page.screenshot({ path: path.join(SALIDA, `${etiqueta}-cara-plana.png`) });

  /* 4. Red mala y caché fría: el otro camino por el que la letra puede cambiar
        sola — la fuente todavía bajando cuando el lector ya se ve. */
  if (lenta) {
    const p2 = await browser.newPage();
    await p2.close();
    const { page: pl, cdp: cl } = await abrirLibro(browser, servidor.url, { throttle: 1 });
    await cl.send('Network.clearBrowserCache');
    await cl.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });
    await pl.reload({ waitUntil: 'domcontentloaded' });
    await pl.waitForSelector('.libro-marco', { timeout: 180_000 });
    informe.lentaFuentes = await pl.evaluate(() => ({
      estado: document.fonts.status,
      regular: document.fonts.check('400 1em "Libre Baskerville"'),
    }));
    await tocar(pl, 0.5, 0.4);
    await dormir(700);
    await pl.screenshot({ path: path.join(SALIDA, `${etiqueta}-slow3g-al-abrir.png`) });
    await tocarBoton(pl, 'siguiente');
    await dormir(300);
    await pl.screenshot({ path: path.join(SALIDA, `${etiqueta}-slow3g-volteando.png`) });
    await pl.close();
  }

  await cdp.detach().catch(() => {});
  await page.close();
} finally {
  await browser.close();
  servidor.cerrar();
}

await writeFile(path.join(SALIDA, `${etiqueta}-fuentes.json`), JSON.stringify(informe, null, 2));
console.log(JSON.stringify(informe, null, 2));
