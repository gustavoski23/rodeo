// Hablarte — CRON: calentador de arranque en frío (pre-genera una edición genérica)
//
// HONESTIDAD sobre qué es y qué NO es esto:
// El motor real de Hablarte DROP es el frontend, que teje las SEMILLAS del DNA de
// Gus (state.dna) — datos privados que viven en su localStorage y que el servidor
// NUNCA ve. Por eso este cron SOLO puede pre-cocinar una edición GENÉRICA
// ('sorpréndeme', SIN semillas). Es un extra para el primer arranque / caché
// vacía (que el usuario abra la app y tenga algo instantáneo mientras el drop
// personalizado se cocina), NO el corazón del producto.
//
// Vercel llama a este endpoint según "crons" en vercel.json (una vez al día).
// Node ESM, SIN dependencias npm.

import { generarEdicionGenerica, fechaDropHoy } from './_drop-prompt.js';

export default async function handler(req, res) {
  // ── Auth: Vercel Cron manda 'authorization: Bearer <CRON_SECRET>' ───────────
  // Si CRON_SECRET NO está configurado → degradación limpia: 200 skipped, nunca
  // un 500 que dispare alertas. El sitio en producción está VIVO; un cron que
  // "falla" en rojo asustaría sin motivo. Si SÍ está configurado, exigimos match.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return json(res, 200, { skipped: 'no CRON_SECRET', note: 'configura CRON_SECRET en Vercel para activar el cron' });
  }
  if (req.headers['authorization'] !== `Bearer ${secret}`) {
    return json(res, 401, { error: 'unauthorized' });
  }

  // ── Precondiciones de generación y de persistencia ──────────────────────────
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    // Sin key no hay generación posible: mejor skipped 200 que 500. El cron
    // volverá a intentar mañana; entretanto el frontend sigue generando en vivo.
    return json(res, 200, { skipped: 'no OPENCODE_API_KEY' });
  }
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) {
    // Sin KV no hay dónde guardar: generar sería quemar crédito para nada.
    return json(res, 200, { skipped: 'no KV' });
  }

  try {
    // Edición genérica: tema 'sorpréndeme', sin semillas (son privadas del cliente).
    const edicion = await generarEdicionGenerica(apiKey, { tema: 'sorpréndeme', semillas: [] });
    const fecha = fechaDropHoy();
    const payload = JSON.stringify({ edicion, fecha, generatedAt: new Date().toISOString(), source: 'cron' });

    // Persistencia vía Upstash Redis REST (KV) con fetch PURO, sin @vercel/kv.
    // SET con el value en el cuerpo del POST (soporta payloads grandes; meterlo en
    // la URL rompería con JSON largo). Sin TTL: drop-today decide frescura por fecha.
    const setRes = await fetch(`${trimSlash(kvUrl)}/set/rodeo:drop:generic`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
      body: payload,
    });
    if (!setRes.ok) {
      const detail = (await setRes.text().catch(() => '')).slice(0, 300);
      return json(res, 502, { error: 'kv_set_failed', status: setRes.status, detail });
    }

    return json(res, 200, { ok: true, fecha, headline: edicion.headline });
  } catch (e) {
    // Falló la generación tras 3 intentos: 502 (no 500) para diferenciar de un
    // bug del handler. No es crítico: es solo el pre-caliente.
    return json(res, 502, { error: 'generation_failed', detail: String((e && e.message) || e).slice(0, 300) });
  }
}

function trimSlash(u) { return String(u).replace(/\/+$/, ''); }

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(obj));
}
