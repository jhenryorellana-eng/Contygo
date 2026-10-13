const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const hearing = require('../lib/agent/hearing-intake.ts');
const { closingAction, closingLines, closingVariant } = require('../components/contygo/juvenil/closingSpeech.ts');
const { CONTYGO_SERVICES } = require('../lib/contygo-catalog.ts');

// El proveedor de IA se sustituye: estas pruebas no llaman a Gemini.
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async () => { throw new Error('offline'); } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' ? server : load.call(this, request, ...args); };
delete require.cache[require.resolve('../app/api/agent/service-intake/route.ts')];
const { POST } = require('../app/api/agent/service-intake/route.ts');
Module._load = load;

const TODAY = '2026-10-12';
const ymd = days => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
let b, net;
const say = async body => (await POST(b.request('/api/agent/service-intake', { serviceId: 'preparacion-audiencia', ...body }))).json();
test.beforeEach(() => { freshModules(); net = mockFetch(); contygoDefaults(net); b = browser(); b.newIp(); });

test('es un servicio público y destacado de la corte, con un paquete por audiencia', () => {
  const service = CONTYGO_SERVICES.find(item => item.id === hearing.HEARING_SERVICE);
  assert.equal(service.slug, 'preparacion-de-audiencia');
  assert.equal(service.category, 'corte');
  assert.deepEqual(service.plans, [{ name: 'Segunda audiencia', price: 150 }, { name: 'Tercera audiencia', price: 350 }]);
});

test('las tres preguntas: sin audiencia no se pregunta más; la de mérito decide la preparación', () => {
  assert.deepEqual(hearing.hearingFlow({}, TODAY).questions.map(question => question.id), [hearing.HAS_FIELD, hearing.DATE_FIELD, hearing.MERIT_FIELD]);
  const none = hearing.hearingFlow({ [hearing.HAS_FIELD]: false }, TODAY);
  assert.deepEqual(none.questions.map(question => question.id), [hearing.HAS_FIELD]);
  assert.deepEqual(none.outcome, { kind: 'none', date: null, soon: false, advisor: true });
  const answers = { [hearing.HAS_FIELD]: true, [hearing.DATE_FIELD]: '2026-11-20' };
  assert.equal(hearing.hearingFlow(answers, TODAY).outcome, null, 'falta saber si es la de mérito');
  assert.deepEqual(hearing.hearingFlow({ ...answers, [hearing.MERIT_FIELD]: true }, TODAY).outcome, { kind: 'tercera', date: '2026-11-20', soon: false, advisor: false });
  assert.equal(hearing.hearingFlow({ ...answers, [hearing.MERIT_FIELD]: false }, TODAY).outcome.kind, 'segunda');
  // «No la tengo a mano» vale; una fecha pasada no; una en 3 días o menos avisa que se reserve cuanto antes.
  assert.deepEqual(hearing.hearingFlow({ ...answers, [hearing.DATE_FIELD]: hearing.NO_DATE, [hearing.MERIT_FIELD]: false }, TODAY).outcome, { kind: 'segunda', date: null, soon: false, advisor: false });
  assert.equal(hearing.hearingFlow({ ...answers, [hearing.DATE_FIELD]: '2026-10-01', [hearing.MERIT_FIELD]: true }, TODAY).outcome, null);
  assert.equal(hearing.hearingFlow({ ...answers, [hearing.DATE_FIELD]: '2026-10-15', [hearing.MERIT_FIELD]: true }, TODAY).outcome.soon, true);
  assert.equal(hearing.hearingFlow({ ...answers, [hearing.DATE_FIELD]: '2026-10-16', [hearing.MERIT_FIELD]: true }, TODAY).outcome.soon, false);
});

test('las respuestas escritas: la fecha con el mes en palabras, «no la tengo a mano» y sí/no', () => {
  const [, when, merit] = hearing.hearingFlow({}, TODAY).questions;
  assert.equal(hearing.normalizeHearingAnswer(when, 'no la tengo a mano'), hearing.NO_DATE);
  assert.equal(hearing.normalizeHearingAnswer(when, `15 de marzo de ${new Date().getUTCFullYear() + 1}`), `${new Date().getUTCFullYear() + 1}-03-15`);
  assert.equal(hearing.normalizeHearingAnswer(merit, 'sí'), true);
  assert.equal(hearing.normalizeHearingAnswer(merit, 'no'), false);
  assert.equal(hearing.normalizeHearingAnswer(merit, 'tal vez'), null);
});

test('el chat funciona aunque el servicio aún no esté en contygo, y recomienda la preparación de la tercera audiencia', async () => {
  assert.equal(catalog.services.some(service => service.slug === 'preparacion-de-audiencia'), false);
  const opening = await say({ answers: {} });
  assert.equal(opening.field, hearing.HAS_FIELD);
  assert.match(opening.message, /Preparación de Audiencia[\s\S]*¿Tienes una audiencia programada/);
  for (const line of hearing.hearingVoiceScripts()) assert.ok(opening.scripts.includes(line), line);
  const when = await say({ answers: opening.answers, field: hearing.HAS_FIELD, answer: true });
  assert.equal(when.question.kind, 'date');
  assert.equal(when.question.dateMode, 'future_event');
  assert.equal(when.question.unknownLabel, 'No la tengo a mano');
  const merit = await say({ answers: when.answers, field: hearing.DATE_FIELD, answer: ymd(40) });
  assert.equal(merit.field, hearing.MERIT_FIELD);
  const done = await say({ answers: merit.answers, field: hearing.MERIT_FIELD, answer: true });
  assert.equal(done.complete, true);
  assert.equal(done.hearing.kind, 'tercera');
  assert.equal(done.message, hearing.hearingFinish(done.hearing));
  assert.equal(done.guidance.title, 'Te corresponde la preparación para la tercera audiencia');
  assert.match(done.guidance.detail, /no abogado/);
  assert.equal(done.eligible, null, 'sin el servicio en contygo no hay nada que evaluar allí');
  assert.equal(net.calls.some(call => call.path === '/eligibility/evaluate'), false);
});

test('sin audiencia programada el chat termina enseguida y Henry orienta por WhatsApp', async () => {
  const done = await say({ answers: {}, field: hearing.HAS_FIELD, answer: false });
  assert.equal(done.complete, true);
  assert.deepEqual(done.hearing, { kind: 'none', date: null, soon: false, advisor: true });
  assert.match(done.message, /Henry puede orientarte por WhatsApp/);
  assert.equal(done.guidance.status, 'review');
});

test('cuando contygo ya tiene el servicio, sus respuestas se evalúan allí y las de la landing no viajan', async () => {
  const withService = { services: [...catalog.services, {
    id: 'a0d1e2c3-0000-4000-8000-000000000001', slug: 'preparacion-de-audiencia', name: { es: 'Preparación de Audiencia', en: null },
    plans: [{ id: 'p2', name: { es: 'Segunda audiencia', en: null }, priceCents: 15000, extraPartyPriceCents: 0, installmentOptions: [] }, { id: 'p3', name: { es: 'Tercera audiencia', en: null }, priceCents: 35000, extraPartyPriceCents: 0, installmentOptions: [] }],
    eligibilityQuestions: [], partyRoles: [],
  }] };
  net.on('GET', '/catalog', { status: 200, body: withService });
  const done = await say({ answers: { [hearing.HAS_FIELD]: true, [hearing.DATE_FIELD]: hearing.NO_DATE }, field: hearing.MERIT_FIELD, answer: false });
  assert.equal(done.hearing.kind, 'segunda');
  const evaluate = net.calls.find(call => call.path === '/eligibility/evaluate');
  assert.deepEqual(evaluate.json, { serviceId: 'a0d1e2c3-0000-4000-8000-000000000001', answers: [] });
  assert.equal(done.eligible, true);
});

test('el cierre nombra la preparación que le toca; sin audiencia, el botón es «Hablar con Henry»', () => {
  const id = hearing.HEARING_SERVICE;
  assert.equal(closingVariant(id, null, null, { kind: 'tercera', advisor: false }), 'audiencia-tercera');
  assert.equal(closingVariant(id, null, null, { kind: 'segunda', advisor: false }), 'audiencia-segunda');
  assert.equal(closingVariant(id, null, null, { kind: 'none', advisor: true }), 'audiencia-henry');
  assert.equal(closingVariant(id, null, null, null), null);
  assert.equal(closingAction(id, 'audiencia-henry'), 'Hablar con Henry');
  assert.equal(closingAction(id, 'audiencia-tercera'), 'Revisar mi contrato');
  assert.match(closingLines(id, 'audiencia-tercera').join(' '), /mérito/);
  assert.equal(closingVariant('reforzar-asilo', null, null, { kind: 'tercera', advisor: false }), null, 'solo cuenta para su servicio');
});
