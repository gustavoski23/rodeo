// Copiloto del profe — el cerebro: transcript → resumen estructurado, y el
// chat de ideas por estudiante. Modelo por env COPILOTO_MODEL; el default es
// el gratis de Zen (mimo-v2.5-free) en OPENCODE_ZEN_URL — decisión de Gus
// (19-08-2026): este trabajo es baratísimo en tokens y el gratis alcanza;
// si la calidad del resumen no da, se sube de modelo con una variable, sin
// tocar código. Los prompts y el parser viven en _copiloto.js (puros,
// testeados en tests/copiloto.test.mjs).

import { construirPromptIdea, construirPromptResumen, extraerJson, validarResumen } from './_copiloto.js';
import { DEFAULT_FREE_MODEL, OPENCODE_ZEN_URL } from './_opencode.js';
import { registrarUso, usuarioDe } from './_uso.js';

const MAX_BODY = 900_000; // transcript de 1 h ≈ 60-80 KB; margen 10x

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'missing_api_key' }));
  }
  const appPass = process.env.APP_PASS;
  if (appPass && req.headers['x-rodeo-pass'] !== appPass) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'bad_json' }));
  }

  const modo = body?.modo;
  const nombre = recortar(body?.nombre, 80);
  const detalle = recortar(body?.detalle, 160);
  const historial = Array.isArray(body?.historial) ? body.historial.map((h) => recortar(h, 600)).filter(Boolean).slice(0, 6) : [];

  let messages;
  let maxTokens;
  if (modo === 'resumen') {
    const transcript = recortar(body?.transcript, 400_000);
    if (!nombre || !transcript || transcript.length < 40) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'missing_fields', detail: 'Se necesita nombre y un transcript con contenido.' }));
    }
    messages = construirPromptResumen({ nombre, detalle, transcript, historial });
    // El modelo gratis de Zen razona antes de responder y el razonamiento
    // consume del mismo max_tokens: con 1200 el JSON salía truncado (medido
    // 19-08-2026). 3000 deja aire para razonar Y responder completo.
    maxTokens = 3000;
  } else if (modo === 'idea') {
    const pregunta = recortar(body?.pregunta, 600);
    if (!nombre || !pregunta) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'missing_fields', detail: 'Se necesita nombre y pregunta.' }));
    }
    messages = construirPromptIdea({ nombre, detalle, pregunta, historial });
    maxTokens = 1500; // mismo margen para el razonamiento del modelo gratis
  } else {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'bad_mode' }));
  }

  const model = process.env.COPILOTO_MODEL || DEFAULT_FREE_MODEL;
  const quien = usuarioDe(req);
  const t0 = Date.now();

  try {
    const upstream = await fetch(OPENCODE_ZEN_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: maxTokens }),
    });
    if (!upstream.ok) {
      await registrarUso({ servicio: 'copiloto_llm', modelo: model, usuario: quien, unidades: 0, costo_usd: 0, ok: false, ms: Date.now() - t0 });
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'llm_upstream', status: upstream.status }));
    }
    const data = await upstream.json();
    const texto = data?.choices?.[0]?.message?.content || '';
    const tokens = Number(data?.usage?.total_tokens) || 0;
    await registrarUso({ servicio: 'copiloto_llm', modelo: model, usuario: quien, unidades: tokens, costo_usd: 0, ok: true, ms: Date.now() - t0 });

    res.setHeader('Content-Type', 'application/json');
    if (modo === 'idea') {
      res.statusCode = 200;
      return res.end(JSON.stringify({ respuesta: texto.trim().slice(0, 4000) }));
    }
    const resumen = validarResumen(extraerJson(texto));
    if (!resumen) {
      // El transcript quedó guardado en el cliente: reintentar el resumen no
      // pierde nada. Mejor un error claro que una sesión a medias.
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'bad_llm_output' }));
    }
    res.statusCode = 200;
    return res.end(JSON.stringify({ resumen }));
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'llm_failed', detail: String(err && err.message).slice(0, 300) }));
  }
}

function recortar(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
