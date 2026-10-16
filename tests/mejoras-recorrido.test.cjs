// Mejoras del recorrido (15-10-2026):
// 1. Cerrar la guía sin querer no borra lo hecho: la pestaña la retoma (readJourney / saveJourney).
// 2. Visa Juvenil Básico ↔ Premium conserva lo escrito en la ficha (ContractCheckout; se prueba en el navegador).
// 3. Sin el veredicto del chat (contygo no respondió), la ficha lo pide antes de que la persona escriba sus datos
//    (/api/contratar/servicio con `answers`), y un «no» al contratar queda anotado en el lead para ventas.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const browserState = require('../lib/contygo-api/browser.ts');
const serviceRoute = require('../app/api/contratar/servicio/route.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');

function fakeWindow() {
  const session = new Map();
  global.window = { sessionStorage: { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, String(value)), removeItem: key => session.delete(key) } };
  return session;
}

test('la guía se guarda en la pestaña y solo se retoma en su servicio, el mismo día', t => {
  const session = fakeWindow();
  t.after(() => { delete global.window; });
  const conversation = { watched: true, answers: { a: true }, messages: [{ id: 1, role: 'agent', text: 'Hola' }], complete: true, field: null, externalRef: 'web-0000000000000000' };
  browserState.saveJourney({ serviceId: 'apelacion', stage: 'platform', session: conversation });
  const saved = browserState.readJourney('apelacion');
  assert.equal(saved.stage, 'platform');
  assert.deepEqual(saved.session, conversation);
  assert.equal(browserState.readJourney('visa-juvenil'), null, 'otro servicio empieza de cero');
  // De ayer: no se retoma (las fechas y la evaluación pueden haber cambiado).
  session.set('contygo-recorrido', JSON.stringify({ ...JSON.parse(session.get('contygo-recorrido')), savedAt: Date.now() - 25 * 3_600_000 }));
  assert.equal(browserState.readJourney('apelacion'), null);
  browserState.saveJourney({ serviceId: 'apelacion', stage: 'service', session: conversation });
  browserState.clearJourney();
  assert.equal(browserState.readJourney('apelacion'), null, '«Empezar de nuevo» la borra');
  assert.equal([...session.keys()].some(key => /local/i.test(key)), false);
});

let b, net;
test.beforeEach(() => { freshModules(); delete process.env.TURNSTILE_SECRET_KEY; net = mockFetch(); contygoDefaults(net); b = browser(); b.newIp(); });
const service = async body => (await serviceRoute.POST(b.request('/api/contratar/servicio', body))).json();

test('la ficha pide el veredicto que el chat no tuvo: un «no» antes de escribir los datos', async () => {
  const no = await service({ serviceId: 'visa-juvenil', answers: { [ids.visaQ]: false } });
  assert.deepEqual(no.eligibility, { eligible: false, reasons: [] });
  const yes = await service({ serviceId: 'visa-juvenil', answers: { [ids.visaQ]: true } });
  assert.equal(yes.eligibility.eligible, true);
  assert.deepEqual(net.calls.filter(call => call.path === '/eligibility/evaluate').map(call => call.json.answers), [[{ questionId: ids.visaQ, value: false }], [{ questionId: ids.visaQ, value: true }]]);
});

test('sin todas las respuestas, o con contygo caído, no hay veredicto (lo repite «Enviar mi código»)', async () => {
  const missing = await service({ serviceId: 'visa-juvenil', answers: {} });
  assert.equal(missing.eligibility, null);
  assert.equal(net.calls.some(call => call.path === '/eligibility/evaluate'), false, 'no se pregunta a contygo con respuestas incompletas');
  net.on('POST', '/eligibility/evaluate', { status: 503, body: { error: { code: 'UNAVAILABLE' } } });
  const down = await service({ serviceId: 'visa-juvenil', answers: { [ids.visaQ]: true } });
  assert.equal(down.ok, true, 'la ficha carga igual');
  assert.equal(down.eligibility, null);
  const plain = await service({ serviceId: 'visa-juvenil' });
  assert.equal('eligibility' in plain, false, 'sin `answers`, como siempre');
});

test('el veredicto trae los motivos y los paquetes permitidos', async () => {
  net.on('POST', '/eligibility/evaluate', { status: 200, body: { eligible: false, missingQuestionIds: [], disqualifiedQuestionIds: [ids.apelQ], disqualified: [{ questionId: ids.apelQ, reason: 'deadline_passed' }], notices: [], anchorYmd: null, allowedPlanIds: [ids.apelPlan, 7] } });
  const late = await service({ serviceId: 'apelacion', answers: { [ids.apelQ]: '2026-01-02' } });
  assert.deepEqual(late.eligibility, { eligible: false, reasons: ['deadline_passed'], allowedPlanIds: [ids.apelPlan] });
});

test('un «no» de contygo al contratar queda en el lead: ventas sabe que lo intentó', async () => {
  const form = { firstName: 'Ana', lastName: 'Pérez', email: 'ana.perez@gmail.com', phone: '+13055550199', address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' },
    locale: 'es', servicePlanId: ids.visaPlan, parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2014-04-03' }], consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() } };
  const response = await startRoute.POST(b.request('/api/contratar/iniciar', { serviceId: 'visa-juvenil', externalRef: 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b', form, answers: { [ids.visaQ]: false }, idempotencyKey: crypto.randomUUID(), captchaToken: 'token-ok' }));
  assert.deepEqual((await response.json()).outcome, { step: 'NOT_ELIGIBLE' });
  const lead = net.calls.find(call => call.method === 'PUT' && call.path.startsWith('/leads/'));
  assert.ok(lead, 'se anota en el lead');
  assert.equal(lead.path, '/leads/web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b');
  assert.match(lead.json.aiSummary, /Intentó contratar en línea y necesita ayuda \(NOT_ELIGIBLE\)/);
  assert.equal(net.calls.some(call => call.path === '/contracts'), false, 'no se envía ningún código');
  assert.equal(catalog.services.length > 0, true);
});
