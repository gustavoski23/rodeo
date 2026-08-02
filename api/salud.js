// RODEO — chequeo de salud del backend.
//
// Responde QUÉ ESTÁ CONFIGURADO, nunca CON QUÉ: solo booleanos y los nombres de
// modelo (que no son secretos y ya viajan al cliente en cada respuesta del
// chat). Sirve para saber, desde fuera y sin exponer nada, si un deploy
// —producción o preview— tiene lo necesario para funcionar de verdad.
//
// El caso que lo motiva: en Vercel las variables se pueden marcar solo para
// Production. Cuando pasa eso, la rama despliega bien pero el chat responde
// "missing_api_key" y la voz cae al motor del sistema, sin que nada en la UI
// diga por qué. Con esto se ve de un vistazo.
//
// Con ?ping=deepgram hace además una llamada REAL y mínima a Deepgram para
// distinguir tres fallos que desde fuera se ven iguales ("unauthorized"):
//   · key mala/expirada/revocada        → Deepgram responde 401
//   · sin crédito o plan sin aura-2     → 402 / 403
//   · espacios/comillas al pegar la key → la key "existe" pero Deepgram la
//     rechaza; lo delatamos con metadatos seguros (largo, si trim la cambia).
// Nunca se devuelve el valor de la key, solo su forma.

const MODELS = {
  chat: process.env.MODEL_CHAT || 'claude-haiku-4-5',
  creative: process.env.MODEL_CREATIVE || 'kimi-k2.7-code',
};

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/speak';

// Radiografía SEGURA de una key: nunca el valor, solo su forma. Sirve para
// cazar el fallo más tonto y más común: pegarla con comillas o con un espacio
// o salto de línea al final, que Vercel guarda tal cual y Deepgram rechaza.
function formaClave(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return { presente: false };
  const limpia = raw.trim();
  return {
    presente: true,
    largo: raw.length,
    // Si trim() la acorta, hay espacios/saltos alrededor → causa muy probable.
    espacios_alrededor: raw !== limpia,
    // Comillas pegadas por error al copiar del .env.
    comillas: /^['"]|['"]$/.test(limpia),
  };
}

// Ping real y mínimo a Deepgram: 2 caracteres, con la voz por defecto. Nos
// interesa SOLO el status del upstream, no el audio. Distingue 401/402/403/200.
async function pingDeepgram(apiKey) {
  const model = process.env.TTS_MODEL || 'aura-2-helena-en';
  try {
    const r = await fetch(`${DEEPGRAM_URL}?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hi' }),
    });
    let diagnostico = 'desconocido';
    if (r.ok) diagnostico = 'ok';
    else if (r.status === 401) diagnostico = 'key_rechazada'; // mala/expirada/revocada
    else if (r.status === 402) diagnostico = 'sin_credito';
    else if (r.status === 403) diagnostico = 'sin_acceso_al_modelo'; // plan sin aura-2
    else if (r.status === 429) diagnostico = 'limite_de_tasa';
    // El cuerpo de error de Deepgram es corto y sin secretos; ayuda a Gus.
    const detalle = r.ok ? null : (await r.text()).slice(0, 300);
    return { alcanzado: true, status: r.status, ok: r.ok, diagnostico, detalle, modelo_probado: model };
  } catch (err) {
    return { alcanzado: false, error: String(err && err.message).slice(0, 200), modelo_probado: model };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const hay = (v) => typeof v === 'string' && v.trim().length > 0;
  const ia = hay(process.env.OPENCODE_API_KEY);
  const voz = hay(process.env.DEEPGRAM_API_KEY);

  // ?ping=deepgram: prueba en vivo la voz. Solo bajo petición explícita para no
  // gastar una llamada (por mínima que sea) en cada chequeo de salud.
  const url = new URL(req.url || '/', 'http://x');
  const salida = {
    entorno: process.env.VERCEL_ENV || 'desconocido', // production | preview | development
    listo_para_testear: ia && voz,
    claves: {
      // IA: sin ella /api/chat responde missing_api_key y no hay coach.
      opencode: ia,
      // Voz: sin ella /api/tts y /api/stt responden missing_*_key; el TTS
      // cae al motor del sistema y el dictado deja de funcionar.
      deepgram: voz,
      // Opcionales: no bloquean el testeo.
      app_pass: hay(process.env.APP_PASS),
      supabase_service: hay(process.env.SUPABASE_SERVICE_KEY),
    },
    modelos: MODELS,
    voz_por_defecto: process.env.TTS_MODEL || 'aura-2-helena-en',
  };

  if (url.searchParams.get('ping') === 'deepgram') {
    salida.deepgram_forma = formaClave(process.env.DEEPGRAM_API_KEY);
    salida.deepgram_ping = voz
      ? await pingDeepgram(process.env.DEEPGRAM_API_KEY)
      : { alcanzado: false, error: 'no_hay_key_configurada' };
  }

  res.statusCode = 200;
  res.end(JSON.stringify(salida, null, 2));
}
