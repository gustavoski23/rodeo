// Markers máquina-legibles dentro de comentarios del PR. El estado del loop
// vive en GitHub, no en memoria de ningún agente.
//
//   <!-- ai-design-review:result {"sha":"..","round":2,"key":"..","decision":".."} -->
//   <!-- ai-design-review:reset -->                       (re-arma el contador de rondas)
//   DESIGN_DIRECTOR_OVERRIDE / HUMAN_DESIGN_OVERRIDE       (comentario humano con autoridad final)
//
// El JSON completo del review va aparte, en un bloque ```ai-design-review-json
// dentro del mismo comentario (los HTML comments no soportan "--" interno).

export const MARKER_PREFIX = 'ai-design-review';
export const OVERRIDE_TOKENS = ['DESIGN_DIRECTOR_OVERRIDE', 'HUMAN_DESIGN_OVERRIDE'];
export const JSON_FENCE = 'ai-design-review-json';

export function buildMarker(kind, data) {
  const payload = data ? ` ${JSON.stringify(data)}` : '';
  return `<!-- ${MARKER_PREFIX}:${kind}${payload} -->`;
}

export function parseMarker(body, kind) {
  if (typeof body !== 'string') return null;
  const re = new RegExp(`<!--\\s*${MARKER_PREFIX}:${kind}(?:\\s+(\\{.*?\\}))?\\s*-->`, 's');
  const m = body.match(re);
  if (!m) return null;
  if (!m[1]) return {};
  try {
    return JSON.parse(m[1]);
  } catch {
    return null; // marker corrupto = inexistente; nunca romper el flujo por esto
  }
}

export function buildJsonBlock(review) {
  return '```' + JSON_FENCE + '\n' + JSON.stringify(review, null, 2) + '\n```';
}

export function parseJsonBlock(body) {
  if (typeof body !== 'string') return null;
  const re = new RegExp('```' + JSON_FENCE + '\\r?\\n([\\s\\S]*?)\\r?\\n```');
  const m = body.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export function hasOverride(body) {
  return typeof body === 'string' && OVERRIDE_TOKENS.some((t) => body.includes(t));
}
