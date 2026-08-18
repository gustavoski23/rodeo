import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('free conversation has tactile feedback without blocking navigation', async () => {
  const [button, coach] = await Promise.all([
    read('src/components/rodeo/aurora-pill-button.tsx'),
    read('src/views/talk/use-coach-turn.ts'),
  ]);

  assert.match(button, /AURORA_HOME_FEEDBACK_MS = 120/);
  assert.doesNotMatch(button, /await\s+waitForUi/);
  /* La apertura responde AL INSTANTE aunque ahora venga por IA (pedido de Gus,
     2026-08-04): la sesión y el lápiz se abren de forma síncrona y el turno de
     apertura se dispara SIN esperar (void), así que el cambio de vista nunca
     aguanta al modelo. El lápiz es el feedback táctil, no un retardo artificial
     de "pensando". */
  assert.match(coach, /void abrirLibreIA\(\)/);
  assert.doesNotMatch(coach, /await abrirLibreIA\(\)/);
  assert.match(coach, /addBubble\(\{ tipo: 'espera', desde: Date\.now\(\) \}\)/);
  assert.match(coach, /\[\{ tipo: 'espera', desde: Date\.now\(\) \}\]/);
  assert.doesNotMatch(coach, /FREE_OPENING_THINK_MS|THINK_MS_REDUCED/);
});

test('phone rendering avoids expensive continuous effects', async () => {
  const [app, background, bubbles, orb, waveform] = await Promise.all([
    read('src/App.tsx'),
    read('src/components/rodeo/fondo-tema.tsx'),
    read('src/views/talk/bubbles.tsx'),
    read('src/views/talk/orb-avatar.tsx'),
    read('src/components/elevenlabs/live-waveform.tsx'),
  ]);

  assert.match(app, /reducedMotion=\{MODO_LIGERO \? 'always' : 'user'\}/);
  assert.match(background, /aurora-fondo-gradiente--estatico/);
  assert.match(bubbles, /!MODO_LIGERO/);
  assert.match(orb, /vivo && !MODO_LIGERO/);
  assert.doesNotMatch(waveform, /if \(!needsRedrawRef\.current && !active\) \{\s*rafId = requestAnimationFrame/s);
});

test('audio uploads and immutable assets are mobile-friendly', async () => {
  const [recorder, vercel] = await Promise.all([
    read('src/views/a1-voice/use-grabadora.ts'),
    read('vercel.json'),
  ]);
  const config = JSON.parse(vercel);

  assert.match(recorder, /audioBitsPerSecond: 24_000/);
  const assets = config.headers.find((entry) => entry.source === '/assets/(.*)');
  assert.equal(assets?.headers?.[0]?.value, 'public, max-age=31536000, immutable');
});

test('feature-heavy screens are loaded on demand', async () => {
  const [app, home, menu] = await Promise.all([
    read('src/App.tsx'),
    read('src/views/home/index.tsx'),
    read('src/components/rodeo/menu-flotante.tsx'),
  ]);

  for (const route of ['talk', 'pelala', 'story', 'ladder', 'dna', 'perfil']) {
    assert.match(app, new RegExp(`lazy\\(\\(\\) => import\\('@/views/${route}'\\)\\)`));
  }
  assert.match(app, /lazy\(\(\) => import\('@\/views\/a1\/oficina'\)\)/);
  assert.doesNotMatch(app, /JOB_PACKS|JobPicker/);
  assert.match(app, /import\('@\/components\/rodeo\/suscripcion-overlay'\)/);
  assert.match(home, /lazy\(\(\) => import\('@\/components\/rodeo\/carrusel-features'\)\)/);
  assert.match(menu, /lazy\(\(\) => import\('@\/components\/ui\/liquid-morph-floating-menu'\)\)/);
  assert.doesNotMatch(menu, /import FloatingMenu from/);
});

test('conversation is prefetched only while the connection can afford it', async () => {
  const [home, preload] = await Promise.all([
    read('src/views/home/index.tsx'),
    read('src/lib/preload.ts'),
  ]);

  assert.match(home, /programarPrecargaConversacion\(\)/);
  assert.match(preload, /saveData/);
  assert.match(preload, /effectiveType === 'slow-2g'/);
  assert.match(preload, /effectiveType === '2g'/);
  assert.match(preload, /requestIdleCallback/);
  assert.match(preload, /import\('@\/views\/talk'\)/);
});

test('onboarding keeps the first flow narrow and warms up the Home menu', async () => {
  const [app, onboarding, preload] = await Promise.all([
    read('src/App.tsx'),
    read('src/views/onboarding/index.tsx'),
    read('src/lib/preload.ts'),
  ]);

  assert.match(app, /lazy\(\(\) => import\('@\/views\/onboarding'\)\)/);
  assert.match(app, /useOnboarding/);
  // Banderas como SVG (no emoji): en Windows/Chrome el emoji de bandera no
  // renderiza, así que se dibujan con componentes SVG que se ven en todo equipo.
  assert.match(onboarding, /\{ id: 'es', Bandera: BanderaES \}/);
  assert.match(onboarding, /\{ id: 'en', Bandera: BanderaUS \}/);
  assert.match(onboarding, /from '@\/components\/rodeo\/banderas'/);
  assert.doesNotMatch(onboarding, /id: 'pt'|id: 'fr'/);
  // La pantalla de "preparando tu inglés" ya no calienta solo el menú del Home:
  // ESPERA a que la precarga baje features + imágenes de la vitrina para que al
  // entrar todo se sienta fluido (precargarTodoYEsperar, pedido de Gus).
  assert.match(onboarding, /precargarTodoYEsperar\(\)/);
  assert.match(preload, /homeInteraccionesPrecargadas/);
  assert.match(preload, /rodeo:home-interacciones-listas/);
  assert.match(preload, /import\('@\/components\/ui\/liquid-morph-floating-menu'\)/);
  // Y la precarga cubre las features pesadas (Pélala arrastra three) + su
  // esperador, que es lo que la pantalla de carga aguarda.
  assert.match(preload, /import\('@\/views\/pelala'\)/);
  assert.match(preload, /export function precargarTodoYEsperar/);
});

test('carousel serves smaller modern images on phones with a jpeg fallback', async () => {
  const carousel = await read('src/components/ui/card-fan-carousel.tsx');
  assert.match(carousel, /type="image\/avif"/);
  assert.match(carousel, /type="image\/webp"/);
  assert.match(carousel, /-400\.avif/);
  assert.match(carousel, /sizes="\(max-width: 479px\) 128px/);

  const [jpg, avif] = await Promise.all([
    stat(new URL('../public/carrusel/conversacion.jpg', import.meta.url)),
    stat(new URL('../public/carrusel/conversacion-400.avif', import.meta.url)),
  ]);
  assert.ok(avif.size < jpg.size / 2, `expected ${avif.size} to be less than half of ${jpg.size}`);
});

/* ────────────────────────────────────────────────────────────────────────────
   LIBRO — el volteo en el teléfono, con TOQUE REAL.

   Regla #2 del repo: los eventos sintéticos de JS mienten en las dos
   direcciones, así que esto va con `page.touchscreen` de puppeteer-core (CDP
   `Input.dispatchTouchEvent`) sobre un perfil con `isMobile` y `hasTouch`.

   Se SALTA sola cuando no hay con qué correrla — puppeteer-core no vive en el
   repo (LIBRO-runbook §5.1) y hace falta un `dist/` construido:

     npm run build
     RODEO_PUPPETEER=<ruta>/node_modules node --test tests/mobile-performance.test.mjs

   Cubre lo que se rompió alguna vez y lo que no se puede romper nunca:
   deslizar adelante, deslizar atrás, tap en la portada para abrir, las glosas
   guardando al DNA, el A−/A+, y el umbral de arranque del curl. */

const UMBRAL_CURL_MS = 260;

async function conLibro(fn) {
  const arnes = await import('./perf/libro-harness.mjs');
  if (!(await arnes.disponible())) return { saltado: 'sin puppeteer-core o sin Chromium' };
  const { existsSync } = await import('node:fs');
  // `dist` primero: es el build de verdad. `dist-perf` es el de medición, que
  // los scripts de tests/perf parchean y reconstruyen — sirve de respaldo, pero
  // no es lo que se despliega.
  const dist = ['dist', 'dist-perf'].find((d) => existsSync(new URL(`../${d}/index.html`, import.meta.url)));
  if (!dist) return { saltado: 'no hay build (corré `npm run build`)' };

  const servidor = await arnes.servir({ dist, puerto: 4178 });
  const browser = await arnes.abrirNavegador();
  try {
    const { page } = await arnes.abrirLibro(browser, servidor.url, { throttle: 1 });
    return { resultado: await fn(page, arnes) };
  } finally {
    await browser.close();
    servidor.cerrar();
  }
}

test('the book turns pages with a real finger and the curl starts fast', { timeout: 600_000 }, async (t) => {
  const { saltado, resultado } = await conLibro(async (page, arnes) => {
    const pasos = {};

    /* 1. TAP EN LA PORTADA para abrir. Es su propio caso porque no lo atiende
          el libro: lo atiende el handler nativo en fase de captura de
          index.tsx, midiendo que el dedo no se haya movido. */
    pasos.antesDeAbrir = await arnes.anuncio(page);
    pasos.tap = await arnes.medirVolteo(page, () => arnes.tocar(page, 0.5, 0.4));
    pasos.despuesDeAbrir = await arnes.anuncio(page);

    /* 2. DESLIZAR ADELANTE: lo hace el arrastre nativo del componente sobre la
          mitad derecha, con su curl siguiendo el dedo. */
    await arnes.esperarCache(page);
    pasos.adelante = await arnes.medirVolteo(page, () => arnes.deslizar(page, -1));
    pasos.trasAdelante = await arnes.anuncio(page);

    /* 3. DESLIZAR ATRÁS: este NO lo hace el componente (pediría la mitad
          izquierda, que en el móvil está fuera del marco). Lo atiende nuestro
          handler, que le manda un `pointercancel` al libro para quitarle el
          gesto y salta la página en el tick siguiente. */
    await arnes.esperarCache(page);
    pasos.atras = await arnes.medirVolteo(page, () => arnes.deslizar(page, +1));
    pasos.trasAtras = await arnes.anuncio(page);

    return pasos;
  });

  if (saltado) return t.skip(saltado);

  /* Los tres gestos MUEVEN el libro, y a la cara EXACTA. El anuncio del <Book>
     es la única señal que lo distingue: el pie dice "Cap. 1 de 10" tanto en la
     lámina de apertura como en el abrebocas, así que con él un deslizamiento
     que no hace nada pasaría por bueno. */
  assert.match(resultado.antesDeAbrir, /Portada/, 'el libro no arrancó cerrado');
  assert.equal(resultado.despuesDeAbrir, 'Página 2 de 22', 'el tap en la portada tiene que abrir el libro');
  assert.equal(resultado.trasAdelante, 'Página 3 de 22', 'deslizar adelante tiene que avanzar UNA cara');
  assert.equal(resultado.trasAtras, 'Página 2 de 22', 'deslizar atrás tiene que retroceder UNA cara');

  // Y el curl arranca pronto. `curlMs` va del evento de puntero confiable al
  // primer gl.drawElements: hasta ahí lo que se ve es el pliegue PLANO del DOM,
  // que es exactamente el "salto" que se sentía.
  for (const camino of ['adelante', 'atras']) {
    const ms = resultado[camino].curlMs;
    assert.notEqual(ms, null, `el curl WebGL no llegó a dibujar en «${camino}»`);
    assert.ok(ms < UMBRAL_CURL_MS, `«${camino}» tardó ${ms} ms en el primer frame de curl (umbral ${UMBRAL_CURL_MS})`);
    assert.equal(
      resultado[camino].capturasEnCamino,
      0,
      `«${camino}» pagó una rasterización de snapdom dentro del gesto: la caliente-texturas dejó de funcionar`,
    );
  }
});

test('the book keeps its glosses tappable and its A−/A+ working', { timeout: 600_000 }, async (t) => {
  const { saltado, resultado } = await conLibro(async (page, arnes) => {
    await arnes.tocar(page, 0.5, 0.4); // abrir
    await arnes.dormir(1200);
    await arnes.tocarBoton(page, 'siguiente'); // hasta la cara de texto
    await arnes.dormir(1600);

    /* LAS GLOSAS. Se toca una palabra subrayada de verdad y se comprueba que
       (a) abre el significado y (b) el botón la guarda al DNA. El
       onPointerDownCapture de CuentoVivo corta ahí el arrastre del libro: sin
       eso, tocar una palabra empezaría a voltear la página. */
    const dnaAntes = await page.evaluate(() => JSON.parse(localStorage.getItem('rodeo_dna') || '[]').length);
    const glosa = await page.evaluate(() => {
      const g = [...document.querySelectorAll('.libro-cuerpo [data-gloss]')].find((n) => n.offsetParent);
      if (!g) return null;
      const r = g.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, texto: g.textContent };
    });
    if (!glosa) return { error: 'no encontré ninguna glosa visible' };
    await page.touchscreen.tap(glosa.x, glosa.y);
    await arnes.dormir(450);
    const tip = await page.evaluate(() => document.querySelector('[data-gloss-tip]')?.textContent ?? null);

    const guardar = await page.evaluate(() => {
      const b = [...document.querySelectorAll('[data-gloss-tip] button')].find((x) => /guardar/i.test(x.textContent ?? ''));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (guardar) await page.touchscreen.tap(guardar.x, guardar.y);
    await arnes.dormir(400);
    const dnaDespues = await page.evaluate(() => JSON.parse(localStorage.getItem('rodeo_dna') || '[]').length);

    // La página NO se volteó por tocar la palabra.
    const caraTrasGlosa = await arnes.anuncio(page);

    /* EL A−/A+. Cambia el cuerpo de letra sin cambiar el tamaño de la página,
       así que la caché de texturas del curl —que se indexa por ese tamaño— no
       se entera sola: la cara girando enseñaría el texto a la escala anterior.
       La vista tiene que llamar a invalidarCaras(). Se comprueba mirando
       cuántas caras quedan guardadas justo después del cambio. */
    const antes = await page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent ?? '');
    /* Esperar la caché ANTES de leerla, no leerla en un instante arbitrario.
       Sin esto la prueba era flaky de manual: con la misma configuración pasaba
       una corrida y fallaba la siguiente, según si las capturas de las dos hojas
       calientes habían terminado o no cuando le tocaba mirar. Una aserción sobre
       «la caché se está usando» tiene que esperar a la caché. */
    await page
      .waitForFunction(() => (window.__curlCache?.carasGuardadas() ?? 0) > 0, { timeout: 30_000, polling: 200 })
      .catch(() => {});
    const guardadasAntes = await page.evaluate(() => window.__curlCache?.carasGuardadas() ?? -1);
    const generacionAntes = await page.evaluate(() => window.__curlCache?.generacionActual() ?? -1);
    await page.evaluate(() => window.__reset?.());
    const mas = await page.evaluate(() => {
      const b = document.querySelector('button[aria-label="Letra más grande"]');
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.touchscreen.tap(mas.x, mas.y);
    await arnes.dormir(300);
    const despues = await page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent ?? '');
    /* La GENERACIÓN es lo que se comprueba, no «cuántas caras quedan justo
       ahora»: invalidar vacía la caché, pero el efecto de captura vuelve a
       llenarla enseguida, así que un conteo a los 300 ms sería una carrera. La
       generación solo sube cuando alguien invalida de verdad. */
    const generacionDespues = await page.evaluate(() => window.__curlCache?.generacionActual() ?? -1);
    /* Y esperar a que la caché se vuelva a llenar hay que hacerlo MIRÁNDOLA.
       `esperarQuietas` cuenta rasterizaciones de snapdom, y ese contador solo
       existe en el build instrumentado: contra el `dist` de verdad devuelve 0
       siempre y la espera termina en 700 ms, antes de que ninguna captura haya
       acabado. Se leía como «la caché no se rellenó» cuando lo único que pasaba
       es que la prueba miraba demasiado pronto. */
    await page
      .waitForFunction(() => (window.__curlCache?.carasGuardadas() ?? 0) > 0, { timeout: 30_000, polling: 200 })
      .catch(() => {});
    const guardadasLuego = await page.evaluate(() => window.__curlCache?.carasGuardadas() ?? -1);

    return {
      glosa: glosa.texto,
      tip,
      dnaAntes,
      dnaDespues,
      caraTrasGlosa,
      antes,
      despues,
      guardadasAntes,
      generacionAntes,
      generacionDespues,
      guardadasLuego,
    };
  });

  if (saltado) return t.skip(saltado);
  assert.equal(resultado.error, undefined, resultado.error);

  assert.ok(resultado.tip, `tocar «${resultado.glosa}» no abrió el significado`);
  assert.equal(resultado.dnaDespues, resultado.dnaAntes + 1, 'la glosa no se guardó en el DNA');
  assert.equal(resultado.caraTrasGlosa, 'Página 3 de 22', 'tocar una glosa volteó la página');

  assert.notEqual(resultado.despues, resultado.antes, 'A+ no cambió la escala');
  assert.match(resultado.despues, /%$/);
  assert.ok(resultado.guardadasAntes > 0, 'no había ninguna cara cacheada: la caché no se está usando');
  assert.ok(
    resultado.generacionDespues > resultado.generacionAntes,
    'cambiar la escala no invalidó las texturas: la cara girando enseñaría el layout anterior',
  );
  assert.ok(
    resultado.guardadasLuego > 0 && resultado.guardadasLuego <= 6,
    `tras invalidar quedaron ${resultado.guardadasLuego} caras: o no se recapturó, o la caché pasó del tope de 6`,
  );
});

/* El fork vendorizado de @gfazioli/mantine-book (src/vendor/mantine-book) es
   una copia del dist/esm del paquete con DOS archivos cambiados y uno nuevo.
   Esta prueba es lo que impide que se convierta en un fork de verdad sin que
   nadie se entere: si alguien toca un tercer archivo, o si `npm i` trae otra
   versión del paquete y la copia queda vieja, falla aquí y no en el teléfono
   de Gus. El porqué de cada cambio está en src/vendor/mantine-book/FORK.md. */
test('the vendored fork stays honest: only the files it claims to change', async () => {
  const { readdir, readFile: leerArchivo } = await import('node:fs/promises');
  const { existsSync } = await import('node:fs');

  const paquete = new URL('../node_modules/@gfazioli/mantine-book/', import.meta.url);
  const fork = new URL('../src/vendor/mantine-book/', import.meta.url);
  if (!existsSync(paquete)) return; // sin node_modules no hay nada que comparar

  // La versión va CLAVADA, sin ^: el contrato del pointercancel sintético del
  // móvil depende del comportamiento interno de esta versión exacta.
  const raiz = JSON.parse(await read('package.json'));
  assert.equal(raiz.dependencies['@gfazioli/mantine-book'], '1.0.5');
  const instalado = JSON.parse(await leerArchivo(new URL('package.json', paquete), 'utf8'));
  assert.equal(instalado.version, '1.0.5', 'el fork se copió de la 1.0.5');

  const CAMBIADOS = new Set(['Curl/webgl/CurlWebglLayer.mjs', 'Curl/webgl/snapshot.mjs']);
  const NUEVOS = new Set(['curl-cache.mjs', 'curl-cache.d.ts', 'index.d.ts', 'FORK.md']);

  const listar = async (base, dentro = '') => {
    const salida = [];
    for (const e of await readdir(new URL(dentro, base), { withFileTypes: true })) {
      const rel = dentro + e.name;
      if (e.isDirectory()) salida.push(...(await listar(base, `${rel}/`)));
      else salida.push(rel);
    }
    return salida;
  };

  const delFork = (await listar(fork)).sort();
  const delPaquete = new Set(await listar(new URL('dist/esm/', paquete)));

  const iguales = [];
  const distintos = [];
  for (const rel of delFork) {
    if (NUEVOS.has(rel)) continue;
    assert.ok(delPaquete.has(rel), `${rel} no existe en el paquete: ¿sobra en el fork?`);
    const a = await leerArchivo(new URL(rel, fork), 'utf8');
    // Al copiar se quitan los .map, así que también la línea que los apunta.
    // El `\r?` y el `[^\r\n]` no son decorativos: en JS el `.` no cruza un \r,
    // así que con CRLF este reemplazo no enganchaba y dejaba la línea puesta,
    // haciendo "distintos" a todos los archivos. Hoy .gitattributes fuerza LF y
    // no debería pasar, pero un tar mal hecho del paquete lo repetiría.
    const b = (await leerArchivo(new URL(`dist/esm/${rel}`, paquete), 'utf8')).replace(
      /\r?\n\/\/# sourceMappingURL=[^\r\n]*\r?\n?$/,
      '\n',
    );
    (a === b ? iguales : distintos).push(rel);
  }

  assert.deepEqual(
    distintos.sort(),
    [...CAMBIADOS].sort(),
    'el fork cambió archivos que no declara (o dejó de cambiar los que sí): actualizá FORK.md',
  );
  assert.ok(iguales.length >= 14, `solo ${iguales.length} archivos intactos: la copia se quedó corta`);

  // Y que el FORK.md siga explicando lo que el código hace.
  const nota = await read('src/vendor/mantine-book/FORK.md');
  for (const marca of ['FORK 1', 'FORK 2', 'FORK 3', 'FORK 4', 'FORK 5']) assert.match(nota, new RegExp(marca));
  const capa = await read('src/vendor/mantine-book/Curl/webgl/CurlWebglLayer.mjs');
  for (const marca of ['FORK 1', 'FORK 2', 'FORK 3', 'FORK 4']) assert.match(capa, new RegExp(marca));
  assert.match(await read('src/vendor/mantine-book/Curl/webgl/snapshot.mjs'), /FORK 5[\s\S]*embedFonts: true/);
});
