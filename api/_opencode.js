// Cliente compartido de OpenCode. Usa primero la cuota Go y recurre a un modelo
// Zen gratuito si Go falla por crédito/cuota, región o indisponibilidad.

export const OPENCODE_GO_URL = 'https://opencode.ai/zen/go/v1/chat/completions';
export const OPENCODE_GO_RESPONSES_URL = 'https://opencode.ai/zen/go/v1/responses';
export const OPENCODE_ZEN_URL = 'https://opencode.ai/zen/v1/chat/completions';
export const DEFAULT_GO_CHAT_MODEL = 'gpt-5.6-luna';
export const DEFAULT_GO_CREATIVE_MODEL = 'gpt-5.6-luna';
export const DEFAULT_FREE_MODEL = 'mimo-v2.5-free';

// Modelos Go compatibles con los dos protocolos que este cliente implementa.
// Así una variable legacy como MODEL_CHAT=claude-haiku-4-5 no se envía por
// accidente a un endpoint incompatible.
const GO_CHAT_COMPLETION_MODELS = new Set([
  'gpt-5.6-luna',
  'grok-4.5',
  'glm-5.2',
  'glm-5.1',
  'glm-5',
  'kimi-k3',
  'kimi-k2.7-code',
  'kimi-k2.6',
  'kimi-k2.5',
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'mimo-v2.5',
  'mimo-v2.5-pro',
  'hy3',
]);

const CREDIT_ERROR_MARKERS = [
  'creditserror',
  'credits_error',
  'insufficient balance',
  'insufficient_balance',
  'insufficient credit',
  'insufficient quota',
  'insufficient_quota',
  'not enough balance',
  'not enough credit',
  'out of credits',
  'credit exhausted',
  'credit balance',
  'quota exceeded',
  'quota_exceeded',
  'quota exhausted',
  'usage limit',
  'usage_limit',
  'limit reached',
];

export function isCreditOrQuotaError(status, detail = '') {
  if (status === 402) return true;
  const normalized = String(detail).toLowerCase();
  return CREDIT_ERROR_MARKERS.some((marker) => normalized.includes(marker));
}

export function resolveGoModel(configured, defaultModel) {
  return GO_CHAT_COMPLETION_MODELS.has(configured) ? configured : defaultModel;
}

export function openCodeContent(data, protocol) {
  if (protocol === 'chat') {
    return (data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content) || '';
  }
  if (typeof data.output_text === 'string') return data.output_text;
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (part.type === 'output_text' && typeof part.text === 'string') return part.text;
    }
  }
  return '';
}

export async function requestOpenCode(apiKey, body, fetchImpl = fetch, sessionId = null) {
  const primaryModel = body.model;
  const usesResponsesApi = primaryModel === 'gpt-5.6-luna';
  const primaryUrl = usesResponsesApi ? OPENCODE_GO_RESPONSES_URL : OPENCODE_GO_URL;
  const primaryBody = usesResponsesApi ? toResponsesBody(body) : body;
  const primary = await send(fetchImpl, primaryUrl, apiKey, primaryBody, sessionId);
  if (primary.ok) {
    return {
      response: primary,
      model: primaryModel,
      protocol: usesResponsesApi ? 'responses' : 'chat',
      usedFallback: false,
    };
  }

  // Leemos el error solo para clasificarlo. Nunca se devuelve al cliente ni se
  // registra: puede contener metadatos internos del proveedor.
  const primaryDetail = await primary.text().catch(() => '');
  const canFallback = isCreditOrQuotaError(primary.status, primaryDetail)
    || primary.status >= 500
    || /regionerror|requires explicit opt in/i.test(primaryDetail);
  if (!canFallback) {
    return {
      response: primary,
      model: primaryModel,
      protocol: usesResponsesApi ? 'responses' : 'chat',
      usedFallback: false,
    };
  }

  const fallbackModel = process.env.MODEL_FALLBACK || DEFAULT_FREE_MODEL;
  if (!fallbackModel || fallbackModel === primaryModel) {
    return {
      response: primary,
      model: primaryModel,
      protocol: usesResponsesApi ? 'responses' : 'chat',
      usedFallback: false,
    };
  }

  const fallback = await send(fetchImpl, OPENCODE_ZEN_URL, apiKey, { ...body, model: fallbackModel }, sessionId);
  return { response: fallback, model: fallbackModel, protocol: 'chat', usedFallback: true };
}

function toResponsesBody(body) {
  return {
    model: body.model,
    max_output_tokens: body.max_tokens,
    stream: body.stream === true,
    input: body.messages,
  };
}

/* Gate nuevo de OpenCode (10-sep-2026, con el chat de producción caído): cada
   request sin x-opencode-session muere con 400 MissingSessionID, y el User-Agent
   de librería genérica también está proscrito (quieren clientes identificables).
   El id debe ser ESTABLE por conversación: aparte de pasar el gate, habilita su
   prompt caching — Luna cobra 10x menos los tokens cacheados. El navegador manda
   el suyo por x-rodeo-session (uno por instalación de la app); si no llega, uno
   por proceso del serverless es el mejor compromiso: estable entre invocaciones
   calientes y sin filtrar nada del cliente. */
const UA_HABLARTE = 'hablarte/2.0 (https://rodeo-sigma.vercel.app)';

let sesionDeProceso = null;
function sesionPorDefecto() {
  if (!sesionDeProceso) {
    sesionDeProceso = globalThis.crypto && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `hablarte-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return sesionDeProceso;
}

export function cabecerasOpenCode(apiKey, sessionId) {
  // Node http puede entregar cabeceras repetidas como arreglo; un id con coma
  // dentro rompería la estabilidad que da el caching. Un solo valor, limpio.
  const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  const limpia = typeof sid === 'string' ? sid.trim().slice(0, 128) : '';
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'x-opencode-session': limpia || sesionPorDefecto(),
    'User-Agent': UA_HABLARTE,
  };
}

function send(fetchImpl, url, apiKey, body, sessionId) {
  return fetchImpl(url, {
    method: 'POST',
    headers: cabecerasOpenCode(apiKey, sessionId),
    body: JSON.stringify(body),
  });
}
