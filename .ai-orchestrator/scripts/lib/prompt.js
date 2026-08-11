// Carga prompts versionados (frontmatter `version:` obligatorio en el del
// reviewer: entra en la idempotency key).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ORCH_ROOT } from './config.js';

export function loadPrompt(name) {
  const path = resolve(ORCH_ROOT, 'prompts', name);
  const text = readFileSync(path, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { version: '0', body: text.trim() };
  const vm = m[1].match(/version:\s*["']?([\w.-]+)["']?/);
  return { version: vm ? vm[1] : '0', body: m[2].trim() };
}
