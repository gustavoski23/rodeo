#!/usr/bin/env node
/* hacer-demo.mjs — reconstruye el demo single-file del artifact.
 *
 * Qué hace:
 *   1. `RODEO_DEMO=1 npm run build`  (inlineDynamicImports → un solo bundle JS).
 *   2. Inlinea el JS y la CSS en el index.html.
 *   3. Convierte a data: URI todos los assets locales que el JS/CSS referencian
 *      literalmente (/orb-perlin.png, /carrusel/*.jpg, /fonts/*.ttf, …). El CSP
 *      del artifact bloquea CUALQUIER request externo, así que nada puede quedar
 *      como ruta suelta.
 *   4. Inlinea las Google Fonts (Familjen Grotesk / Archivo / Space Mono) vía
 *      curl —usa el proxy del entorno— y las mete como @font-face con woff2 en
 *      base64. Best-effort: si falla, quita el <link> y cae a fuentes de sistema.
 *   5. Antepone un bootstrap que (a) siembra localStorage para SALTAR EL GATE sin
 *      red (rodeo_gate_skip) y poner nombre/tts, y (b) shimmea window.fetch para
 *      /api/chat (SSE con reply canned del coach), /api/stt ({text}) y /api/tts.
 *
 * Salida: scratchpad/demo.html  (single-file, self-contained).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const OUT = process.env.DEMO_OUT || join(ROOT, 'scratchpad', 'demo.html');

const MIME = {
  '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.hdr': 'image/vnd.radiance',
};
const mimeOf = (p) => MIME[extname(p).toLowerCase()] || 'application/octet-stream';
const dataUri = (abs) => `data:${mimeOf(abs)};base64,${readFileSync(abs).toString('base64')}`;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

// ── 1. Build ────────────────────────────────────────────────────────────────
console.log('· build RODEO_DEMO=1 …');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit', env: { ...process.env, RODEO_DEMO: '1' } });

// ── 2. Leer index + JS + CSS ─────────────────────────────────────────────────
let html = readFileSync(join(DIST, 'index.html'), 'utf8');
// El artifact conserva su identidad "RODEO · demo de migración" (el <title> del
// build de producción es otro). El tag gana sobre el parámetro `title` del tool.
html = html.replace(/<title>[^<]*<\/title>/, '<title>RODEO · demo de migración</title>');
const jsPath = html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
const cssPath = html.match(/href="(\/assets\/[^"]+\.css)"/)[1];
let js = readFileSync(join(DIST, jsPath.slice(1)), 'utf8');
let css = readFileSync(join(DIST, cssPath.slice(1)), 'utf8');

// ── 3. Inlinar assets locales referenciados literalmente ─────────────────────
const files = walk(DIST).filter((f) => f !== join(DIST, jsPath.slice(1)) && f !== join(DIST, cssPath.slice(1)));
let inlined = 0;
for (const abs of files) {
  const webPath = '/' + relative(DIST, abs).split(/[\\/]/).join('/');
  const inJs = js.includes(webPath);
  const inCss = css.includes(webPath);
  if (!inJs && !inCss) continue;
  const uri = dataUri(abs);
  if (inJs) js = js.split(webPath).join(uri);
  if (inCss) css = css.split(webPath).join(uri);
  inlined++;
}
console.log(`· ${inlined} assets locales inlineados como data: URI`);

// ── 4. Google Fonts → @font-face inline (best-effort, vía curl/proxy) ─────────
let fontsCss = '';
const linkRe = /<link[^>]*href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"[^>]*>/;
const linkMatch = html.match(linkRe);
if (linkMatch) {
  try {
    const tmp = mkdtempSync(join(tmpdir(), 'rdfonts-'));
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
    const cssFile = join(tmp, 'g.css');
    execSync(`curl -sfL -A ${JSON.stringify(UA)} ${JSON.stringify(linkMatch[1])} -o ${JSON.stringify(cssFile)}`, { stdio: 'pipe' });
    let gcss = readFileSync(cssFile, 'utf8');
    const urls = [...gcss.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
    const uniq = [...new Set(urls)];
    for (let i = 0; i < uniq.length; i++) {
      const u = uniq[i];
      const wf = join(tmp, `f${i}.woff2`);
      execSync(`curl -sfL -A ${JSON.stringify(UA)} ${JSON.stringify(u)} -o ${JSON.stringify(wf)}`, { stdio: 'pipe' });
      const uri = `data:font/woff2;base64,${readFileSync(wf).toString('base64')}`;
      gcss = gcss.split(u).join(uri);
    }
    fontsCss = gcss;
    console.log(`· Google Fonts inlineadas (${uniq.length} woff2)`);
  } catch (e) {
    console.warn('· Google Fonts NO inlineadas (' + (e.message || e) + ') — caen a sistema');
    fontsCss = '';
  }
}

// ── 5. Bootstrap: gate bypass + shim de red ──────────────────────────────────
const bootstrap = `
<script>
/* DEMO RODEO — bootstrap. Corre ANTES del módulo de la app (script clásico en
   <head>, ejecución síncrona durante el parse) para sembrar localStorage y
   shimmear la red antes de que los stores se hidraten. */
(function () {
  var S = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  // El gate de login DEBE aparecer SIEMPRE (Gus lo muestra en sus demos). En vez
  // de saltarlo, se BORRA el flag de "skip" en cada carga: así el login reaparece
  // aunque en una visita anterior se haya pulsado "Skip" (que persiste el flag).
  try { localStorage.removeItem('rodeo_gate_skip'); } catch (e) {}
  S('rodeo_nombre', 'Gustavo');
  S('rodeo_tts', false);            // sin llamadas a /api/tts en el opener
  S('rodeo_pass', 'demo');          // por si el gate del PIN saltara

  var CORR = [];
  var REPLY = 'Nice one, Gustavo! What made it feel \\u27e6worth every peso||que vali\\u00f3 cada peso\\u27e7? Tell me a bit more \\u2014 when did you buy it, and would you buy it again?';
  var IDEA = 'You could say: "It was worth every peso because it has lasted me for years."';
  var DEBRIEF = { top_errors: [{ quote: 'I have 25 years', fix: "I'm 25 years old", why: 'Age uses the verb "to be", not "to have".' }], upgrades: [{ b2: 'It was worth it', c1: 'It was well worth the investment', note: 'A more formal, upgraded register.' }], closing: 'Great session, Gustavo \\u2014 you kept the conversation flowing naturally. Keep it up!' };

  function coachJson() { return JSON.stringify({ reply: REPLY, corrections: CORR, glosses: [] }); }
  function pick(body) {
    // creative → debrief ; chat + 2 msgs cortos → idea ; resto → reply del coach
    if (body && body.mode === 'creative') return JSON.stringify(DEBRIEF);
    if (body && body.mode === 'chat' && Array.isArray(body.messages) && body.messages.length === 2 && (body.max_tokens || 0) <= 600) return JSON.stringify({ idea: IDEA });
    return coachJson();
  }
  function jsonResponse(obj) {
    return new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  function sseResponse(content) {
    // Trocea el content en ~10 deltas para que se vea el stream (el opener libre
    // no pasa por aquí; esto es la respuesta a lo que el usuario ENVÍA).
    var enc = new TextEncoder();
    var n = Math.max(1, Math.ceil(content.length / 10));
    var parts = [];
    for (var i = 0; i < content.length; i += n) parts.push(content.slice(i, i + n));
    var idx = 0;
    var stream = new ReadableStream({
      pull: function (ctrl) {
        return new Promise(function (res) {
          setTimeout(function () {
            if (idx < parts.length) {
              ctrl.enqueue(enc.encode('data: ' + JSON.stringify({ delta: parts[idx++] }) + '\\n\\n'));
            } else {
              ctrl.enqueue(enc.encode('data: ' + JSON.stringify({ done: true, finish_reason: 'stop', cost: 0.0002 }) + '\\n\\n'));
              ctrl.enqueue(enc.encode('data: [DONE]\\n\\n'));
              ctrl.close();
            }
            res();
          }, 55);
        });
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }

  var _fetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    try {
      if (url.indexOf('/api/chat') !== -1) {
        var body = {};
        try { body = JSON.parse((init && init.body) || '{}'); } catch (e) {}
        var content = pick(body);
        return Promise.resolve(body && body.stream ? sseResponse(content)
          : jsonResponse({ content: content, finish_reason: 'stop', cost: 0.0002 }));
      }
      if (url.indexOf('/api/stt') !== -1) return Promise.resolve(jsonResponse({ text: 'This jacket was totally worth it, I still use it every week.' }));
      if (url.indexOf('/api/tts') !== -1) return Promise.resolve(new Response(new ArrayBuffer(0), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }));
      if (url.indexOf('supabase') !== -1 || url.indexOf('/auth/') !== -1) return Promise.resolve(jsonResponse({}));
    } catch (e) {}
    return _fetch ? _fetch(input, init) : Promise.reject(new Error('offline demo'));
  };
})();
</script>`;

// ── 6. Ensamblar el single-file ──────────────────────────────────────────────
// Quitar preconnect + <link> de google fonts + <link> css + <script module> externos.
html = html
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(linkRe, '')
  .replace(/<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>\s*/, '')
  .replace(/<script type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>\s*/, '');

// Inyectar: bootstrap primero (justo tras <head>), luego la CSS (fonts + app),
// y el módulo de la app al final del <head>.
// OJO: reemplazos con FUNCIÓN, no string. El bundle minificado contiene
// secuencias `$\``, `$'`, `$&`… que String.replace(str) interpreta como
// patrones y acabaría duplicando/descolocando el HTML entero. La función
// devuelve el texto TAL CUAL, sin interpretar `$`.
html = html.replace(/<head>/, () => '<head>' + bootstrap);
// Escapar la secuencia de cierre para que ningún literal del bundle rompa el
// tag antes de tiempo: el parser HTML corta el <script> en cuanto ve "</script"
// y el <style> en "</style", pase lo que pase. En un string/regex de JS,
// "<\/script" es idéntico a "</script" (el \/ es sólo "/"), así que es inocuo.
const safeJs = js.replace(/<\/script/gi, '<\\/script');
const safeCss = (fontsCss + '\n' + css).replace(/<\/style/gi, '<\\/style');
const styleBlock = `<style>${safeCss}</style>`;
const scriptBlock = `<script type="module">${safeJs}</script>`;
html = html.replace(/<\/head>/, () => `${styleBlock}\n${scriptBlock}\n</head>`);

writeFileSync(OUT, html);
const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
console.log(`· escrito ${OUT} (${mb} MB)`);
