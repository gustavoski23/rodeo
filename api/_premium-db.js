// RODEO — Premium en servidor: verifica la sesión de Supabase y persiste la
// suscripción cripto atada al usuario (tabla public.suscripciones_premium).
//
// POR QUÉ vive en el servidor y no en el navegador: dar Premium es dinero. Si
// el navegador pudiera escribir la tabla, cualquiera con la key pública se
// acreditaría solo. Aquí se usa la service_role key (salta RLS) y SOLO después
// de que /api/cripto re-confirmó el pago contra la cadena. El cliente nunca
// toca esta tabla para escribir; a lo sumo LEE su propia fila por RLS.
//
// REGLA DE ORO (igual que _uso.js): esto es un añadido. Si Supabase no está
// configurado o falla, NADA se rompe — el cobro sigue funcionando en el
// navegador; simplemente no queda atado a la cuenta. Nunca lanza al caller.
//
// Node ESM, SIN dependencias npm.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cablhejzsxqgwdvyzqei.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
// Key pública "publishable/anon": va en el bundle del cliente, así que no es
// secreta. Solo se usa como `apikey` al validar el token del usuario.
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_jNRFSwU8ar-DZ0UY2_mQfg_Nz7LKXYI';

const TIMEOUT_MS = 4000;
const DIA_MS = 86_400_000;

/** Días de validez del plan (mensual 30, anual 365), o null para la prueba. */
function periodoDias(plan) {
  if (plan === 'rodeo-monthly') return 30;
  if (plan === 'rodeo-yearly') return 365;
  return null;
}

/** Vencimiento ISO = pago + período, o null si no hay período o no hay hora. */
export function vencimientoISO(plan, paidAtMs) {
  const dias = periodoDias(plan);
  if (dias === null || typeof paidAtMs !== 'number' || !Number.isFinite(paidAtMs)) return null;
  return new Date(paidAtMs + dias * DIA_MS).toISOString();
}

/** El Bearer token del header Authorization, o '' si no viene bien formado. */
function bearerDe(req) {
  const raw = req && req.headers && req.headers['authorization'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string') return '';
  const m = /^Bearer\s+(.+)$/i.exec(v.trim());
  // Un JWT ronda los cientos de chars; el tope es defensivo.
  return m && m[1].length <= 4000 ? m[1].trim() : '';
}

/**
 * Verifica el access token del usuario contra Supabase Auth y devuelve
 * { userId, email } si es válido, o null. Es una llamada a /auth/v1/user, sin
 * SDK: si el token es bueno, Supabase responde 200 con el usuario.
 */
export async function verificarSesion(req) {
  const token = bearerDe(req);
  if (token === '') return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null; // 401 = token vencido/inválido: no es sesión
    const user = await res.json();
    if (!user || typeof user.id !== 'string') return null;
    return { userId: user.id, email: typeof user.email === 'string' ? user.email : null };
  } catch {
    // Red caída / timeout: tratamos como "sin sesión verificable". El pago
    // sigue su curso en el navegador; solo no se ata a la cuenta esta vez.
    return null;
  }
}

/**
 * Acredita un pago confirmado al usuario. INSERT idempotente: `tx_id` es la PK,
 * así que reclamar el mismo pago dos veces (el navegador sondea) o desde otra
 * cuenta se ignora — gana quien lo reclamó primero. Devuelve true si la fila
 * quedó (de esta llamada o de una previa), false si no se pudo persistir.
 */
export async function acreditarPago(datos) {
  if (!SERVICE_KEY) return false; // sin service key: la función está apagada
  const { userId, email, chain, plan, txId, amountBaseUnits, reference, paidAtMs } = datos;
  if (typeof txId !== 'string' || txId === '' || typeof userId !== 'string') return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/suscripciones_premium`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        // Upsert: ante choque con la PK (tx_id), IGNORA en vez de 409. Así el
        // sondeo repetido no es un error y nadie sobrescribe al primer dueño.
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({
        tx_id: txId,
        user_id: userId,
        email: email || null,
        chain,
        plan,
        amount_base_units: String(amountBaseUnits),
        reference: reference || null,
        paid_at: typeof paidAtMs === 'number' ? new Date(paidAtMs).toISOString() : null,
        expires_at: vencimientoISO(plan, paidAtMs),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * La suscripción ACTIVA del usuario, o null. Lee sus filas con la service key
 * (salta RLS; ya conocemos su userId del token verificado) y elige la vigente:
 * la prueba (sin vencimiento) o una cuyo `expires_at` sigue en el futuro.
 * Devuelve el comprobante con la forma que consume el cliente (CryptoReceipt).
 */
export async function premiumDeUsuario(userId, ahoraMs) {
  if (!SERVICE_KEY || typeof userId !== 'string' || userId === '') return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const q =
      `user_id=eq.${encodeURIComponent(userId)}` +
      `&select=chain,plan,tx_id,amount_base_units,paid_at,expires_at` +
      `&order=created_at.desc&limit=10`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/suscripciones_premium?${q}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const filas = await res.json();
    if (!Array.isArray(filas)) return null;
    return elegirVigente(filas, typeof ahoraMs === 'number' ? ahoraMs : Date.now());
  } catch {
    return null;
  }
}

/** Elige la fila vigente (sin vencer) más reciente y la mapea a CryptoReceipt. */
export function elegirVigente(filas, ahoraMs) {
  for (const fila of filas) {
    const vence = fila.expires_at ? Date.parse(fila.expires_at) : null;
    const vigente = vence === null || (Number.isFinite(vence) && vence > ahoraMs);
    if (!vigente) continue;
    return {
      chain: fila.chain,
      plan: fila.plan,
      txId: fila.tx_id,
      amountBaseUnits: String(fila.amount_base_units),
      paidAtMs: fila.paid_at ? Date.parse(fila.paid_at) : null,
    };
  }
  return null;
}
