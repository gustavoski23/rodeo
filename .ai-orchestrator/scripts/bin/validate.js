#!/usr/bin/env node
// Valida toda la configuración del orquestador sin tocar ninguna API:
//   node bin/validate.js
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, ORCH_ROOT } from '../lib/config.js';
import { loadBrief } from '../lib/brief.js';
import { loadPrompt } from '../lib/prompt.js';
import { makeValidator } from '../lib/openai.js';

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const warn = (msg) => console.log(`  ~ ${msg}`);

console.log('[validate] .ai-orchestrator');

try {
  const config = loadConfig();
  ok(`config.yml: ${config.screens.length} screens, ${Object.keys(config.viewports).length} viewports, maxRounds=${config.maxRounds}, modelo=${config.review.model}`);
} catch (e) {
  bad(`config.yml: ${e.message}`);
}

try {
  const brief = loadBrief();
  if (!brief) bad('design-brief.md no existe (el review en CI saldrá BLOCKED)');
  else ok(`design-brief.md: feature="${brief.feature}" v${brief.version} referenceMode=${brief.referenceMode} hash=${brief.hash}`);
} catch (e) {
  bad(`design-brief.md: ${e.message}`);
}

try {
  const p = loadPrompt('design-reviewer.md');
  if (p.version === '0') bad('prompts/design-reviewer.md sin "version:" en frontmatter (rompe la idempotencia)');
  else ok(`design-reviewer.md v${p.version} (${p.body.length} chars)`);
} catch (e) {
  bad(`prompts/design-reviewer.md: ${e.message}`);
}

try {
  loadPrompt('claude-resolve-review.md');
  ok('claude-resolve-review.md presente');
} catch (e) {
  bad(`prompts/claude-resolve-review.md: ${e.message}`);
}

try {
  const schema = JSON.parse(readFileSync(resolve(ORCH_ROOT, 'schemas', 'design-review.schema.json'), 'utf8'));
  const validate = makeValidator(schema);
  const sample = {
    version: '1', decision: 'APPROVE', overallScore: 90, summary: 's',
    findings: [], approvedAspects: [], nextAction: 'n',
  };
  const res = validate(sample);
  if (res.ok) ok('design-review.schema.json compila y acepta un review mínimo');
  else bad(`schema rechaza un review mínimo válido: ${res.errors.join('; ')}`);
} catch (e) {
  bad(`design-review.schema.json: ${e.message}`);
}

if (!existsSync(resolve(ORCH_ROOT, 'references'))) warn('references/ no existe (opcional)');
for (const env of ['OPENAI_API_KEY', 'RODEO_APP_PASS']) {
  if (!process.env[env]) warn(`${env} no está en el entorno (necesario solo en CI/review real)`);
}

if (failures) {
  console.error(`[validate] FALLÓ con ${failures} errores`);
  process.exit(1);
}
console.log('[validate] todo OK');
