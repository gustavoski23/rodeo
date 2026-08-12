// Hablarte — proxy serverless hacia OpenCode Zen
// La API key vive SOLO aquí (env var OPENCODE_API_KEY), nunca en el frontend.
// Modelos configurables: MODEL_GO_CHAT y MODEL_GO_CREATIVE (con aliases legacy).

import {
  DEFAULT_GO_CHAT_MODEL,
  DEFAULT_GO_CREATIVE_MODEL,
  openCodeContent,
  requestOpenCode,
  resolveGoModel,
} from './_opencode.js';
import { registrarUso, usuarioDe } from './_uso.js';

// Luna usa la cuota Go y no exige activar proveedores alojados en China. Es el
// modelo accesible más económico con esa preferencia desactivada y responde con
// latencia baja. Los aliases legacy solo ganan si son compatibles con Go.
const MODELS = {
  chat: resolveGoModel(
    process.env.MODEL_GO_CHAT || process.env.MODEL_CHAT,
    DEFAULT_GO_CHAT_MODEL,
  ),
  creative: resolveGoModel(
    process.env.MODEL_GO_CREATIVE || process.env.MODEL_CREATIVE,
    DEFAULT_GO_CREATIVE_MODEL,
  ),
};

// Sin temperature explícita quedábamos con el default del proveedor. Subirla
// ensancha el muestreo y ayuda a que TALK no caiga siempre en la misma frase.
// No es la causa principal de la repetición (eso es el prompt), pero suma.
const TEMPS = {
  chat: 0.9,
  creative: 0.85,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'missing_api_key', detail: 'Configura OPENCODE_API_KEY en Vercel.' }));
  }

  // Protección ligera: si APP_PASS está configurado, el frontend debe mandarlo.
  // Evita que cualquiera que encuentre la URL use tu crédito.
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

  const { mode = 'chat', messages, max_tokens, stream: wantsStream = false } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'missing_messages' }));
  }

  // Límites duros para que un bug del frontend no queme crédito.
  // OJO: preservar el SYSTEM (mensaje 0) al recortar — es el contrato del
  // flujo (esquema JSON estricto, marcadores ⟦en||es⟧, reglas del rol). Sin
  // esto, tras ~20 turnos de ROLEPLAY/TALK cae fuera de la ventana y el
  // modelo empieza a devolver texto plano en vez de JSON.
  const hasSystem = messages[0] && messages[0].role === 'system';
  const head = hasSystem ? [messages[0]] : [];
  const tail = messages.slice(hasSystem ? 1 : 0).slice(-(40 - head.length));
  const safeMessages = [...head, ...tail].map((m) => ({
    role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
    content: String(m.content).slice(0, 8000),
  }));
  // Kimi es razonador: el pensamiento consume tokens ANTES del JSON, así que el
  // techo debe ser holgado o el JSON se trunca. 8000 deja aire de sobra.
  const safeMaxTokens = Math.min(Number(max_tokens) || 2500, 8000);
  const model = MODELS[mode] || MODELS.chat;
  const quien = usuarioDe(req);
  const t0 = Date.now();

  try {
    const requestBody = {
      model,
      max_tokens: safeMaxTokens,
      temperature: TEMPS[mode] ?? TEMPS.chat,
      stream: wantsStream === true,
      messages: safeMessages,
    };
    const { response: upstream, model: servedModel, protocol } = await requestOpenCode(apiKey, requestBody);

    if (!upstream.ok) {
      await registrarUso({
        servicio: 'opencode',
        modelo: servedModel,
        modo: mode,
        usuario: quien,
        ok: false,
        ms: Date.now() - t0,
      });
      return aiUnavailable(res);
    }

    // ── Modo streaming (SSE) ───────────────────────────────────────────────
    // Kimi razona antes de escribir: el razonamiento llega en reasoning_content
    // y NO se reenvía al cliente. Solo van los deltas de content, para que la
    // burbuja crezca con la respuesta de verdad y no con el pensamiento crudo.
    if (wantsStream === true && upstream.body) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',   // evita que un proxy bufferee y mate el stream
      });

      // Comentario SSE inmediato: fuerza el envío de cabeceras y confirma al
      // cliente que la conexión está viva mientras el modelo aún razona.
      res.write(': open\n\n');
      if (typeof res.flush === 'function') res.flush();

      const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let finishReason = null, usage = null, cost = null;

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              if (protocol === 'responses') {
                if (j.type === 'response.output_text.delta' && j.delta) send({ delta: j.delta });
                if (j.type === 'response.completed' && j.response) {
                  finishReason = j.response.status === 'completed' ? 'stop' : j.response.status;
                  usage = j.response.usage || usage;
                }
                if (j.cost) cost = j.cost;
                continue;
              }
              const choice = j.choices && j.choices[0];
              const delta = (choice && choice.delta) || {};
              if (delta.content) send({ delta: delta.content });
              if (choice && choice.finish_reason) finishReason = choice.finish_reason;
              if (j.usage) usage = j.usage;
              if (j.cost) cost = j.cost;
            } catch { /* linea partida entre chunks: se completa en la siguiente vuelta */ }
          }
        }
        send({ done: true, finish_reason: finishReason, cost, usage, model: servedModel });
        await registrarUso({
          servicio: 'opencode',
          modelo: servedModel,
          modo: mode,
          usuario: quien,
          tokens_in: usage && (usage.prompt_tokens ?? usage.input_tokens),
          tokens_out: usage && (usage.completion_tokens ?? usage.output_tokens),
          costo_usd: cost,
          ok: true,
          ms: Date.now() - t0,
        });
      } catch (streamErr) {
        send({ done: true, error: 'stream_broken', detail: String(streamErr && streamErr.message).slice(0, 200) });
        await registrarUso({
          servicio: 'opencode',
          modelo: servedModel,
          modo: mode,
          usuario: quien,
          ok: false,
          ms: Date.now() - t0,
        });
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const data = await upstream.json();
    const choice = data.choices && data.choices[0];
    const msg = (choice && choice.message) || {};
    // Kimi es un modelo razonador: el pensamiento llega en reasoning_content.
    // Al frontend solo le pasamos la respuesta limpia.
    // Si Kimi consumió el presupuesto razonando y no dejó content, NO es un error:
    // devolvemos 200 con content vacío + finish_reason para que el cliente reintente
    // con más tokens (callJSON reintenta ante content no parseable).
    const content = openCodeContent(data, protocol);
    const responseModel = data.model || servedModel;

    await registrarUso({
      servicio: 'opencode',
      modelo: responseModel,
      modo: mode,
      usuario: quien,
      tokens_in: data.usage && (data.usage.prompt_tokens ?? data.usage.input_tokens),
      tokens_out: data.usage && (data.usage.completion_tokens ?? data.usage.output_tokens),
      costo_usd: data.cost,
      ok: true,
      ms: Date.now() - t0,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        content,
        model: responseModel,
        finish_reason: protocol === 'responses'
          ? (data.status === 'completed' ? 'stop' : data.status)
          : (choice && choice.finish_reason),
        cost: data.cost,
        usage: data.usage,
      })
    );
  } catch (err) {
    return aiUnavailable(res);
  }
}

function aiUnavailable(res) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({
    error: 'ai_temporarily_unavailable',
    detail: 'La IA no está disponible en este momento. Intenta de nuevo en un minuto.',
  }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) { // 1MB: ningún request legítimo de la app se acerca
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
