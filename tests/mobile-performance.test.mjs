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
  /* La apertura responde AL INSTANTE (sesión + lápiz), pero el texto espera a
     que la voz de Deepgram arranque (sync texto-voz, pedido de Gus): el lápiz
     es el feedback táctil, no un retardo artificial de "pensando". */
  assert.match(coach, /abrirSesion\(sesion, \[\{ tipo: 'espera'/);
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
  assert.match(onboarding, /\{ id: 'es', bandera: '🇪🇸' \}/);
  assert.match(onboarding, /\{ id: 'en', bandera: '🇺🇸' \}/);
  assert.doesNotMatch(onboarding, /id: 'pt'|id: 'fr'/);
  assert.match(onboarding, /programarPrecargaHome\(\)/);
  assert.match(preload, /homeInteraccionesPrecargadas/);
  assert.match(preload, /rodeo:home-interacciones-listas/);
  assert.match(preload, /import\('@\/components\/ui\/liquid-morph-floating-menu'\)/);
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
