// Copiloto del profe — transcripción de UN segmento de clase (~5 min de audio).
// Endpoint propio y no /api/stt porque los límites son distintos (el del coach
// corta en 3 MB / tomas de 30 s; una clase manda segmentos más largos) y porque
// el proveedor es conmutable: COPILOTO_STT=deepgram (default) | fish.
//
// Por qué el default es Deepgram y no Fish: nova-3 con language=multi hace
// code-switching español↔inglés DENTRO de la misma frase (la razón documentada
// en api/stt.js), mientras el ASR de Fish (beta) detecta UN idioma por request.
// Una clase de idiomas es code-switching puro. Fish queda a un env var de
// distancia para el A/B con clases reales — decisión de Gus 19-08-2026.
//
// El audio NUNCA se guarda: entra, se transcribe, se descarta. La memoria del
// copiloto es el transcript, no la grabación.

import { costoSTT, registrarUso, usuarioDe } from './_uso.js';

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';
const FISH_URL = 'https://api.fish.audio/v1/asr';

// Segmentos de ~5 min en opus (~24 kbps) pesan ~900 KB; 4 MB deja margen para
// mp4 de iOS y para archivos subidos cortos, bajo el límite de Vercel (4.5 MB).
const MAX_AUDIO_BYTES = 4_000_000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  const appPass = process.env.APP_PASS;
  if (appPass && req.headers['x-rodeo-pass'] !== appPass) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  const proveedor = (process.env.COPILOTO_STT || 'deepgram').toLowerCase();
  const contentType = req.headers['content-type'] || 'audio/webm';

  let audio;
  try {
    audio = await readBody(req);
  } catch (err) {
    res.statusCode = 413;
    return res.end(JSON.stringify({ error: 'audio_too_large', detail: String(err && err.message) }));
  }
  if (!audio || !audio.length) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'missing_audio' }));
  }

  const quien = usuarioDe(req);
  const t0 = Date.now();

  try {
    if (proveedor === 'fish') {
      const apiKey = process.env.FISH_AUDIO_API_KEY;
      if (!apiKey) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: 'missing_stt_key', detail: 'Configura FISH_AUDIO_API_KEY.' }));
      }
      const form = new FormData();
      form.append('audio', new Blob([audio], { type: contentType }), 'clase.webm');
      const upstream = await fetch(FISH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        res.statusCode = 502;
        return res.end(JSON.stringify({ error: 'stt_upstream', status: upstream.status, detail: detail.slice(0, 400) }));
      }
      const data = await upstream.json();
      const text = (data?.text || '').trim();
      const segundos = Number(data?.duration) || 0;
      await registrarUso({
        servicio: 'copiloto_stt', modelo: 'fish-asr', usuario: quien,
        unidades: segundos, costo_usd: (segundos / 3600) * 0.36, // ~$0.36/h publicado por terceros; ajustar con factura real
        ok: true, ms: Date.now() - t0,
      });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ text, segundos, proveedor: 'fish' }));
    }

    // Deepgram (default)
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'missing_stt_key', detail: 'Configura DEEPGRAM_API_KEY.' }));
    }
    const qs = new URLSearchParams({
      model: 'nova-3',
      language: 'multi',
      smart_format: 'true',
      punctuate: 'true',
    });
    const upstream = await fetch(`${DEEPGRAM_URL}?${qs.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': contentType },
      body: audio,
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'stt_upstream', status: upstream.status, detail: detail.slice(0, 400) }));
    }
    const data = await upstream.json();
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    const text = (alt?.transcript || '').trim();
    const segundos = Number(data?.metadata?.duration) || 0;
    await registrarUso({
      servicio: 'copiloto_stt', modelo: 'nova-3', usuario: quien,
      unidades: segundos, costo_usd: costoSTT(segundos),
      ok: true, ms: Date.now() - t0,
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ text, segundos, proveedor: 'deepgram' }));
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'stt_failed', detail: String(err && err.message).slice(0, 300) }));
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_AUDIO_BYTES) {
        reject(new Error(`audio > ${MAX_AUDIO_BYTES} bytes`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
