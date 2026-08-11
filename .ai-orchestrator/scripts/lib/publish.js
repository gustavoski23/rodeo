// Publica el resultado en el PR: comentario con markers + JSON completo
// (Claude lo consume verbatim, sin resúmenes intermedios) y check run
// "AI Design Review" para que el estado se vea sin abrir logs.
import { buildMarker, buildJsonBlock } from './markers.js';

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function renderReviewComment({ review, sha, round, key, previewUrl, maxRounds }) {
  const marker = buildMarker('result', { sha, round, key, decision: review.decision });
  const findings = [...(review.findings ?? [])].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  );

  const lines = [
    marker,
    `## 🎨 AI Design Review — ronda ${round}/${maxRounds} — **${review.decision}**`,
    '',
    `**Score:** ${review.overallScore}/100 · **SHA:** \`${sha.slice(0, 7)}\` · [preview](${previewUrl})`,
    '',
    review.summary,
    '',
  ];

  if (findings.length) {
    lines.push('### Findings');
    for (const f of findings) {
      lines.push(`#### \`${f.id}\` · ${f.priority} · ${f.category} · pantalla: ${f.screen}`);
      lines.push(`**Problema:** ${f.problem}`);
      lines.push(`**Por qué importa:** ${f.whyItMatters}`);
      lines.push(`**Cambio pedido:** ${f.requestedChange}`);
      if (f.acceptanceCriteria?.length) {
        lines.push('**Acceptance criteria:**');
        for (const ac of f.acceptanceCriteria) lines.push(`- [ ] ${ac}`);
      }
      if (f.implementationHints?.length) {
        lines.push('**Hints:** ' + f.implementationHints.join(' · '));
      }
      lines.push('');
    }
  }
  if (review.approvedAspects?.length) {
    lines.push('### Aprobado');
    for (const a of review.approvedAspects) lines.push(`- ✅ ${a}`);
    lines.push('');
  }
  lines.push(`**Next action:** ${review.nextAction}`);
  lines.push('');
  lines.push('<details><summary>JSON del review (para Claude)</summary>');
  lines.push('');
  lines.push(buildJsonBlock(review));
  lines.push('');
  lines.push('</details>');
  return lines.join('\n');
}

export function renderHumanRequiredComment({ sha, round, maxRounds, lastReview }) {
  const marker = buildMarker('human-required', { sha, round });
  const pending = (lastReview?.review?.findings ?? [])
    .map((f) => `- \`${f.id}\` (${f.priority}): ${f.problem}`)
    .join('\n');
  return [
    marker,
    `## 🛑 HUMAN_DESIGN_REVIEW_REQUIRED`,
    '',
    `Se agotaron las ${maxRounds} rondas automáticas sin APPROVE. El loop queda detenido: ni GPT ni Claude vuelven a actuar solos en este PR.`,
    '',
    pending ? `**Findings pendientes de la última ronda:**\n${pending}` : '_No hay findings registrados de la última ronda._',
    '',
    'Para decidir: revisa la preview y los screenshots del run. Para re-armar el loop tras intervenir, comenta:',
    '',
    '```',
    buildMarker('reset'),
    '```',
  ].join('\n');
}

export function renderBlockedComment({ sha, reason }) {
  return [
    buildMarker('blocked', { sha }),
    `## ⚠️ AI Design Review — BLOCKED`,
    '',
    `**SHA:** \`${sha.slice(0, 7)}\``,
    `**Motivo:** ${reason}`,
    '',
    'No se le preguntó a GPT qué opina de una página rota. Arregla la causa y haz push (o relanza con workflow_dispatch).',
  ].join('\n');
}

// Estados del check → cómo se ven en la pestaña Checks del PR.
export const CHECK_STATES = {
  capturing: { status: 'in_progress', title: 'Capturando screenshots…' },
  reviewing: { status: 'in_progress', title: 'GPT revisando…' },
  approved: { status: 'completed', conclusion: 'success', title: 'APPROVED' },
  changes_requested: { status: 'completed', conclusion: 'action_required', title: 'REQUEST_CHANGES' },
  human_review_required: { status: 'completed', conclusion: 'action_required', title: 'HUMAN_DESIGN_REVIEW_REQUIRED' },
  blocked: { status: 'completed', conclusion: 'failure', title: 'BLOCKED' },
  stale: { status: 'completed', conclusion: 'neutral', title: 'Obsoleto (hubo un push más nuevo)' },
  skipped: { status: 'completed', conclusion: 'neutral', title: 'Ya revisado (idempotente)' },
};

export async function setCheck({ gh, checkId, sha, checkName, state, summary = '' }) {
  const def = CHECK_STATES[state];
  const payload = {
    name: checkName,
    head_sha: sha,
    status: def.status,
    ...(def.conclusion ? { conclusion: def.conclusion } : {}),
    output: { title: def.title, summary: summary || def.title },
  };
  if (checkId) {
    await gh.updateCheckRun(checkId, payload);
    return checkId;
  }
  const created = await gh.createCheckRun(payload);
  return created.id;
}
