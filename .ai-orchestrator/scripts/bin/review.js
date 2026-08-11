#!/usr/bin/env node
// Orquestador de una ronda de AI Design Review.
//
//   node bin/review.js                      → modo CI (lee el evento de GitHub)
//   node bin/review.js --pr 53              → PR explícito (workflow_dispatch)
//   node bin/review.js --url http://...     → salta la resolución de preview (local)
//   node bin/review.js --dry-run            → captura + packet, sin OpenAI ni publicación
//   node bin/review.js --force              → ignora idempotencia (nunca el guard de forks)
//
// Cada ejecución loguea: PR, SHA, round, preview, capture, review, decision,
// findings y next action. Nunca secretos.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, ORCH_ROOT } from '../lib/config.js';
import { loadBrief } from '../lib/brief.js';
import { loadPrompt } from '../lib/prompt.js';
import { ghClient } from '../lib/github.js';
import { resolvePreview } from '../lib/preview.js';
import { captureScreens } from '../lib/capture.js';
import { buildPacket, filterUiFiles, listReferences, truncate } from '../lib/packet.js';
import { requestReview, ReviewError } from '../lib/openai.js';
import {
  idempotencyKey, computeRound, alreadyReviewed, latestReview,
  humanRequiredAlreadyPosted, collectOverrides,
} from '../lib/state.js';
import {
  renderReviewComment, renderHumanRequiredComment, renderBlockedComment, setCheck,
} from '../lib/publish.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const log = (msg) => console.log(`[ai-design-review] ${msg}`);
const OUT_DIR = resolve(ORCH_ROOT, 'out');
const SHOTS_DIR = resolve(OUT_DIR, 'screenshots');

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  log(`output ${name}=${value}`);
}

function finish({ decision, round = 0, proceed = false }) {
  setOutput('decision', decision);
  setOutput('round', String(round));
  setOutput('proceed', proceed ? 'true' : 'false');
  process.exit(0); // los estados controlados NO tumban el job: el estado vive en el check
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });
  const dryRun = flag('dry-run');
  const urlOverride = opt('url');
  const force = flag('force');

  const config = loadConfig();
  const brief = loadBrief();
  const reviewerPrompt = loadPrompt('design-reviewer.md');
  const schema = JSON.parse(readFileSync(resolve(ORCH_ROOT, 'schemas', 'design-review.schema.json'), 'utf8'));

  // ── Modo local (sin GitHub): captura + packet contra una URL dada ─────────
  if (urlOverride && !process.env.GITHUB_REPOSITORY) {
    if (!brief) throw new Error('Falta .ai-orchestrator/design-brief.md');
    log(`modo local contra ${urlOverride}`);
    const { shots, issues, blocked } = await captureScreens({
      config, baseUrl: urlOverride, round: 0, outDir: SHOTS_DIR, log,
    });
    if (blocked) throw new Error(`captura bloqueada: ${blocked.reason}`);
    const refs = listReferences(resolve(ORCH_ROOT, 'references'), config.maxReferenceImages);
    const { packet, screenshots, references } = buildPacket({
      config, brief, pr: { number: 0, title: '(local)' }, sha: 'local', previewUrl: urlOverride,
      shots, references: refs, uiFiles: { files: [], omitted: 0 },
      implementationSummary: '(local dry run)', previousReview: null, overrides: [], round: 0,
      captureIssues: issues,
    });
    writeFileSync(resolve(OUT_DIR, 'packet.json'), JSON.stringify(packet, null, 2));
    log(`packet en out/packet.json · ${screenshots.length} screenshots · ${references.length} referencias`);
    if (dryRun) return log('dry-run: no se llama a OpenAI');
    const review = await requestReview({
      packet, screenshots, references, systemPrompt: reviewerPrompt.body, schema,
      model: config.review.model, maxOutputTokens: config.review.maxOutputTokens, log,
    });
    writeFileSync(resolve(OUT_DIR, 'review.json'), JSON.stringify(review, null, 2));
    log(`decision=${review.decision} score=${review.overallScore} findings=${review.findings.length} → out/review.json`);
    return;
  }

  // ── Modo CI ───────────────────────────────────────────────────────────────
  const gh = ghClient();
  let prNumber = opt('pr') ? Number(opt('pr')) : undefined;
  if (!prNumber && process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    prNumber = event.pull_request?.number ?? Number(event.inputs?.pr_number);
  }
  if (!prNumber) throw new Error('No pude determinar el número de PR (--pr o evento)');

  const pr = await gh.getPR(prNumber);
  const sha = pr.head.sha;
  log(`PR #${prNumber} "${truncate(pr.title, 80)}" · HEAD ${sha.slice(0, 7)}`);

  // Guard de seguridad NO negociable: nunca sobre forks (secrets en juego).
  if (pr.head.repo?.full_name !== gh.repo) {
    log(`PR viene de fork (${pr.head.repo?.full_name}) — el orquestador no corre sobre forks`);
    return finish({ decision: 'SKIPPED_FORK' });
  }
  const labels = (pr.labels ?? []).map((l) => l.name);
  if (!labels.includes(config.review.label)) {
    log(`PR sin label "${config.review.label}" — no se revisa`);
    return finish({ decision: 'SKIPPED_NO_LABEL' });
  }

  const checkName = config.review.checkName;
  let checkId = null;
  const blockedExit = async (reason) => {
    log(`BLOCKED: ${reason}`);
    checkId = await setCheck({ gh, checkId, sha, checkName, state: 'blocked', summary: reason });
    await gh.createIssueComment(prNumber, renderBlockedComment({ sha, reason }));
    return finish({ decision: 'BLOCKED' });
  };

  if (!brief) return blockedExit('falta .ai-orchestrator/design-brief.md — sin brief no hay estándar contra el cual revisar');

  const comments = await gh.listIssueComments(prNumber);
  const key = idempotencyKey({
    repo: gh.repo, pr: prNumber, sha, briefHash: brief.hash, promptVersion: reviewerPrompt.version,
  });
  log(`idempotency key=${key} briefHash=${brief.hash} promptVersion=${reviewerPrompt.version}`);

  if (!force && alreadyReviewed(comments, key)) {
    log('este SHA+brief+prompt ya fue revisado — idempotencia, no se repite');
    checkId = await setCheck({ gh, checkId, sha, checkName, state: 'skipped' });
    return finish({ decision: 'SKIPPED_DUPLICATE' });
  }

  const round = computeRound(comments);
  const prev = latestReview(comments);
  log(`round ${round}/${config.maxRounds}`);

  if (round > config.maxRounds) {
    if (!humanRequiredAlreadyPosted(comments, sha)) {
      await gh.createIssueComment(prNumber, renderHumanRequiredComment({
        sha, round, maxRounds: config.maxRounds, lastReview: prev,
      }));
    }
    checkId = await setCheck({
      gh, checkId, sha, checkName, state: 'human_review_required',
      summary: `${config.maxRounds} rondas automáticas sin APPROVE. Comenta el marker de reset para re-armar.`,
    });
    return finish({ decision: 'HUMAN_REVIEW_REQUIRED', round });
  }

  checkId = await setCheck({ gh, checkId, sha, checkName, state: 'capturing', summary: `round ${round}` });

  // La condición crítica: preview.headSha DEBE ser el HEAD actual del PR.
  const isStale = async () => (await gh.getPR(prNumber)).head.sha !== sha;
  let previewUrl = urlOverride;
  if (!previewUrl) {
    const preview = await resolvePreview({
      gh, sha,
      timeoutSeconds: config.preview.timeoutSeconds,
      pollSeconds: config.preview.pollSeconds,
      environmentHint: config.preview.environmentHint,
      log, isStale,
    });
    if (preview.status === 'stale') {
      log('hubo un push más nuevo mientras esperaba la preview — descarto');
      checkId = await setCheck({ gh, checkId, sha, checkName, state: 'stale' });
      return finish({ decision: 'STALE', round });
    }
    if (preview.status !== 'ready') {
      return blockedExit(`preview ${preview.status}: ${preview.reason ?? 'sin detalle'}`);
    }
    previewUrl = preview.url;
  }

  const { shots, issues, blocked } = await captureScreens({
    config, baseUrl: previewUrl, round, outDir: SHOTS_DIR, log,
  });
  if (blocked) return blockedExit(blocked.reason);
  log(`capture ok: ${shots.length} screenshots`);

  checkId = await setCheck({ gh, checkId, sha, checkName, state: 'reviewing', summary: `round ${round} · ${shots.length} screenshots` });

  const prFiles = await gh.listPRFiles(prNumber);
  const uiFiles = filterUiFiles(prFiles, config.maxUiFilesListed);
  const refs = listReferences(resolve(ORCH_ROOT, 'references'), config.maxReferenceImages);
  const overrides = collectOverrides(comments);
  // Resumen de implementación: lo más cercano que dejó quien implementó —
  // el body del PR (sección marcada) o el último commit.
  const implementationSummary = pr.body?.includes('IMPLEMENTATION SUMMARY')
    ? pr.body
    : `(del último commit) ${pr.title}`;

  const { packet, screenshots, references } = buildPacket({
    config, brief, pr, sha, previewUrl, shots, references: refs, uiFiles,
    implementationSummary, previousReview: prev, overrides, round, captureIssues: issues,
  });
  writeFileSync(resolve(OUT_DIR, 'packet.json'), JSON.stringify(packet, null, 2));

  if (dryRun) {
    log('dry-run: packet listo, no llamo a OpenAI ni publico');
    checkId = await setCheck({ gh, checkId, sha, checkName, state: 'skipped', summary: 'dry-run' });
    return finish({ decision: 'DRY_RUN', round });
  }

  let review;
  try {
    review = await requestReview({
      packet, screenshots, references, systemPrompt: reviewerPrompt.body, schema,
      model: config.review.model, maxOutputTokens: config.review.maxOutputTokens, log,
    });
  } catch (e) {
    if (e instanceof ReviewError) return blockedExit(`reviewer falló (${e.kind}): ${e.message}`);
    throw e;
  }

  // Nunca publicar un review sobre un SHA que ya no es HEAD.
  if (await isStale()) {
    log('HEAD cambió durante el review — descarto el resultado (stale)');
    checkId = await setCheck({ gh, checkId, sha, checkName, state: 'stale' });
    return finish({ decision: 'STALE', round });
  }

  writeFileSync(resolve(OUT_DIR, 'findings.json'), JSON.stringify({
    pr: prNumber, sha, round, key, review,
  }, null, 2));

  await gh.createIssueComment(prNumber, renderReviewComment({
    review, sha, round, key, previewUrl, maxRounds: config.maxRounds,
  }));

  const approved = review.decision === 'APPROVE';
  checkId = await setCheck({
    gh, checkId, sha, checkName,
    state: approved ? 'approved' : 'changes_requested',
    summary: `round ${round}/${config.maxRounds} · score ${review.overallScore}/100 · ${review.findings.length} findings`,
  });

  log(`decision=${review.decision} score=${review.overallScore} findings=${review.findings.length}`);
  log(`next action: ${review.nextAction}`);
  finish({
    decision: review.decision,
    round,
    proceed: !approved && round < config.maxRounds,
  });
}

main().catch((e) => {
  console.error(`[ai-design-review] ERROR no controlado: ${e.stack ?? e}`);
  process.exit(1);
});
