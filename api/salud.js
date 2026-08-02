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

const MODELS = {
  chat: process.env.MODEL_CHAT || 'claude-haiku-4-5',
  creative: process.env.MODEL_CREATIVE || 'kimi-k2.7-code',
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const hay = (v) => typeof v === 'string' && v.trim().length > 0;
  const ia = hay(process.env.OPENCODE_API_KEY);
  const voz = hay(process.env.DEEPGRAM_API_KEY);

  res.statusCode = 200;
  res.end(
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
  );
}
