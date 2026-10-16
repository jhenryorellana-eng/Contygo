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
  assert.deepEqual(service.plans, [{ name: 'Preparación para la segunda audiencia', price: 150 }, { name: 'Preparación para la tercera audiencia', price: 350 }], 'los nombres de contygo: el precio vivo se busca por nombre');
});

test('sus dos vídeos ya están (portadas, tarjeta del cierre y vista previa de WhatsApp)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const media = require('../lib/contygo-rebuild-media.ts');
  const first = media.getRebuildServiceFilm(hearing.HEARING_SERVICE);
  assert.deepEqual([first.src, first.duration], ['/contygo/films/preparacion-audiencia-v1-720p.mp4', 79.58333333333333]);
  for (const file of [first.src, first.poster, '/contygo/v7/cierre-preparacion-audiencia.webp', '/contygo/compartir/preparacion-audiencia.jpg']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', file)), file);
  const second = media.getRebuildPlatformFilm(hearing.HEARING_SERVICE);
  assert.deepEqual([second.src, second.duration, second.provisional], ['/contygo/films/preparacion-audiencia-video2-v1-720p.mp4', 149.08333333333334, undefined]);
  for (const file of [second.src, second.poster]) assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', file)), file);
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

// El servicio como está en producción (14-10-2026): la fecha (future_event, 7 días) y «¿En qué audiencia se encuentra?»
// (single_choice), que limita el paquete: Segunda → $150, Tercera → $350.
const H = {
  service: 'a0d1e2c3-0000-4000-8000-000000000001', p2: 'a0d1e2c3-0000-4000-8000-0000000000a1', p3: 'a0d1e2c3-0000-4000-8000-0000000000a2',
  date: 'a0d1e2c3-0000-4000-8000-0000000000b1', choice: 'a0d1e2c3-0000-4000-8000-0000000000b2',
};
const HEARING_PLANS = { 'segunda-audiencia': H.p2, 'tercera-audiencia': H.p3 };
const hearingService = {
  id: H.service, slug: 'preparacion-de-audiencia', name: { es: 'Preparación de Audiencia', en: null },
  plans: [
    { id: H.p2, name: { es: 'Preparación para la segunda audiencia', en: null }, priceCents: 15000, extraPartyPriceCents: 0, installmentOptions: [] },
    { id: H.p3, name: { es: 'Preparación para la tercera audiencia', en: null }, priceCents: 35000, extraPartyPriceCents: 0, installmentOptions: [] },
  ],
  eligibilityQuestions: [
    { id: H.date, kind: 'date', dateMode: 'future_event', minNotice: { value: 7, unit: 'calendar_days' }, prompt: { es: '¿Cuándo es su próxima audiencia?', en: null } },
    { id: H.choice, kind: 'single_choice', prompt: { es: '¿En qué audiencia se encuentra?', en: null }, options: [
      { code: 'segunda-audiencia', name: { es: 'Segunda audiencia', en: null } }, { code: 'tercera-audiencia', name: { es: 'Tercera audiencia', en: null } },
    ] },
  ],
  partyRoles: [{ roleKey: 'lead', label: { es: 'Titular', en: null }, cardinality: 'single', isRequired: true }],
};
/** contygo en producción: falta una respuesta → missing; la fecha a menos de 7 días → event_too_close; la opción limita el paquete. */
function withHearingService() {
  net.on('GET', '/catalog', { status: 200, body: { services: [...catalog.services, hearingService] } });
  net.on('POST', '/eligibility/evaluate', call => {
    const answers = call.json.answers;
    const value = id => answers.find(item => item.questionId === id)?.value;
    const missing = [H.date, H.choice].filter(id => value(id) === undefined);
    const tooClose = typeof value(H.date) === 'string' && (Date.parse(value(H.date)) - Date.parse(ymd(0))) / 86_400_000 < 7;
    const disqualified = tooClose ? [{ questionId: H.date, reason: 'event_too_close' }] : [];
    return { status: 200, body: { eligible: !missing.length && !disqualified.length, missingQuestionIds: missing, disqualifiedQuestionIds: disqualified.map(item => item.questionId), disqualified, notices: [], anchorYmd: null, allowedPlanIds: HEARING_PLANS[value(H.choice)] ? [HEARING_PLANS[value(H.choice)]] : null } };
  });
}
const chat = async answers => {
  let turn = await say({ answers: {} });
  for (const [field, answer] of answers) turn = await say({ answers: turn.answers, field, answer });
  return turn;
};

test('single_choice de contygo: se responde con el code de una opción (o su rótulo), nunca se adivina', () => {
  const { normalizeAnswer, questionKind, hasUnknownQuestion } = require('../lib/contygo-api/checkout.ts');
  const { publicQuestion } = require('../lib/contygo-api/catalog.ts');
  const question = hearingService.eligibilityQuestions[1];
  assert.equal(questionKind(question), 'choice');
  assert.equal(hasUnknownQuestion(hearingService.eligibilityQuestions), false, 'ya no se escala a WhatsApp');
  const target = { kind: 'choice', options: question.options };
  assert.equal(normalizeAnswer(target, 'tercera-audiencia'), 'tercera-audiencia');
  assert.equal(normalizeAnswer(target, 'segunda audiencia'), 'segunda-audiencia');
  assert.equal(normalizeAnswer(target, 'cuarta-audiencia'), null);
  assert.equal(normalizeAnswer(target, true), null);
  assert.equal(normalizeAnswer({ kind: 'choice' }, 'segunda-audiencia'), null, 'sin options no hay respuesta posible');
  assert.deepEqual(publicQuestion(question).options, [{ code: 'segunda-audiencia', label: 'Segunda audiencia' }, { code: 'tercera-audiencia', label: 'Tercera audiencia' }]);
});

test('con el servicio en contygo, el chat no repite sus dos preguntas: las responde con las suyas y contygo evalúa', async () => {
  withHearingService();
  const date = ymd(40);
  const done = await chat([[hearing.HAS_FIELD, true], [hearing.DATE_FIELD, date], [hearing.MERIT_FIELD, true]]);
  assert.equal(done.complete, true);
  assert.equal(done.total, 3, 'solo las tres preguntas de la landing');
  assert.equal(done.hearing.kind, 'tercera');
  assert.equal(done.eligible, true);
  assert.equal(done.answers[H.date], date);
  assert.equal(done.answers[H.choice], 'tercera-audiencia');
  const evaluate = net.calls.filter(call => call.path === '/eligibility/evaluate').at(-1);
  assert.deepEqual(evaluate.json, { serviceId: H.service, answers: [{ questionId: H.date, value: date }, { questionId: H.choice, value: 'tercera-audiencia' }] });
  assert.ok(Object.keys(evaluate.json.answers).every(key => !String(key).startsWith('audiencia.')), 'las claves audiencia.* no viajan');
});

test('«No la tengo a mano»: no es un «no»; la fecha queda pendiente para la ficha del contrato', async () => {
  withHearingService();
  const done = await chat([[hearing.HAS_FIELD, true], [hearing.DATE_FIELD, 'no la tengo a mano'], [hearing.MERIT_FIELD, false]]);
  assert.equal(done.hearing.kind, 'segunda');
  assert.equal(done.hearing.advisor, false);
  assert.equal(done.eligible, null, 'contygo solo echa en falta la fecha');
  assert.equal(done.answers[H.date], undefined);
  assert.equal(done.answers[H.choice], 'segunda-audiencia');
  const { missingQuestions } = require('../lib/contygo-api/variants.ts');
  const { publicServiceView } = require('../lib/contygo-api/catalog.ts');
  assert.deepEqual(missingQuestions(publicServiceView(hearingService).questions, done.answers).map(question => question.id), [H.date]);
});

test('una audiencia en menos de 7 días: contygo la descalifica y Henry la atiende por WhatsApp', async () => {
  withHearingService();
  const done = await chat([[hearing.HAS_FIELD, true], [hearing.DATE_FIELD, ymd(3)], [hearing.MERIT_FIELD, true]]);
  assert.equal(done.eligible, false);
  assert.deepEqual({ kind: done.hearing.kind, advisor: done.hearing.advisor, tooClose: done.hearing.tooClose }, { kind: 'tercera', advisor: true, tooClose: true });
  assert.match(done.message, /al menos 7 días/);
  assert.equal(done.guidance.status, 'review');
  const { closingAction, closingLines, closingVariant } = require('../components/contygo/juvenil/closingSpeech.ts');
  // Tiene audiencia: no «Cuando tengas tu audiencia…» (eso es para quien aún no la tiene).
  assert.equal(closingVariant(hearing.HEARING_SERVICE, null, null, done.hearing), 'audiencia-pronto');
  assert.equal(closingAction(hearing.HEARING_SERVICE, 'audiencia-pronto'), 'Hablar con Henry');
  assert.match(closingLines(hearing.HEARING_SERVICE, 'audiencia-pronto').join(' '), /^Tu audiencia es en pocos días/);
  assert.equal(closingVariant(hearing.HEARING_SERVICE, null, null, { kind: 'segunda', advisor: true }), 'audiencia-revisar', 'otro reparo de contygo');
  assert.equal(closingVariant(hearing.HEARING_SERVICE, null, null, { kind: 'none', advisor: true }), 'audiencia-henry');
});

test('el contrato: solo el paquete de su audiencia; otro se rechaza antes de enviar el código', async () => {
  withHearingService();
  process.env.LANDING_TOKEN_SECRET ||= 'secreto-de-prueba-de-la-landing-000000000000';
  const flow = require('../lib/contygo-api/flow.ts');
  const form = planId => ({
    firstName: 'Ana', lastName: 'Pérez', email: 'ana.perez@gmail.com', phone: '+13055550199',
    address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es', servicePlanId: planId, parties: [],
    consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() },
  });
  const answers = { [H.date]: ymd(40), [H.choice]: 'segunda-audiencia' };
  const ref = 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b';
  const wrong = await flow.startContract({ localServiceId: hearing.HEARING_SERVICE, externalRef: ref, form: form(H.p3), answers }, crypto.randomUUID());
  assert.equal(wrong.step, 'INVALID');
  assert.match(wrong.errors.servicePlanId, /no corresponde/);
  assert.equal(net.calls.some(call => call.path === '/contracts'), false, 'no se envía el código con un paquete que contygo rechazaría');
  const right = await flow.startContract({ localServiceId: hearing.HEARING_SERVICE, externalRef: ref, form: form(H.p2), answers }, crypto.randomUUID());
  assert.equal(right.step, 'ASK_CODE');
  const body = net.calls.find(call => call.path === '/contracts').json;
  assert.equal(body.servicePlanId, H.p2);
  assert.deepEqual(body.eligibilityAnswers, [{ questionId: H.date, answer: ymd(40) }, { questionId: H.choice, answer: 'segunda-audiencia' }]);
});

test('un 422 PLAN_NOT_ALLOWED de contygo vuelve al paso del paquete', () => {
  const { mapContractResponse } = require('../lib/contygo-api/checkout.ts');
  const outcome = mapContractResponse({ status: 422, error: { code: 'PLAN_NOT_ALLOWED', details: { questionIds: [H.choice], allowedPlanIds: [H.p2] } } });
  assert.equal(outcome.step, 'INVALID');
  assert.ok(outcome.errors.servicePlanId);
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
