// RODEO — proxy serverless de texto-a-voz hacia Deepgram (Aura-2).
// La API key vive SOLO aquí (env var DEEPGRAM_API_KEY), nunca en el frontend.
// El navegador manda {text} y recibe el MP3 ya sintetizado.

import { costoTTS, registrarUso, usuarioDe } from './_uso.js';

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/speak';
// aura-2-helena-en = "Caring, Natural, Positive, Friendly, Raspy" (US femenina).
// Voz por defecto elegida por el usuario. El frontend puede pedir otra (Draco)
// vía el parámetro model. Configurable por env sin tocar código.
const TTS_MODEL = process.env.TTS_MODEL || 'aura-2-helena-en';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'missing_tts_key', detail: 'Configura DEEPGRAM_API_KEY.' }));
  }

  // Misma protección ligera que /api/chat: si APP_PASS está definido, el
  // frontend debe mandarlo. Evita que cualquiera queme tu crédito de voz.
  const appPass = process.env.APP_PASS;
  if (appPass && req.headers['x-rodeo-pass'] !== appPass) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(await readBody(req));
  } catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'bad_json' }));
  }

  // Aura-2 rechaza payloads > 2000 chars con 413. Recortamos por si acaso.
  const text = String(body.text || '').slice(0, 2000).trim();
  if (!text) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'missing_text' }));
  }

  // El frontend puede pedir una voz concreta (probador). Lista blanca estricta:
  // solo modelos Aura-2 en inglés, para que nadie inyecte un modelo arbitrario.
  const pedido = String(body.model || '').trim();
  const model = /^aura-2-[a-z]+-en$/.test(pedido) ? pedido : TTS_MODEL;
  // Medición para el panel /uso. Deepgram cobra por CARACTER sintetizado.
  const quien = usuarioDe(req);
  const t0 = Date.now();

  try {
    // Sin encoding/container explícito, Deepgram devuelve MP3 (audio/mpeg),
    // que el navegador decodifica nativo con decodeAudioData.
    const upstream = await fetch(`${DEEPGRAM_URL}?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'tts_upstream', status: upstream.status, detail: detail.slice(0, 400) }));
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    await registrarUso({
      servicio: 'deepgram_tts', modelo: model, usuario: quien,
      unidades: text.length, costo_usd: costoTTS(text.length),
      ok: true, ms: Date.now() - t0,
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(audio);
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'tts_failed', detail: String(err && err.message).slice(0, 300) }));
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 100_000) { // ningún texto legítimo de la app se acerca
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
