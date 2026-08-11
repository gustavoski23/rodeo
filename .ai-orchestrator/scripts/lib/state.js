// Estado del loop derivado SIEMPRE de los comentarios del PR (GitHub es la
// fuente de verdad): rondas, idempotencia, findings previos y overrides.
import { createHash } from 'node:crypto';
import { parseMarker, parseJsonBlock, hasOverride } from './markers.js';

// Un review queda identificado por repo+PR+SHA+brief+versión del prompt del
// reviewer. El mismo SHA con el mismo brief y prompt jamás se revisa dos veces.
export function idempotencyKey({ repo, pr, sha, briefHash, promptVersion }) {
  const raw = `${repo}:${pr}:${sha}:${briefHash}:${promptVersion}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function resultComments(comments) {
  // Los comentarios llegan en orden cronológico. Un marker :reset re-arma el
  // contador: solo cuentan los results posteriores al último reset. El reset
  // solo vale de un HUMANO — el comentario HUMAN_DESIGN_REVIEW_REQUIRED (bot)
  // muestra el marker como instrucción y NO debe re-armar el loop.
  let results = [];
  for (const c of comments) {
    if (c.user?.type !== 'Bot' && parseMarker(c.body, 'reset') !== null) {
      results = [];
      continue;
    }
    const data = parseMarker(c.body, 'result');
    if (data && data.sha) results.push({ ...data, body: c.body });
  }
  return results;
}

// Número de ronda que TOCARÍA ejecutar ahora (1-based).
export function computeRound(comments) {
  return resultComments(comments).length + 1;
}

export function alreadyReviewed(comments, key) {
  return resultComments(comments).some((r) => r.key === key);
}

export function latestReview(comments) {
  const results = resultComments(comments);
  if (!results.length) return null;
  const last = results[results.length - 1];
  return { meta: last, review: parseJsonBlock(last.body) };
}

export function humanRequiredAlreadyPosted(comments, sha) {
  return comments.some((c) => {
    const d = parseMarker(c.body, 'human-required');
    return d && d.sha === sha;
  });
}

const MAX_OVERRIDE_CHARS = 1500;

// Overrides humanos: comentarios con DESIGN_DIRECTOR_OVERRIDE. Nunca los
// escriben bots (se filtran) y siempre viajan completos al reviewer.
export function collectOverrides(comments) {
  return comments
    .filter((c) => hasOverride(c.body) && c.user?.type !== 'Bot')
    .map((c) => ({
      author: c.user?.login ?? 'unknown',
      at: c.created_at,
      excerpt: c.body.length > MAX_OVERRIDE_CHARS ? c.body.slice(0, MAX_OVERRIDE_CHARS) + ' …[truncado]' : c.body,
    }));
}
