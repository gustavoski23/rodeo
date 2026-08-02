// RODEO — /api/cripto : cobro de la suscripción en cripto (USDC).
//
// QUÉ ES: un proxy fino al receptor de cobros de Pangea Wallet
// (gustavoski23/pangea-wallet, ADR-0009). Dos acciones:
//   { action: 'intent', chain: 'solana'|'stellar', plan: '...' }
//       → crea la intención y devuelve dirección, referencia/memo y enlace de pago
//   { action: 'status', intent: '<token>' }
//       → dice si el pago ya llegó a la cadena
//
// POR QUÉ un proxy y no llamar a Pangea desde el navegador:
//   1. Los endpoints de Pangea están pensados SERVIDOR A SERVIDOR: no traen
//      cabeceras CORS, así que un fetch desde el navegador de RODEO no podría
//      leer la respuesta.
//   2. La URL del receptor queda como variable de entorno del servidor, no
//      incrustada en el bundle público.
//   3. Un solo sitio donde traducir los errores a español humano.
//
// DEGRADACIÓN LIMPIA (mismo patrón que api/premium.js): si PANGEA_PAYMENTS_URL
// no está configurada, responde 503 con un mensaje claro y el frontend
// muestra el pago en cripto como "pronto". Nada se rompe.
//
// SEGURIDAD — lo que este proxy NO hace y por qué:
//   · No decide el monto: lo pone el catálogo de planes del servidor de Pangea.
//     Aquí solo viaja el identificador del plan.
//   · No acredita nada por su cuenta: `paid:true` sale de releer la cadena.
//   · Un 502 del receptor significa "no pude comprobarlo", NO "no pagó": se
//     propaga como tal para que el frontend reintente en vez de negar acceso.
//
// Node ESM, SIN dependencias npm.

// Planes que este frontend puede pedir. La lista existe para no reenviar a
// ciegas lo que mande el navegador; los montos viven en Pangea.
const PLANES = new Set(['rodeo-monthly', 'rodeo-yearly']);
const REDES = new Set(['solana', 'stellar']);

const TIMEOUT_MS = 15000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const base = String(process.env.PANGEA_PAYMENTS_URL || '').trim().replace(/\/+$/, '');
  if (!base) {
    return json(res, 503, {
      ok: false,
      error: 'El pago en cripto todavía no está encendido.',
      motivo: 'sin_configurar',
    });
  }

  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { ok: false, error: 'No entendí la petición. Intenta de nuevo.' });
  }

  const action = body && body.action;

  if (action === 'intent') {
    const plan = String((body && body.plan) || '').trim();
    const chain = String((body && body.chain) || '').trim();
    if (!PLANES.has(plan) || !REDES.has(chain)) {
      return json(res, 400, { ok: false, error: 'Ese plan o esa red no existen.' });
    }
    return proxy(res, `${base}/api/payments/intent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ plan, chain, label: 'RODEO Premium' }),
    });
  }

  if (action === 'status') {
    const intent = String((body && body.intent) || '');
    // Un token legítimo ronda los 400 caracteres; el tope es defensivo.
    if (!intent || intent.length > 2000) {
      return json(res, 400, { ok: false, error: 'No entendí la petición. Intenta de nuevo.' });
    }
    const url = `${base}/api/payments/status?intent=${encodeURIComponent(intent)}`;
    return proxy(res, url, { method: 'GET', headers: { accept: 'application/json' } });
  }

  return json(res, 400, { ok: false, error: 'No entendí la petición. Intenta de nuevo.' });
}

/** Reenvía al receptor y normaliza la respuesta a { ok, ... }. */
async function proxy(res, url, init) {
  let upstream;
  try {
    upstream = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    // Red caída / timeout: transitorio. NO es "no pagó".
    return json(res, 502, {
      ok: false,
      error: 'No pude conectar con el servidor de pagos. Intenta de nuevo en un momento.',
      transitorio: true,
    });
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return json(res, 502, {
      ok: false,
      error: 'El servidor de pagos respondió raro. Intenta de nuevo en un momento.',
      transitorio: true,
    });
  }

  if (!upstream.ok) {
    // 502 del receptor = no pudo leer la cadena. Se marca transitorio para
    // que el frontend siga preguntando en vez de dar el cobro por perdido.
    return json(res, upstream.status, {
      ok: false,
      error: mapError(data && data.code, data && data.error),
      codigo: (data && data.code) || null,
      transitorio: upstream.status === 502 || upstream.status === 429,
    });
  }

  return json(res, 200, { ok: true, ...data });
}

// ── Traduce el código del receptor a español humano de RODEO ─────────────────
function mapError(code, fallback) {
  switch (code) {
    case 'NOT_CONFIGURED':
      return 'El pago en cripto todavía no está encendido.';
    case 'UNSUPPORTED_CHAIN':
      return 'Esa red no está disponible para pagar ahora mismo.';
    case 'INVALID_INTENT':
      return 'Ese cobro venció. Genera uno nuevo y vuelve a intentar.';
    case 'RATE_LIMITED':
      return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
    case 'NETWORK_ERROR':
      return 'No pude consultar la red en este momento. Sigo intentando.';
    default:
      return fallback ? String(fallback).slice(0, 160) : 'Algo salió mal. Intenta de nuevo.';
  }
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(obj));
}

// Lee el cuerpo crudo si Vercel no lo parseó (mismo helper que api/chat.js),
// con tope de 1MB por si acaso — ningún request legítimo se acerca.
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) {
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
