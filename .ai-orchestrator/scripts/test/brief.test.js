import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrief, BriefError } from '../lib/brief.js';

test('brief válido: feature, modo, hash estable', () => {
  const text = `---\nfeature: "Mapa A1"\nversion: "2"\nreferenceMode: strict\n---\n## FEATURE\nel mapa`;
  const b = parseBrief(text);
  assert.equal(b.feature, 'Mapa A1');
  assert.equal(b.version, '2');
  assert.equal(b.referenceMode, 'strict');
  assert.equal(b.hash, parseBrief(text).hash);
});

test('hash cambia si cambia el contenido (y con CRLF no cambia)', () => {
  const a = parseBrief(`---\nfeature: "F"\n---\ncuerpo`);
  const b = parseBrief(`---\nfeature: "F"\n---\ncuerpo distinto`);
  assert.notEqual(a.hash, b.hash);
  const crlf = parseBrief(`---\r\nfeature: "F"\r\n---\r\ncuerpo`);
  assert.equal(a.hash, crlf.hash);
});

test('referenceMode default es directional; inválido revienta', () => {
  assert.equal(parseBrief(`---\nfeature: "F"\n---\nx`).referenceMode, 'directional');
  assert.throws(() => parseBrief(`---\nfeature: "F"\nreferenceMode: pixel\n---\nx`), BriefError);
});

test('sin frontmatter, sin feature o sin cuerpo → error claro', () => {
  assert.throws(() => parseBrief('solo cuerpo'), /frontmatter/);
  assert.throws(() => parseBrief(`---\nversion: "1"\n---\nx`), /feature/);
  assert.throws(() => parseBrief(`---\nfeature: "F"\n---\n`), /vacío/);
});
