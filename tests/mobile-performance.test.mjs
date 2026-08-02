import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('free conversation has tactile feedback without blocking navigation', async () => {
  const [button, coach] = await Promise.all([
    read('src/components/rodeo/aurora-pill-button.tsx'),
    read('src/views/talk/use-coach-turn.ts'),
  ]);

  assert.match(button, /AURORA_HOME_FEEDBACK_MS = 120/);
  assert.doesNotMatch(button, /await\s+waitForUi/);
  assert.match(coach, /abrirSesion\(sesion, \[\{ tipo: 'coach'/);
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
  const [app, home] = await Promise.all([read('src/App.tsx'), read('src/views/home/index.tsx')]);

  for (const route of ['talk', 'pelala', 'story', 'ladder', 'dna', 'perfil']) {
    assert.match(app, new RegExp(`lazy\\(\\(\\) => import\\('@/views/${route}'\\)\\)`));
  }
  assert.match(app, /import\('@\/components\/rodeo\/suscripcion-overlay'\)/);
  assert.match(home, /lazy\(\(\) => import\('@\/components\/rodeo\/carrusel-features'\)\)/);
});
