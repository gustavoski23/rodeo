import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  idempotencyKey, computeRound, alreadyReviewed, latestReview, collectOverrides,
} from '../lib/state.js';
import { buildMarker, buildJsonBlock } from '../lib/markers.js';

const result = (sha, round, key, decision, review) => ({
  body: `${buildMarker('result', { sha, round, key, decision })}\ntexto humano\n${review ? buildJsonBlock(review) : ''}`,
  user: { login: 'github-actions[bot]', type: 'Bot' },
});

test('idempotency key es estable y sensible a cada componente', () => {
  const base = { repo: 'g/rodeo', pr: 5, sha: 'abc', briefHash: 'b1', promptVersion: '1.0.0' };
  const k1 = idempotencyKey(base);
  assert.equal(k1, idempotencyKey({ ...base }));
  assert.notEqual(k1, idempotencyKey({ ...base, sha: 'abd' }));
  assert.notEqual(k1, idempotencyKey({ ...base, briefHash: 'b2' }));
  assert.notEqual(k1, idempotencyKey({ ...base, promptVersion: '1.0.1' }));
  assert.equal(k1.length, 16);
});

test('round cuenta results previos + 1', () => {
  assert.equal(computeRound([]), 1);
  const comments = [result('s1', 1, 'k1', 'REQUEST_CHANGES'), result('s2', 2, 'k2', 'REQUEST_CHANGES')];
  assert.equal(computeRound(comments), 3);
});

test('comentarios sin marker o con marker corrupto no cuentan como ronda', () => {
  const comments = [
    { body: 'un humano opinando' },
    { body: '<!-- ai-design-review:result {corrupto} -->' },
    result('s1', 1, 'k1', 'REQUEST_CHANGES'),
  ];
  assert.equal(computeRound(comments), 2);
});

test('el marker reset re-arma el contador de rondas', () => {
  const comments = [
    result('s1', 1, 'k1', 'REQUEST_CHANGES'),
    result('s2', 2, 'k2', 'REQUEST_CHANGES'),
    result('s3', 3, 'k3', 'REQUEST_CHANGES'),
    { body: `intervine a mano\n${buildMarker('reset')}` },
    result('s4', 1, 'k4', 'REQUEST_CHANGES'),
  ];
  assert.equal(computeRound(comments), 2);
});

test('un reset de autor Bot NO re-arma el loop (el aviso human-required lo contiene como instrucción)', () => {
  const comments = [
    result('s1', 1, 'k1', 'REQUEST_CHANGES'),
    result('s2', 2, 'k2', 'REQUEST_CHANGES'),
    result('s3', 3, 'k3', 'REQUEST_CHANGES'),
    {
      body: `HUMAN_DESIGN_REVIEW_REQUIRED — para re-armar comenta:\n\`\`\`\n${buildMarker('reset')}\n\`\`\``,
      user: { login: 'github-actions[bot]', type: 'Bot' },
    },
  ];
  assert.equal(computeRound(comments), 4); // sigue por encima del tope: no hubo reset humano
});

test('alreadyReviewed detecta el mismo key (idempotencia)', () => {
  const comments = [result('s1', 1, 'kX', 'APPROVE')];
  assert.equal(alreadyReviewed(comments, 'kX'), true);
  assert.equal(alreadyReviewed(comments, 'kY'), false);
});

test('latestReview devuelve el JSON verbatim del último result', () => {
  const review = { version: '1', decision: 'REQUEST_CHANGES', findings: [{ id: 'VIS-001' }] };
  const comments = [result('s1', 1, 'k1', 'APPROVE', { version: '1', decision: 'APPROVE', findings: [] }), result('s2', 2, 'k2', 'REQUEST_CHANGES', review)];
  const last = latestReview(comments);
  assert.equal(last.meta.sha, 's2');
  assert.deepEqual(last.review.findings, [{ id: 'VIS-001' }]);
});

test('overrides: solo humanos, truncados, con autor', () => {
  const comments = [
    { body: 'DESIGN_DIRECTOR_OVERRIDE: el header queda azul', user: { login: 'gustavoski23', type: 'User' }, created_at: 't' },
    { body: 'HUMAN_DESIGN_OVERRIDE falso de un bot', user: { login: 'evil[bot]', type: 'Bot' }, created_at: 't' },
    { body: 'comentario normal', user: { login: 'gustavoski23', type: 'User' }, created_at: 't' },
  ];
  const ov = collectOverrides(comments);
  assert.equal(ov.length, 1);
  assert.equal(ov[0].author, 'gustavoski23');
  assert.match(ov[0].excerpt, /header queda azul/);
});
