// Idempotency-Key decisions of the checkout (guía §8): the same key and body are repeated only after a cut.
// Pure functions: no network, no React.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { keepsKey, startKey, confirmKey } = require('../lib/contygo-api/checkout-keys.ts');

const outcome = (step, extra = {}) => ({ step, ...extra });

test('el mismo envío tras un corte conserva su clave; cualquier otra cosa estrena una', () => {
  let n = 0; const fresh = () => `new-${++n}`;
  const last = { op: 'start', key: 'k1', fingerprint: 'f1' };
  assert.equal(startKey(last, 'f1', fresh), 'k1');
  assert.equal(startKey(last, 'f2', fresh), 'new-1', 'otra ficha, otra clave');
  assert.equal(startKey(null, 'f1', fresh), 'new-2');
  assert.equal(startKey({ op: 'confirm', key: 'c', code: '123456', verificationId: 'v' }, 'f1', fresh), 'new-3', 'una clave de /confirmar no sirve de /iniciar');
  const confirm = { op: 'confirm', key: 'c1', code: '123456', verificationId: 'v1' };
  assert.equal(confirmKey(confirm, '123456', 'v1', fresh), 'c1');
  assert.equal(confirmKey(confirm, '654321', 'v1', fresh), 'new-4', 'otro código, otra clave');
  assert.equal(confirmKey(confirm, '123456', 'v2', fresh), 'new-5', 'otra verificación, otra clave');
  assert.equal(confirmKey({ op: 'start', key: 's', fingerprint: 'f' }, '123456', 'v1', fresh), 'new-6');
});

test('busy conserva la clave (RETRY_LATER busy, 502/503/504, página que no es JSON, 429 de nuestra ruta, captcha)', () => {
  assert.equal(keepsKey({ status: 200, outcome: outcome('RETRY_LATER', { reason: 'busy' }) }), true);
  for (const status of [500, 502, 503, 504]) assert.equal(keepsKey({ status, outcome: undefined }), true, String(status));
  assert.equal(keepsKey({ status: 200, outcome: undefined }), true, 'JSON vacío o página de error con 200');
  assert.equal(keepsKey({ status: 429, outcome: undefined }), true, '429 de nuestra propia ruta');
  assert.equal(keepsKey({ status: 403, outcome: undefined, error: 'captcha_failed' }), true);
  assert.equal(keepsKey({ status: 403, outcome: undefined, error: 'captcha_missing' }), true);
});

test('una respuesta definitiva estrena clave (fresh_key, WRONG_CODE, ERROR, RESTART…)', () => {
  for (const reason of ['fresh_key', 'destination', 'verification', 'general', 'conflict']) assert.equal(keepsKey({ status: 200, outcome: outcome('RETRY_LATER', { reason }) }), false, reason);
  for (const step of ['WRONG_CODE', 'ERROR', 'RESTART', 'INVALID', 'ASK_CODE', 'SIGN', 'SIGN_LINK_PENDING', 'HUMAN', 'NOT_ELIGIBLE', 'UNAVAILABLE', 'UNAVAILABLE_ONLINE', 'INVALID_PARTIES', 'NEEDS_ANSWERS']) {
    assert.equal(keepsKey({ status: 200, outcome: outcome(step) }), false, step);
  }
  // A 429 that does carry an outcome is contygo's answer, not ours.
  assert.equal(keepsKey({ status: 429, outcome: outcome('RETRY_LATER', { reason: 'destination' }) }), false);
  // 400, 404, 413 or a 403 that is not the captcha: not transient.
  for (const status of [400, 404, 413]) assert.equal(keepsKey({ status, outcome: undefined }), false, String(status));
  assert.equal(keepsKey({ status: 403, outcome: undefined, error: 'forbidden' }), false);
});
