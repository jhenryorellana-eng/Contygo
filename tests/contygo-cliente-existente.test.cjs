// Cliente que vuelve (decisión del 03-10-2026): CLIENT_NEEDS_HUMAN con una pista segura (solo web, tras el código)
// se convierte en FIX_CONTACT para que la persona corrija el teléfono; «Te reconocimos» con clientCreated=false.
// Todo con fetch simulado: nada llega a contygo.app.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');

const checkout = require('../lib/contygo-api/checkout.ts');
const keys = require('../lib/contygo-api/checkout-keys.ts');
const messages = require('../lib/contygo-api/messages.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');
const confirmRoute = require('../app/api/contratar/confirmar/route.ts');

const EXTERNAL_REF = 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b';
const uuid = () => crypto.randomUUID();
const form = (patch = {}) => ({
  firstName: 'Ana', lastName: 'Pérez López', email: 'ana.perez@e2e.local', phone: '(305) 555-0199',
  address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es',
  servicePlanId: ids.visaPlan, parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2014-04-03' }],
  consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() }, ...patch,
});
const startBody = (patch = {}) => ({ serviceId: 'visa-juvenil', externalRef: EXTERNAL_REF, form: form(), answers: { [ids.visaQ]: true }, idempotencyKey: uuid(), captchaToken: 'token-ok', ...patch });
const outcomeOf = async response => (await response.json()).outcome;
const start = async (b, patch) => outcomeOf(b.keep(await startRoute.POST(b.request('/api/contratar/iniciar', startBody(patch)))));
const confirm = async (b, ask) => outcomeOf(b.keep(await confirmRoute.POST(b.request('/api/contratar/confirmar', { body: ask.body, verificationId: ask.verificationId, ticket: ask.ticket, code: '481920', idempotencyKey: uuid() }))));
const leadPuts = net => net.calls.filter(call => call.method === 'PUT' && call.path.startsWith('/leads/'));
const needsHuman = details => ({ status: 409, body: { error: { code: 'CLIENT_NEEDS_HUMAN', message: 'Needs a person', ...(details ? { details } : {}) } } });

let net;
test.beforeEach(() => {
  freshModules();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.CONTYGO_CHECKOUT_ENABLED;
  net = mockFetch(); contygoDefaults(net);
});

const map = details => checkout.mapContractResponse({ status: 409, data: null, error: { code: 'CLIENT_NEEDS_HUMAN', ...(details ? { details } : {}) }, retryAfter: null });

test('mapContractResponse: email_has_account y phone_in_use pasan a FIX_CONTACT; lo demás sigue en HUMAN', () => {
  assert.deepEqual(map({ resolution: 'email_has_account', phoneHint: '42' }), { step: 'FIX_CONTACT', reason: 'email_has_account', phoneHint: '42' });
  assert.deepEqual(map({ resolution: 'email_has_account' }), { step: 'FIX_CONTACT', reason: 'email_has_account' });
  assert.deepEqual(map({ resolution: 'phone_in_use' }), { step: 'FIX_CONTACT', reason: 'phone_in_use' });
  // Sin details, o con algo que no conocemos: el HUMAN de hoy.
  assert.deepEqual(map(undefined), { step: 'HUMAN' });
  assert.deepEqual(map({}), { step: 'HUMAN' });
  assert.deepEqual(map({ resolution: 'something_new' }), { step: 'HUMAN' });
  assert.deepEqual(map({ resolution: 'phone_in_use', phoneHint: '42' }), { step: 'FIX_CONTACT', reason: 'phone_in_use' }, 'phone_in_use nunca arrastra pista');
});

test('mapContractResponse: un phoneHint que no son exactamente 2 dígitos se descarta', () => {
  for (const bad of ['4', '423', '4a', ' 42', '42 ', '', 42, null, ['42'], { hint: '42' }, '١٢']) {
    assert.deepEqual(map({ resolution: 'email_has_account', phoneHint: bad }), { step: 'FIX_CONTACT', reason: 'email_has_account' }, JSON.stringify(bad));
  }
});

test('2.ª llamada: FIX_CONTACT llega al navegador sin avisar a ventas (sin PUT /leads de intento)', async () => {
  const b = browser();
  const ask = await start(b);
  assert.equal(ask.step, 'ASK_CODE');
  net.on('POST', '/contracts', needsHuman({ resolution: 'email_has_account', phoneHint: '42' }));
  const before = leadPuts(net).length;
  const fix = await confirm(b, ask);
  assert.deepEqual(fix, { step: 'FIX_CONTACT', reason: 'email_has_account', phoneHint: '42' });
  assert.equal(leadPuts(net).length, before, 'no es un fallo: nada se reporta');
  assert.equal(leadPuts(net).some(call => /Intentó contratar/.test(call.json.aiSummary ?? '')), false);
});

test('2.ª llamada: phone_in_use también pasa sin reportAttempt', async () => {
  const b = browser();
  const ask = await start(b);
  net.on('POST', '/contracts', needsHuman({ resolution: 'phone_in_use' }));
  const before = leadPuts(net).length;
  assert.deepEqual(await confirm(b, ask), { step: 'FIX_CONTACT', reason: 'phone_in_use' });
  assert.equal(leadPuts(net).length, before);
});

test('2.ª llamada: CLIENT_NEEDS_HUMAN sin details sigue siendo HUMAN y SÍ avisa a ventas', async () => {
  const b = browser();
  const ask = await start(b);
  net.on('POST', '/contracts', needsHuman());
  const before = leadPuts(net).length;
  const human = await confirm(b, ask);
  assert.equal(human.step, 'HUMAN');
  assert.match(human.ref, /^WEB-/);
  assert.equal(leadPuts(net).length, before + 1);
  assert.match(leadPuts(net).at(-1).json.aiSummary, /\(CLIENT_NEEDS_HUMAN\)\.$/);
});

test('el cuerpo de FIX_CONTACT no arrastra nada más que el motivo y a lo sumo 2 dígitos', async () => {
  const b = browser();
  const ask = await start(b);
  net.on('POST', '/contracts', needsHuman({ resolution: 'email_has_account', phoneHint: '42', otherAccount: 'x' }));
  const fix = await confirm(b, ask);
  assert.deepEqual(Object.keys(fix).sort(), ['phoneHint', 'reason', 'step']);
});

test('Idempotency-Key: FIX_CONTACT es una respuesta definitiva, la siguiente llamada estrena clave', () => {
  assert.equal(keys.keepsKey({ status: 200, outcome: { step: 'FIX_CONTACT', reason: 'email_has_account' } }), false);
  assert.equal(keys.keepsKey({ status: 200, outcome: { step: 'FIX_CONTACT', reason: 'phone_in_use' } }), false);
  assert.equal(keys.retriesConfirmAlone({ status: 200, outcome: { step: 'FIX_CONTACT', reason: 'phone_in_use' } }), false);
  let n = 0;
  // Con otro teléfono la ficha cambia: otra huella, otra clave.
  const last = { op: 'start', key: 'k1', fingerprint: JSON.stringify([{ phone: '+13055550199' }]) };
  assert.equal(keys.startKey(last, JSON.stringify([{ phone: '+13055550142' }]), () => `new-${++n}`), 'new-1');
});

test('textos de FIX_CONTACT: exactos, con la pista de 2 dígitos solo si es válida', () => {
  const withHint = messages.fixContactMessages({ reason: 'email_has_account', phoneHint: '42' });
  assert.equal(withHint.fieldError, 'Este correo ya tiene una cuenta en ContyGo. Usa el teléfono de tu cuenta (termina en 42).');
  assert.equal(withHint.title, 'Ya tienes una cuenta con este correo.');
  assert.equal(withHint.detail, 'Escribe el teléfono que registraste y te enviaremos un código nuevo. O entra a tu cuenta.');
  assert.equal(messages.fixContactMessages({ reason: 'email_has_account' }).fieldError, 'Este correo ya tiene una cuenta en ContyGo. Usa el teléfono de tu cuenta.');
  assert.equal(messages.fixContactMessages({ reason: 'email_has_account', phoneHint: '123456' }).fieldError, 'Este correo ya tiene una cuenta en ContyGo. Usa el teléfono de tu cuenta.');
  const inUse = messages.fixContactMessages({ reason: 'phone_in_use' });
  assert.equal(inUse.fieldError, 'Con este correo no podemos usar este teléfono.');
  assert.equal(inUse.title, 'Revisa tu teléfono.');
  assert.equal(inUse.detail, 'Si ya eres cliente, usa el correo y el teléfono de tu cuenta; si no, prueba con otro teléfono o escríbenos por WhatsApp.');
  assert.deepEqual(messages.outcomeMessage({ step: 'FIX_CONTACT', reason: 'phone_in_use' }), { title: inUse.title, detail: inUse.detail });
  assert.equal(messages.ACCOUNT_LOGIN_URL, 'https://contygo.app/entrar');
});

test('«Te reconocimos» solo con clientCreated=false', () => {
  assert.equal(messages.RECOGNIZED_MESSAGE, 'Te reconocimos: añadimos este servicio a tu cuenta de ContyGo.');
  assert.equal(messages.outcomeMessage({ step: 'SIGN', clientCreated: false, serviceAlreadyLive: null, firstName: 'Ana' }).title, messages.RECOGNIZED_MESSAGE);
  assert.match(messages.outcomeMessage({ step: 'SIGN', clientCreated: true, serviceAlreadyLive: null, firstName: 'Ana' }).title, /Tu contrato está preparado/);
});
