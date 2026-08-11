import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePreview } from '../lib/preview.js';

const URL_OK = 'https://rodeo-abc-preview.vercel.app';

function fakeGh({ deployments = [], statusesById = {} }) {
  return {
    listDeployments: async () => deployments,
    listDeploymentStatuses: async (id) => statusesById[id] ?? [],
  };
}
const okFetch = async (url) => ({ status: 200, url, ok: true });
const noSleep = async () => {};

test('resuelve la URL cuando el deployment del SHA está en success', async () => {
  const gh = fakeGh({
    deployments: [{ id: 1, environment: 'Preview' }],
    statusesById: { 1: [{ state: 'success', environment_url: URL_OK }] },
  });
  const r = await resolvePreview({ gh, sha: 'a'.repeat(40), fetchImpl: okFetch, sleepImpl: noSleep });
  assert.equal(r.status, 'ready');
  assert.equal(r.url, URL_OK);
});

test('espera y reintenta hasta que aparece el success', async () => {
  let calls = 0;
  const gh = {
    listDeployments: async () => (++calls < 3 ? [] : [{ id: 9, environment: 'Preview' }]),
    listDeploymentStatuses: async () => [{ state: 'success', environment_url: URL_OK }],
  };
  const r = await resolvePreview({ gh, sha: 'x', pollSeconds: 0.001, fetchImpl: okFetch, sleepImpl: noSleep });
  assert.equal(r.status, 'ready');
  assert.equal(calls, 3);
});

test('deployment en failure → failed, sin review falso', async () => {
  const gh = fakeGh({
    deployments: [{ id: 2, environment: 'Preview' }],
    statusesById: { 2: [{ state: 'failure' }] },
  });
  const r = await resolvePreview({ gh, sha: 'x', fetchImpl: okFetch, sleepImpl: noSleep });
  assert.equal(r.status, 'failed');
});

test('preview con HTTP 500 → http_error', async () => {
  const gh = fakeGh({
    deployments: [{ id: 3, environment: 'Preview' }],
    statusesById: { 3: [{ state: 'success', environment_url: URL_OK }] },
  });
  const r = await resolvePreview({ gh, sha: 'x', fetchImpl: async (u) => ({ status: 500, url: u }), sleepImpl: noSleep });
  assert.equal(r.status, 'http_error');
  assert.match(r.reason, /HTTP 500/);
});

test('redirect fuera del host (deployment protection) → http_error', async () => {
  const gh = fakeGh({
    deployments: [{ id: 4, environment: 'Preview' }],
    statusesById: { 4: [{ state: 'success', environment_url: URL_OK }] },
  });
  const r = await resolvePreview({
    gh, sha: 'x', sleepImpl: noSleep,
    fetchImpl: async () => ({ status: 200, url: 'https://vercel.com/sso/login' }),
  });
  assert.equal(r.status, 'http_error');
  assert.match(r.reason, /redirigió/);
});

test('si el HEAD cambió mientras esperaba → stale (nunca revisar SHA viejo)', async () => {
  const gh = fakeGh({ deployments: [] });
  const r = await resolvePreview({ gh, sha: 'x', isStale: async () => true, sleepImpl: noSleep });
  assert.equal(r.status, 'stale');
});

test('timeout sin deployment → timeout con motivo claro', async () => {
  const gh = fakeGh({ deployments: [] });
  const r = await resolvePreview({ gh, sha: 'x', timeoutSeconds: 0, sleepImpl: noSleep });
  assert.equal(r.status, 'timeout');
  assert.match(r.reason, /ningún deployment/);
});
