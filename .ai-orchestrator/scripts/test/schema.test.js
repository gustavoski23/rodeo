import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeValidator, parseReview, ReviewError } from '../lib/openai.js';
import { ORCH_ROOT } from '../lib/config.js';

const schema = JSON.parse(readFileSync(resolve(ORCH_ROOT, 'schemas', 'design-review.schema.json'), 'utf8'));
const validate = makeValidator(schema);

const finding = {
  id: 'VIS-001', priority: 'P1', category: 'visual-hierarchy', screen: 'talk-mobile-standard',
  problem: 'p', whyItMatters: 'w', requestedChange: 'r',
  acceptanceCriteria: ['a'], implementationHints: ['h'],
};
const valid = {
  version: '1', decision: 'REQUEST_CHANGES', overallScore: 62, summary: 's',
  findings: [finding], approvedAspects: ['x'], nextAction: 'n',
};

test('acepta un review completo válido', () => {
  assert.equal(validate(valid).ok, true);
});

test('rechaza decision fuera del enum', () => {
  const res = validate({ ...valid, decision: 'MAYBE' });
  assert.equal(res.ok, false);
});

test('rechaza prioridad inválida y campos faltantes en findings', () => {
  assert.equal(validate({ ...valid, findings: [{ ...finding, priority: 'P9' }] }).ok, false);
  const { acceptanceCriteria, ...incomplete } = finding;
  assert.equal(validate({ ...valid, findings: [incomplete] }).ok, false);
});

test('rechaza score fuera de rango y propiedades extra', () => {
  assert.equal(validate({ ...valid, overallScore: 150 }).ok, false);
  assert.equal(validate({ ...valid, hacked: true }).ok, false);
});

test('parseReview: extrae output_text del Responses API y valida', () => {
  const responseJson = { output_text: JSON.stringify(valid) };
  assert.deepEqual(parseReview(responseJson, schema).decision, 'REQUEST_CHANGES');
});

test('parseReview: forma output[]/content[] también funciona', () => {
  const responseJson = {
    output: [
      { type: 'reasoning' },
      { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(valid) }] },
    ],
  };
  assert.equal(parseReview(responseJson, schema).overallScore, 62);
});

test('parseReview: JSON corrupto o no conforme falla controlado (ReviewError)', () => {
  assert.throws(() => parseReview({ output_text: 'no es json' }, schema), ReviewError);
  assert.throws(() => parseReview({ output_text: '{"decision":"APPROVE"}' }, schema), ReviewError);
  assert.throws(() => parseReview({}, schema), ReviewError);
});
