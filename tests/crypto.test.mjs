import assert from 'node:assert/strict';
import test from 'node:test';
import jsQR from 'jsqr';
import { create as createQr } from 'qrcode';

import cryptoHandler from '../api/cripto.js';
import {
  formatUsdcBaseUnits,
  isPaymentAddressForChain,
  isPaymentUriForChain,
  paymentQrPayload,
} from '../src/lib/crypto-payment.js';

const ADDRESS = '3axpuPto4iPUiQTPdM6a6qGuA55esJbC6XU8Ba843tSo';
const PAY_URI = `solana:${ADDRESS}?amount=0.104436&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=reference`;

function decodeGeneratedQr(payload) {
  const qr = createQr(payload, { errorCorrectionLevel: 'M' });
  const quietZone = 4;
  const scale = 8;
  const side = (qr.modules.size + quietZone * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4);

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const row = Math.floor(y / scale) - quietZone;
      const column = Math.floor(x / scale) - quietZone;
      const dark =
        row >= 0 &&
        column >= 0 &&
        row < qr.modules.size &&
        column < qr.modules.size &&
        Boolean(qr.modules.get(row, column));
      const value = dark ? 0 : 255;
      const offset = (y * side + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }

  return jsQR(pixels, side, side)?.data ?? null;
}

function responseRecorder() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: '',
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    end(body = '') {
      this.body = body;
      return this;
    },
  };
}

async function call(body) {
  const res = responseRecorder();
  await cryptoHandler({ method: 'POST', body }, res);
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

test('el QR de Solana contiene la dirección pelada compatible con Decaf', () => {
  const payload = paymentQrPayload({ chain: 'solana', payTo: ` ${ADDRESS} `, payUri: PAY_URI });
  assert.equal(payload, ADDRESS);
  assert.equal(decodeGeneratedQr(payload), ADDRESS);
});

test('Stellar conserva la URI completa para no perder el memo', () => {
  const stellarUri = 'web+stellar:pay?destination=GABC&amount=1&memo=pedido';
  assert.equal(
    paymentQrPayload({ chain: 'stellar', payTo: 'GABC', payUri: ` ${stellarUri} ` }),
    stellarUri,
  );
});

test('formatea micro-USDC sin usar floats', () => {
  assert.equal(formatUsdcBaseUnits('104436'), '0.104436');
  assert.equal(formatUsdcBaseUnits('32000000'), '32');
  assert.equal(formatUsdcBaseUnits('000001'), '0.000001');
});

test('valida dirección y esquema antes de mostrar el cobro', () => {
  assert.equal(isPaymentAddressForChain('solana', ADDRESS), true);
  assert.equal(isPaymentAddressForChain('solana', 'no-es-direccion'), false);
  assert.equal(isPaymentUriForChain('solana', PAY_URI), true);
  assert.equal(isPaymentUriForChain('solana', 'javascript:alert(1)'), false);
  assert.equal(isPaymentUriForChain('stellar', 'web+stellar:pay?destination=GABC'), true);
});

test('el plan de cobro reducido queda bloqueado en producción', async () => {
  const previousVercelEnv = process.env.VERCEL_ENV;
  const previousTestMode = process.env.CRYPTO_PAYMENT_TEST_MODE;
  const previousFetch = globalThis.fetch;
  process.env.VERCEL_ENV = 'production';
  delete process.env.CRYPTO_PAYMENT_TEST_MODE;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('no debería llamar al receptor');
  };

  try {
    const result = await call({ action: 'intent', chain: 'solana', plan: 'rodeo-test' });
    assert.equal(result.status, 403);
    assert.equal(result.json.motivo, 'modo_prueba_no_disponible');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
    if (previousTestMode === undefined) delete process.env.CRYPTO_PAYMENT_TEST_MODE;
    else process.env.CRYPTO_PAYMENT_TEST_MODE = previousTestMode;
  }
});

test('el plan reducido sí se envía al receptor en una vista previa', async () => {
  const previousVercelEnv = process.env.VERCEL_ENV;
  const previousFetch = globalThis.fetch;
  process.env.VERCEL_ENV = 'preview';
  let upstreamBody = null;
  globalThis.fetch = async (_url, init) => {
    upstreamBody = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({
        intent: 'signed-intent',
        chain: 'solana',
        payTo: ADDRESS,
        reference: 'reference',
        payUri: PAY_URI,
        amountBaseUnits: '104436',
        expiresAtMs: Date.now() + 60_000,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const result = await call({ action: 'intent', chain: 'solana', plan: 'rodeo-test' });
    assert.equal(result.status, 200);
    assert.equal(result.json.ok, true);
    assert.deepEqual(upstreamBody, { plan: 'rodeo-test', chain: 'solana', label: 'RODEO Premium' });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }
});
