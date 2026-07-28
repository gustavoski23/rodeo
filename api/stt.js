// RODEO — proxy serverless de voz-a-texto hacia Deepgram (Nova-3, multilingüe).
// La API key vive SOLO aquí (env var DEEPGRAM_API_KEY, la misma que usa
// api/tts.js para la voz del coach), nunca en el frontend. El navegador manda
// el audio grabado (blob binario) y recibe el texto ya transcrito.
//
// Por qué Nova-3 en vez del SpeechRecognition del navegador: Gus habla
// mezclando español e inglés en la misma frase, y el reconocedor del
// navegador exige un idioma fijo por toma — con un idioma equivocado el
// resultado es basura ("I have 30 years" sale peor que eso). `language=multi`
// hace code-switching real dentro de la misma toma.

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';

// Grabación tope: 60s de opus (~24kbps) son ~180 KB — muy por debajo del
// límite de payload de las funciones de Vercel (4.5 MB). Un poco de margen
// para contenedores/mp4 de iOS, que pesan más por segundo.
const MAX_AUDIO_BYTES = 3_000_000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'missing_stt_key', detail: 'Configura DEEPGRAM_API_KEY.' }));
  }

  // Misma protección ligera que /api/chat y /api/tts.
  const appPass = process.env.APP_PASS;
  if (appPass && req.headers['x-rodeo-pass'] !== appPass) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

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

  // Keyterms opcionales: el cliente manda su jerga guardada (rodeo_dna) y el
  // vocabulario reciente de la conversación en un header, para sesgar el
  // reconocimiento hacia lo que YA se está hablando (justo lo que resuelve
  // "a lie" vs "alive"). Nova-3 acepta hasta ~100 palabras — recortamos.
  const keytermsHeader = req.headers['x-rodeo-keyterms'];
  const keyterms = keytermsHeader
    ? String(keytermsHeader)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 25)
    : [];

  const qs = new URLSearchParams({
    model: 'nova-3',
    language: 'multi', // code-switching real ES↔EN en la misma toma
    smart_format: 'true',
    punctuate: 'true',
  });
  for (const k of keyterms) qs.append('keyterm', k);

  try {
    const upstream = await fetch(`${DEEPGRAM_URL}?${qs.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': contentType,
      },
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
    const confidence = typeof alt?.confidence === 'number' ? alt.confidence : null;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ text, confidence }));
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
        reject(new Error('audio_too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
