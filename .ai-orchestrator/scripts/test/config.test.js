import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, ConfigError } from '../lib/config.js';

const MINIMAL = `
version: 1
viewports:
  mobile: { width: 390, height: 844 }
screens:
  - id: home
    path: /
    viewports: [mobile]
`;

test('config mínimo válido hereda defaults', () => {
  const cfg = parseConfig(MINIMAL);
  assert.equal(cfg.maxRounds, 3);
  assert.equal(cfg.maxScreenshotsPerReview, 8);
  assert.equal(cfg.review.label, 'ai-design-review');
  assert.equal(cfg.screens[0].id, 'home');
});

test('rechaza screens vacío', () => {
  assert.throws(() => parseConfig('version: 1\nviewports: {}\nscreens: []'), ConfigError);
});

test('rechaza viewport desconocido en una screen', () => {
  const bad = MINIMAL.replace('[mobile]', '[tablet]');
  assert.throws(() => parseConfig(bad), /viewport desconocido/);
});

test('rechaza screen id duplicado', () => {
  const dup = MINIMAL + `  - id: home\n    path: /x\n    viewports: [mobile]\n`;
  assert.throws(() => parseConfig(dup), /duplicado/);
});

test('rechaza action con forma inválida', () => {
  const bad = MINIMAL + `    actions:\n      - tap: '.x'\n`;
  assert.throws(() => parseConfig(bad), /action inválida/);
});

test('rechaza maxRounds fuera de rango', () => {
  assert.throws(() => parseConfig(MINIMAL + 'maxRounds: 0\n'), /maxRounds/);
});

test('OPENAI_REVIEW_MODEL del env pisa el modelo del config', () => {
  process.env.OPENAI_REVIEW_MODEL = 'gpt-test-override';
  try {
    const cfg = parseConfig(MINIMAL);
    assert.equal(cfg.review.model, 'gpt-test-override');
  } finally {
    delete process.env.OPENAI_REVIEW_MODEL;
  }
});
