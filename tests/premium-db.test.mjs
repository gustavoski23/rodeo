import assert from 'node:assert/strict';
import test from 'node:test';

import { elegirVigente, vencimientoISO } from '../api/_premium-db.js';

test('el vencimiento suma el período del plan al momento del pago', () => {
  // paidAtMs = 0 → epoch, así el ISO es determinista sin depender del reloj.
  assert.equal(vencimientoISO('rodeo-monthly', 0), '1970-01-31T00:00:00.000Z');
  assert.equal(vencimientoISO('rodeo-yearly', 0), '1971-01-01T00:00:00.000Z');
});

test('la prueba y los pagos sin hora no tienen vencimiento', () => {
  assert.equal(vencimientoISO('rodeo-test', 0), null);
  assert.equal(vencimientoISO('rodeo-monthly', null), null);
  assert.equal(vencimientoISO('rodeo-monthly', undefined), null);
});

test('elegirVigente toma la fila sin vencer y la mapea a CryptoReceipt', () => {
  const ahora = 1_000_000;
  const receipt = elegirVigente(
    [
      {
        chain: 'stellar',
        plan: 'rodeo-monthly',
        tx_id: 'abc',
        amount_base_units: '104088',
        paid_at: '2026-08-03T16:20:22.000Z',
        expires_at: new Date(ahora + 86_400_000).toISOString(),
      },
    ],
    ahora,
  );
  assert.deepEqual(receipt, {
    chain: 'stellar',
    plan: 'rodeo-monthly',
    txId: 'abc',
    amountBaseUnits: '104088',
    paidAtMs: Date.parse('2026-08-03T16:20:22.000Z'),
  });
});

test('la prueba (sin vencimiento) cuenta como vigente', () => {
  const receipt = elegirVigente(
    [{ chain: 'solana', plan: 'rodeo-test', tx_id: 't', amount_base_units: '104088', paid_at: null, expires_at: null }],
    Date.now(),
  );
  assert.equal(receipt?.plan, 'rodeo-test');
  assert.equal(receipt?.paidAtMs, null);
});

test('una suscripción vencida no cuenta; se elige la siguiente vigente', () => {
  const ahora = 2_000_000_000_000;
  const vencida = { chain: 'solana', plan: 'rodeo-monthly', tx_id: 'vieja', amount_base_units: '1', paid_at: null, expires_at: new Date(ahora - 1000).toISOString() };
  const vigente = { chain: 'stellar', plan: 'rodeo-test', tx_id: 'nueva', amount_base_units: '2', paid_at: null, expires_at: null };
  // Sin nada vigente → null.
  assert.equal(elegirVigente([vencida], ahora), null);
  // La primera (más reciente) está vencida; cae a la segunda, vigente.
  assert.equal(elegirVigente([vencida, vigente], ahora)?.txId, 'nueva');
});
