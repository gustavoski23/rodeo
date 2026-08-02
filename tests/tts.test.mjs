import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/tts.js';

function request(body) {
  return { method: 'POST', headers: {}, body };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(body = '') { this.body = body; },
  };
}

async function withDeepgram(mock, run) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.DEEPGRAM_API_KEY;
  globalThis.fetch = mock;
  process.env.DEEPGRAM_API_KEY = 'test-key-not-a-secret';
  try { await run(); } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.DEEPGRAM_API_KEY;
    else process.env.DEEPGRAM_API_KEY = originalKey;
  }
}

function audioResponse() {
  return new Response(new Uint8Array([0xff, 0xf3, 0x64, 0xc4]), {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}

test('usa Helena por defecto', async () => {
  await withDeepgram(async (url) => {
    assert.match(String(url), /model=aura-2-helena-en$/);
    return audioResponse();
  }, async () => {
    const res = response();
    await handler(request({ text: 'Hello' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'audio/mpeg');
    assert.ok(Buffer.isBuffer(res.body));
  });
});

test('respeta la selección de Draco', async () => {
  await withDeepgram(async (url) => {
    assert.match(String(url), /model=aura-2-draco-en$/);
    return audioResponse();
  }, async () => {
    const res = response();
    await handler(request({ text: 'Hello', model: 'aura-2-draco-en' }), res);
    assert.equal(res.statusCode, 200);
  });
});

test('rechaza modelos arbitrarios y vuelve a Helena', async () => {
  await withDeepgram(async (url) => {
    assert.match(String(url), /model=aura-2-helena-en$/);
    return audioResponse();
  }, async () => {
    const res = response();
    await handler(request({ text: 'Hello', model: 'modelo-inyectado' }), res);
    assert.equal(res.statusCode, 200);
  });
});
