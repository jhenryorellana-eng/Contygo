const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, catalog, SIGNING_URL, VERIFICATION_ID, mockFetch } = require('./helpers/contygo-harness.cjs');
const { contygoApi, ContygoNotConfiguredError, parseRetryAfter } = require('../lib/contygo-api/client.ts');
const checkout = require('../lib/contygo-api/checkout.ts');
const { CONTRACT_TERMS } = require('../lib/contygo-api/terms.ts');

const visa = catalog.services[0];
const apel = catalog.services[1];
const form = (patch = {}) => ({
  firstName: 'Ana', middleName: 'María', lastName: 'Pérez López', email: 'Ana.Perez@Gmail.com', phone: '(305) 555-0199',
  address: { line1: '100 Main St', apartment: '4B', city: 'Miami', state: 'fl', zip: '33101-1234' }, locale: 'es',
  servicePlanId: ids.visaPlan, parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2014-04-03' }],
  consent: { accepted: true, at: new Date(Date.now() - 60_000).toISOString() }, ...patch,
});

// ---------------- Cliente ----------------

test('cliente: clave Bearer, JSON e Idempotency-Key; sin clave no llama a nadie', async () => {
  const net = mockFetch();
  net.on('POST', '/contracts', { status: 409, body: { error: { code: 'CLIENT_VERIFICATION_REQUIRED', details: { verificationId: VERIFICATION_ID, maskedEmail: 'a***@gmail.com' } } } });
  await contygoApi.createContract({ externalRef: 'web-x' }, 'alta-prueba-1');
  const [call] = net.calls;
  assert.equal(call.url, 'https://contygo.app/api/integrations/v1/contracts');
  assert.equal(call.headers.Authorization, `Bearer ${process.env.CONTYGO_API_KEY}`);
  assert.equal(call.headers['Content-Type'], 'application/json');
  assert.equal(call.headers['Idempotency-Key'], 'alta-prueba-1');
  const key = process.env.CONTYGO_API_KEY;
  delete process.env.CONTYGO_API_KEY;
  await assert.rejects(contygoApi.catalog(), ContygoNotConfiguredError);
  process.env.CONTYGO_API_KEY = key;
  assert.equal(net.calls.length, 1);
});

test('cliente: un corte de red en la 2.ª llamada repite con la MISMA clave y los MISMOS bytes', async () => {
  const net = mockFetch();
  net.on('POST', '/contracts', (call, n) => n === 1 ? new TypeError('fetch failed') : { status: 201, body: { clientCreated: true, signingUrl: SIGNING_URL, contractId: 'c', caseId: 'k', caseNumber: 'U26-1', clientId: 'x', warnings: [] } });
  const result = await contygoApi.createContract({ externalRef: 'web-a', b: [1, 2], verificationId: 'v', verificationCode: '481920' }, 'alta-a-2-1-1');
  assert.equal(result.status, 201);
  assert.equal(net.calls.length, 2);
  assert.equal(net.calls[0].headers['Idempotency-Key'], net.calls[1].headers['Idempotency-Key']);
  assert.equal(net.calls[0].body, net.calls[1].body);
});

test('cliente: un 429 nunca se reintenta y trae Retry-After', async () => {
  const net = mockFetch();
  net.on('POST', '/contracts', { status: 429, body: { error: { code: 'DESTINATION_RATE_LIMITED', message: '…' } }, headers: { 'retry-after': '120' } });
  const result = await contygoApi.createContract({ externalRef: 'web-a' }, 'alta-a-1-1');
  assert.equal(net.calls.length, 1);
  assert.equal(result.status, 429);
  assert.equal(result.error.code, 'DESTINATION_RATE_LIMITED');
  assert.equal(result.retryAfter, 120);
  assert.equal(parseRetryAfter(null), null);
});

test('cliente: 409 IN_PROGRESS espera y repite con la misma clave', async () => {
  const net = mockFetch();
  net.on('POST', '/contracts', (call, n) => n === 1 ? { status: 409, body: { error: { code: 'IN_PROGRESS' } }, headers: { 'retry-after': '1' } } : { status: 409, body: { error: { code: 'VERIFICATION_INVALID', details: { attemptsLeft: 3 } } } });
  const result = await contygoApi.createContract({ externalRef: 'web-a' }, 'alta-a-2-1-2');
  assert.equal(net.calls.length, 2);
  assert.equal(net.calls[1].headers['Idempotency-Key'], 'alta-a-2-1-2');
  assert.equal(result.error.code, 'VERIFICATION_INVALID');
});

test('cliente: el reenvío no manda cuerpo y sí su clave', async () => {
  const net = mockFetch();
  net.on('POST', /\/contracts\/.+\/link$/, { status: 200, body: { contractId: 'c', signingUrl: SIGNING_URL, expiresAt: '2026-10-12T00:00:00Z', rotated: false } });
  await contygoApi.resendSigningLink('55555555-5555-4555-8555-555555555555', 'reenvio-55555555-1');
  assert.equal(net.calls[0].path, '/contracts/55555555-5555-4555-8555-555555555555/link');
  assert.equal(net.calls[0].body, null);
  assert.equal(net.calls[0].headers['Idempotency-Key'], 'reenvio-55555555-1');
});

// ---------------- Datos y cuerpo ----------------

test('teléfono en E.164, correo real y código postal de 5 dígitos', () => {
  assert.equal(checkout.normalizePhone('(305) 555-0199'), '+13055550199');
  assert.equal(checkout.normalizePhone('1 305 555 0199'), '+13055550199');
  assert.equal(checkout.normalizePhone('+52 55 1234 5678'), '+525512345678');
  assert.equal(checkout.normalizePhone('555-0199'), null);
  assert.equal(checkout.normalizePhone('+1 055 555 0199'), null);
  assert.equal(checkout.normalizeEmail(' Ana@Gmail.COM '), 'ana@gmail.com');
  assert.equal(checkout.normalizeEmail('ana@clients.usalatinoprime.com'), null, 'el dominio interno no recibe el código');
  assert.equal(checkout.normalizeEmail('ana@gmail'), null);
  const ok = checkout.validateContractForm(form(), visa);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.address.zip, '33101');
  assert.equal(ok.value.address.state, 'FL');
  assert.equal(ok.value.fullName, 'Ana María Pérez López');
});

test('personas adicionales según partyRoles: el titular ocupa `lead`, los obligatorios faltan, `single` admite una', () => {
  const missing = checkout.validateContractForm(form({ parties: [] }), visa);
  assert.equal(missing.ok, false);
  assert.match(missing.errors['role.minor'], /Menor/);
  const lead = checkout.validateContractForm(form({ parties: [{ role: 'lead', firstName: 'Ana', lastName: 'Pérez' }, { role: 'minor', firstName: 'Luis', lastName: 'Pérez' }] }), visa);
  assert.equal(lead.ok, false, 'el rol lead no se pide: lo ocupa el cliente');
  const single = { ...visa, partyRoles: [{ roleKey: 'spouse', label: { es: 'Cónyuge', en: null }, cardinality: 'single', isRequired: false }] };
  const two = checkout.validateContractForm(form({ parties: [{ role: 'spouse', firstName: 'A', lastName: 'B' }, { role: 'spouse', firstName: 'C', lastName: 'D' }] }), single);
  assert.equal(two.ok, false);
  const future = checkout.validateContractForm(form({ parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2999-01-01' }] }), visa);
  assert.equal(future.ok, false);
});

test('la casilla es obligatoria y su momento nunca queda en el futuro', () => {
  assert.equal(checkout.validateContractForm(form({ consent: { accepted: false, at: new Date().toISOString() } }), visa).ok, false);
  const now = new Date('2026-09-28T15:00:00Z');
  const ahead = checkout.validateContractForm(form({ consent: { accepted: true, at: '2026-09-28T15:03:00Z' } }), visa, now);
  assert.equal(ahead.value.consentAt, now.toISOString());
  assert.equal(checkout.validateContractForm(form({ servicePlanId: 'otro' }), visa).ok, false);
  assert.equal(checkout.validateContractForm(form({ installmentOptionId: 'otra' }), visa).ok, false);
  assert.equal(checkout.validateContractForm(form({ installmentOptionId: ids.installment }), visa).ok, true);
});

test('el cuerpo es estricto: solo campos del OpenAPI, sin importes, answer (no value) y consent web versionado', () => {
  const valid = checkout.validateContractForm(form(), visa);
  const answers = { [ids.visaQ]: true };
  const body = checkout.buildContractBody({ externalRef: 'web-abc', serviceId: visa.id, form: valid.value, eligibilityAnswers: checkout.toContractAnswers(visa.eligibilityQuestions, answers), termsVersion: CONTRACT_TERMS.version });
  assert.deepEqual(Object.keys(body).sort(), ['client', 'consent', 'eligibilityAnswers', 'externalRef', 'parties', 'serviceId', 'servicePlanId']);
  assert.deepEqual(Object.keys(body.client).sort(), ['address', 'email', 'fullName', 'locale', 'nameParts', 'phoneE164']);
  assert.deepEqual(body.client.nameParts, { firstName: 'Ana', middleName: 'María', lastName: 'Pérez López' });
  assert.deepEqual(body.eligibilityAnswers, [{ questionId: ids.visaQ, answer: true }]);
  assert.deepEqual(checkout.toEvaluateAnswers(visa.eligibilityQuestions, answers), [{ questionId: ids.visaQ, value: true }]);
  assert.deepEqual(body.consent, { textVersion: CONTRACT_TERMS.version, at: valid.value.consentAt, channel: 'web' });
  assert.ok(!/cents|price|amount|total/i.test(JSON.stringify(body)), 'nunca se envían importes');
  const noParties = checkout.buildContractBody({ externalRef: 'web-abc', serviceId: visa.id, form: { ...valid.value, parties: [] }, eligibilityAnswers: [], termsVersion: 'v' });
  assert.ok(!('parties' in noParties));
});

test('preguntas: manda el kind del catálogo (yes_no o date); el texto solo sirve de respaldo si falta', () => {
  assert.equal(checkout.questionKind(visa.eligibilityQuestions[0]), 'yesno');
  assert.equal(checkout.questionKind(apel.eligibilityQuestions[0]), 'date');
  // Catálogo real del 29-09-2026 (I-485): dice «fecha» y «date», y es de sí/no. Deducirlo del texto fallaba.
  const i485 = { kind: 'yes_no', prompt: { es: '¿La fecha de prioridad del I-360 está vigente en el Visa Bulletin (EB-4)?', en: 'Is the I-360 priority date current in the Visa Bulletin (EB-4)?' } };
  assert.equal(checkout.questionKind(i485), 'yesno');
  assert.equal(checkout.questionKind({ prompt: { es: '¿Cuál es la fecha de la orden?', en: null } }), 'date', 'respaldo para un catálogo sin kind');
  assert.equal(checkout.normalizeAnswer('yesno', 'Sí.'), true);
  assert.equal(checkout.normalizeAnswer('yesno', 'no'), false);
  assert.equal(checkout.normalizeAnswer('yesno', 'tal vez'), null);
  assert.equal(checkout.normalizeAnswer('date', '2026-02-30'), null);
  assert.equal(checkout.normalizeAnswer('date', '2999-01-01'), null);
  assert.equal(checkout.normalizeAnswer('date', '2026-05-14'), '2026-05-14');
  assert.deepEqual(checkout.sanitizeAnswers(visa.eligibilityQuestions, { [ids.visaQ]: 'si', otra: true }), { [ids.visaQ]: true });
});

// ---------------- Respuestas → pantallas (guía §5) ----------------

test('cada respuesta de POST /contracts lleva a su pantalla; el sobre no sale de aquí', () => {
  const map = (status, code, details, retryAfter = null) => checkout.mapContractResponse({ status, data: null, error: { code, details }, retryAfter });
  const ask = map(409, 'CLIENT_VERIFICATION_REQUIRED', { verificationId: VERIFICATION_ID, maskedEmail: 'a***@gmail.com', expiresAt: 'x' });
  assert.deepEqual(ask, { step: 'ASK_CODE', verificationId: VERIFICATION_ID, maskedEmail: 'a***@gmail.com', expiresAt: 'x' });
  assert.deepEqual(map(409, 'VERIFICATION_INVALID', { attemptsLeft: 2 }), { step: 'WRONG_CODE', attemptsLeft: 2 });
  assert.deepEqual(map(409, 'VERIFICATION_EXPIRED'), { step: 'RESTART' });
  assert.deepEqual(map(409, 'CLIENT_NEEDS_HUMAN'), { step: 'HUMAN' });
  assert.deepEqual(map(422, 'NOT_ELIGIBLE', { missingQuestionIds: [] }), { step: 'NOT_ELIGIBLE' });
  assert.deepEqual(map(422, 'PLAN_NOT_CONTRACTABLE'), { step: 'UNAVAILABLE' });
  assert.deepEqual(map(422, 'INVALID_PARTIES', { role: 'minor' }), { step: 'INVALID_PARTIES', role: 'minor' });
  assert.deepEqual(map(429, 'DESTINATION_RATE_LIMITED', undefined, 300), { step: 'RETRY_LATER', reason: 'destination', retryAfter: 300 });
  assert.deepEqual(map(429, 'VERIFICATION_RATE_LIMITED', undefined, 60), { step: 'RETRY_LATER', reason: 'verification', retryAfter: 60 });
  assert.deepEqual(map(429, 'RATE_LIMITED', undefined, 30), { step: 'RETRY_LATER', reason: 'general', retryAfter: 30 });
  assert.deepEqual(map(422, 'CONSENT_CHANNEL_MISMATCH'), { step: 'UNAVAILABLE_ONLINE', code: 'CONSENT_CHANNEL_MISMATCH' }, 'configuración: ya no es un error genérico');
  assert.deepEqual(map(503, 'INTERNAL', undefined, 2), { step: 'RETRY_LATER', reason: 'busy', retryAfter: 2 });
  assert.deepEqual(map(409, 'IN_PROGRESS', undefined, 1), { step: 'RETRY_LATER', reason: 'busy', retryAfter: 1 }, 'misma clave');
  assert.deepEqual(map(409, 'IDEMPOTENCY_MISMATCH'), { step: 'RETRY_LATER', reason: 'conflict', retryAfter: null }, 'la próxima vez, clave nueva');
  const created = { clientCreated: false, caseId: 'k', caseNumber: 'U26-000133', contractId: 'c', clientId: 'x', signingUrl: SIGNING_URL, warnings: [{ code: 'SERVICE_ALREADY_LIVE', caseNumber: 'U26-000123' }] };
  const sign = checkout.mapContractResponse({ status: 201, data: created, error: null, retryAfter: null });
  assert.equal(sign.step, 'SIGN');
  assert.equal(sign.serviceAlreadyLive, 'U26-000123');
  const foreign = checkout.mapContractResponse({ status: 201, data: { ...created, signingUrl: 'https://evil.example/firma/x' }, error: null, retryAfter: null });
  assert.equal(foreign.step, 'SIGN_LINK_PENDING', 'solo se muestra una URL de firma de contygo: con otra, la persona pide el enlace por /reenviar');
  assert.equal(JSON.stringify(foreign).includes('evil.example') && foreign.step === 'SIGN', false);
});

test('token del contrato de la guía (§2 bis) y ticket de la verificación: firmados, sin base de datos', () => {
  const tokens = require('../lib/contygo-api/tokens.ts');
  const id = '55555555-5555-4555-8555-555555555555';
  const token = tokens.signContractToken(id);
  assert.equal(token, `${id}.${crypto.createHmac('sha256', process.env.LANDING_TOKEN_SECRET).update(id).digest('base64url')}`);
  assert.equal(tokens.readContractToken(token), id);
  for (const bad of [id, `${id}.`, `${id}.x`, token.replace(/^5/, '6'), `../${token}`, 42, null]) assert.equal(tokens.readContractToken(bad), null, String(bad));
  const body = { externalRef: 'web-a', client: { fullName: 'Ana' } };
  const ticket = tokens.signVerificationTicket(VERIFICATION_ID, body);
  assert.equal(tokens.checkVerificationTicket(ticket, VERIFICATION_ID, body), true);
  assert.equal(tokens.checkVerificationTicket(ticket, VERIFICATION_ID, { ...body, client: { fullName: 'Eva' } }), false);
  assert.equal(tokens.checkVerificationTicket(ticket, 'otro-verification-id-00000', body), false);
  assert.equal(tokens.checkVerificationTicket(ticket, VERIFICATION_ID, body, Date.now() + (tokens.TICKET_TTL_SECONDS + 5) * 1000), false, 'caduca');
  assert.equal(tokens.checkVerificationTicket(tokens.signContractToken(VERIFICATION_ID), VERIFICATION_ID, body), false, 'un token de contrato no vale de ticket');
  assert.ok(checkout.isExternalRef('web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b'));
  assert.ok(!checkout.isExternalRef('web-x') && !checkout.isExternalRef('lead-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b'));
  assert.ok(checkout.isIdempotencyKey(crypto.randomUUID()));
  assert.ok(!checkout.isIdempotencyKey('alta-web-1') && !checkout.isIdempotencyKey(undefined));
});

test('el texto de aceptación y su versión cambian juntos', () => {
  // Si cambias el texto, cambia CONTRACT_TERMS.version y actualiza esta huella.
  const fingerprint = crypto.createHash('sha256').update(CONTRACT_TERMS.es + '\n' + CONTRACT_TERMS.en).digest('hex').slice(0, 16);
  assert.deepEqual({ version: CONTRACT_TERMS.version, fingerprint }, { version: 'terminos-web-2026-10-02', fingerprint: '6f02897c8a009f41' });
});

test('fuera de producción, contra el contygo real, solo se lee salvo prueba coordinada', async () => {
  const { writesBlocked } = require('../lib/contygo-api/client.ts');
  const saved = process.env.CONTYGO_ALLOW_WRITES;
  delete process.env.CONTYGO_ALLOW_WRITES;
  try {
    assert.equal(writesBlocked('GET', '/catalog'), false);
    assert.equal(writesBlocked('POST', '/eligibility/evaluate'), false);
    assert.equal(writesBlocked('PUT', '/leads/web-x'), true);
    assert.equal(writesBlocked('POST', '/contracts'), true);
    const net = mockFetch();
    const blocked = await contygoApi.createContract({ externalRef: 'web-x' }, 'alta-x-1-1');
    assert.equal(blocked.error.code, 'DEV_WRITES_DISABLED');
    assert.equal(net.calls.length, 0, 'no sale ninguna petición');
    process.env.CONTYGO_API_BASE = 'http://127.0.0.1:3999/api/integrations/v1';
    assert.equal(writesBlocked('POST', '/contracts'), false, 'contra un simulador local sí');
  } finally {
    delete process.env.CONTYGO_API_BASE;
    process.env.CONTYGO_ALLOW_WRITES = saved;
  }
});
