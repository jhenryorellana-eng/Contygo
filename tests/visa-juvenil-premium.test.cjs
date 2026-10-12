const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const { CONTYGO_SERVICES, contractService, serviceVariants } = require('../lib/contygo-catalog.ts');
const { publicServiceView } = require('../lib/contygo-api/catalog.ts');
const { carryAnswers, missingQuestions } = require('../lib/contygo-api/variants.ts');
const serviceRoute = require('../app/api/contratar/servicio/route.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');

const post = async (route, b, url, body) => b.keep(await route.POST(b.request(url, body)));
const view = slug => publicServiceView(catalog.services.find(service => service.slug === slug));
test.beforeEach(() => { freshModules(); delete process.env.TURNSTILE_SECRET_KEY; });

test('Visa Juvenil Premium es una variante: se contrata, pero no tiene tarjeta, enlace ni entrada propia en el sitemap', () => {
  assert.equal(CONTYGO_SERVICES.some(service => service.id === 'visa-juvenil-premium'), false);
  assert.equal(contractService('visa-juvenil-premium').slug, 'visa-juvenil-premium');
  assert.deepEqual(serviceVariants('visa-juvenil').map(service => service.id), ['visa-juvenil', 'visa-juvenil-premium']);
  assert.deepEqual(serviceVariants('apelacion').map(service => service.id), ['apelacion'], 'los demás servicios van directos al contrato');
  assert.deepEqual(serviceVariants('visa-juvenil-premium'), []);
  for (const id of ['__proto__', 'constructor', 7, null]) assert.equal(contractService(id), null);
});

test('una respuesta del chat vale para la misma pregunta de la variante; lo que falta queda por preguntar en la ficha', () => {
  const answers = carryAnswers(view('visa-juvenil-premium').questions, view('visa-juvenil-basico').questions, { [ids.visaQ]: true, 'visa.state': 'TX' });
  assert.deepEqual(answers, { [ids.visaQ]: true, 'visa.state': 'TX', [ids.premiumQ]: true });
  assert.deepEqual(missingQuestions(view('visa-juvenil-premium').questions, answers).map(question => question.id), [ids.premiumBirth]);
  // Otra pregunta, o una respuesta que no encaja en la variante, nunca se traslada.
  const state = { id: 's1', kind: 'state', prompt: { es: '¿En qué estado vive el menor?', en: null }, options: [{ code: 'TX', label: 'Texas' }] };
  assert.deepEqual(carryAnswers([{ ...state, id: 's2', options: [{ code: 'FL', label: 'Florida' }] }], [state], { s1: 'TX' }), { s1: 'TX' });
  assert.deepEqual(carryAnswers([{ ...state, id: 's3', prompt: { es: '¿Dónde nació el menor?', en: null } }], [state], { s1: 'TX' }), { s1: 'TX' });
});

test('la ficha de Premium sale del catálogo de contygo: su paquete, sus personas y sus preguntas', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const answer = await (await post(serviceRoute, browser(), '/api/contratar/servicio', { serviceId: 'visa-juvenil-premium' })).json();
  assert.equal(answer.service.slug, 'visa-juvenil-premium');
  assert.deepEqual(answer.service.plans.map(plan => [plan.id, plan.priceCents]), [[ids.premiumPlan, 350000]]);
  assert.deepEqual(answer.service.questions.map(question => question.id), [ids.premiumQ, ids.premiumBirth]);
  assert.deepEqual(answer.service.partyRoles.map(role => role.roleKey), ['minor'], 'el titular no se pide como persona adicional');
});

test('el contrato de Premium se evalúa y se crea en contygo con el servicio y el paquete de Premium', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const body = {
    serviceId: 'visa-juvenil-premium', externalRef: 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b',
    form: {
      firstName: 'Ana', lastName: 'Pérez López', email: 'ana.perez@gmail.com', phone: '+13055550199',
      address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es', servicePlanId: ids.premiumPlan,
      parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2012-03-04' }],
      consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() },
    },
    answers: { 'visa.residence': true, [ids.visaQ]: true, [ids.premiumQ]: true, [ids.premiumBirth]: '2012-03-04' },
    attribution: { sourceUrl: 'https://landing.invalid/visa-juvenil' }, idempotencyKey: crypto.randomUUID(), captchaToken: 'token-ok',
  };
  const outcome = (await (await post(startRoute, browser(), '/api/contratar/iniciar', body)).json()).outcome;
  assert.equal(outcome.step, 'ASK_CODE');
  const evaluate = net.calls.find(call => call.path === '/eligibility/evaluate');
  assert.equal(evaluate.json.serviceId, ids.premium);
  assert.deepEqual(evaluate.json.answers.map(item => item.questionId), [ids.premiumQ, ids.premiumBirth], 'solo viajan las respuestas de las preguntas de Premium');
  const contract = net.calls.find(call => call.path === '/contracts');
  assert.equal(contract.json.serviceId, ids.premium);
  assert.equal(contract.json.servicePlanId, ids.premiumPlan);
  // Sin la pregunta que el chat no hizo, no se llama a contygo para crear nada.
  const before = net.calls.filter(call => call.path === '/contracts').length;
  const missing = (await (await post(startRoute, browser(), '/api/contratar/iniciar', { ...body, answers: { [ids.premiumQ]: true }, idempotencyKey: crypto.randomUUID() })).json()).outcome;
  assert.equal(missing.step, 'NEEDS_ANSWERS');
  assert.equal(net.calls.filter(call => call.path === '/contracts').length, before);
});
