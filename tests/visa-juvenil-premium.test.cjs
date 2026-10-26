// Visa Juvenil es solo Premium (26-10-2026): contygo ocultó Básico el 25-10-2026 y GET /catalog ya no lo lista,
// así que el asistente y la ficha de /visa-juvenil se emparejan con visa-juvenil-premium. Sin selector Básico / Premium.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { ids, mockFetch, contygoDefaults, browser, freshModules, visaInterview } = require('./helpers/contygo-harness.cjs');
const { CONTYGO_SERVICES, contractService, serviceVariants } = require('../lib/contygo-catalog.ts');
const { carryAnswers } = require('../lib/contygo-api/variants.ts');
const serviceRoute = require('../app/api/contratar/servicio/route.ts');

// El proveedor de IA se sustituye: estas pruebas no llaman a Gemini.
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async () => { throw new Error('offline'); } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' ? server : load.call(this, request, ...args); };
delete require.cache[require.resolve('../app/api/agent/service-intake/route.ts')];
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
Module._load = load;

const post = async (route, b, url, body) => b.keep(await route.POST(b.request(url, body)));
test.beforeEach(() => { freshModules(); delete process.env.TURNSTILE_SECRET_KEY; });

test('Visa Juvenil se contrata como Premium ($3,500), sin variantes ni selector', () => {
  const visa = CONTYGO_SERVICES.find(service => service.id === 'visa-juvenil');
  assert.equal(visa.slug, 'visa-juvenil-premium');
  assert.equal(visa.legacySlug, 'visa-juvenil', 'la URL de la landing no cambia');
  assert.equal(visa.name, 'Visa Juvenil Premium');
  assert.deepEqual(visa.plans, [{ name: 'Premium', price: 3500 }]);
  assert.equal(CONTYGO_SERVICES.some(service => service.slug === 'visa-juvenil-basico'), false, 'Básico ya no existe');
  assert.deepEqual(serviceVariants('visa-juvenil').map(service => service.id), ['visa-juvenil'], 'directo al contrato');
  assert.equal(contractService('visa-juvenil-premium'), null);
  for (const id of ['__proto__', 'constructor', 7, null]) assert.equal(contractService(id), null);
});

test('el asistente de Visa Juvenil funciona con el catálogo de contygo, que solo lista Premium', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const b = browser(); b.newIp();
  const hello = await (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'visa-juvenil', answers: {} }))).json();
  assert.equal(hello.ok, true, 'nunca service_not_contractable');
  const done = await (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'visa-juvenil', answers: visaInterview, field: ids.visaQ, answer: true }))).json();
  assert.equal(done.complete, true);
  assert.equal(net.calls.find(call => call.path === '/eligibility/evaluate').json.serviceId, ids.visa);
});

test('la ficha de Visa Juvenil sale de Premium en contygo: su paquete y sus preguntas', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const answer = await (await post(serviceRoute, browser(), '/api/contratar/servicio', { serviceId: 'visa-juvenil' })).json();
  assert.equal(answer.service.slug, 'visa-juvenil-premium');
  assert.deepEqual(answer.service.plans.map(plan => [plan.id, plan.priceCents]), [[ids.visaPlan, 350000]]);
  assert.deepEqual(answer.service.questions.map(question => question.id), [ids.visaQ]);
  const gone = await (await post(serviceRoute, browser(), '/api/contratar/servicio', { serviceId: 'visa-juvenil-premium' })).json();
  assert.equal(gone.ok, false, 'Premium no es un servicio aparte de la landing');
});

test('una respuesta solo se traslada a la misma pregunta con una opción que le sirve', () => {
  const state = { id: 's1', kind: 'state', prompt: { es: '¿En qué estado vive el menor?', en: null }, options: [{ code: 'TX', label: 'Texas' }] };
  assert.deepEqual(carryAnswers([{ ...state, id: 's2' }], [state], { s1: 'TX' }), { s1: 'TX', s2: 'TX' });
  assert.deepEqual(carryAnswers([{ ...state, id: 's2', options: [{ code: 'FL', label: 'Florida' }] }], [state], { s1: 'TX' }), { s1: 'TX' });
  assert.deepEqual(carryAnswers([{ ...state, id: 's3', prompt: { es: '¿Dónde nació el menor?', en: null } }], [state], { s1: 'TX' }), { s1: 'TX' });
});
