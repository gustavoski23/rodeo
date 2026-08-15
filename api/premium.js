// Hablarte — POST /api/premium : activa/valida licencias de Premium
//
// QUÉ ES: un proxy fino a la License API PÚBLICA de Lemon Squeezy. El frontend
// (js/premium.js) manda la clave que Gus recibió al pagar y aquí la
// activamos/validamos contra Lemon Squeezy, devolviendo un JSON limpio.
//
// POR QUÉ un proxy y no llamar a Lemon desde el navegador:
//   1. Un solo sitio para la lógica anti-fraude (LEMON_STORE_ID) y los mensajes
//      humanos en español.
//   2. Evita problemas de CORS y deja la puerta abierta a auditar/loggear.
//
// DEGRADACIÓN LIMPIA (patrón de api/cron-drop.js): la License API de Lemon es
// PÚBLICA — NO necesita API key ni ninguna env var para funcionar. Así que este
// endpoint funciona apenas Gus cree su producto en Lemon Squeezy, sin tocar
// Vercel. La única env OPCIONAL es LEMON_STORE_ID (anti-clave-ajena). Sin ella
// igual sirve; solo que no verifica que la clave sea de la tienda de Hablarte.
//
// Node ESM, SIN dependencias npm.

const LS_BASE = 'https://api.lemonsqueezy.com/v1/licenses';
// Nombre con el que registramos cada activación en Lemon (aparece en su panel).
const INSTANCE_NAME = 'rodeo';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  // Vercel ya parsea el JSON si el Content-Type es application/json; si no,
  // lo leemos a mano (mismo patrón que api/chat.js).
  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { ok: false, error: 'No entendí la petición. Intenta de nuevo.' });
  }

  const licenseKey = String((body && body.license_key) || '').trim();
  // 'activate' (primera vez, canjea la clave) | 'validate' (revalidación silenciosa).
  const action = body && body.action === 'validate' ? 'validate' : 'activate';
  const instanceId = String((body && body.instance_id) || '').trim();

  if (!licenseKey) {
    return json(res, 400, { ok: false, error: 'Falta la clave.' });
  }

  // Lemon quiere los campos como form-urlencoded (así está en su doc).
  const form = new URLSearchParams();
  form.set('license_key', licenseKey);
  if (action === 'activate') form.set('instance_name', INSTANCE_NAME);
  if (action === 'validate' && instanceId) form.set('instance_id', instanceId);

  // ── Llamada a Lemon Squeezy ────────────────────────────────────────────────
  let upstream;
  try {
    upstream = await fetch(`${LS_BASE}/${action}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
  } catch {
    // Red caída / DNS / timeout: NO es culpa de la clave. Sin flag `dead`, para
    // que la revalidación de fondo le dé el beneficio de la duda (siga Premium).
    return json(res, 502, { ok: false, error: 'No pude conectar con el servidor de pagos. Revisa tu internet e intenta de nuevo.' });
  }

  // Rate limit de Lemon: también transitorio, sin `dead`.
  if (upstream.status === 429) {
    return json(res, 429, { ok: false, error: 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.' });
  }
  // Falla del lado de Lemon (5xx): transitorio.
  if (upstream.status >= 500) {
    return json(res, 502, { ok: false, error: 'El servidor de pagos está teniendo problemas. Intenta de nuevo en un rato.' });
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return json(res, 502, { ok: false, error: 'El servidor de pagos respondió raro. Intenta de nuevo en un momento.' });
  }

  // Lemon pone activated/valid + un `error` humano DENTRO del cuerpo, incluso
  // cuando responde 400/404. Por eso decidimos por el cuerpo, no por el status.
  const okFlag = action === 'activate' ? data.activated === true : data.valid === true;
  const lk = (data && data.license_key) || {};
  const status = lk.status || null; // active | inactive | expired | disabled

  if (!okFlag) {
    // Clave rechazada por Lemon (respuesta REAL, no error de red). En modo
    // 'validate' esto significa que la suscripción ya no vive → `dead:true`
    // para que el frontend desactive Premium. En 'activate' es un error que el
    // usuario puede corregir (clave mal pegada, etc.), sin `dead`.
    return json(res, 200, {
      ok: false,
      dead: action === 'validate',
      error: mapError(data.error, status),
      status,
    });
  }

  // ── Anti-clave-ajena (opcional) ────────────────────────────────────────────
  // Si LEMON_STORE_ID está en Vercel, la clave DEBE ser de esa tienda. Evita
  // que alguien active Hablarte con una clave comprada en OTRO producto de Lemon.
  const storeId = process.env.LEMON_STORE_ID;
  if (storeId && data.meta && String(data.meta.store_id) !== String(storeId)) {
    return json(res, 200, { ok: false, error: 'Esa clave no es de Hablarte.' });
  }

  // Una clave que Lemon aceptó pero cuyo estado ya no es 'active' (vencida,
  // deshabilitada) NO da Premium. En validate marca `dead` para desactivar.
  if (status && status !== 'active') {
    return json(res, 200, { ok: false, dead: action === 'validate', error: mapError(null, status), status });
  }

  // ── Éxito ──────────────────────────────────────────────────────────────────
  return json(res, 200, {
    ok: true,
    status,
    instance_id: (data.instance && data.instance.id) || instanceId || null,
    expires_at: lk.expires_at || null,
    // Pista NO sensible para saludar al usuario (nunca guardamos nada del lado servidor).
    email: (data.meta && data.meta.customer_email) || null,
  });
}

// ── Traduce el error crudo de Lemon a español humano ──────────────────────────
function mapError(rawError, status) {
  const s = String(rawError || '').toLowerCase();
  if (status === 'expired' || /expired/.test(s)) {
    return 'Tu suscripción venció. Renueva para seguir con Premium.';
  }
  if (status === 'disabled' || /disabled/.test(s)) {
    return 'Esa clave fue desactivada.';
  }
  if (/activation limit|activation_limit/.test(s)) {
    return 'Esa clave ya se usó en demasiados aparatos. Desactívala en uno o escríbeme.';
  }
  if (/not found|no encontr/.test(s)) {
    return 'No encontré esa clave. Revísala — se pega completa, con guiones y todo.';
  }
  if (status === 'inactive') {
    return 'Esa clave todavía no está activa. Si acabas de pagar, espera un momento y reintenta.';
  }
  // Fallback: usa el mensaje de Lemon si vino, o algo genérico.
  return rawError ? String(rawError).slice(0, 160) : 'No pude activar esa clave. Revísala e intenta de nuevo.';
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
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
