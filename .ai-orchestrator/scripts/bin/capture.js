#!/usr/bin/env node
// Captura standalone (sin GitHub, sin OpenAI):
//   node bin/capture.js --url http://localhost:4870 [--round 0] [--out dir]
import { resolve } from 'node:path';
import { loadConfig, ORCH_ROOT } from '../lib/config.js';
import { captureScreens } from '../lib/capture.js';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};

const baseUrl = opt('url');
if (!baseUrl) {
  console.error('Uso: node bin/capture.js --url http://localhost:4870 [--round 0] [--out dir]');
  process.exit(2);
}

const config = loadConfig();
const outDir = resolve(opt('out', resolve(ORCH_ROOT, 'out', 'screenshots')));
const round = Number(opt('round', '0'));

const { shots, issues, blocked } = await captureScreens({
  config, baseUrl, round, outDir, log: (m) => console.log(`[capture] ${m}`),
});

console.log(`[capture] ${shots.length} screenshots en ${outDir}`);
for (const s of shots) console.log(`  - ${s.file}`);
const issueCount = issues.consoleErrors.length + issues.pageErrors.length + issues.failedRequests.length;
if (issueCount) {
  console.log(`[capture] ${issueCount} problemas de runtime:`);
  for (const list of [issues.consoleErrors, issues.pageErrors, issues.failedRequests]) {
    for (const i of list.slice(0, 10)) console.log(`  ! ${i}`);
  }
}
if (issues.blankScreens.length) console.log(`[capture] pantallas en blanco: ${issues.blankScreens.join(', ')}`);
if (blocked) {
  console.error(`[capture] BLOCKED: ${blocked.reason}`);
  process.exit(1);
}
