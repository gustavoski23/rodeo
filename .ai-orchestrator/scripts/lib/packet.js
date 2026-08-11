// REVIEW PACKET: lo MÍNIMO que GPT necesita para dirigir. Nunca el repo, nunca
// diffs gigantes, nunca logs enteros. Screenshot-first, con límites duros.
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const UI_FILE_RE = /\.(tsx|jsx|vue|svelte|css|scss|html|js|mjs)$|^(icons|fonts|episodios|public)\//;
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export function truncate(s, n) {
  if (typeof s !== 'string') return s;
  return s.length > n ? s.slice(0, n) + ' …[truncado]' : s;
}

export function filterUiFiles(prFiles, max = 40) {
  const ui = prFiles
    .map((f) => f.filename)
    .filter((name) => UI_FILE_RE.test(name) && !name.startsWith('.ai-orchestrator/') && !name.startsWith('.github/'));
  return { files: ui.slice(0, max), omitted: Math.max(0, ui.length - max) };
}

export function listReferences(referencesDir, max = 4) {
  let entries = [];
  try {
    entries = readdirSync(referencesDir)
      .filter((f) => IMG_EXT.has(extname(f).toLowerCase()))
      .sort()
      .map((f) => ({ name: f, file: join(referencesDir, f), bytes: statSync(join(referencesDir, f)).size }));
  } catch {
    return { references: [], omitted: 0 };
  }
  return { references: entries.slice(0, max), omitted: Math.max(0, entries.length - max) };
}

export function capList(list, max, label) {
  const capped = list.slice(0, max);
  if (list.length > max) capped.push(`…y ${list.length - max} más de ${label} [truncado]`);
  return capped;
}

export function buildPacket({
  config,
  brief,
  pr,
  sha,
  previewUrl,
  shots,
  references,
  uiFiles,
  implementationSummary,
  previousReview,
  overrides,
  round,
  captureIssues,
}) {
  const maxShots = config.maxScreenshotsPerReview;
  const screenshots = shots.slice(0, maxShots);
  const droppedShots = shots.length - screenshots.length;
  const maxErr = config.maxConsoleErrors;

  const packet = {
    feature: brief.feature,
    referenceMode: brief.referenceMode,
    designBrief: truncate(brief.body, 12000),
    pr: { number: pr.number, sha, title: truncate(pr.title, 200) },
    previewUrl,
    round,
    implementationSummary: truncate(implementationSummary || '(no proporcionado)', 3500),
    uiFilesChanged: uiFiles.files,
    uiFilesOmitted: uiFiles.omitted,
    screenshots: screenshots.map((s) => ({ screen: s.screen, viewport: s.viewport, size: `${s.width}x${s.height}` })),
    screenshotsDropped: droppedShots,
    references: references.references.map((r) => ({ name: r.name })),
    runtimeIssues: {
      consoleErrors: capList(captureIssues.consoleErrors, maxErr, 'console errors'),
      pageErrors: capList(captureIssues.pageErrors, maxErr, 'page errors'),
      failedRequests: capList(captureIssues.failedRequests, maxErr, 'requests fallidas'),
      blankScreens: captureIssues.blankScreens,
    },
    previousFindings: previousReview?.review
      ? {
          decision: previousReview.review.decision,
          round: previousReview.meta.round,
          findings: (previousReview.review.findings ?? []).map((f) => ({
            id: f.id,
            priority: f.priority,
            problem: truncate(f.problem, 400),
            requestedChange: truncate(f.requestedChange, 400),
          })),
        }
      : null,
    humanOverrides: overrides,
  };

  const text = JSON.stringify(packet);
  if (text.length > config.maxPacketChars) {
    // Recorte de emergencia con orden explícito de sacrificio: primero el
    // brief (GPT ya lo conoce de rondas previas), luego findings previos.
    packet.designBrief = truncate(packet.designBrief, 4000);
    if (JSON.stringify(packet).length > config.maxPacketChars && packet.previousFindings) {
      packet.previousFindings.findings = packet.previousFindings.findings.slice(0, 10);
    }
    packet._truncated = true;
  }

  return { packet, screenshots, references: references.references };
}
