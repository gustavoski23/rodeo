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

export async function requestOpenCode(apiKey, body, fetchImpl = fetch) {
  const primaryModel = body.model;
  const usesResponsesApi = primaryModel === 'gpt-5.6-luna';
  const primaryUrl = usesResponsesApi ? OPENCODE_GO_RESPONSES_URL : OPENCODE_GO_URL;
  const primaryBody = usesResponsesApi ? toResponsesBody(body) : body;
  const primary = await send(fetchImpl, primaryUrl, apiKey, primaryBody);
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

  const fallback = await send(fetchImpl, OPENCODE_ZEN_URL, apiKey, { ...body, model: fallbackModel });
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

function send(fetchImpl, url, apiKey, body) {
  return fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
