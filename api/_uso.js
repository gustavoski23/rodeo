// Hablarte — registro de consumo (IA + voz) para el panel /uso.
//
// Escribe una fila por llamada de pago en la tabla public.uso_ia de Supabase,
// vía PostgREST con la service_role key. Esa key vive SOLO aquí (env var en
// Vercel) y salta RLS por diseño: la tabla no tiene policies, así que nadie con
// la key pública puede leer el gasto.
//
// REGLA DE ORO: registrar NUNCA puede tumbar una respuesta al usuario. Todo va
// envuelto en try/catch, con timeout corto, y si no hay configuración es un
// no-op silencioso (la app funciona igual, simplemente no se mide).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cablhejzsxqgwdvyzqei.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Deepgram no devuelve costo, así que lo estimamos por tarifa. Ajustables por
// env var el día que cambie el plan; los defaults son las tarifas de pago por
// uso publicadas para aura-2 (TTS) y nova-3 (STT).
const USD_TTS_POR_1K_CHARS = Number(process.env.PRECIO_TTS_1K || 0.03);
const USD_STT_POR_MINUTO = Number(process.env.PRECIO_STT_MIN || 0.0052);

export function costoTTS(caracteres) {
  return (Number(caracteres) || 0) / 1000 * USD_TTS_POR_1K_CHARS;
}
export function costoSTT(segundos) {
  return (Number(segundos) || 0) / 60 * USD_STT_POR_MINUTO;
}

/** Etiqueta del tester. La manda el frontend en x-rodeo-user; sin ella, anónimo. */
export function usuarioDe(req) {
  const raw = req && req.headers && req.headers['x-rodeo-user'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (typeof v === 'string' && v.trim() ? v.trim() : 'anónimo').slice(0, 60);
}

/**
 * Inserta una fila de uso. Devuelve siempre (nunca lanza).
 * Se hace `await` a propósito en vez de fire-and-forget: en serverless el
 * proceso puede congelarse en cuanto respondes, y una escritura suelta se
 * perdería. El costo es una petición corta (~50 ms) contra la misma región.
 */
export async function registrarUso(fila) {
  if (!SERVICE_KEY) return; // sin key configurada: no-op silencioso
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    await fetch(`${SUPABASE_URL}/rest/v1/uso_ia`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        servicio: fila.servicio,
        modelo: fila.modelo || null,
        modo: fila.modo || null,
        usuario: fila.usuario || 'anónimo',
        tokens_in: Math.round(Number(fila.tokens_in) || 0),
        tokens_out: Math.round(Number(fila.tokens_out) || 0),
        unidades: Number(fila.unidades) || 0,
        costo_usd: Number(fila.costo_usd) || 0,
        ok: fila.ok !== false,
        ms: Math.round(Number(fila.ms) || 0),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
  } catch {
    // Medir es secundario: si Supabase está pausado, caído o lento, la app
    // sigue exactamente igual para el usuario.
  }
}
