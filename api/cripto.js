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
// DEGRADACIÓN SEGURA: si Pangea no está disponible, responde con un mensaje
// humano y el frontend bloquea el cobro. Nunca se concede Premium como
// sustituto de una confirmación on-chain.
//
// SEGURIDAD — lo que este proxy NO hace y por qué:
//   · No decide el monto: lo pone el catálogo de planes del servidor de Pangea.
//     Aquí solo viaja el identificador del plan.
//   · No acredita nada por su cuenta: `paid:true` sale de releer la cadena.
//   · Un 502 del receptor significa "no pude comprobarlo", NO "no pagó": se
//     propaga como tal para que el frontend reintente en vez de negar acceso.
//
// Node ESM, SIN dependencias npm.

import { acreditarPago, premiumDeUsuario, verificarSesion } from './_premium-db.js';

// Planes que este frontend puede pedir. La lista existe para no reenviar a
// ciegas lo que mande el navegador; los montos viven en Pangea.
const PLANES = new Set(['rodeo-monthly', 'rodeo-yearly']);
const REDES = new Set(['solana', 'stellar']);

/** Wallet de Pangea (la nuestra). Sobrescribible con PANGEA_PAYMENTS_URL. */
const PANGEA_URL_POR_DEFECTO = 'https://pangea-wallet.vercel.app';

const TIMEOUT_MS = 15000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  // Por defecto apunta a la wallet de Gus; PANGEA_PAYMENTS_URL lo sobrescribe
  // (p. ej. para probar contra un despliegue de vista previa). Si esa wallet
  // todavía no tiene el receptor desplegado o sin configurar, responde 404/503
  // y el frontend cae solo al modo demostración: nada se rompe.
  const base = String(process.env.PANGEA_PAYMENTS_URL || PANGEA_URL_POR_DEFECTO)
    .trim()
    .replace(/\/+$/, '');
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
    if ((!PLANES.has(plan) && plan !== 'rodeo-test') || !REDES.has(chain)) {
      return json(res, 400, { ok: false, error: 'Ese plan o esa red no existen.' });
    }
    // El plan de 0,10 USDC existe únicamente para una prueba controlada.
    // Vercel define VERCEL_ENV=preview en despliegues de rama; producción lo
    // rechaza aunque alguien llame al endpoint a mano con `rodeo-test`.
    if (plan === 'rodeo-test' && !testPlanEnabled()) {
      return json(res, 403, {
        ok: false,
        error: 'El modo de prueba no está disponible en este entorno.',
        motivo: 'modo_prueba_no_disponible',
      });
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
    const r = await fetchReceptor(url, { method: 'GET', headers: { accept: 'application/json' } });
    if (r.error) return json(res, r.error.status, r.error.payload);
    const data = r.data;

    // ATAR EL PAGO A LA CUENTA. Solo cuando la cadena YA confirmó (paid + txId)
    // y el navegador mandó una sesión válida. Verificar el token es una llamada
    // de red, así que se hace únicamente aquí —cuando de verdad hay algo que
    // acreditar—, no en cada sondeo. Si no hay sesión o Supabase no está, el
    // cobro sigue igual en el navegador; solo no queda atado a la cuenta.
    let guardado = false;
    if (data && data.paid === true && data.payment && typeof data.payment.txId === 'string') {
      const sesion = await verificarSesion(req);
      if (sesion) {
        guardado = await acreditarPago({
          userId: sesion.userId,
          email: sesion.email,
          chain: data.chain,
          plan: data.plan,
          txId: data.payment.txId,
          amountBaseUnits: data.payment.amountBaseUnits,
          reference: data.reference,
          paidAtMs: data.payment.paidAtMs,
        });
      }
    }
    return json(res, 200, { ok: true, ...data, guardado });
  }

  // ¿Qué Premium tiene la cuenta logueada? Re-lee la tabla (fuente de verdad)
  // para que el Premium siga al usuario a otro aparato: inicia sesión y lo ve.
  if (action === 'mi-premium') {
    const sesion = await verificarSesion(req);
    if (!sesion) return json(res, 200, { ok: true, premium: null });
    const premium = await premiumDeUsuario(sesion.userId);
    return json(res, 200, { ok: true, premium, email: sesion.email });
  }

  return json(res, 400, { ok: false, error: 'No entendí la petición. Intenta de nuevo.' });
}

function testPlanEnabled() {
  return (
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NODE_ENV === 'test' ||
    process.env.CRYPTO_PAYMENT_TEST_MODE === '1'
  );
}

/** Reenvía al receptor y normaliza la respuesta a { ok, ... }. */
async function proxy(res, url, init) {
  const r = await fetchReceptor(url, init);
  if (r.error) return json(res, r.error.status, r.error.payload);
  return json(res, 200, { ok: true, ...r.data });
}

/**
 * Llama al receptor y devuelve el resultado SIN cerrar la respuesta, para que
 * quien llama pueda post-procesarlo (p. ej. `status` acredita el pago antes de
 * responder). Devuelve `{ data }` en éxito o `{ error: { status, payload } }`
 * con el mismo {ok:false,...} que se enviaría tal cual.
 */
async function fetchReceptor(url, init) {
  // Si la wallet tiene "Vercel Authentication" (SSO) activada, sus URLs
  // *.vercel.app responden una página de login en vez del API. El token de
  // "Protection Bypass for Automation" (Vercel → Settings → Deployment
  // Protection) deja pasar la llamada servidor-a-servidor. Opcional: si no
  // está, no se manda nada y todo funciona igual cuando el SSO no cubre la URL.
  const bypass = String(process.env.PANGEA_BYPASS_TOKEN || '').trim();
  const headers = bypass
    ? { ...(init.headers || {}), 'x-vercel-protection-bypass': bypass }
    : init.headers;

  let upstream;
  try {
    upstream = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    // Red caída / timeout: transitorio. NO es "no pagó".
    return {
      error: {
        status: 502,
        payload: {
          ok: false,
          error: 'No pude conectar con el servidor de pagos. Intenta de nuevo en un momento.',
          transitorio: true,
        },
      },
    };
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    // El receptor no devolvió JSON. La causa típica es que el código todavía
    // no está desplegado (404 del SPA) o que el SSO de la wallet está
    // devolviendo su página de login. Se distingue para el diagnóstico.
    const ct = upstream.headers.get('content-type') || '';
    const esLogin = upstream.status === 401 || upstream.status === 403 || /text\/html/.test(ct);
    return {
      error: {
        status: esLogin ? 503 : 502,
        payload: {
          ok: false,
          error: esLogin
            ? 'El servidor de pagos está protegido y rechazó la conexión.'
            : 'El servidor de pagos respondió raro. Intenta de nuevo en un momento.',
          // 404/login = configuración pendiente → el frontend cae a modo demo.
          motivo: esLogin || upstream.status === 404 ? 'sin_configurar' : undefined,
          transitorio: !esLogin && upstream.status !== 404,
        },
      },
    };
  }

  if (!upstream.ok) {
    // 502 del receptor = no pudo leer la cadena. Se marca transitorio para
    // que el frontend siga preguntando en vez de dar el cobro por perdido.
    return {
      error: {
        status: upstream.status,
        payload: {
          ok: false,
          error: mapError(data && data.code, data && data.error),
          codigo: (data && data.code) || null,
          transitorio: upstream.status === 502 || upstream.status === 429,
        },
      },
    };
  }

  return { data };
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
