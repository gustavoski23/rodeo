// RODEO — proxy serverless hacia OpenCode Zen
// La API key vive SOLO aquí (env var OPENCODE_API_KEY), nunca en el frontend.
// Modelos configurables: MODEL_CHAT (conversación, latencia baja) y MODEL_CREATIVE (generación).

const OPENCODE_URL = 'https://opencode.ai/zen/v1/chat/completions';

const MODELS = {
  chat: process.env.MODEL_CHAT || 'kimi-k2.6',
  creative: process.env.MODEL_CREATIVE || 'kimi-k2.7-code',
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

  const { mode = 'chat', messages, max_tokens } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'missing_messages' }));
  }

  // Límites duros para que un bug del frontend no queme crédito
  const safeMessages = messages.slice(-40).map((m) => ({
    role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
    content: String(m.content).slice(0, 8000),
  }));
  // Kimi es razonador: el pensamiento consume tokens ANTES del JSON, así que el
  // techo debe ser holgado o el JSON se trunca. 8000 deja aire de sobra.
  const safeMaxTokens = Math.min(Number(max_tokens) || 2500, 8000);
  const model = MODELS[mode] || MODELS.chat;

  try {
    const upstream = await fetch(OPENCODE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: safeMaxTokens,
        temperature: TEMPS[mode] ?? TEMPS.chat,
        messages: safeMessages,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'upstream_error', status: upstream.status, detail: detail.slice(0, 500) }));
    }

    const data = await upstream.json();
    const choice = data.choices && data.choices[0];
    const msg = (choice && choice.message) || {};
    // Kimi es un modelo razonador: el pensamiento llega en reasoning_content.
    // Al frontend solo le pasamos la respuesta limpia.
    // Si Kimi consumió el presupuesto razonando y no dejó content, NO es un error:
    // devolvemos 200 con content vacío + finish_reason para que el cliente reintente
    // con más tokens (callJSON reintenta ante content no parseable).
    const content = msg.content || '';

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        content,
        model: data.model,
        finish_reason: choice && choice.finish_reason,
        cost: data.cost,
        usage: data.usage,
      })
    );
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'proxy_failed', detail: String(err && err.message).slice(0, 300) }));
  }
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
