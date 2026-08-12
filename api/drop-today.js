// Hablarte — GET /api/drop-today
// Devuelve la edición GENÉRICA pre-cocinada por el cron desde KV (Upstash REST).
// El frontend lo usa SOLO como fallback instantáneo cuando NO hay cache local
// (store 'rodeo_drop_hoy') NI semillas del DNA que ameriten un drop personalizado.
// Nunca reemplaza al drop sembrado: es el "algo que leer YA" del primer arranque.
//
// Respuestas:
//   200 { edicion, fecha }  → hay edición pre-cocinada
//   204 (sin cuerpo)        → no hay edición, o KV no está configurado
// Node ESM, SIN dependencias npm.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  // Sin KV configurado → 204: el frontend simplemente sigue generando en vivo.
  if (!kvUrl || !kvToken) {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const getRes = await fetch(`${trimSlash(kvUrl)}/get/rodeo:drop:generic`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (!getRes.ok) { res.statusCode = 204; return res.end(); }

    // Upstash REST devuelve { result: <string|null> }. result es el JSON que
    // guardó el cron (o null si la clave no existe).
    const data = await getRes.json().catch(() => null);
    const raw = data && data.result;
    if (!raw) { res.statusCode = 204; return res.end(); }

    let parsed;
    try { parsed = JSON.parse(raw); } catch { res.statusCode = 204; return res.end(); }
    if (!parsed || !parsed.edicion) { res.statusCode = 204; return res.end(); }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    // Cache de borde corta: la edición cambia como mucho una vez al día.
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.end(JSON.stringify({ edicion: parsed.edicion, fecha: parsed.fecha || null }));
  } catch {
    // Cualquier fallo de red con KV: 204, no rompemos el arranque de la app.
    res.statusCode = 204;
    return res.end();
  }
}

function trimSlash(u) { return String(u).replace(/\/+$/, ''); }
