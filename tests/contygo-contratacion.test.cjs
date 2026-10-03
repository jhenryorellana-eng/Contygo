const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, SIGNING_URL, VERIFICATION_ID, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const { signWebhook } = require('../lib/contygo-api/webhook.ts');
const { signVerificationTicket } = require('../lib/contygo-api/tokens.ts');

const agentServer = require('../lib/agent/server.ts');
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
const leadRoute = require('../app/api/contratar/lead/route.ts');
const serviceRoute = require('../app/api/contratar/servicio/route.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');
const confirmRoute = require('../app/api/contratar/confirmar/route.ts');
const statusRoute = require('../app/api/contratar/estado/route.ts');
const resendRoute = require('../app/api/contratar/reenviar/route.ts');
const webhookRoute = require('../app/api/webhooks/contygo/route.ts');

// Lo que el navegador genera y guarda (guía §2 bis): el externalRef de la conversación y una
// Idempotency-Key (crypto.randomUUID) por intento.
const EXTERNAL_REF = 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b';
const CONTRACT_ID = '55555555-5555-4555-8555-555555555555';
const uuid = () => crypto.randomUUID();
const contractForm = (patch = {}) => ({
  firstName: 'Ana', middleName: 'María', lastName: 'Pérez López', email: 'ana.perez@gmail.com', phone: '+13055550199',
  address: { line1: '100 Main St', apartment: '4B', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es',
  servicePlanId: ids.visaPlan, parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2014-04-03' }],
  consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() }, ...patch,
});
const startBody = (patch = {}) => ({
  serviceId: 'visa-juvenil', externalRef: EXTERNAL_REF, form: contractForm(), answers: { [ids.visaQ]: true },
  attribution: { sourceUrl: 'https://landing.invalid/contygo-app/v7', utm: { utm_source: 'facebook' } },
  idempotencyKey: uuid(), captchaToken: 'token-ok', ...patch,
});
/** La 2.ª llamada tal como la manda la UI: lo que guardó de la 1.ª, el código y una clave nueva. */
const confirmBody = (ask, patch = {}) => ({ body: ask.body, verificationId: ask.verificationId, ticket: ask.ticket, code: '481920', idempotencyKey: uuid(), ...patch });
const expectedToken = contractId => `${contractId}.${crypto.createHmac('sha256', process.env.LANDING_TOKEN_SECRET).update(contractId).digest('base64url')}`;

/** Captura todo lo que se escribe en consola durante la prueba. */
function captureConsole() {
  const lines = [];
  const original = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  for (const level of Object.keys(original)) console[level] = (...args) => lines.push(args.map(String).join(' '));
  return { lines, restore: () => Object.assign(console, original) };
}

async function post(route, b, url, body) { return b.keep(await route.POST(b.request(url, body))); }
const outcomeOf = async response => (await response.json()).outcome;
const start = (b, patch) => post(startRoute, b, '/api/contratar/iniciar', startBody(patch));
const confirm = (b, ask, patch) => post(confirmRoute, b, '/api/contratar/confirmar', confirmBody(ask, patch));
const contractCalls = net => net.calls.filter(call => call.path === '/contracts');

/** Recorre el chat de Visa Juvenil hasta completar sus preguntas. */
async function interview(b, answer = true) {
  const greeting = await (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'visa-juvenil', answers: {} })).json();
  const done = await (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'visa-juvenil', answers: {}, field: greeting.field, answer })).json();
  return { greeting, done };
}

test.beforeEach(() => { freshModules(); delete process.env.TURNSTILE_SECRET_KEY; delete process.env.CONTYGO_WEBHOOK_SECRET; });

test('las preguntas del chat salen del catálogo con su kind y al terminar se evalúa en contygo; el servidor no guarda nada', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const b = browser();
  const { greeting, done } = await interview(b);
  assert.equal(greeting.question.id, ids.visaQ);
  assert.equal(greeting.question.text, '¿El menor tiene menos de 21 años y no está casado?');
  assert.equal(greeting.question.kind, 'yesno');
  assert.equal(greeting.total, 1);
  assert.ok(greeting.message.includes(greeting.question.text));
  assert.ok(greeting.scripts.includes(greeting.message), 'la locución del saludo se precarga');
  assert.equal(done.complete, true);
  assert.equal(done.eligible, true);
  assert.equal(done.guidance.status, 'potential');
  assert.deepEqual(done.answers, { [ids.visaQ]: true }, 'las respuestas vuelven al navegador, que es quien las guarda');
  const evaluate = net.calls.find(call => call.path === '/eligibility/evaluate');
  assert.deepEqual(evaluate.json, { serviceId: ids.visa, answers: [{ questionId: ids.visaQ, value: true }] });
  assert.equal(b.jar.size, 0, 'sin cookies ni sesión en el servidor');
  // Un servicio sin preguntas se completa sin preguntar nada.
  const itin = await (await post(intakeRoute, browser(), '/api/agent/service-intake', { serviceId: 'itin', answers: {} })).json();
  assert.equal(itin.total, 0);
  assert.equal(itin.complete, true);
});

test('la ficha recibe el servicio de contygo, sin nada de la persona', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const b = browser();
  const view = await (await post(serviceRoute, b, '/api/contratar/servicio', { serviceId: 'visa-juvenil' })).json();
  assert.deepEqual(Object.keys(view).sort(), ['captchaSiteKey', 'checkoutEnabled', 'ok', 'service', 'terms']);
  assert.deepEqual(view.service.questions, [{ id: ids.visaQ, prompt: { es: '¿El menor tiene menos de 21 años y no está casado?', en: null }, kind: 'yesno' }]);
  assert.equal(view.service.partyRoles.some(role => role.roleKey === 'lead'), false, 'el titular no se pide como persona adicional');
  assert.equal(b.jar.size, 0);
});

test('respuestas negativas o incompletas: no se envía ningún código', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const b = browser();
  const { done } = await interview(b, 'no');
  assert.equal(done.complete, true);
  assert.equal(done.eligible, false);
  assert.equal(done.guidance.status, 'review');
  assert.deepEqual(await outcomeOf(await start(b, { answers: done.answers })), { step: 'NOT_ELIGIBLE' });
  assert.deepEqual(await outcomeOf(await start(b, { answers: {} })), { step: 'NEEDS_ANSWERS' });
  assert.equal(contractCalls(net).length, 0);
});

test('lead: PUT /leads/<externalRef de la UI>, source web, E.164, atribución sin query y veredicto de contygo', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const b = browser();
  const res = await post(leadRoute, b, '/api/contratar/lead', {
    serviceId: 'visa-juvenil', externalRef: EXTERNAL_REF, displayName: 'Ana', phone: '(305) 555-0199', answers: { [ids.visaQ]: true },
    attribution: { sourceUrl: 'https://landing.invalid/contygo-app/v7?servicio=visa-juvenil&email=a@b.c#x', utm: { utm_source: 'facebook', utm_campaign: 'sijs', evil: 'x' } },
  });
  assert.equal(res.status, 200);
  const lead = net.calls.find(call => call.method === 'PUT');
  assert.equal(lead.path, `/leads/${EXTERNAL_REF}`);
  assert.equal(lead.json.source, 'web');
  assert.equal(lead.json.phoneE164, '+13055550199');
  assert.equal(lead.json.fullName, 'Ana');
  assert.deepEqual(lead.json.attribution, { sourceUrl: 'https://landing.invalid/contygo-app/v7', utm: { utm_source: 'facebook', utm_campaign: 'sijs' } });
  assert.match(lead.json.aiSummary, /califica/);
  assert.ok(!lead.json.aiSummary.includes('menor'), 'el resumen no lleva las respuestas');
  assert.equal((await post(leadRoute, b, '/api/contratar/lead', { serviceId: 'visa-juvenil', externalRef: EXTERNAL_REF, displayName: 'Ana', phone: '12' })).status, 400);
  assert.equal((await post(leadRoute, b, '/api/contratar/lead', { serviceId: 'visa-juvenil', externalRef: '../catalog', displayName: 'Ana', phone: '(305) 555-0199' })).status, 400, 'solo referencias web-<uuid>');
  assert.equal(b.jar.size, 0);
});

test('«Contratar» en dos pasos sin estado: la UI guarda cuerpo, sobre y ticket; clave nueva por intento; token firmado al final', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const logs = captureConsole();
  try {
    const b = browser();
    const firstKey = uuid();
    const ask = await outcomeOf(await start(b, { idempotencyKey: firstKey }));
    assert.equal(ask.step, 'ASK_CODE');
    assert.equal(ask.maskedEmail, 'a***@gmail.com');
    assert.equal(ask.verificationId, VERIFICATION_ID, 'el verificationId vuelve a la UI (guía §4, paso 3)');
    assert.match(ask.ticket, /^\d{10}\.[A-Za-z0-9_-]{43}$/);
    const [first] = contractCalls(net);
    assert.deepEqual(ask.body, first.json, 'la UI recibe el cuerpo EXACTO que se mandó');
    assert.equal(first.headers['Idempotency-Key'], firstKey, 'se reenvía la clave que generó la UI');
    assert.equal(first.json.consent.channel, 'web');
    assert.equal(first.json.externalRef, EXTERNAL_REF);
    assert.equal(net.calls.find(call => call.method === 'PUT').path, `/leads/${EXTERNAL_REF}`, 'el alta actualiza el mismo lead');

    const wrong = await outcomeOf(await confirm(b, ask, { code: '000000' }));
    assert.deepEqual(wrong, { step: 'WRONG_CODE', attemptsLeft: 4 });
    // La 2.ª llamada puede llegar a otra instancia (o desde otro «navegador»): no hace falta memoria.
    const right = await confirm(browser(), ask, { code: '481 920' });
    const outcome = await outcomeOf(right);
    assert.equal(right.headers.get('cache-control'), 'no-store');
    assert.deepEqual(outcome, { step: 'SIGN', clientCreated: true, caseNumber: 'U26-000133', signingUrl: SIGNING_URL, serviceAlreadyLive: null, firstName: 'Ana', token: expectedToken(CONTRACT_ID) });

    const [, wrongCall, rightCall] = contractCalls(net);
    const { verificationId, verificationCode, ...repeated } = rightCall.json;
    assert.deepEqual(repeated, first.json, 'la 2.ª llamada repite EXACTAMENTE el cuerpo de la 1.ª');
    assert.equal(rightCall.body, `${first.body.slice(0, -1)},"verificationId":"${VERIFICATION_ID}","verificationCode":"481920"}`, 'byte a byte');
    assert.equal(verificationId, VERIFICATION_ID);
    assert.equal(verificationCode, '481920');
    assert.equal(new Set([first, wrongCall, rightCall].map(call => call.headers['Idempotency-Key'])).size, 3, 'cada intento estrena su Idempotency-Key');
    assert.equal(b.jar.size, 0, 'ni cookies ni sesión');
    assert.ok(!logs.lines.some(line => /tok_SECRETO|ana\.perez|Pérez|\+1305/.test(line) || line.includes(VERIFICATION_ID)), 'ni la URL de firma, ni el sobre, ni datos de la persona llegan a los logs');
  } finally { logs.restore(); }
});

test('solo se canjea un código con el cuerpo y el sobre que firmó este servidor', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const b = browser();
  const ask = await outcomeOf(await start(b));
  const changed = { ...ask.body, client: { ...ask.body.client, address: { ...ask.body.client.address, line1: '999 Otro St' } } };
  const reordered = Object.fromEntries(Object.entries(ask.body).reverse());
  const forged = ask.ticket.slice(0, -1) + (ask.ticket.endsWith('A') ? 'B' : 'A');
  const expired = signVerificationTicket(ask.verificationId, ask.body, Date.now() - 31 * 60_000);
  for (const patch of [{ body: changed }, { body: reordered }, { ticket: forged }, { ticket: expired }, { ticket: undefined }, { verificationId: 'otro-sobre-de-otra-persona-000' }]) {
    assert.deepEqual(await outcomeOf(await confirm(b, ask, patch)), { step: 'RESTART' }, JSON.stringify(Object.keys(patch)));
  }
  assert.equal(contractCalls(net).filter(call => call.json.verificationCode).length, 0, 'nada de eso llega a contygo');
  const bad = await confirm(b, ask, { idempotencyKey: 'alta-1' });
  assert.equal(bad.status, 400, 'la clave de la UI es un UUID');
});

test('cliente existente: «¡Ya eres cliente!» solo tras el código, y aviso del trámite en curso', async () => {
  const net = mockFetch(); contygoDefaults(net, { existingClient: true, warnings: [{ code: 'SERVICE_ALREADY_LIVE', caseNumber: 'U26-000123' }] });
  const b = browser();
  const ask = await outcomeOf(await start(b));
  assert.equal(ask.step, 'ASK_CODE');
  assert.ok(!('clientCreated' in ask), 'la 1.ª respuesta es igual para clientes y desconocidos');
  const outcome = await outcomeOf(await confirm(b, ask));
  assert.equal(outcome.clientCreated, false);
  assert.equal(outcome.serviceAlreadyLive, 'U26-000123');
});

test('CLIENT_NEEDS_HUMAN, código caducado, 429 e IDEMPOTENCY_MISMATCH: cada uno con su pantalla y sin bucles', async () => {
  const net = mockFetch(); contygoDefaults(net);
  let mode = 'human';
  net.on('POST', '/contracts', call => {
    if (!call.json.verificationId) {
      if (mode === 'limit') return { status: 429, body: { error: { code: 'DESTINATION_RATE_LIMITED', message: '…' } }, headers: { 'retry-after': '1800' } };
      if (mode === 'mismatch') return { status: 409, body: { error: { code: 'IDEMPOTENCY_MISMATCH', message: '…' } } };
      return { status: 409, body: { error: { code: 'CLIENT_VERIFICATION_REQUIRED', details: { verificationId: VERIFICATION_ID, maskedEmail: 'a***@gmail.com', expiresAt: null } } } };
    }
    return mode === 'human' ? { status: 409, body: { error: { code: 'CLIENT_NEEDS_HUMAN', message: '…' } } } : { status: 409, body: { error: { code: 'VERIFICATION_EXPIRED', message: '…' } } };
  });
  const b = browser();
  const ask = await outcomeOf(await start(b));
  const human = await outcomeOf(await confirm(b, ask));
  assert.equal(human.step, 'HUMAN');
  assert.match(human.ref, /^WEB-[0-9A-F]{6}$/, 'referencia corta para el mensaje de WhatsApp');

  mode = 'expired';
  assert.deepEqual(await outcomeOf(await confirm(b, ask)), { step: 'RESTART' });

  mode = 'limit';
  const before = net.calls.length;
  const limited = await start(b);
  assert.deepEqual(await outcomeOf(limited), { step: 'RETRY_LATER', reason: 'destination', retryAfter: 1800 });
  assert.equal(limited.headers.get('retry-after'), '1800');
  assert.equal(net.calls.slice(before).filter(call => call.path === '/contracts').length, 1, 'un 429 no se reintenta');

  mode = 'mismatch';
  assert.deepEqual(await outcomeOf(await start(b)), { step: 'RETRY_LATER', reason: 'conflict', retryAfter: null }, 'esa clave ya no sirve: la UI estrena otra');
});

test('un corte al confirmar: la UI repite la misma clave y los mismos bytes, y contygo no crea nada dos veces', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const b = browser();
  const ask = await outcomeOf(await start(b));
  let cut = true;
  net.on('POST', '/contracts', call => {
    if (call.json.verificationCode && cut) return new TypeError('socket hang up');
    return { status: 201, body: { clientCreated: true, caseId: 'k', caseNumber: 'U26-000140', contractId: 'c1', clientId: 'x', signingUrl: SIGNING_URL, warnings: [] } };
  });
  const key = uuid();
  assert.equal((await outcomeOf(await confirm(b, ask, { idempotencyKey: key }))).step, 'RETRY_LATER');
  cut = false;
  const second = await outcomeOf(await confirm(b, ask, { idempotencyKey: key }));
  assert.equal(second.step, 'SIGN');
  const attempts = contractCalls(net).filter(call => call.json.verificationCode);
  assert.deepEqual([...new Set(attempts.map(call => call.headers['Idempotency-Key']))], [key]);
  assert.equal(new Set(attempts.map(call => call.body)).size, 1);
});

test('CAPTCHA, clave de la UI y límite propio por IP delante del envío del código', async () => {
  const net = mockFetch(); contygoDefaults(net);
  process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
  const b = browser();
  assert.equal((await start(b, { captchaToken: 'token-malo' })).status, 403);
  assert.equal((await start(b, { captchaToken: undefined })).status, 403);
  assert.equal(contractCalls(net).length, 0, 'sin CAPTCHA no se envía ningún código');
  assert.equal(net.calls.find(call => call.url.includes('siteverify')).json.secret, process.env.TURNSTILE_SECRET_KEY);
  assert.equal((await start(b, { idempotencyKey: 'alta-x-1' })).status, 400, 'la clave la genera la UI con crypto.randomUUID');
  assert.equal((await start(b, { externalRef: 'web-x' })).status, 400);
  for (let i = 0; i < 6; i++) await start(b, { idempotencyKey: 'no-vale' });
  const limited = await start(b);
  assert.equal(limited.status, 429, 'la IP tiene su techo por hora');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  const foreign = await startRoute.POST(b.request('/api/contratar/iniciar', startBody(), { headers: { origin: 'https://evil.example' } }));
  assert.equal(foreign.status, 403);
});

test('sin LANDING_TOKEN_SECRET en producción no se envía ningún código: no se podría canjear', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const saved = { env: process.env.NODE_ENV, secret: process.env.LANDING_TOKEN_SECRET };
  process.env.NODE_ENV = 'production';
  process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
  delete process.env.LANDING_TOKEN_SECRET;
  try {
    const res = await start(browser());
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'landing_token_secret_missing');
    process.env.LANDING_TOKEN_SECRET = 'corto';
    assert.equal((await start(browser(), { captchaToken: 'token-ok' })).status, 503, 'un secreto corto tampoco vale');
    assert.equal(contractCalls(net).length, 0);
  } finally {
    process.env.NODE_ENV = saved.env;
    process.env.LANDING_TOKEN_SECRET = saved.secret;
  }
});

test('estado y reenvío solo con el token firmado del contrato; caché de 60 s y techo de reenvíos', async () => {
  const net = mockFetch(); contygoDefaults(net);
  net.on('GET', /^\/contracts\/[^/]+$/, { status: 200, body: { contractId: CONTRACT_ID, caseId: 'k', caseNumber: 'U26-000133', status: 'sent', sentAt: '2026-09-28T10:00:00Z', signedAt: null, signingExpiresAt: '2026-10-12T10:00:00Z', downpayment: { status: 'pending', amountCents: 50000, paidAt: null }, externalRef: EXTERNAL_REF } });
  let resend = 0;
  net.on('POST', /\/link$/, () => (++resend < 3 ? { status: 200, body: { contractId: CONTRACT_ID, signingUrl: SIGNING_URL, expiresAt: '2026-10-12T00:00:00Z', rotated: resend > 1 } } : { status: 409, body: { error: { code: 'CONTRACT_ALREADY_SIGNED' } } }));
  const b = browser();
  const forged = `${CONTRACT_ID}.${'A'.repeat(43)}`;
  for (const token of [undefined, CONTRACT_ID, forged, expectedToken('66666666-6666-4666-8666-666666666666').replace(/^6+/, CONTRACT_ID.slice(0, 8))]) {
    assert.equal((await post(statusRoute, b, '/api/contratar/estado', { token })).status, 404);
    assert.equal((await post(resendRoute, b, '/api/contratar/reenviar', { token, idempotencyKey: uuid() })).status, 404);
  }
  assert.equal(net.calls.filter(call => call.path.startsWith('/contracts/')).length, 0, 'sin token válido no se consulta nada');

  const ask = await outcomeOf(await start(b));
  const { token } = await outcomeOf(await confirm(b, ask));
  assert.equal(token, expectedToken(CONTRACT_ID));
  const one = await (await post(statusRoute, b, '/api/contratar/estado', { token })).json();
  await post(statusRoute, b, '/api/contratar/estado', { token });
  assert.deepEqual(one, { ok: true, caseNumber: 'U26-000133', contract: 'sent', signingExpiresAt: '2026-10-12T10:00:00Z', downpayment: 'pending', checkedAt: one.checkedAt });
  assert.equal(net.calls.filter(call => call.method === 'GET' && call.path.startsWith('/contracts/')).length, 1, 'no más de una consulta por minuto');

  const keys = [uuid(), uuid(), uuid()];
  const r1 = await outcomeOf(await post(resendRoute, b, '/api/contratar/reenviar', { token, idempotencyKey: keys[0] }));
  const r2 = await outcomeOf(await post(resendRoute, b, '/api/contratar/reenviar', { token, idempotencyKey: keys[1] }));
  const r3 = await outcomeOf(await post(resendRoute, b, '/api/contratar/reenviar', { token, idempotencyKey: keys[2] }));
  assert.equal(r1.step, 'SIGN_LINK');
  assert.equal(r2.rotated, true);
  assert.deepEqual(r3, { step: 'ALREADY_SIGNED' });
  assert.deepEqual(net.calls.filter(call => call.path.endsWith('/link')).map(call => call.headers['Idempotency-Key']), keys, 'se reenvía la clave de cada reenvío');
  assert.equal((await post(resendRoute, b, '/api/contratar/reenviar', { token, idempotencyKey: uuid() })).status, 429, 'nuestro techo de reenvíos va por debajo del de contygo');
  assert.equal((await post(resendRoute, b, '/api/contratar/reenviar', { token, idempotencyKey: 'x' })).status, 400);
});

test('webhooks opcionales: apagados sin secreto; con secreto, firma del cuerpo crudo, ventana de ±300 s y dedupe', async () => {
  const raw = JSON.stringify({ eventId: '6f1c1d1e-0000-4000-8000-0000000000aa', type: 'contract.signed', occurredAt: '2026-09-28T10:00:00.000Z', dedupeKey: 'c', data: { caseNumber: 'U26-000133', contractId: CONTRACT_ID, createdVia: 'web', externalRef: EXTERNAL_REF, serviceSlug: 'visa-juvenil-basico', signedAt: '2026-09-28T10:00:00.000Z' } });
  const send = (body, { ts = String(Math.floor(Date.now() / 1000)), sig, id = '6f1c1d1e-0000-4000-8000-0000000000aa', secret = 'whsec_prueba' } = {}) => {
    const { NextRequest } = require('next/server');
    return webhookRoute.POST(new NextRequest('https://landing.invalid/api/webhooks/contygo', { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-event-id': id, 'x-timestamp': ts, 'x-signature': sig ?? signWebhook(secret, ts, body) } }));
  };
  assert.equal((await send(raw)).status, 404, 'sin base de datos no hacen falta: la ruta está apagada');
  process.env.CONTYGO_WEBHOOK_SECRET = 'whsec_prueba';
  const logs = captureConsole();
  try {
    assert.equal((await send(raw)).status, 200);
    assert.equal((await send(raw)).status, 200, 'un reenvío del mismo evento responde 2xx');
    assert.equal((await send(raw, { secret: 'otro' })).status, 401);
    assert.equal((await send(raw, { ts: String(Math.floor(Date.now() / 1000) - 301) })).status, 401);
    const reformatted = JSON.stringify(JSON.parse(raw), null, 2);
    assert.equal((await send(reformatted, { sig: signWebhook('whsec_prueba', String(Math.floor(Date.now() / 1000)), raw) })).status, 401, 'la firma es de los bytes crudos');
    assert.equal(logs.lines.filter(line => line.includes('contract.signed')).length, 1, 'el mismo aviso se cuenta una vez');
    assert.ok(!logs.lines.some(line => line.includes(EXTERNAL_REF) || line.includes('U26-000133')), 'solo el tipo, sin datos');
  } finally { logs.restore(); }
});

test('Gemini solo interpreta la pregunta actual: una fecha dicha con palabras se normaliza y una incompleta no avanza', async () => {
  const net = mockFetch(); contygoDefaults(net);
  let reply = { value: '2026-05-14', clear: true };
  const original = agentServer.getGenAI;
  const genai = { models: { generateContent: async () => ({ text: JSON.stringify(reply) }) } };
  Object.defineProperty(agentServer, 'agentEnabled', { value: true, configurable: true });
  agentServer.getGenAI = () => genai;
  try {
    const b = browser();
    const greeting = await (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'apelacion', answers: {} })).json();
    assert.equal(greeting.question.kind, 'date');
    const said = await (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: 'el catorce de mayo de este año' })).json();
    assert.deepEqual(said.answers, { [ids.apelQ]: '2026-05-14' });
    reply = { value: '2026-05', clear: false };
    const unclear = await (await post(intakeRoute, browser(), '/api/agent/service-intake', { serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: 'en mayo' })).json();
    assert.equal(unclear.complete, false);
    assert.match(unclear.message, /Necesito confirmar/);
  } finally { agentServer.getGenAI = original; }
});
