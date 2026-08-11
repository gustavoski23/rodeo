// Parsea el DESIGN BRIEF (.ai-orchestrator/design-brief.md): frontmatter YAML
// + cuerpo markdown. El hash del brief entra en la idempotency key.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { ORCH_ROOT } from './config.js';

export const REFERENCE_MODES = ['strict', 'directional', 'inspiration'];

export class BriefError extends Error {}

export function parseBrief(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new BriefError('design-brief.md necesita frontmatter YAML (--- ... ---)');
  let meta;
  try {
    meta = yaml.load(m[1]) ?? {};
  } catch (e) {
    throw new BriefError(`design-brief.md: frontmatter YAML inválido: ${e.message}`);
  }
  if (!meta.feature || typeof meta.feature !== 'string') {
    throw new BriefError('design-brief.md: falta "feature" en el frontmatter');
  }
  const referenceMode = meta.referenceMode ?? 'directional';
  if (!REFERENCE_MODES.includes(referenceMode)) {
    throw new BriefError(`design-brief.md: referenceMode "${referenceMode}" inválido (${REFERENCE_MODES.join('|')})`);
  }
  const body = m[2].trim();
  if (!body) throw new BriefError('design-brief.md: el cuerpo está vacío');
  const hash = createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
  return {
    feature: meta.feature,
    version: String(meta.version ?? '1'),
    referenceMode,
    screens: Array.isArray(meta.screens) ? meta.screens : null,
    body,
    hash,
  };
}

export function loadBrief(path = resolve(ORCH_ROOT, 'design-brief.md')) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null; // brief ausente es un estado válido: el review queda BLOCKED
  }
  return parseBrief(text);
}
