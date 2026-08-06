/* Arnés de medición del libro interactivo en TELÉFONO.

   Regla #2 del repo: nada táctil se prueba con eventos sintéticos de JS. Todo
   lo de aquí va por `page.touchscreen` de puppeteer-core, que por dentro es
   `Input.dispatchTouchEvent` de CDP — eventos confiables que sí pasan por el
   pipeline de entrada del navegador, con `isMobile` y `hasTouch` puestos.

   Se usa desde dos sitios:
   - `tests/perf/medir.mjs`, el runner que saca la tabla de PERF-libro.md.
   - `tests/mobile-performance.test.mjs`, la regresión que vigila el umbral.

   puppeteer-core NO se instala en el repo (LIBRO-runbook §5.1): se resuelve
   desde donde esté, y si no está, quien nos llama decide si salta la prueba. */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sonda } from './instrumentacion.mjs';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* El Chromium del entorno. PUPPETEER_EXECUTABLE_PATH manda si está puesto. */
export function buscarChromium() {
  const candidatos = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/opt/pw-browsers/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  return candidatos.find((p) => existsSync(p)) ?? null;
}

/* puppeteer-core puede estar en el repo, en un node_modules del scratchpad
   (que es donde lo pide el runbook) o donde diga RODEO_PUPPETEER. */
export async function cargarPuppeteer() {
  const bases = [process.env.RODEO_PUPPETEER, path.join(RAIZ, 'node_modules')].filter(Boolean);
  for (const base of bases) {
    const pkg = path.join(base, 'puppeteer-core/package.json');
    if (!existsSync(pkg)) continue;
    // La entrada ESM sale del `exports` del propio paquete: la ruta interna
    // cambió entre versiones (lib/esm/… → lib/…) y adivinarla ya falló una vez.
    const manifiesto = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(pkg, 'utf8')));
    const rel = manifiesto.exports?.['.']?.import ?? manifiesto.module ?? manifiesto.main;
    const entrada = path.join(base, 'puppeteer-core', rel);
    if (!existsSync(entrada)) continue;
    const mod = await import(`file://${entrada}`);
    return mod.default ?? mod;
  }
  try {
    return createRequire(import.meta.url)('puppeteer-core');
  } catch {
    return null;
  }
}

/** ¿Se puede correr el arnés en esta máquina? Para saltar la prueba sin ruido. */
export async function disponible() {
  return Boolean(buscarChromium()) && Boolean(await cargarPuppeteer());
}

/* ── El servidor de estáticos ────────────────────────────────────────────── */

/** Levanta `vite preview` sobre un dist ya construido y espera a que responda. */
export async function servir({ dist = 'dist-perf', puerto = 4173 } = {}) {
  /* `detached` + `unref` + stdio cerrado, las tres cosas a propósito: sin ellas
     el proceso de medición NO TERMINA aunque ya haya escrito sus resultados —las
     tuberías de stdio del hijo mantienen vivo el bucle de eventos de Node— y una
     cadena `medir 1x && medir 4x` se queda colgada para siempre después de la
     primera. `detached` además le da grupo propio al hijo, que es lo que permite
     matar al `npx` Y al `vite` que cuelga de él. */
  const proc = spawn(
    'npx',
    ['vite', 'preview', '--outDir', dist, '--port', String(puerto), '--strictPort', '--host', '127.0.0.1'],
    { cwd: RAIZ, stdio: 'ignore', detached: true },
  );
  proc.unref();
  const matar = () => {
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      /* ya se fue */
    }
  };
  const url = `http://127.0.0.1:${puerto}`;
  const hasta = Date.now() + 30_000;
  while (Date.now() < hasta) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return { url, cerrar: matar };
    } catch {
      /* todavía no levanta */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  matar();
  throw new Error('vite preview no respondió en 30 s');
}

/* ── El navegador ────────────────────────────────────────────────────────── */

/** Teléfono de referencia: 390×844 @3, el iPhone que usa Gus. */
export const TELEFONO = {
  viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};

export async function abrirNavegador() {
  const puppeteer = await cargarPuppeteer();
  const executablePath = buscarChromium();
  if (!puppeteer || !executablePath) throw new Error('sin puppeteer-core o sin Chromium');
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      // SwiftShader: sin GPU en el contenedor, el curl WebGL se rasteriza por
      // CPU. Los tiempos de GPU pura no son comparables con un teléfono, pero
      // lo que aquí se mide (la rasterización de snapdom y el hueco hasta el
      // primer draw) es trabajo de CPU y del hilo principal igual.
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-features=IsolateOrigins,site-per-process',
      '--font-render-hinting=none',
    ],
  });
}

/** Abre la vista del libro con el onboarding y el gate ya resueltos. */
export async function abrirLibro(browser, url, { throttle = 1, libro = 'vuelta', dpr } = {}) {
  const page = await browser.newPage();
  /* `dpr` solo lo baja quien va a GRABAR la pantalla. Componer 1170×2532 por
     software cuesta tanto que el screencast entrega ~15 fotogramas por segundo,
     y con eso una animación de 400 ms sale en seis fotos casi iguales. A dpr 1
     el compositor va sobrado y la tira se puede mirar. Para MEDIR tiempos no se
     toca: ahí el teléfono de referencia es 390×844 @3 y punto. */
  await page.emulate(dpr ? { ...TELEFONO, viewport: { ...TELEFONO.viewport, deviceScaleFactor: dpr } } : TELEFONO);
  await page.evaluateOnNewDocument(sonda);
  // El onboarding y el nivel se siembran antes del primer script de la app:
  // `store` es localStorage con JSON, mismas claves de siempre.
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('rodeo_onboarding', '"1"');
    localStorage.setItem('rodeo_nombre', '"Gus"');
    localStorage.setItem('rodeo_nivel', '"B2-C1"');
    localStorage.setItem('rodeo_idioma', '"es"');
  });
  // `libroActivo` vive solo en memoria del store (default 'vuelta'), que es el
  // que se abre primero y el único donde se veía el cambio de tipografía.
  if (libro !== 'vuelta') throw new Error('el arnés solo abre el libro por defecto (vuelta)');

  const cdp = await page.createCDPSession();
  await page.goto(`${url}/#/libro`, { waitUntil: 'domcontentloaded' });

  // El gate de login es lo primero: "Skip" entra como invitado.
  await page
    .waitForFunction(
      () =>
        document.querySelector('.libro-marco') ||
        [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Skip'),
      { timeout: 20_000 },
    )
    .catch(() => {});
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'Skip');
    b?.click();
  });

  // La precarga de las 42 láminas bloquea con el PencilLoader: se deja correr
  // de verdad, porque sembrar su flag dejaría las imágenes sin decodificar y el
  // primer volteo pagaría ese trabajo dentro de la medición.
  await page.waitForSelector('.libro-marco', { timeout: 90_000 });
  await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 20_000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));

  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  return { page, cdp };
}

/* ── Los gestos, con toque real ──────────────────────────────────────────── */

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export async function marco(page) {
  return page.$eval('.libro-marco', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

/** Deslizar con el dedo. `dir` -1 avanza (hacia la izquierda), +1 retrocede. */
export async function deslizar(page, dir, { pasos = 8, ms = 26 } = {}) {
  const m = await marco(page);
  const y = m.y + m.h * 0.5;
  const desde = dir < 0 ? m.x + m.w * 0.88 : m.x + m.w * 0.14;
  const recorrido = dir * m.w * 0.7;
  await page.touchscreen.touchStart(desde, y);
  for (let i = 1; i <= pasos; i++) {
    await page.touchscreen.touchMove(desde + (recorrido * i) / pasos, y);
    await dormir(ms);
  }
  await page.touchscreen.touchEnd();
}

/* Deslizar y PARAR a mitad de camino, con el dedo todavía apoyado. Es la única
   forma de mirar la cara curvada quieta: durante el volteo el curl WebGL pinta
   la cara como TEXTURA (un screenshot del DOM hecho por snapdom), no como DOM
   vivo, y ahí es donde se ve —o no— el cambio de tipografía. Devuelve `soltar`
   para terminar el gesto cuando ya se capturó la pantalla. */
export async function deslizarYSostener(page, dir = -1, { hasta = 0.55, pasos = 10, ms = 30 } = {}) {
  const m = await marco(page);
  const y = m.y + m.h * 0.5;
  const desde = dir < 0 ? m.x + m.w * 0.88 : m.x + m.w * 0.14;
  const recorrido = dir * m.w * hasta;
  await page.touchscreen.touchStart(desde, y);
  for (let i = 1; i <= pasos; i++) {
    await page.touchscreen.touchMove(desde + (recorrido * i) / pasos, y);
    await dormir(ms);
  }
  return async () => {
    // Se suelta VOLVIENDO al punto de partida para que el gesto no complete el
    // volteo: así la misma cara sirve para varias capturas seguidas.
    await page.touchscreen.touchMove(desde, y);
    await dormir(60);
    await page.touchscreen.touchEnd();
  };
}

/** Tap con el dedo en un punto relativo del marco (0-1 en cada eje). */
export async function tocar(page, fx = 0.5, fy = 0.5) {
  const m = await marco(page);
  await page.touchscreen.tap(m.x + m.w * fx, m.y + m.h * fy);
}

/** Tap en una de las flechas del pie. */
export async function tocarBoton(page, cual) {
  const etiqueta = cual === 'siguiente' ? 'Página siguiente' : 'Página anterior';
  const caja = await page.evaluate((et) => {
    const b = document.querySelector(`button[aria-label="${et}"]`);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, etiqueta);
  if (!caja) throw new Error(`no encontré el botón «${etiqueta}»`);
  await page.touchscreen.tap(caja.x, caja.y);
}

/* ── La medición ─────────────────────────────────────────────────────────── */

/* La CARA exacta en la que está el libro. Sale del anuncio accesible que pinta
   el propio <Book> ("Página N de 22" / "Portada" / "Fin del libro"), que es la
   única señal que distingue dos caras del mismo capítulo — el pie dice "Cap. 1
   de 10" tanto en la lámina de apertura como en el abrebocas. */
export const anuncio = (page) =>
  page.evaluate(() => document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent?.trim() ?? '');

/** Índice de capítulo que muestra el pie ("Cap. N de M"), o el rótulo entero. */
export const pie = (page) =>
  page.evaluate(() => {
    const nodos = [...document.querySelectorAll('span')];
    const p = nodos.find((n) => /Portada|Cap\. \d+ de \d+|Fin ·/.test(n.textContent ?? ''));
    return p?.textContent?.trim() ?? '';
  });

/* Espera a que la librería deje de rasterizar caras.

   Después de CADA volteo la librería vuelve a capturar las caras vecinas (se
   mide en `capturasDespues`), y ese trabajo cae en el hilo principal. Sin
   esperarlo, la medición siguiente arranca con la CPU ocupada por la anterior
   y mide dos cosas a la vez. */
export async function esperarQuietas(page, { quieto = 700, techo = 45_000 } = {}) {
  const hasta = Date.now() + techo;
  let n = -1;
  let desde = Date.now();
  while (Date.now() < hasta) {
    // Se miran las TERMINADAS y las EN VUELO. Solo con las terminadas, una
    // captura de 5 s (que a 4× es lo normal) se ve igual que no tener nada
    // rasterizando: el contador no crece mientras corre, y el arnés daba por
    // asentada una página con el hilo principal ocupado.
    const { fin, vuelo } = await page.evaluate(() => ({
      fin: window.__perf.caps.length,
      vuelo: window.__perf.enVuelo ?? 0,
    }));
    if (fin !== n || vuelo > 0) {
      n = fin;
      desde = Date.now();
    } else if (Date.now() - desde >= quieto) {
      return true;
    }
    await dormir(120);
  }
  return false;
}

/**
 * Corre un gesto y devuelve los tiempos del volteo.
 *
 * `curlMs` es EL NÚMERO: del inicio del volteo (el evento de puntero confiable
 * que lo dispara) al primer `gl.drawElements`, o sea al primer frame de curl.
 * Hasta ese instante lo que se ve es el pliegue plano del DOM, que es
 * exactamente el "salto" que se siente.
 */
export async function medirVolteo(page, gesto, { minimo = 1200, techo = 12_000 } = {}) {
  await page.evaluate(() => window.__reset());
  await gesto();
  // Se espera a que el curl DEJE de dibujar, no un tiempo fijo: con la CPU
  // frenada 6× el mismo volteo tarda varias veces más y un `sleep` de 1,5 s
  // cortaría la medición por la mitad.
  await dormir(minimo);
  const hasta = Date.now() + techo;
  let n = -1;
  let desde = Date.now();
  while (Date.now() < hasta) {
    const actual = await page.evaluate(() => window.__perf.draws.length);
    if (actual !== n) {
      n = actual;
      desde = Date.now();
    } else if (Date.now() - desde >= 400) break;
    await dormir(100);
  }
  return page.evaluate(() => {
    const P = window.__perf;
    const abajo = P.ev.find((e) => e.tipo === 'pointerdown');
    const click = P.ev.find((e) => e.tipo === 'click');
    // El arrastre no arranca el pliegue en el pointerdown: la librería espera a
    // ver si el gesto tira en horizontal (mobileScrollSupport, umbral de
    // swipeDistance/4 = 7.5 px). Ese es el instante en que el volteo empieza.
    const mueve =
      abajo && P.ev.find((e) => e.tipo === 'pointermove' && Math.abs(e.x - abajo.x) >= 8 && e.t > abajo.t);
    const t0 = click?.t ?? mueve?.t ?? abajo?.t ?? null;
    if (t0 === null) return { error: 'sin evento de puntero confiable' };

    const draws = P.draws.filter((d) => d.t >= t0);
    const primerDraw = draws[0]?.t ?? null;
    const ultimoDraw = draws[draws.length - 1]?.t ?? null;
    const frames = P.frames.filter((t) => t >= t0 && (ultimoDraw === null || t <= ultimoDraw));
    const dur = frames.length > 1 ? frames[frames.length - 1] - frames[0] : 0;

    return {
      curlMs: primerDraw === null ? null : Math.round((primerDraw - t0) * 10) / 10,
      desdeAbajoMs: primerDraw === null || !abajo ? null : Math.round((primerDraw - abajo.t) * 10) / 10,
      draws: draws.length,
      // Reparto del coste del frame: `drawMs` es lo que tarda el rasterizador
      // (SwiftShader en el banco, GPU en un teléfono) y `frameMs` el hueco
      // real entre frames. La diferencia es JS del hilo principal.
      drawMs: draws.length ? Math.round((draws.reduce((s, d) => s + d.ms, 0) / draws.length) * 10) / 10 : null,
      frameMs: frames.length > 1 ? Math.round((dur / (frames.length - 1)) * 10) / 10 : null,
      volteoMs: primerDraw !== null && ultimoDraw !== null ? Math.round(ultimoDraw - primerDraw) : null,
      fps: dur > 0 ? Math.round(((frames.length - 1) / dur) * 1000 * 10) / 10 : null,
      // Capturas que SOLAPAN el camino crítico (entre que arranca el volteo y
      // que aparece el primer frame de curl). Solapamiento, no "terminan
      // dentro": una rasterización que empezó antes del gesto y sigue corriendo
      // ocupa el hilo principal igual, y contarla solo si acaba dentro del
      // hueco dejaba fuera justo los casos peores.
      capturasEnCamino: P.caps.filter((c) => c.t1 > t0 && (primerDraw === null || c.t0 < primerDraw)).length,
      // Y las que la librería dispara DESPUÉS de que la hoja aterriza: son las
      // que dejan la CPU ocupada justo cuando el dedo va a volver a pasar.
      capturasDespues: ultimoDraw === null ? 0 : P.caps.filter((c) => c.t0 > ultimoDraw).length,
      capturas: P.caps.map((c) => Math.round(c.ms * 10) / 10),
      png: P.png.map((p) => ({ w: p.w, h: p.h, bytes: p.bytes })),
      tex: P.tex.filter((x) => x.w > 1).map((x) => ({ w: x.w, h: x.h })),
    };
  });
}

/** Todas las capturas vistas desde que se reseteó, con su duración. */
export const capturas = (page) =>
  page.evaluate(() => ({
    n: window.__perf.caps.length,
    ms: window.__perf.caps.map((c) => Math.round(c.ms * 10) / 10),
    png: window.__perf.png.map((p) => ({ w: p.w, h: p.h, kb: Math.round(p.bytes / 1024) })),
  }));

export const memoriaMb = (page) =>
  page.evaluate(() => {
    const m = performance.memory;
    return m ? Math.round(m.usedJSHeapSize / 1048576) : null;
  });

export { dormir };
