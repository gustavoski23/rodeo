// Hablarte — chequeo de salud del backend.
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

import {
  DEFAULT_FREE_MODEL,
  DEFAULT_GO_CHAT_MODEL,
  DEFAULT_GO_CREATIVE_MODEL,
  OPENCODE_ZEN_URL,
  openCodeContent,
  requestOpenCode,
  resolveGoModel,
} from './_opencode.js';
import { registrarUso, usuarioDe } from './_uso.js';

/* Modelos REALES del chat — resueltos por el MISMO cliente compartido que usa
   api/chat.js (_opencode.js). La lección que motiva esto: la primera versión
   duplicaba aquí la lista de modelos "a propósito", otra sesión cambió la
   estrategia en chat.js, y este endpoint quedó diagnosticando modelos que la
   app ya no usaba — decía sin_saldo con el chat funcionando. */
const MODELS = {
  chat: resolveGoModel(process.env.MODEL_GO_CHAT || process.env.MODEL_CHAT, DEFAULT_GO_CHAT_MODEL),
  creative: resolveGoModel(process.env.MODEL_GO_CREATIVE || process.env.MODEL_CREATIVE, DEFAULT_GO_CREATIVE_MODEL),
};
const MODELO_GRATIS = process.env.MODEL_FALLBACK || DEFAULT_FREE_MODEL;

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

/* Diagnóstico ligero de un cuerpo de error SIN devolverlo jamás: el cuerpo
   puede traer metadatos del proveedor (misma postura que _opencode.js). Si la
   respuesta ya fue leída por requestOpenCode, text() lanza y queda ''. */
async function diagnosticoDe(r) {
  if (r.ok) return 'ok';
  let cuerpo = '';
  try {
    cuerpo = await r.text();
  } catch {
    /* body ya consumido al clasificar el fallback */
  }
  if (/CreditsError|Insufficient balance|insufficient_quota|quota exceeded/i.test(cuerpo)) return 'sin_saldo_o_cuota';
  if (r.status === 401) return 'key_rechazada_o_sin_saldo';
  if (r.status === 402) return 'sin_saldo';
  if (r.status === 404 || /ModelNotFound|unknown model/i.test(cuerpo)) return 'modelo_desconocido';
  if (r.status === 429) return 'limite_de_tasa';
  return 'error';
}

/* Ping real por el MISMO camino que el chat: requestOpenCode prueba el modelo
   Go titular y, si el fallo es de crédito/cuota/región, cae solo al modelo
   gratis — el resultado dice quién respondió de verdad (uso_respaldo). Aparte
   se prueba el modelo gratis DIRECTO en Zen, porque es la red de seguridad
   final y conviene saber si está viva por sí misma. 16 tokens por sonda. */
async function pingOpenCode(apiKey) {
  const out = [];
  const sonda = { max_tokens: 16, messages: [{ role: 'user', content: 'Say "ok".' }] };

  try {
    const { response, model, usedFallback } = await requestOpenCode(apiKey, { ...sonda, model: MODELS.chat });
    out.push({
      camino: 'chat_real',
      modelo_pedido: MODELS.chat,
      modelo_respondio: model,
      uso_respaldo_gratis: usedFallback,
      status: response.status,
      ok: response.ok,
      diagnostico: await diagnosticoDe(response),
    });
  } catch (err) {
    out.push({ camino: 'chat_real', modelo_pedido: MODELS.chat, alcanzado: false, error: String(err && err.message).slice(0, 150) });
  }

  try {
    const r = await fetch(OPENCODE_ZEN_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sonda, model: MODELO_GRATIS }),
    });
    out.push({ camino: 'respaldo_gratis_directo', modelo: MODELO_GRATIS, status: r.status, ok: r.ok, diagnostico: await diagnosticoDe(r) });
  } catch (err) {
    out.push({ camino: 'respaldo_gratis_directo', modelo: MODELO_GRATIS, alcanzado: false, error: String(err && err.message).slice(0, 150) });
  }
  return out;
}

/* Turno de HUMO (&turno=0..4): un turno REAL del coach, con el contrato JSON de
   la app y mensajes de usuario FIJOS (nada del querystring entra al prompt).
   Es la única forma de ver una respuesta genuina del modelo desde fuera sin
   navegador: GET puro. Los mensajes están elegidos para ejercitar lo que Gus
   quiere verificar: corrección de errores reales, cómo-digo en espanglish y
   conversación natural. Usa la MISMA cadena con respaldo que /api/chat. */
const TURNO_SYSTEM = `You are Gus's English conversation partner inside Hablarte, a personal English trainer. Gus is Venezuelan, lives in Medellín, level B2+ working toward C1. Natural contemporary English, 2-4 sentences, react like a friend (don't interview him). If he writes Spanish/Spanglish asking how to say something, hand him the exact natural English a native would use. OUTPUT — STRICT JSON only, exactly: {"reply":"your in-character reply","corrections":[{"quote":"his exact incorrect words","fix":"how a native says it","why":"por qué, en español, una línea"}],"glosses":[{"term":"exact phrase from your reply","es":"qué significa, natural"}]} — corrections only for REAL errors in his message ([] if clean); 0-2 glosses.`;
const TURNOS = [
  'the football cards from the worldcup album',
  'I have 25 years and I work in a crypto startup in Medellin',
  'oye cómo digo que me quedé sin saldo en la cuenta',
  'Honestly I think the AI hype is a little bit too much, no? Everybody talks about that',
  'Yesterday I runned five kilometers and now my legs is hurting so much',
];

async function turnoDeHumo(apiKey, indice, quien) {
  const texto = TURNOS[indice] ?? TURNOS[0];
  const t0 = Date.now();
  try {
      // El MISMO camino que un turno real del chat: modelo Go titular con
      // respaldo gratis automático (requestOpenCode decide, igual que chat.js).
      // 2500 de techo como el piso del chat real: un modelo razonador quema
      // cientos de tokens ANTES del primer carácter y con menos saldría vacío.
      const { response: r, model: m, protocol } = await requestOpenCode(apiKey, {
        model: MODELS.chat,
        max_tokens: 2500,
        temperature: 0.9,
        messages: [
          { role: 'system', content: TURNO_SYSTEM },
          { role: 'user', content: texto },
        ],
      });
      if (!r.ok) return { error: 'ningun_modelo_respondio', status: r.status, diagnostico: await diagnosticoDe(r), mensaje_de_prueba: texto, ms: Date.now() - t0 };
      const data = await r.json();
      const crudo = String(openCodeContent(data, protocol) || '');
      // El modelo puede envolver el JSON en ```fences``` — mismo parseo defensivo del cliente.
      let parsed = null;
      try {
        const s = crudo.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        const a = s.indexOf('{');
        const b = s.lastIndexOf('}');
        if (a !== -1 && b !== -1) parsed = JSON.parse(s.slice(a, b + 1));
      } catch { /* se muestra el crudo */ }
      // El turno de humo gasta crédito de verdad: al panel /uso como todo lo
      // demás, para que un abuso del endpoint se VEA (etiqueta 'salud:turno').
      await registrarUso({
        servicio: 'opencode', modelo: data.model || m, modo: 'salud:turno', usuario: quien,
        tokens_in: data.usage && (data.usage.prompt_tokens ?? data.usage.input_tokens),
        tokens_out: data.usage && (data.usage.completion_tokens ?? data.usage.output_tokens),
        costo_usd: data.cost, ok: true, ms: Date.now() - t0,
      });
      return {
        modelo: data.model || m,
        ms: Date.now() - t0,
        mensaje_de_prueba: texto,
        respuesta: parsed || null,
        crudo: parsed ? null : crudo.slice(0, 600),
        usage: data.usage || null,
      };
  } catch (err) {
    return { error: 'red_caida', detalle: String(err && err.message).slice(0, 150), mensaje_de_prueba: texto, ms: Date.now() - t0 };
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
    // El titular va por la cuota Go; si falla por crédito/cuota/región, el
    // cliente compartido cae solo al modelo gratis de Zen.
    modelos: { chat: MODELS.chat, creative: MODELS.creative, respaldo_gratis: MODELO_GRATIS },
    voz_por_defecto: process.env.TTS_MODEL || 'aura-2-helena-en',
  };

  /* Los pings GASTAN dinero de verdad (poco, pero real) y este endpoint es un
     GET sin auth: un bot que desenrolle el link (Slack, Discord, crawlers) o un
     <img src=…> hostil lo dispararía gratis. Regla: si hay APP_PASS, todo lo
     que cueste plata lo exige — por cabecera x-rodeo-pass o por &pass= (los
     clientes GET-only, como el fetch del MCP de Vercel, no pueden mandar
     cabeceras). Los booleanos de arriba siguen siendo públicos: no cuestan. */
  const appPass = process.env.APP_PASS;
  const pinOk = !appPass || req.headers?.['x-rodeo-pass'] === appPass || url.searchParams.get('pass') === appPass;
  const ping = url.searchParams.get('ping');

  if (ping === 'deepgram') {
    salida.deepgram_forma = formaClave(process.env.DEEPGRAM_API_KEY);
    if (!pinOk) salida.deepgram_ping = { error: 'pin_requerido', detalle: 'Manda x-rodeo-pass o &pass= con el APP_PASS.' };
    else
      salida.deepgram_ping = voz
        ? await pingDeepgram(process.env.DEEPGRAM_API_KEY)
        : { alcanzado: false, error: 'no_hay_key_configurada' };
  }

  if (ping === 'opencode') {
    salida.opencode_forma = formaClave(process.env.OPENCODE_API_KEY);
    if (!pinOk) salida.opencode_ping = { error: 'pin_requerido', detalle: 'Manda x-rodeo-pass o &pass= con el APP_PASS.' };
    else {
      salida.opencode_ping = ia
        ? await pingOpenCode(process.env.OPENCODE_API_KEY)
        : { alcanzado: false, error: 'no_hay_key_configurada' };
      // &turno=0..4: además del ping, UN turno real del coach para ver la
      // respuesta genuina (solo si se pide explícito — cuesta unos centavos).
      const turno = url.searchParams.get('turno');
      if (ia && turno !== null) {
        const idx = Math.min(4, Math.max(0, Number(turno) || 0));
        salida.turno_de_humo = await turnoDeHumo(process.env.OPENCODE_API_KEY, idx, usuarioDe(req) || 'salud');
      }
    }
  }

  res.statusCode = 200;
  res.end(JSON.stringify(salida, null, 2));
}
