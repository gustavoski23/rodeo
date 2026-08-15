// Hablarte — datos del panel de consumo (/uso.html).
//
// Lee public.uso_ia con la service_role key y devuelve el JSON ya agregado. La
// consulta va SIEMPRE por aquí y nunca desde el navegador: así ni la key ni el
// gasto quedan expuestos a quien abra la app.
//
// Protección: si PANEL_USO_TOKEN está configurado hay que mandarlo (?token=…).
// Sin él, el panel queda abierto a quien tenga la URL — bien para una preview
// privada, mal para producción. La respuesta lo avisa en `protegido`.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cablhejzsxqgwdvyzqei.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TOKEN = process.env.PANEL_USO_TOKEN || '';

const MAX_FILAS = 5000; // techo duro: el panel resume, no lista todo

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const url = new URL(req.url, 'http://x');
  if (TOKEN && url.searchParams.get('token') !== TOKEN) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }
  if (!SERVICE_KEY) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      sin_configurar: true,
      detalle: 'Falta SUPABASE_SERVICE_KEY en Vercel. El registro está apagado y no se ha perdido nada: la app funciona igual, solo no se mide.',
      protegido: !!TOKEN, filas: [], resumen: vacio(),
    }));
  }

  // Ventana: por defecto los últimos 7 días.
  const dias = Math.min(Math.max(Number(url.searchParams.get('dias')) || 7, 1), 90);
  const desde = new Date(Date.now() - dias * 86400000).toISOString();

  try {
    const q = new URLSearchParams({
      select: 'ts,servicio,modelo,modo,usuario,tokens_in,tokens_out,unidades,costo_usd,ok,ms',
      ts: `gte.${desde}`,
      order: 'ts.desc',
      limit: String(MAX_FILAS),
    });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/uso_ia?${q}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 300);
      res.statusCode = 502;
      // 404 aquí = la tabla no existe todavía (falta correr la migración).
      return res.end(JSON.stringify({ error: 'supabase_error', status: r.status, detalle }));
    }
    const filas = await r.json();
    res.statusCode = 200;
    return res.end(JSON.stringify({
      protegido: !!TOKEN,
      dias,
      generado: new Date().toISOString(),
      truncado: filas.length >= MAX_FILAS,
      resumen: agregar(filas),
      filas: filas.slice(0, 60), // últimas llamadas para la tabla en vivo
    }));
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'panel_failed', detalle: String(err && err.message).slice(0, 200) }));
  }
}

function vacio() {
  return { total_usd: 0, llamadas: 0, por_usuario: [], por_servicio: [], por_modelo: [], por_dia: [] };
}

function agregar(filas) {
  const r = vacio();
  const usuarios = new Map(), servicios = new Map(), modelos = new Map(), dias = new Map();
  const sumar = (mapa, clave, fila) => {
    const a = mapa.get(clave) || { clave, usd: 0, llamadas: 0, tokens: 0, unidades: 0, errores: 0 };
    a.usd += Number(fila.costo_usd) || 0;
    a.llamadas += 1;
    a.tokens += (Number(fila.tokens_in) || 0) + (Number(fila.tokens_out) || 0);
    a.unidades += Number(fila.unidades) || 0;
    if (fila.ok === false) a.errores += 1;
    mapa.set(clave, a);
  };
  for (const f of filas) {
    r.total_usd += Number(f.costo_usd) || 0;
    r.llamadas += 1;
    sumar(usuarios, f.usuario || 'anónimo', f);
    sumar(servicios, f.servicio || '—', f);
    sumar(modelos, f.modelo || '—', f);
    sumar(dias, String(f.ts).slice(0, 10), f);
  }
  const orden = (m) => [...m.values()].sort((a, b) => b.usd - a.usd);
  r.por_usuario = orden(usuarios);
  r.por_servicio = orden(servicios);
  r.por_modelo = orden(modelos);
  r.por_dia = [...dias.values()].sort((a, b) => a.clave.localeCompare(b.clave));
  return r;
}
