// Permiso de Trabajo (I-765) (26-10-2026): el servicio de contygo que faltaba en la landing. GET /catalog no tiene
// preguntas de elegibilidad para él: el asistente hace las del guion (lib/agent/service-scripts.ts) y después las dudas.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const { CONTYGO_SERVICES } = require('../lib/contygo-catalog.ts');
const { getServiceGuideUrl } = require('../lib/contygo.ts');
const { serviceKnowledge } = require('../lib/agent/service-knowledge.ts');

// El proveedor de IA se sustituye: estas pruebas no llaman a Gemini.
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async () => { throw new Error('offline'); } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' ? server : load.call(this, request, ...args); };
delete require.cache[require.resolve('../app/api/agent/service-intake/route.ts')];
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
Module._load = load;

// Como en contygo (copia del 29-09-2026, con el precio de octubre): un paquete, sin preguntas ni personas adicionales.
const permit = {
  id: 'a14de82b-0000-4000-8000-000000000001', slug: 'permiso-de-trabajo', name: { es: 'Permiso de Trabajo (I-765)', en: 'Work Permit (I-765)' },
  plans: [{ id: 'b820fb0c-0000-4000-8000-0000000000a1', name: { es: 'Estándar', en: 'Standard' }, priceCents: 12000, extraPartyPriceCents: 0, installmentOptions: [] }],
  eligibilityQuestions: [], partyRoles: [],
};

let b, net;
const say = async body => (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'permiso-de-trabajo', ...body }))).json();
test.beforeEach(() => {
  freshModules(); net = mockFetch(); contygoDefaults(net);
  net.on('GET', '/catalog', { status: 200, body: { services: [...catalog.services, permit] } });
  b = browser(); b.newIp();
});

test('es un servicio de asilo con su link propio y el paquete Estándar de contygo', () => {
  const service = CONTYGO_SERVICES.find(item => item.id === 'permiso-de-trabajo');
  assert.equal(service.slug, 'permiso-de-trabajo');
  assert.equal(service.category, 'asilo');
  assert.deepEqual(service.plans, [{ name: 'Estándar', price: 120 }]);
  assert.equal(getServiceGuideUrl('permiso-de-trabajo'), '/permiso-de-trabajo');
});

test('el asistente empieza por la solicitud de asilo; el camino rápido va directo a las dudas', async () => {
  const hello = await say({ answers: {} });
  assert.equal(hello.ok, true, 'nunca service_not_contractable');
  assert.equal(hello.field, 'permiso-de-trabajo.i589');
  assert.match(hello.message, /¿ya presentaste tu solicitud de asilo, el formulario I-589\?/);
  const quick = await say({ answers: {}, quick: true });
  assert.equal(quick.ok, true);
  assert.equal(quick.field ?? null, null, 'sin preguntas de contygo, el camino rápido no pregunta nada');
});

test('lo que sabe el bot: la cuenta de 150 días y la renovación, sin hablar de dinero', () => {
  const knowledge = serviceKnowledge('permiso-de-trabajo', []);
  assert.match(knowledge, /150 días/);
  assert.match(knowledge, /180 días/);
  assert.match(knowledge, /30 de octubre de 2025/);
  assert.doesNotMatch(knowledge, /\$|dólar|honorario|precio|cuota|\btasas?\b|cobra/i);
});
