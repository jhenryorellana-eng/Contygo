const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/contygo-harness.cjs'); // carga TypeScript
const browserState = require('../lib/contygo-api/browser.ts');
const { isExternalRef, isIdempotencyKey } = require('../lib/contygo-api/checkout.ts');

/** Un navegador mínimo: sessionStorage de verdad y un localStorage que no se debe tocar nunca. */
function fakeWindow({ broken = false } = {}) {
  const session = new Map();
  const touched = [];
  const storage = {
    getItem: key => { if (broken) throw new Error('bloqueado'); return session.has(key) ? session.get(key) : null; },
    setItem: (key, value) => { if (broken) throw new Error('bloqueado'); session.set(key, String(value)); },
    removeItem: key => { if (broken) throw new Error('bloqueado'); session.delete(key); },
  };
  const local = new Proxy({}, { get: (_, key) => { touched.push(key); return () => null; } });
  global.window = { sessionStorage: storage, localStorage: local, location: { origin: 'https://landing.invalid', pathname: '/contygo-app/v7', search: '?servicio=visa-juvenil&email=a@b.c&utm_source=facebook', href: 'https://landing.invalid/contygo-app/v7?servicio=visa-juvenil&email=a@b.c&utm_source=facebook' } };
  return { session, touched };
}
test.afterEach(() => { delete global.window; });

test('claves de la UI: UUID v4 con randomUUID y también en la red local (http, sin randomUUID)', () => {
  assert.ok(isIdempotencyKey(browserState.newIdempotencyKey()));
  assert.ok(isExternalRef(browserState.newExternalRef()));
  // Un contexto no seguro (http://192.168…): hay getRandomValues pero no randomUUID.
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const { webcrypto } = require('node:crypto');
  Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: array => webcrypto.getRandomValues(array) }, configurable: true });
  try {
    const keys = Array.from({ length: 50 }, () => browserState.newIdempotencyKey());
    assert.ok(keys.every(key => isIdempotencyKey(key)), keys.find(key => !isIdempotencyKey(key)));
    assert.equal(new Set(keys).size, 50);
  } finally { Object.defineProperty(globalThis, 'crypto', original); }
});

test('la ficha vive en sessionStorage mientras dura el flujo y se borra al terminar; nunca en localStorage', () => {
  const { session, touched } = fakeWindow();
  const draft = { v: 1, serviceId: 'visa-juvenil', externalRef: browserState.newExternalRef(), form: { firstName: 'Ana' }, persons: [], consent: { accepted: true, at: '2026-09-29T10:00:00.000Z' }, sent: { body: { externalRef: 'web-a' }, ticket: 't', verificationId: 'v', maskedEmail: 'a***@gmail.com', expiresAt: null } };
  browserState.saveDraft(draft);
  assert.deepEqual(browserState.readDraft(), draft);
  browserState.clearDraft();
  assert.equal(browserState.readDraft(), null);
  browserState.saveContract({ v: 1, serviceId: 'visa-juvenil', token: 'c.sig', caseNumber: 'U26-000133', clientCreated: true });
  assert.deepEqual(JSON.parse(session.get('contygo-contrato')), { v: 1, serviceId: 'visa-juvenil', token: 'c.sig', caseNumber: 'U26-000133', clientCreated: true }, 'al final solo queda el token, sin datos personales');
  browserState.clearContract();
  assert.equal(session.size, 0);
  session.set('contygo-contratacion', '{"v":2}');
  assert.equal(browserState.readDraft(), null, 'una versión desconocida se ignora');
  assert.deepEqual(touched, [], 'localStorage no se toca');
});

test('sin sessionStorage (modo privado, bloqueado) la ficha sigue en memoria sin romperse', () => {
  fakeWindow({ broken: true });
  assert.doesNotThrow(() => browserState.saveDraft({ v: 1 }));
  assert.equal(browserState.readDraft(), null);
  assert.doesNotThrow(() => browserState.clearContract());
});

test('atribución: la página sin query y solo las claves utm_*', () => {
  fakeWindow();
  assert.deepEqual(browserState.pageAttribution(), { sourceUrl: 'https://landing.invalid/contygo-app/v7', utm: { utm_source: 'facebook' } });
});
