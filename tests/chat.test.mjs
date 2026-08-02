import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/chat.js';
import {
  DEFAULT_FREE_MODEL,
  DEFAULT_GO_CHAT_MODEL,
  OPENCODE_GO_URL,
  OPENCODE_GO_RESPONSES_URL,
  OPENCODE_ZEN_URL,
  isCreditOrQuotaError,
  resolveGoModel,
} from '../api/_opencode.js';

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function request(body) {
  return { method: 'POST', headers: {}, body };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    chunks: [],
    setHeader(name, value) { this.headers[name] = value; },
    writeHead(status, headers) { this.statusCode = status; Object.assign(this.headers, headers); },
    write(chunk) { this.chunks.push(String(chunk)); },
    end(chunk = '') { this.chunks.push(String(chunk)); this.body = this.chunks.join(''); },
  };
}

async function withFetch(mock, run) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENCODE_API_KEY;
  globalThis.fetch = mock;
  process.env.OPENCODE_API_KEY = 'test-key-not-a-secret';
  try { await run(); } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENCODE_API_KEY;
    else process.env.OPENCODE_API_KEY = originalKey;
  }
}

test('detecta errores de crédito sin confundir fallos genéricos', () => {
  assert.equal(isCreditOrQuotaError(402, ''), true);
  assert.equal(isCreditOrQuotaError(400, '{"name":"CreditsError","message":"Insufficient balance"}'), true);
  assert.equal(isCreditOrQuotaError(429, 'usage limit exceeded'), true);
  assert.equal(isCreditOrQuotaError(429, 'insufficient_quota'), true);
  assert.equal(isCreditOrQuotaError(429, 'server busy'), false);
});

test('descarta un modelo legacy incompatible con OpenCode Go', () => {
  assert.equal(resolveGoModel('claude-haiku-4-5', DEFAULT_GO_CHAT_MODEL), DEFAULT_GO_CHAT_MODEL);
  assert.equal(resolveGoModel('gpt-5.6-luna', DEFAULT_GO_CHAT_MODEL), 'gpt-5.6-luna');
});

test('usa OpenCode Go Responses y normaliza la respuesta de Luna', async () => {
  const calls = [];
  await withFetch(async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    return jsonResponse({
      model: body.model,
      status: 'completed',
      output: [{ content: [{ type: 'output_text', text: 'respuesta de Go' }] }],
      usage: { input_tokens: 4, output_tokens: 3, total_tokens: 7 },
    });
  }, async () => {
    const res = response();
    await handler(request({ messages: [{ role: 'user', content: 'Hola' }] }), res);
    const data = JSON.parse(res.body);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, OPENCODE_GO_RESPONSES_URL);
    assert.equal(calls[0].body.model, DEFAULT_GO_CHAT_MODEL);
    assert.equal(calls[0].body.input[0].content, 'Hola');
    assert.equal(data.content, 'respuesta de Go');
    assert.equal(data.finish_reason, 'stop');
  });
});

test('conserva streaming SSE cuando Luna responde desde OpenCode Go', async () => {
  await withFetch(async (url) => {
    assert.equal(url, OPENCODE_GO_RESPONSES_URL);
    return new Response(
      'event: response.output_text.delta\n' +
      'data: {"type":"response.output_text.delta","delta":"Hola desde Go"}\n\n' +
      'event: response.completed\n' +
      'data: {"type":"response.completed","response":{"status":"completed","usage":{"total_tokens":9}}}\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }, async () => {
    const res = response();
    await handler(request({ stream: true, messages: [{ role: 'user', content: 'Hola' }] }), res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /"delta":"Hola desde Go"/);
    assert.match(res.body, /"finish_reason":"stop"/);
    assert.match(res.body, new RegExp(`"model":"${DEFAULT_GO_CHAT_MODEL}"`));
  });
});

test('reintenta con el modelo gratuito tras CreditsError', async () => {
  const calls = [];
  await withFetch(async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    if (calls.length === 1) {
      return jsonResponse({ name: 'CreditsError', message: 'Insufficient balance' }, { status: 402 });
    }
    return jsonResponse({
      model: body.model,
      choices: [{ message: { content: 'respuesta segura' }, finish_reason: 'stop' }],
      usage: { total_tokens: 8 },
    });
  }, async () => {
    const res = response();
    await handler(request({ messages: [{ role: 'user', content: 'Hola' }] }), res);
    const data = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, OPENCODE_GO_RESPONSES_URL);
    assert.equal(calls[0].body.model, DEFAULT_GO_CHAT_MODEL);
    assert.equal(calls[1].url, OPENCODE_ZEN_URL);
    assert.equal(calls[1].body.model, DEFAULT_FREE_MODEL);
    assert.equal(data.content, 'respuesta segura');
    assert.equal(data.model, DEFAULT_FREE_MODEL);
  });
});

test('no reintenta errores que no son de crédito o cuota', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return jsonResponse({ message: 'modelo inválido' }, { status: 400 });
  }, async () => {
    const res = response();
    await handler(request({ messages: [{ role: 'user', content: 'Hola' }] }), res);
    const data = JSON.parse(res.body);
    assert.equal(calls, 1);
    assert.equal(res.statusCode, 503);
    assert.equal(data.error, 'ai_temporarily_unavailable');
    assert.doesNotMatch(res.body, /modelo inválido/i);
  });
});

test('oculta ambos errores técnicos cuando también falla el fallback', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    if (calls === 1) {
      return jsonResponse({ name: 'CreditsError', message: 'Insufficient balance' }, { status: 402 });
    }
    return jsonResponse({ internal: 'free model overloaded' }, { status: 503 });
  }, async () => {
    const res = response();
    await handler(request({ messages: [{ role: 'user', content: 'Hola' }] }), res);
    const data = JSON.parse(res.body);
    assert.equal(calls, 2);
    assert.equal(res.statusCode, 503);
    assert.equal(data.error, 'ai_temporarily_unavailable');
    assert.match(data.detail, /Intenta de nuevo/);
    assert.doesNotMatch(res.body, /CreditsError|Insufficient balance|overloaded/i);
  });
});

test('el fallback también conserva streaming SSE', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    if (calls === 1) return jsonResponse({ message: 'quota exceeded' }, { status: 429 });
    return new Response(
      'data: {"choices":[{"delta":{"content":"Hola"},"finish_reason":null}]}\n\n' +
      'data: {"choices":[{"delta":{"content":" mundo"},"finish_reason":"stop"}]}\n\n' +
      'data: [DONE]\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }, async () => {
    const res = response();
    await handler(request({ stream: true, messages: [{ role: 'user', content: 'Hola' }] }), res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /"delta":"Hola"/);
    assert.match(res.body, /"delta":" mundo"/);
    assert.match(res.body, new RegExp(`"model":"${DEFAULT_FREE_MODEL}"`));
    assert.match(res.body, /data: \[DONE\]/);
  });
});
