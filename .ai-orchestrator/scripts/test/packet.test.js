import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPacket, filterUiFiles, truncate, capList } from '../lib/packet.js';
import { parseBrief } from '../lib/brief.js';

const config = {
  maxScreenshotsPerReview: 2,
  maxPacketChars: 24000,
  maxConsoleErrors: 3,
  maxUiFilesListed: 40,
};
const brief = parseBrief(`---\nfeature: "F"\nreferenceMode: strict\n---\ncuerpo del brief`);
const shot = (n) => ({ screen: `s${n}`, viewport: 'mobile-standard', width: 390, height: 844, file: `/tmp/s${n}.png` });

function build(overrides = {}) {
  return buildPacket({
    config, brief,
    pr: { number: 7, title: 'T' }, sha: 'abc1234', previewUrl: 'https://x',
    shots: [shot(1), shot(2)], references: { references: [], omitted: 0 },
    uiFiles: { files: ['index.html'], omitted: 0 },
    implementationSummary: 'resumen', previousReview: null, overrides: [], round: 1,
    captureIssues: { consoleErrors: [], pageErrors: [], failedRequests: [], blankScreens: [] },
    ...overrides,
  });
}

test('packet: campos esenciales presentes y screenshot-first', () => {
  const { packet } = build();
  assert.equal(packet.feature, 'F');
  assert.equal(packet.referenceMode, 'strict');
  assert.equal(packet.pr.number, 7);
  assert.equal(packet.screenshots.length, 2);
  assert.equal(packet.round, 1);
});

test('límite duro de screenshots: recorta y lo reporta', () => {
  const { packet, screenshots } = build({ shots: [shot(1), shot(2), shot(3), shot(4)] });
  assert.equal(screenshots.length, 2);
  assert.equal(packet.screenshotsDropped, 2);
});

test('console errors se capean con nota de truncado', () => {
  const { packet } = build({
    captureIssues: { consoleErrors: ['a', 'b', 'c', 'd', 'e'], pageErrors: [], failedRequests: [], blankScreens: [] },
  });
  assert.equal(packet.runtimeIssues.consoleErrors.length, 4); // 3 + nota
  assert.match(packet.runtimeIssues.consoleErrors[3], /más de console errors/);
});

test('brief gigante se recorta para respetar maxPacketChars', () => {
  const bigBrief = parseBrief(`---\nfeature: "F"\n---\n${'x'.repeat(50000)}`);
  const { packet } = build({ brief: bigBrief, config: { ...config, maxPacketChars: 8000 } });
  assert.ok(JSON.stringify(packet).length < 20000);
  assert.equal(packet._truncated, true);
});

test('findings previos viajan con id/priority intactos (sin resumir)', () => {
  const previousReview = {
    meta: { round: 1 },
    review: { decision: 'REQUEST_CHANGES', findings: [{ id: 'VIS-001', priority: 'P0', problem: 'p', requestedChange: 'r' }] },
  };
  const { packet } = build({ previousReview });
  assert.equal(packet.previousFindings.findings[0].id, 'VIS-001');
  assert.equal(packet.previousFindings.findings[0].priority, 'P0');
});

test('filterUiFiles: solo archivos visuales, nunca la infraestructura del orquestador', () => {
  const files = [
    { filename: 'index.html' }, { filename: 'js/story-mode.js' }, { filename: 'icons/a.svg' },
    { filename: '.ai-orchestrator/config.yml' }, { filename: '.github/workflows/x.yml' },
    { filename: 'api/chat.js' }, { filename: 'README.md' },
  ];
  const { files: ui } = filterUiFiles(files);
  assert.ok(ui.includes('index.html'));
  assert.ok(ui.includes('js/story-mode.js'));
  assert.ok(!ui.some((f) => f.startsWith('.ai-orchestrator/') || f.startsWith('.github/')));
  assert.ok(!ui.includes('README.md'));
});

test('truncate y capList marcan el recorte', () => {
  assert.match(truncate('x'.repeat(20), 10), /truncado/);
  assert.equal(truncate('corto', 10), 'corto');
  assert.equal(capList(['a', 'b'], 5, 'z').length, 2);
});
