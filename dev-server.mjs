// Servidor local de desarrollo: sirve index.html y monta el MISMO handler de api/chat.js
// Uso: OPENCODE_API_KEY=... node dev-server.mjs  (puerto 4870)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

// Carga .env.local (solo desarrollo; en Vercel las env vars van en el dashboard)
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const { default: handler } = await import('./api/chat.js');
const { default: ttsHandler } = await import('./api/tts.js');
const { default: sttHandler } = await import('./api/stt.js');
const { default: copilotoHandler } = await import('./api/copiloto.js');
const { default: copilotoSttHandler } = await import('./api/copiloto-stt.js');
const { default: criptoHandler } = await import('./api/cripto.js');
const { default: cronHandler } = await import('./api/cron-drop.js');
const { default: dropTodayHandler } = await import('./api/drop-today.js');

const PORT = 4870;
const ROOT = process.cwd();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/chat') {
    return handler(req, res);
  }
  if (url.pathname === '/api/tts') {
    return ttsHandler(req, res);
  }
  if (url.pathname === '/api/stt') {
    return sttHandler(req, res);
  }
  if (url.pathname === '/api/copiloto') {
    return copilotoHandler(req, res);
  }
  if (url.pathname === '/api/copiloto-stt') {
    return copilotoSttHandler(req, res);
  }
  if (url.pathname === '/api/cripto') {
    return criptoHandler(req, res);
  }
  if (url.pathname === '/api/cron-drop') {
    return cronHandler(req, res);
  }
  if (url.pathname === '/api/drop-today') {
    return dropTodayHandler(req, res);
  }
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    const data = await readFile(join(ROOT, decodeURIComponent(file)));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, () => console.log(`Hablarte dev server → http://localhost:${PORT}`));
