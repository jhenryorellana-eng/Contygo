const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');
const { NextRequest } = require('next/server');
const { ids, catalog, SIGNING_URL, VERIFICATION_ID, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');

// Pruebas de «contratación en producción» (plan B1-B10): preguntas us_state / future_event / kind desconocido,
// teléfono +1, errores de la API bien mapeados, plazos y reintentos, aviso a ventas, precios vivos,
// interruptores de seguridad. Todo con fetch simulado: nada llega a contygo.app.

const checkout = require('../lib/contygo-api/checkout.ts');
const client = require('../lib/contygo-api/client.ts');
const flow = require('../lib/contygo-api/flow.ts');
const catalogLib = require('../lib/contygo-api/catalog.ts');
const intakeLib = require('../lib/agent/service-intake.ts');

// El proveedor de IA se sustituye: estas pruebas no llaman a Gemini.
let geminiCalls = [];
let provider = async () => { throw new Error('offline'); };
const realServer = require('../lib/agent/server.ts');
const fakeServer = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async args => { geminiCalls.push(args); return provider(args); } } }) };
const realLoad = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' ? fakeServer : realLoad.call(this, request, ...args); };
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
Module._load = realLoad;

const serviceRoute = require('../app/api/contratar/servicio/route.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');
const confirmRoute = require('../app/api/contratar/confirmar/route.ts');
const resendRoute = require('../app/api/contratar/reenviar/route.ts');
const pricesRoute = require('../app/api/contratar/precios/route.ts');

const EXTERNAL_REF = 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b';
const CONTRACT_ID = '55555555-5555-4555-8555-555555555555';
const uuid = () => crypto.randomUUID();
const created = (patch = {}) => ({ clientCreated: true, caseId: 'k', caseNumber: 'U26-000140', contractId: CONTRACT_ID, clientId: 'x', signingUrl: SIGNING_URL, warnings: [], ...patch });
const contractForm = (patch = {}) => ({
  firstName: 'Ana', lastName: 'Pérez López', email: 'ana.perez@e2e.local', phone: '(305) 555-0199',
  address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es',
  servicePlanId: ids.visaPlan, parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2014-04-03' }],
  consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() }, ...patch,
});
const startBody = (patch = {}) => ({
  serviceId: 'visa-juvenil', externalRef: EXTERNAL_REF, form: contractForm(), answers: { [ids.visaQ]: true },
  idempotencyKey: uuid(), captchaToken: 'token-ok', ...patch,
});
const confirmBody = (ask, patch = {}) => ({ body: ask.body, verificationId: ask.verificationId, ticket: ask.ticket, code: '481920', idempotencyKey: uuid(), ...patch });

async function post(route, b, url, body) { return b.keep(await route.POST(b.request(url, body))); }
const outcomeOf = async response => (await response.json()).outcome;
const start = (b, patch) => post(startRoute, b, '/api/contratar/iniciar', startBody(patch));
const confirm = (b, ask, patch) => post(confirmRoute, b, '/api/contratar/confirmar', confirmBody(ask, patch));
const contractCalls = net => net.calls.filter(call => call.path === '/contracts');
const leadPuts = net => net.calls.filter(call => call.method === 'PUT' && call.path.startsWith('/leads/'));

function captureConsole() {
  const lines = { log: [], warn: [], error: [] };
  const original = { log: console.log, warn: console.warn, error: console.error };
  for (const level of Object.keys(lines)) console[level] = (...args) => lines[level].push(args.map(String).join(' '));
  return { lines, restore: () => Object.assign(console, original) };
}
/** Ejecuta con variables de entorno cambiadas y las restaura siempre. */
async function withEnv(patch, run) {
  const saved = {};
  for (const key of Object.keys(patch)) { saved[key] = process.env[key]; if (patch[key] === undefined) delete process.env[key]; else process.env[key] = patch[key]; }
  try { return await run(); } finally { for (const key of Object.keys(saved)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
}

// ---- Catálogos con las preguntas nuevas (kind us_state, dateMode, kind desconocido)
const STATE_Q = { id: 'fbb0dc08-0000-4000-8000-0000000000b3', kind: 'us_state', prompt: { es: '¿En qué estado vives?', en: null },
  options: [{ code: 'TX', label: { es: 'Texas', en: 'Texas' } }, { code: 'FL', label: { es: 'Florida', en: 'Florida' } }, { code: 'NY', label: { es: 'Nueva York', en: 'New York' } }] };
const BIRTH_Q = { id: 'fbb0dc08-0000-4000-8000-0000000000b4', kind: 'date', dateMode: 'birthdate', prompt: { es: '¿Cuál es la fecha de nacimiento del menor?', en: null } };
const FUTURE_Q = { id: 'fbb0dc08-0000-4000-8000-0000000000b5', kind: 'date', dateMode: 'future_event', minNotice: { days: 30 }, prompt: { es: '¿Cuándo es tu próxima audiencia?', en: null } };
const WEIRD_Q = { id: 'fbb0dc08-0000-4000-8000-0000000000b6', kind: 'multi_choice', prompt: { es: '¿Cuál de estas aplica?', en: null } };
const catalogWith = questions => ({ services: catalog.services.map(service => service.id === ids.visa ? { ...service, eligibilityQuestions: questions } : service) });
const ymd = days => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

let net;
test.beforeEach(() => {
  freshModules();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.CONTYGO_CHECKOUT_ENABLED;
  net = mockFetch(); contygoDefaults(net);
  geminiCalls = []; provider = async () => { throw new Error('offline'); };
});

// =============================== B1 · preguntas del catálogo ===============================

test('B1 · questionKind: manda el kind (us_state → state); uno desconocido no se adivina; sin kind, respaldo por texto', () => {
  const prompt = { es: '¿Cuál es la fecha de la orden?', en: null };
  assert.equal(checkout.questionKind({ kind: 'yes_no', prompt }), 'yesno');
  assert.equal(checkout.questionKind({ kind: 'date', prompt }), 'date');
  assert.equal(checkout.questionKind({ kind: 'us_state', prompt }), 'state');
  assert.equal(checkout.questionKind({ kind: 'multi_choice', prompt: { es: '¿Cuál fecha?', en: null } }), 'unknown', 'aunque el texto diga «fecha»');
  assert.equal(checkout.questionKind({ prompt }), 'date', 'solo un catálogo antiguo SIN kind cae al texto');
  assert.equal(checkout.hasUnknownQuestion([STATE_Q, WEIRD_Q]), true);
  assert.equal(checkout.hasUnknownQuestion([STATE_Q, BIRTH_Q, FUTURE_Q]), false);
});

test('B1 · normalizeAnswer: estado = código de 2 letras que exista en options; fechas según dateMode; unknown nunca', () => {
  const state = { kind: 'state', options: STATE_Q.options };
  assert.equal(checkout.normalizeAnswer(state, 'tx'), 'TX');
  assert.equal(checkout.normalizeAnswer(state, ' Fl '), 'FL');
  assert.equal(checkout.normalizeAnswer(state, 'CA'), null, 'CA no está en las options de esta pregunta');
  assert.equal(checkout.normalizeAnswer(state, 'Texas'), 'TX', 'por el rótulo de las options');
  assert.equal(checkout.normalizeAnswer(state, 'nueva york'), 'NY');
  assert.equal(checkout.normalizeAnswer(state, true), null);
  assert.equal(checkout.normalizeAnswer('state', 'ca'), 'CA', 'sin options, cualquier estado de EE. UU.');
  assert.equal(checkout.normalizeAnswer('state', 'ZZ'), null);

  const today = '2026-10-02';
  assert.equal(checkout.normalizeAnswer({ kind: 'date', dateMode: 'past' }, '2026-10-04', today), null, 'dos días adelante; uno se tolera por la zona horaria');
  assert.equal(checkout.normalizeAnswer({ kind: 'date', dateMode: 'birthdate' }, '2026-10-04', today), null);
  assert.equal(checkout.normalizeAnswer({ kind: 'date', dateMode: 'birthdate' }, '2014-04-03', today), '2014-04-03');
  assert.equal(checkout.normalizeAnswer({ kind: 'date' }, '2026-10-04', today), null, 'sin dateMode: hasta hoy (catálogo antiguo)');
  assert.equal(checkout.normalizeAnswer({ kind: 'date', dateMode: 'future_event' }, '2026-12-15', today), '2026-12-15');
  assert.equal(checkout.normalizeAnswer({ kind: 'date', dateMode: 'future_event' }, '2026-10-02', today), '2026-10-02', 'hoy vale: minNotice lo decide contygo');
  assert.equal(checkout.normalizeAnswer({ kind: 'date', dateMode: 'future_event' }, '2026-09-30', today), null, 'dos días atrás; uno se tolera por la zona horaria');
  assert.equal(checkout.normalizeAnswer({ kind: 'date', dateMode: 'future_event' }, '2026-02-30', today), null);
  assert.equal(checkout.normalizeAnswer('unknown', true), null);
  assert.equal(checkout.normalizeAnswer({ kind: 'unknown' }, 'si'), null);
});

test('B1 · sanitizeAnswers / toEvaluateAnswers / toContractAnswers conservan el código de estado y las fechas futuras', () => {
  const questions = [STATE_Q, FUTURE_Q];
  const future = ymd(40);
  const answers = checkout.sanitizeAnswers(questions, { [STATE_Q.id]: 'tx', [FUTURE_Q.id]: future });
  assert.deepEqual(answers, { [STATE_Q.id]: 'TX', [FUTURE_Q.id]: future });
  assert.deepEqual(checkout.toEvaluateAnswers(questions, answers), [{ questionId: STATE_Q.id, value: 'TX' }, { questionId: FUTURE_Q.id, value: future }]);
  assert.deepEqual(checkout.toContractAnswers(questions, answers), [{ questionId: STATE_Q.id, answer: 'TX' }, { questionId: FUTURE_Q.id, answer: future }]);
  assert.deepEqual(checkout.sanitizeAnswers(questions, { [STATE_Q.id]: true }), {}, 'un booleano no responde un estado');
  assert.deepEqual(checkout.sanitizeAnswers([WEIRD_Q, STATE_Q], { [WEIRD_Q.id]: 'x', [STATE_Q.id]: 'TX' }), {}, 'una pregunta desconocida corta la cadena');
});

test('B1 · /iniciar con us_state + birthdate + future_event: contygo recibe el código y las fechas tal cual', async () => {
  const questions = [STATE_Q, BIRTH_Q, FUTURE_Q];
  net.on('GET', '/catalog', { status: 200, body: catalogWith(questions) });
  const answers = { [STATE_Q.id]: 'tx', [BIRTH_Q.id]: '2014-04-03', [FUTURE_Q.id]: ymd(45) };
  const b = browser();
  const ask = await outcomeOf(await start(b, { answers }));
  assert.equal(ask.step, 'ASK_CODE');
  const evaluate = net.calls.find(call => call.path === '/eligibility/evaluate');
  assert.deepEqual(evaluate.json.answers, [{ questionId: STATE_Q.id, value: 'TX' }, { questionId: BIRTH_Q.id, value: '2014-04-03' }, { questionId: FUTURE_Q.id, value: ymd(45) }]);
  assert.deepEqual(contractCalls(net)[0].json.eligibilityAnswers.map(item => item.answer), ['TX', '2014-04-03', ymd(45)]);
  // Una audiencia pasada no sirve de future_event: faltan respuestas y no sale ningún código.
  const before = contractCalls(net).length;
  const missing = await outcomeOf(await start(b, { answers: { ...answers, [FUTURE_Q.id]: ymd(-3) } }));
  assert.equal(missing.step, 'NEEDS_ANSWERS');
  assert.equal(contractCalls(net).length, before);
});

test('B1 · una pregunta de kind desconocido escala: HUMAN, sin evaluar ni mandar código, y deja el aviso en el lead', async () => {
  net.on('GET', '/catalog', { status: 200, body: catalogWith([WEIRD_Q]) });
  const log = captureConsole();
  let outcome;
  try { outcome = await outcomeOf(await start(browser(), { answers: { [WEIRD_Q.id]: true } })); } finally { log.restore(); }
  assert.equal(outcome.step, 'HUMAN');
  assert.match(outcome.ref, /^WEB-[0-9A-F]{6}$/);
  assert.equal(net.calls.some(call => call.path === '/eligibility/evaluate'), false);
  assert.equal(contractCalls(net).length, 0);
  assert.match(leadPuts(net)[0].json.aiSummary, /\(UNKNOWN_QUESTION_KIND\)/);
});

test('B1 · el chat: las preguntas llevan kind, dateMode y options al navegador; el estado se responde con su código', async () => {
  net.on('GET', '/catalog', { status: 200, body: catalogWith([STATE_Q, FUTURE_Q]) });
  const b = browser(); b.newIp();
  const say = async body => (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'visa-juvenil', ...body })).json();
  const opening = await say({ answers: {} });
  assert.equal(opening.question.kind, 'state');
  assert.deepEqual(opening.question.options, [{ code: 'TX', label: 'Texas' }, { code: 'FL', label: 'Florida' }, { code: 'NY', label: 'Nueva York' }]);
  assert.equal(opening.escalate, false);
  const afterState = await say({ answers: {}, field: STATE_Q.id, answer: 'tx' });
  assert.deepEqual(afterState.answers, { [STATE_Q.id]: 'TX' });
  assert.equal(afterState.question.kind, 'date');
  assert.equal(afterState.question.dateMode, 'future_event');
  assert.deepEqual(afterState.question.minNotice, { days: 30 });
  assert.equal(geminiCalls.length, 0, 'un clic canónico no usa Gemini');
  const done = await say({ answers: afterState.answers, field: FUTURE_Q.id, answer: ymd(60) });
  assert.equal(done.complete, true);
  assert.equal(done.eligible, true);
  // Una fecha futura no vale como «pasada», pero sí como future_event; una pasada no vale como future_event.
  const past = await say({ answers: afterState.answers, field: FUTURE_Q.id, answer: ymd(-5) });
  assert.equal(past.complete, false);
  assert.match(past.message, /elegir la fecha/);
});

test('B1 · Gemini extrae el código de estado de texto libre y el prompt permite fechas futuras en future_event', async () => {
  net.on('GET', '/catalog', { status: 200, body: catalogWith([STATE_Q, FUTURE_Q]) });
  const b = browser(); b.newIp();
  const say = async body => (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'visa-juvenil', ...body })).json();
  provider = async () => ({ text: JSON.stringify({ clear: true, value: 'TX' }) });
  const state = await say({ answers: {}, field: STATE_Q.id, answer: 'vivo en Texas desde hace dos años' });
  assert.deepEqual(state.answers, { [STATE_Q.id]: 'TX' });
  assert.equal(state.source, 'gemini');
  const sent = JSON.parse(geminiCalls[0].contents[0].parts[0].text);
  assert.equal(sent.kind, 'state');
  assert.equal(sent.today, new Date().toISOString().slice(0, 10), 'la fecha de hoy la pone el servidor');
  assert.match(geminiCalls[0].config.systemInstruction, /state[\s\S]*código de 2 letras[\s\S]*TX/);
  assert.match(geminiCalls[0].config.systemInstruction, /future_event[\s\S]*no puede ser anterior a today/);
  // Gemini inventa un estado que contygo no ofrece: no avanza.
  provider = async () => ({ text: JSON.stringify({ clear: true, value: 'CA' }) });
  const invalid = await say({ answers: {}, field: STATE_Q.id, answer: 'vivo en California' });
  assert.deepEqual(invalid.answers, {});
  // future_event: una fecha futura dicha con palabras se acepta.
  provider = async () => ({ text: JSON.stringify({ clear: true, value: ymd(90) }) });
  const future = await say({ answers: { [STATE_Q.id]: 'TX' }, field: FUTURE_Q.id, answer: 'dentro de tres meses, el día tal' });
  assert.equal(future.answers[FUTURE_Q.id], ymd(90));
});

test('B1 · el chat con una pregunta de kind desconocido escala sin llamar a Gemini', async () => {
  net.on('GET', '/catalog', { status: 200, body: catalogWith([WEIRD_Q]) });
  const b = browser(); b.newIp();
  const say = async body => (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'visa-juvenil', ...body })).json();
  const opening = await say({ answers: {} });
  assert.equal(opening.escalate, true);
  assert.equal(opening.question.kind, 'unknown');
  assert.match(opening.message, /WhatsApp/);
  const turn = await say({ answers: {}, field: WEIRD_Q.id, answer: 'lo que sea' });
  assert.equal(turn.escalate, true);
  assert.deepEqual(turn.answers, {});
  assert.equal(geminiCalls.length, 0);
});

test('B1 · eligibilityGuidance lee disqualified[].reason con texto neutro (sin «no aplica» ni promesa de asesor)', () => {
  const questions = catalog.services[1].eligibilityQuestions;
  const reasons = ['answer', 'deadline_passed', 'deadline_too_close', 'future_date', 'event_too_close', 'age_limit_too_close', 'age_limit_passed', 'algo_nuevo'];
  const details = new Set();
  for (const reason of reasons) {
    const guidance = intakeLib.eligibilityGuidance({ eligible: false, missingQuestionIds: [], disqualifiedQuestionIds: ['q'], disqualified: [{ questionId: 'q', reason }], notices: [], anchorYmd: null }, questions);
    assert.equal(guidance.status, 'review');
    assert.doesNotMatch(`${guidance.title} ${guidance.detail}`, /no aplica|podría no|asesor.*(contactar|llamar)|te contactar/i, reason);
    details.add(guidance.detail);
  }
  assert.ok(details.size >= 7, 'cada motivo tiene su frase');
  const two = intakeLib.eligibilityGuidance({ eligible: false, missingQuestionIds: [], disqualifiedQuestionIds: [], disqualified: [{ questionId: 'a', reason: 'answer' }, { questionId: 'b', reason: 'answer' }], notices: [{ questionId: 'a', message: { es: 'Aviso de prueba.' } }], anchorYmd: null }, questions);
  assert.equal(two.detail.split(intakeLib.reasonDetail('answer')).length, 2, 'un motivo repetido se dice una vez');
  assert.match(two.detail, /Aviso de prueba\./);
  assert.equal(intakeLib.eligibilityGuidance({ eligible: false, missingQuestionIds: [], disqualifiedQuestionIds: [], notices: [], anchorYmd: null }, questions).status, 'review', 'sin disqualified (contygo antiguo) también');
});

test('B1 · /servicio entrega kind, dateMode, minNotice y options (solo el código y el rótulo) y principalFallbackWhenEmpty', async () => {
  const cat = catalogWith([STATE_Q, FUTURE_Q]);
  cat.services[0].partyRoles[1].principalFallbackWhenEmpty = true;
  net.on('GET', '/catalog', { status: 200, body: cat });
  const view = await (await post(serviceRoute, browser(), '/api/contratar/servicio', { serviceId: 'visa-juvenil' })).json();
  assert.equal(view.checkoutEnabled, true);
  assert.deepEqual(view.service.questions[0], { id: STATE_Q.id, prompt: STATE_Q.prompt, kind: 'state', options: [{ code: 'TX', label: 'Texas' }, { code: 'FL', label: 'Florida' }, { code: 'NY', label: 'Nueva York' }] });
  assert.deepEqual(view.service.questions[1], { id: FUTURE_Q.id, prompt: FUTURE_Q.prompt, kind: 'date', dateMode: 'future_event', minNotice: { days: 30 } });
  assert.equal(view.service.partyRoles.find(role => role.roleKey === 'minor').principalFallbackWhenEmpty, true);
});

// =============================== B2 · teléfono +1 ===============================

test('B2 · el teléfono del contrato: como el bot, solo ^\\+1\\d{10}$ con reglas NANP; el del lead puede ser internacional', () => {
  const ok = { '(305) 555-0199': '+13055550199', '305.555.0199': '+13055550199', '305-555-0199': '+13055550199', '1 305 555 0199': '+13055550199', '+1 (305) 555-0199': '+13055550199', '001 305 555 0199': '+13055550199', '13055550199': '+13055550199' };
  for (const [raw, e164] of Object.entries(ok)) assert.equal(checkout.normalizeContractPhone(raw), e164, raw);
  for (const raw of ['+52 55 1234 5678', '0052 55 1234 5678', '555-0199', '+1 055 555 0199', '+1 305 155 0199', '+1 305 555 019', 'abc', '', null, 42, '+44 20 7946 0958']) assert.equal(checkout.normalizeContractPhone(raw), null, String(raw));
  assert.match(checkout.normalizeContractPhone('305 555 0199'), /^\+1\d{10}$/);
  // El lead (PUT /leads) conserva el teléfono internacional y aprende el «00».
  assert.equal(checkout.normalizePhone('+52 55 1234 5678'), '+525512345678');
  assert.equal(checkout.normalizePhone('0052 55 1234 5678'), '+525512345678');
  assert.equal(checkout.normalizePhone('(305) 555-0199'), '+13055550199');
});

test('B2 · validateContractForm: un teléfono que no es de EE. UU. da el texto +1', () => {
  const service = catalog.services[0];
  const bad = checkout.validateContractForm(contractForm({ phone: '+52 55 1234 5678' }), service);
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.phone, 'Necesitamos un teléfono de EE. UU. para tu cuenta.');
  assert.equal(checkout.PHONE_US_MESSAGE, 'Necesitamos un teléfono de EE. UU. para tu cuenta.');
  const good = checkout.validateContractForm(contractForm({ phone: '305.555.0199' }), service);
  assert.equal(good.ok, true);
  assert.equal(good.value.phoneE164, '+13055550199');
});

test('B2 · /iniciar rechaza un teléfono internacional antes de llamar a contygo', async () => {
  const outcome = await outcomeOf(await start(browser(), { form: contractForm({ phone: '+52 55 1234 5678' }) }));
  assert.equal(outcome.step, 'INVALID');
  assert.equal(outcome.errors.phone, 'Necesitamos un teléfono de EE. UU. para tu cuenta.');
  assert.equal(contractCalls(net).length, 0);
});

// =============================== B3 · errores de la API ===============================

const map = (status, code, details, phase) => checkout.mapContractResponse({ status, data: null, error: { code, details }, retryAfter: null }, phase);

test('B3 · INVALID_REQUEST: details.fields en sus dos formas → errores con las claves de la ficha', () => {
  const zod = map(400, 'INVALID_REQUEST', { fields: [
    { path: 'client.address.zip', code: 'invalid_string' },
    { path: 'client.address.line1', code: 'too_small' },
    { path: 'client.address.apartment', code: 'too_big' },
    { path: 'client.address.city', code: 'too_small' },
    { path: 'client.address.state', code: 'invalid_string' },
    { path: 'client.nameParts.firstName', code: 'too_small' },
    { path: 'client.nameParts.middleName', code: 'too_big' },
    { path: 'client.nameParts.lastName', code: 'too_small' },
    { path: 'parties.1.lastName', code: 'too_small' },
    { path: 'parties[0].dateOfBirth', code: 'invalid_string' },
    { path: 'campo.que.no.existe', code: 'x' },
  ] });
  assert.equal(zod.step, 'INVALID');
  assert.deepEqual(Object.keys(zod.errors).sort(), ['address.apartment', 'address.city', 'address.line1', 'address.state', 'address.zip', 'firstName', 'lastName', 'middleName', 'parties.0.dateOfBirth', 'parties.1.lastName']);
  assert.equal(zod.errors['address.zip'], 'El código postal tiene 5 dígitos.');
  const identity = map(400, 'INVALID_REQUEST', { fields: [
    { path: 'client.email', reason: 'reserved_domain' },
    { path: 'client.phoneE164', reason: 'unsupported_country' },
  ] });
  assert.deepEqual(identity, { step: 'INVALID', errors: { email: 'Usa otro correo.', phone: 'Necesitamos un teléfono de EE. UU. para tu cuenta.' } });
  assert.equal(map(400, 'INVALID_REQUEST', { fields: [{ path: 'client.email', reason: 'invalid' }] }).errors.email, 'Escribe un correo válido. Ahí llegará tu código.');
  assert.deepEqual(map(400, 'INVALID_REQUEST', { fields: [{ path: 'client.phoneE164', reason: 'invalid' }] }).errors, { phone: 'Necesitamos un teléfono de EE. UU. para tu cuenta.' });
  assert.deepEqual(map(400, 'INVALID_REQUEST', { fields: [{ path: ['client', 'address', 'zip'], code: 'x' }] }).errors, { 'address.zip': 'El código postal tiene 5 dígitos.' });
  assert.deepEqual(map(400, 'INVALID_REQUEST', undefined), { step: 'ERROR', code: 'INVALID_REQUEST' }, 'sin campos mapeables es un error, no una ficha vacía');
});

test('B3 · /iniciar reabre el campo que contygo señala; /confirmar con INVALID_REQUEST pide empezar otra vez', async () => {
  const b = browser();
  net.on('POST', '/contracts', { status: 400, body: { error: { code: 'INVALID_REQUEST', details: { fields: [{ path: 'client.phoneE164', reason: 'unsupported_country' }, { path: 'client.email', reason: 'reserved_domain' }] } } } });
  const invalid = await outcomeOf(await start(b));
  assert.deepEqual(invalid, { step: 'INVALID', errors: { phone: 'Necesitamos un teléfono de EE. UU. para tu cuenta.', email: 'Usa otro correo.' } });
  assert.equal(contractCalls(net).length, 1, 'un 400 no se reintenta');

  net.reset(); contygoDefaults(net);
  const ask = await outcomeOf(await start(b));
  net.on('POST', '/contracts', { status: 400, body: { error: { code: 'INVALID_REQUEST', details: { fields: [{ path: 'client.email', reason: 'invalid' }] } } } });
  assert.deepEqual(await outcomeOf(await confirm(b, ask)), { step: 'RESTART' });
});

test('B3 · errores de configuración → UNAVAILABLE_ONLINE con console.error de formato fijo y sin PII', async () => {
  const cases = [[401, 'UNAUTHORIZED'], [403, 'FORBIDDEN'], [422, 'COMPLIANCE_INCOMPLETE'], [422, 'COMPLIANCE_EXPIRED'], [422, 'CASE_PAYMENT_PLAN_INVALID'], [422, 'CONSENT_CHANNEL_MISMATCH'], [422, 'NO_SALES_OWNER']];
  for (const [status, code] of cases) {
    freshModules(); net.reset(); contygoDefaults(net);
    net.on('POST', '/contracts', { status, body: { error: { code, message: 'ana.perez@e2e.local 305' } } });
    const log = captureConsole();
    let outcome;
    try { outcome = await outcomeOf(await start(browser())); } finally { log.restore(); }
    assert.equal(outcome.step, 'UNAVAILABLE_ONLINE', code);
    assert.equal(outcome.code, code);
    assert.match(outcome.ref, /^WEB-[0-9A-F]{6}$/);
    assert.deepEqual(log.lines.error, [`[contygo:config] contract-1 ${code}`]);
    assert.equal(log.lines.error.concat(log.lines.warn).some(line => /ana\.perez|555|Ana/.test(line)), false, 'sin PII en consola');
    assert.equal(contractCalls(net).length, 1, `${code}: no se reintenta`);
  }
  // En la 2.ª llamada, igual (menos el 500, que se reintenta).
  net.reset(); contygoDefaults(net);
  const b = browser();
  const ask = await outcomeOf(await start(b));
  net.on('POST', '/contracts', { status: 403, body: { error: { code: 'FORBIDDEN' } } });
  const log = captureConsole();
  let second;
  try { second = await outcomeOf(await confirm(b, ask)); } finally { log.restore(); }
  assert.equal(second.step, 'UNAVAILABLE_ONLINE');
  assert.deepEqual(log.lines.error, ['[contygo:config] contract-2 FORBIDDEN']);
});

test('B3 · 401/403 del catálogo y de la elegibilidad ya no se disfrazan de «revisa tu conexión»', async () => {
  // /servicio: catálogo 403
  net.on('GET', '/catalog', { status: 403, body: { error: { code: 'FORBIDDEN' } } });
  let log = captureConsole();
  let view, outcome;
  try { view = await (await post(serviceRoute, browser(), '/api/contratar/servicio', { serviceId: 'visa-juvenil' })).json(); } finally { log.restore(); }
  assert.deepEqual({ ok: view.ok, checkoutEnabled: view.checkoutEnabled, reason: view.reason, service: view.service }, { ok: true, checkoutEnabled: false, reason: 'unavailable_online', service: null });
  assert.deepEqual(log.lines.error, ['[contygo:config] catalog FORBIDDEN']);
  // /iniciar: catálogo 401
  freshModules(); net.reset(); contygoDefaults(net);
  net.on('GET', '/catalog', { status: 401, body: { error: { code: 'UNAUTHORIZED' } } });
  log = captureConsole();
  try { outcome = await outcomeOf(await start(browser())); } finally { log.restore(); }
  assert.equal(outcome.step, 'UNAVAILABLE_ONLINE');
  assert.equal(outcome.code, 'UNAUTHORIZED');
  assert.deepEqual(log.lines.error, ['[contygo:config] catalog UNAUTHORIZED']);
  // /iniciar: elegibilidad 403
  freshModules(); net.reset(); contygoDefaults(net);
  net.on('POST', '/eligibility/evaluate', { status: 403, body: { error: { code: 'FORBIDDEN' } } });
  log = captureConsole();
  try { outcome = await outcomeOf(await start(browser())); } finally { log.restore(); }
  assert.equal(outcome.step, 'UNAVAILABLE_ONLINE');
  assert.deepEqual(log.lines.error, ['[contygo:config] eligibility FORBIDDEN']);
  assert.equal(contractCalls(net).length, 0);
  // Chat: elegibilidad 403 → unavailableOnline
  freshModules();
  const b = browser(); b.newIp();
  log = captureConsole();
  let done;
  try {
    const greeting = await (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'visa-juvenil', answers: {} })).json();
    done = await (await post(intakeRoute, b, '/api/agent/service-intake', { serviceId: 'visa-juvenil', answers: {}, field: greeting.field, answer: true })).json();
  } finally { log.restore(); }
  assert.equal(done.complete, true);
  assert.equal(done.eligible, null);
  assert.equal(done.unavailableOnline, true);
  // Un 503 sí sigue siendo «reintenta»
  freshModules(); net.reset(); contygoDefaults(net);
  net.on('POST', '/eligibility/evaluate', { status: 503, body: { error: { code: 'INTERNAL' } } });
  assert.equal((await outcomeOf(await start(browser()))).step, 'RETRY_LATER');
});

test('B3 · 500 en la 2.ª llamada: se repite con la MISMA clave y los MISMOS bytes, sin estrenar clave', async () => {
  const b = browser();
  const ask = await outcomeOf(await start(b));
  let n = 0;
  net.on('POST', '/contracts', call => (++n === 1 ? { status: 500, body: { error: { code: 'INTERNAL' } } } : { status: 201, body: created() }));
  const key = uuid();
  const outcome = await outcomeOf(await confirm(b, ask, { idempotencyKey: key }));
  assert.equal(outcome.step, 'SIGN');
  const attempts = contractCalls(net).filter(call => call.json.verificationCode);
  assert.equal(attempts.length, 2);
  assert.deepEqual([...new Set(attempts.map(call => call.headers['Idempotency-Key']))], [key]);
  assert.equal(new Set(attempts.map(call => call.body)).size, 1);
});

test('B3 · si el 500 de la 2.ª llamada persiste: RETRY_LATER busy (el navegador conserva la clave), nunca «error»', async () => {
  const b = browser();
  const ask = await outcomeOf(await start(b));
  net.on('POST', '/contracts', { status: 500, body: { error: { code: 'INTERNAL' } } });
  const key = uuid();
  const response = await confirm(b, ask, { idempotencyKey: key });
  const outcome = await outcomeOf(response);
  assert.equal(outcome.step, 'RETRY_LATER');
  assert.equal(outcome.reason, 'busy');
  assert.equal(response.headers.get('retry-after'), '5');
  const attempts = contractCalls(net).filter(call => call.json.verificationCode);
  assert.ok(attempts.length >= 2 && attempts.length <= 3);
  assert.deepEqual([...new Set(attempts.map(call => call.headers['Idempotency-Key']))], [key]);
  assert.equal(leadPuts(net).filter(call => /\(INTERNAL\)/.test(call.json.aiSummary ?? '')).length, 0, 'un fallo transitorio no avisa a ventas');
});

test('B3 · un 500 en la 1.ª llamada no creó nada y se reintenta con clave nueva; en la 2.ª, con la misma', () => {
  assert.deepEqual(map(500, 'INTERNAL', undefined, 'first'), { step: 'RETRY_LATER', reason: 'fresh_key', retryAfter: 5 });
  assert.deepEqual(map(500, 'INTERNAL', undefined, 'second'), { step: 'RETRY_LATER', reason: 'busy', retryAfter: 5 });
});

test('B3 · 201 sin signingUrl de confianza pero con contrato → SIGN_LINK_PENDING con el token firmado; /reenviar lo usa', async () => {
  const b = browser();
  const ask = await outcomeOf(await start(b));
  net.on('POST', '/contracts', { status: 201, body: created({ signingUrl: undefined, clientCreated: false }) });
  const log = captureConsole();
  let outcome;
  try { outcome = await outcomeOf(await confirm(b, ask)); } finally { log.restore(); }
  assert.deepEqual(Object.keys(outcome).sort(), ['caseNumber', 'clientCreated', 'firstName', 'step', 'token']);
  assert.equal(outcome.step, 'SIGN_LINK_PENDING');
  assert.equal(outcome.clientCreated, false);
  assert.equal(outcome.caseNumber, 'U26-000140');
  assert.equal(outcome.firstName, 'Ana');
  assert.equal(outcome.token, `${CONTRACT_ID}.${crypto.createHmac('sha256', process.env.LANDING_TOKEN_SECRET).update(CONTRACT_ID).digest('base64url')}`);
  assert.equal(JSON.stringify(outcome).includes(CONTRACT_ID + '"'), false, 'nunca el contractId pelado');
  net.on('POST', `/contracts/${CONTRACT_ID}/link`, { status: 200, body: { contractId: CONTRACT_ID, signingUrl: SIGNING_URL, expiresAt: '2026-10-09T00:00:00Z', rotated: true } });
  const link = await outcomeOf(await post(resendRoute, b, '/api/contratar/reenviar', { token: outcome.token, idempotencyKey: uuid() }));
  assert.equal(link.step, 'SIGN_LINK');
  assert.equal(link.signingUrl, SIGNING_URL);
  // Una URL ajena también cuenta como «sin enlace de confianza».
  assert.equal(checkout.mapContractResponse({ status: 201, data: created({ signingUrl: 'https://evil.example/firma/x' }), error: null, retryAfter: null }).step, 'SIGN_LINK_PENDING');
  assert.deepEqual(checkout.mapContractResponse({ status: 201, data: created({ signingUrl: undefined, contractId: undefined }), error: null, retryAfter: null }), { step: 'ERROR', code: 'BAD_SIGNING_URL' });
});

test('B3 · /reenviar: CONTRACT_ALREADY_SIGNED, CONTRACT_NOT_RESENDABLE, IN_PROGRESS, 429 y configuración, cada uno distinto', async () => {
  const b = browser();
  const token = `${CONTRACT_ID}.${crypto.createHmac('sha256', process.env.LANDING_TOKEN_SECRET).update(CONTRACT_ID).digest('base64url')}`;
  const resend = async (status, code, headers) => {
    net.on('POST', `/contracts/${CONTRACT_ID}/link`, { status, body: { error: { code } }, headers });
    b.newIp(); freshModules(); // el tope de reenvíos por contrato es otra prueba
    const log = captureConsole();
    try { return await outcomeOf(await post(resendRoute, b, '/api/contratar/reenviar', { token, idempotencyKey: uuid() })); } finally { log.restore(); }
  };
  assert.deepEqual(await resend(409, 'CONTRACT_ALREADY_SIGNED'), { step: 'ALREADY_SIGNED' });
  assert.deepEqual(await resend(422, 'CONTRACT_NOT_RESENDABLE'), { step: 'NOT_RESENDABLE' });
  assert.deepEqual(await resend(409, 'IN_PROGRESS', { 'retry-after': '1' }), { step: 'IN_PROGRESS', retryAfter: 1 });
  assert.deepEqual(await resend(429, 'RATE_LIMITED', { 'retry-after': '90' }), { step: 'RETRY_LATER', reason: 'destination', retryAfter: 90 });
  assert.deepEqual(await resend(403, 'FORBIDDEN'), { step: 'UNAVAILABLE_ONLINE', code: 'FORBIDDEN' });
});

test('B3 · VERIFICATION_RATE_LIMITED tiene su propio reason con retryAfter; DESTINATION_RATE_LIMITED conserva destination', async () => {
  net.on('POST', '/contracts', { status: 429, body: { error: { code: 'VERIFICATION_RATE_LIMITED' } }, headers: { 'retry-after': '3600' } });
  const verification = await start(browser());
  assert.deepEqual(await outcomeOf(verification), { step: 'RETRY_LATER', reason: 'verification', retryAfter: 3600 });
  assert.equal(verification.headers.get('retry-after'), '3600');
  assert.equal(contractCalls(net).length, 1, 'un 429 no se reintenta');
  net.on('POST', '/contracts', { status: 429, body: { error: { code: 'DESTINATION_RATE_LIMITED' } }, headers: { 'retry-after': '120' } });
  assert.deepEqual(await outcomeOf(await start(browser())), { step: 'RETRY_LATER', reason: 'destination', retryAfter: 120 });
  assert.deepEqual(map(429, 'VERIFICATION_RATE_LIMITED'), { step: 'RETRY_LATER', reason: 'verification', retryAfter: 3600 }, 'sin cabecera, una hora');
});

// =============================== B4 · plazos y reintentos ===============================

test('B4 · 1.ª llamada: tras un corte NO se repite con la misma clave; RETRY_LATER fresh_key', async () => {
  net.on('POST', '/contracts', () => new TypeError('fetch failed'));
  const outcome = await outcomeOf(await start(browser()));
  assert.deepEqual(outcome, { step: 'RETRY_LATER', reason: 'fresh_key', retryAfter: null });
  assert.equal(contractCalls(net).length, 1, 'una sola petición: la misma clave daría IN_PROGRESS 120 s');
  // Un 503 de la 1.ª llamada, en cambio, sí repite con la misma clave (contygo no llegó a procesar).
  freshModules(); net.reset(); contygoDefaults(net);
  let n = 0;
  net.on('POST', '/contracts', call => (++n === 1 ? { status: 503, body: { error: { code: 'INTERNAL' } }, headers: { 'retry-after': '1' } } : { status: 409, body: { error: { code: 'CLIENT_VERIFICATION_REQUIRED', details: { verificationId: VERIFICATION_ID, maskedEmail: 'a***@gmail.com', expiresAt: null } } } }));
  assert.equal((await outcomeOf(await start(browser()))).step, 'ASK_CODE');
  assert.equal(new Set(contractCalls(net).map(call => call.headers['Idempotency-Key'])).size, 1);
});

test('B4 · 2.ª llamada: un corte repite con la misma clave y los mismos bytes dentro del plazo', async () => {
  const b = browser();
  const ask = await outcomeOf(await start(b));
  let n = 0;
  net.on('POST', '/contracts', () => (++n === 1 ? new TypeError('socket hang up') : { status: 201, body: created() }));
  const key = uuid();
  assert.equal((await outcomeOf(await confirm(b, ask, { idempotencyKey: key }))).step, 'SIGN');
  const attempts = contractCalls(net).filter(call => call.json.verificationCode);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].headers['Idempotency-Key'], attempts[1].headers['Idempotency-Key']);
  assert.equal(attempts[0].body, attempts[1].body);
});

test('B4 · plazo global: ningún intento empieza si no cabe; el cliente informa lo último que contygo dijo', async () => {
  // Sin tiempo para empezar: ni una petición.
  const sent = net.calls.length;
  const none = await client.contygoApi.createContract({ externalRef: 'web-a' }, 'k1', { phase: 'second', deadline: Date.now() + 500 });
  assert.deepEqual({ status: none.status, code: none.error.code }, { status: 0, code: 'DEADLINE' });
  assert.equal(net.calls.length, sent);
  // Un 503 con espera que dejaría sin plazo para otro intento: se devuelve el 503, sin dormir ni repetir.
  net.on('POST', '/contracts', { status: 503, body: { error: { code: 'INTERNAL' } }, headers: { 'retry-after': '1' } });
  const t0 = Date.now();
  const short = await client.contygoApi.createContract({ externalRef: 'web-a', verificationCode: '481920' }, 'k2', { phase: 'second', deadline: Date.now() + 2500 });
  assert.equal(short.status, 503);
  assert.ok(Date.now() - t0 < 900, 'no espera un segundo que no puede aprovechar');
  assert.equal(contractCalls(net).length, 1);
  // El timeout de cada intento nunca pasa del plazo que queda.
  let signal;
  net.on('POST', '/contracts', { status: 201, body: created() });
  const orig = global.fetch;
  global.fetch = (url, init) => { signal = init.signal; return orig(url, init); };
  await client.contygoApi.createContract({ externalRef: 'web-a' }, 'k3', { phase: 'first', deadline: Date.now() + 3000 });
  assert.ok(signal instanceof AbortSignal);
  global.fetch = orig;
});

test('B4 · el flujo comparte un presupuesto: con el plazo agotado no se llama ni a elegibilidad ni al alta', async () => {
  await catalogLib.loadCatalog(); // catálogo en caché: lo único que queda es el plazo
  net.calls.length = 0;
  const outcome = await flow.startContract({ localServiceId: 'visa-juvenil', externalRef: EXTERNAL_REF, form: contractForm(), answers: { [ids.visaQ]: true } }, uuid(), { budgetMs: 500 });
  assert.deepEqual(outcome, { step: 'RETRY_LATER', reason: 'busy', retryAfter: null });
  assert.equal(net.calls.length, 0);
  assert.equal(flow.REQUEST_BUDGET_MS, 50_000);
  // /confirmar con el plazo agotado: busy con la misma clave (nada se envió).
  const ask = await outcomeOf(await start(browser()));
  net.calls.length = 0;
  const confirmed = await flow.confirmContract({ ...confirmBody(ask) }, uuid(), { budgetMs: 500 });
  assert.deepEqual(confirmed, { step: 'RETRY_LATER', reason: 'busy', retryAfter: 5 });
  assert.equal(contractCalls(net).length, 0);
});

// =============================== B5 · aviso a ventas ===============================

test('B5 · HUMAN (2.ª llamada): PUT /leads con aiSummary sin PII, y referencia WEB-XXXXXX', async () => {
  const b = browser();
  const ask = await outcomeOf(await start(b));
  net.on('POST', '/contracts', { status: 409, body: { error: { code: 'CLIENT_NEEDS_HUMAN' } } });
  const before = leadPuts(net).length;
  const human = await outcomeOf(await confirm(b, ask));
  assert.equal(human.step, 'HUMAN');
  assert.equal(human.ref, `WEB-${EXTERNAL_REF.slice(-6).toUpperCase()}`);
  assert.equal(checkout.publicRef(EXTERNAL_REF), human.ref);
  const puts = leadPuts(net);
  assert.equal(puts.length, before + 1);
  const put = puts.at(-1);
  assert.equal(put.path, `/leads/${EXTERNAL_REF}`);
  assert.deepEqual(Object.keys(put.json).sort(), ['aiSummary', 'fullName', 'phoneE164', 'source'], 'cuerpo estricto: sin correo ni atribución');
  assert.equal(put.json.aiSummary, 'Web · Visa Juvenil Básico. Intentó contratar en línea y necesita ayuda (CLIENT_NEEDS_HUMAN).');
  assert.ok(put.json.aiSummary.length <= 2000);
  assert.equal(put.json.phoneE164, '+13055550199');
  assert.equal(put.json.fullName, 'Ana Pérez López');
  assert.equal(put.json.source, 'web');
});

test('B5 · UNAVAILABLE_ONLINE y un ERROR no transitorio avisan; un fallo transitorio, no; el interruptor apagado, tampoco', async () => {
  net.on('POST', '/contracts', { status: 422, body: { error: { code: 'COMPLIANCE_EXPIRED' } } });
  const log = captureConsole();
  try {
    const blocked = await outcomeOf(await start(browser()));
    assert.equal(blocked.step, 'UNAVAILABLE_ONLINE');
    assert.match(leadPuts(net).at(-1).json.aiSummary, /\(COMPLIANCE_EXPIRED\)\.$/);
    freshModules(); net.reset(); contygoDefaults(net);
    net.on('POST', '/contracts', { status: 418, body: { error: { code: 'TEAPOT' } } });
    const failed = await outcomeOf(await start(browser()));
    assert.equal(failed.step, 'ERROR');
    assert.equal(failed.code, 'TEAPOT');
    assert.match(failed.ref, /^WEB-/);
    assert.match(leadPuts(net).at(-1).json.aiSummary, /\(TEAPOT\)\.$/);
    // Transitorio: corte, 429, IN_PROGRESS → ningún aviso extra.
    freshModules(); net.reset(); contygoDefaults(net);
    net.on('POST', '/contracts', () => new TypeError('fetch failed'));
    await start(browser());
    const aiSummaries = leadPuts(net).map(call => call.json.aiSummary);
    assert.equal(aiSummaries.some(text => /Intentó contratar/.test(text)), false);
  } finally { log.restore(); }
  // El aviso no tumba la respuesta si el PUT falla.
  freshModules(); net.reset(); contygoDefaults(net);
  net.on('POST', '/contracts', { status: 409, body: { error: { code: 'CLIENT_NEEDS_HUMAN' } } });
  net.on('PUT', /^\/leads\//, { status: 422, body: { error: { code: 'NO_SALES_OWNER' } } });
  const log2 = captureConsole();
  try { assert.equal((await outcomeOf(await start(browser()))).step, 'HUMAN'); } finally { log2.restore(); }
});

test('B5 · el resumen del intento es corto, con código saneado y sin datos de la persona', async () => {
  const lead = require('../lib/contygo-api/lead.ts');
  assert.equal(lead.attemptSummary('Apelación (BIA)', 'no_sales_owner'), 'Web · Apelación (BIA). Intentó contratar en línea y necesita ayuda (NO_SALES_OWNER).');
  assert.equal(lead.attemptSummary('X', 'a b/c<d>'), 'Web · X. Intentó contratar en línea y necesita ayuda (ABCD).');
  assert.ok(lead.attemptSummary('S'.repeat(5000), 'X'.repeat(500)).length < 400);
});

// =============================== B7 · precios vivos ===============================

test('B7 · GET /precios: «desde» y paquetes del catálogo vivo, cacheable, sin ids; 503 si no hay catálogo', async () => {
  const cat = JSON.parse(JSON.stringify(catalog));
  cat.services[0].plans.push({ id: 'p2', name: { es: 'Premium', en: null }, priceCents: 400000, extraPartyPriceCents: 0, installmentOptions: [] });
  cat.services.push({ id: 'zzz', slug: 'servicio-fuera-de-la-landing', name: { es: 'Otro', en: null }, plans: [{ id: 'z', name: { es: 'Z', en: null }, priceCents: 100, extraPartyPriceCents: 0, installmentOptions: [] }], eligibilityQuestions: [], partyRoles: [] });
  net.on('GET', '/catalog', { status: 200, body: cat });
  const response = await pricesRoute.GET(new NextRequest("https://landing.invalid/api/contratar/precios"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /public, s-maxage=300, stale-while-revalidate=\d+/);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.prices['visa-juvenil-basico'].fromCents, 250000);
  assert.deepEqual(body.prices['visa-juvenil-basico'].plans, [{ name: { es: 'Básico', en: null }, priceCents: 250000 }, { name: { es: 'Premium', en: null }, priceCents: 400000 }]);
  assert.equal(body.prices.apelacion.fromCents, 70000);
  assert.equal(body.prices['servicio-fuera-de-la-landing'], undefined, 'solo servicios de la landing');
  assert.equal(JSON.stringify(body).includes('fbb0dc08'), false, 'sin ids internos');
  // Sin catálogo: 503 y sin caché.
  freshModules(); net.reset();
  net.on('GET', '/catalog', { status: 503, body: { error: { code: 'INTERNAL' } } });
  const log = captureConsole();
  let down;
  try { down = await pricesRoute.GET(new NextRequest("https://landing.invalid/api/contratar/precios")); } finally { log.restore(); }
  assert.equal(down.status, 503);
  assert.equal(down.headers.get('cache-control'), 'no-store');
  assert.equal((await down.json()).error, 'prices_unavailable');
});

// =============================== B8 · código del correo ===============================

test('B8 · /confirmar quita todo lo que no sea dígito del código antes de validar', async () => {
  const b = browser();
  const ask = await outcomeOf(await start(b));
  for (const typed of ['481 920', '481-920', ' 4 8 1 9 2 0 ', '481.920', '​481920']) {
    const outcome = await outcomeOf(await confirm(b, ask, { code: typed }));
    assert.equal(outcome.step, 'SIGN', JSON.stringify(typed));
    assert.equal(contractCalls(net).at(-1).json.verificationCode, '481920');
  }
  assert.equal((await outcomeOf(await confirm(b, ask, { code: '48192' }))).step, 'INVALID');
  assert.equal((await outcomeOf(await confirm(b, ask, { code: '4819201' }))).step, 'INVALID');
  assert.equal((await outcomeOf(await confirm(b, ask, { code: 'abcdef' }))).step, 'INVALID');
});

// =============================== B10 · seguridad operativa ===============================

test('B10 · writesBlocked: solo VERCEL_ENV=production, CONTYGO_ALLOW_WRITES=1 o un contygo local (localhost/127.0.0.1)', async () => {
  const none = { VERCEL_ENV: undefined, CONTYGO_ALLOW_WRITES: undefined, CONTYGO_API_BASE: undefined };
  const check = (patch, expected, label) => withEnv({ ...none, ...patch }, () => {
    assert.equal(client.writesBlocked('POST', '/contracts'), expected, label);
    assert.equal(client.writesBlocked('PUT', '/leads/web-x'), expected, label);
  });
  await check({}, true, 'sin nada');
  await check({ VERCEL_ENV: 'preview' }, true, 'Vercel Preview nunca escribe');
  await check({ VERCEL_ENV: 'development' }, true, 'vercel dev');
  await check({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }, true, 'un build de producción en Preview sigue sin escribir');
  await check({ VERCEL_ENV: 'production' }, false, 'producción');
  await check({ CONTYGO_ALLOW_WRITES: '1' }, false, 'prueba coordinada');
  await check({ CONTYGO_ALLOW_WRITES: '0' }, true, 'solo «1» vale');
  await check({ CONTYGO_API_BASE: 'http://127.0.0.1:3999/api/integrations/v1' }, false, 'contygo local de desarrollo');
  await check({ CONTYGO_API_BASE: 'https://dev.contygo.example/api/integrations/v1' }, true, 'lista blanca: un host DEV con nombre tampoco abre las escrituras (solo localhost/127.0.0.1)');
  await check({ CONTYGO_API_BASE: 'https://contygo.app/api/integrations/v1' }, true, 'apuntar a contygo.app no abre las escrituras');
  await check({ CONTYGO_API_BASE: 'no es una url' }, true, 'una base inválida no abre nada');
  await withEnv(none, () => {
    assert.equal(client.writesBlocked('GET', '/catalog'), false);
    assert.equal(client.writesBlocked('POST', '/eligibility/evaluate'), false);
  });
  // En Preview una escritura real ni sale de aquí.
  await withEnv({ ...none, VERCEL_ENV: 'preview' }, async () => {
    const sent = net.calls.length;
    const log = captureConsole();
    let result, outcome;
    try {
      result = await client.contygoApi.createContract({ externalRef: 'web-x' }, 'k');
      outcome = await outcomeOf(await start(browser()));
    } finally { log.restore(); }
    assert.equal(result.error.code, 'DEV_WRITES_DISABLED');
    assert.equal(outcome.step, 'UNAVAILABLE_ONLINE', 'la ficha ofrece WhatsApp en un Preview');
    assert.equal(net.calls.slice(sent).some(call => call.method !== 'GET' && call.path !== '/eligibility/evaluate'), false);
  });
});

test('B10 · interruptor CONTYGO_CHECKOUT_ENABLED=0: /iniciar no llama a contygo y /servicio avisa checkoutEnabled:false', async () => {
  await withEnv({ CONTYGO_CHECKOUT_ENABLED: '0' }, async () => {
    const b = browser();
    const sent = net.calls.length;
    // Ni CAPTCHA ni nada: aunque falte el token.
    const response = await start(b, { captchaToken: undefined });
    assert.equal(response.status, 200);
    const outcome = await outcomeOf(response);
    assert.deepEqual(outcome, { step: 'UNAVAILABLE_ONLINE', code: 'CHECKOUT_DISABLED', ref: checkout.publicRef(EXTERNAL_REF) });
    assert.equal(net.calls.length, sent, 'cero llamadas a contygo');
    const direct = await flow.startContract({ localServiceId: 'visa-juvenil', externalRef: EXTERNAL_REF, form: contractForm(), answers: {} }, uuid());
    assert.equal(direct.step, 'UNAVAILABLE_ONLINE');
    assert.equal(net.calls.length, sent);
    const view = await (await post(serviceRoute, b, '/api/contratar/servicio', { serviceId: 'visa-juvenil' })).json();
    assert.deepEqual({ ok: view.ok, checkoutEnabled: view.checkoutEnabled, reason: view.reason, service: view.service }, { ok: true, checkoutEnabled: false, reason: 'checkout_disabled', service: null });
    assert.ok(view.terms && 'captchaSiteKey' in view);
    assert.equal(net.calls.length, sent);
  });
  // Con cualquier otro valor (o sin definir) sigue encendido.
  for (const value of [undefined, '1', '']) await withEnv({ CONTYGO_CHECKOUT_ENABLED: value }, () => assert.equal(checkout.checkoutEnabled(), true, String(value)));
});

test('B10 · isTrustedSigningUrl: http solo con una API localhost/127.0.0.1 y fuera de producción', async () => {
  const local = 'http://127.0.0.1:3999/api/integrations/v1';
  const localhost = 'http://localhost:3999/api/integrations/v1';
  const url = host => `http://${host}/firma/tok_abc`;
  await withEnv({ NODE_ENV: 'development' }, () => {
    assert.equal(checkout.isTrustedSigningUrl(url('127.0.0.1:3999'), local), true);
    assert.equal(checkout.isTrustedSigningUrl(url('localhost:3999'), localhost), true);
    assert.equal(checkout.isTrustedSigningUrl(url('127.0.0.1:4000'), local), false, 'otro puerto, otro host');
    assert.equal(checkout.isTrustedSigningUrl(url('evil.example'), local), false);
    assert.equal(checkout.isTrustedSigningUrl(url('contygo.app'), 'https://contygo.app/api/integrations/v1'), false, 'http nunca con la API real');
    assert.equal(checkout.isTrustedSigningUrl('http://user:pw@127.0.0.1:3999/firma/x', local), false);
  });
  await withEnv({ NODE_ENV: 'production' }, () => {
    assert.equal(checkout.isTrustedSigningUrl(url('127.0.0.1:3999'), local), false, 'en producción, jamás');
    assert.equal(checkout.isTrustedSigningUrl('https://contygo.app/firma/tok_abc', 'https://contygo.app/api/integrations/v1'), true);
  });
  assert.equal(checkout.isTrustedSigningUrl('https://evil.example/firma/x', 'https://contygo.app/api/integrations/v1'), false);
  assert.equal(checkout.isTrustedSigningUrl('https://127.0.0.1:3999/firma/x', local), true, 'https sigue valiendo si es el mismo host');
});
