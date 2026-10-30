// Lotería de Visas DV-2027 (26-10-2026): el primer producto gratis para la comunidad (docs/loteria-dv-2027.md).
// Sus preguntas son propias (lib/agent/lottery-intake.ts): funciona sin el servicio en el catálogo de contygo.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const lottery = require('../lib/agent/lottery-intake.ts');
const { closingAction, closingLines, closingScript, closingVariant } = require('../components/contygo/juvenil/closingSpeech.ts');
const { CONTYGO_SERVICES } = require('../lib/contygo-catalog.ts');
const { serviceKnowledge } = require('../lib/agent/service-knowledge.ts');

// El proveedor de IA se sustituye y anota lo que recibe.
let modelCalls = [], modelReply = null;
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async request => { modelCalls.push(request); if (!modelReply) throw new Error('offline'); return { text: JSON.stringify(modelReply) }; } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' || request === './server' ? server : load.call(this, request, ...args); };
for (const path of ['../lib/agent/doubts.ts', '../app/api/agent/service-intake/route.ts', '../app/api/agent/service-doubt/route.ts']) delete require.cache[require.resolve(path)];
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
const doubtRoute = require('../app/api/agent/service-doubt/route.ts');
Module._load = load;

let b, net;
const say = async body => (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'loteria-dv-2027', ...body }))).json();
test.beforeEach(() => { freshModules(); net = mockFetch(); contygoDefaults(net); b = browser(); b.newIp(); modelCalls = []; modelReply = null; });

test('es un servicio público y gratis, con su link y su guía; no cuenta entre los de precio publicado', () => {
  const service = CONTYGO_SERVICES.find(item => item.id === lottery.LOTTERY_SERVICE);
  assert.equal(service.slug, 'loteria-visas-dv-2027', 'el slug con el que se contratará en contygo');
  assert.equal(service.legacySlug, 'loteria-de-visas');
  assert.equal(service.free, true);
  assert.deepEqual(service.plans, []);
});

test('el asistente pregunta por su cuenta, aunque el catálogo de contygo no tenga el servicio', async () => {
  const hello = await say({ answers: {} });
  assert.equal(hello.ok, true);
  assert.equal(hello.field, lottery.COUNTRY_FIELD);
  assert.match(hello.message, /¿en qué país naciste\?/);
  assert.ok(hello.scripts.some(line => line.includes('pasaporte vigente')), 'sus frases se precalientan durante el vídeo');
});

test('si la API de contygo está caída, la lotería sigue funcionando (los demás servicios esperan)', async () => {
  net.on('GET', '/catalog', { status: 503, body: { error: 'unavailable' } });
  const hello = await say({ answers: {} });
  assert.equal(hello.ok, true);
  assert.equal(hello.field, lottery.COUNTRY_FIELD);
  const other = await (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'apelacion', answers: {} }))).json();
  assert.equal(other.error, 'catalog_unavailable');
});

test('Perú: puede participar; con cónyuge y dos hijos, cuatro fotos, y la lista para prepararlas', async () => {
  const answers = { [lottery.COUNTRY_FIELD]: 'pe', [lottery.STUDIES_FIELD]: 'secundaria', [lottery.PASSPORT_FIELD]: true, [lottery.MARITAL_FIELD]: 'casado' };
  const ask = await say({ answers });
  assert.equal(ask.field, lottery.CHILDREN_FIELD);
  const done = await say({ answers, field: lottery.CHILDREN_FIELD, answer: '2' });
  assert.equal(done.complete, true);
  assert.equal(done.eligible, null, 'nunca un «no» de contygo: el cierre no se va al asesor');
  assert.equal(done.lottery.status, 'yes');
  assert.equal(done.lottery.people, 4);
  assert.match(done.message, /^¡Puedes participar en la Lotería de Visas 2027! Prepara 4 fotos recientes, una por persona \(tú, tu cónyuge y tus hijos\)/);
  assert.equal(done.guidance.status, 'potential');
  assert.match(done.guidance.detail, /600 por 600 píxeles/);
  assert.match(done.guidance.detail, /Incluir a todos es obligatorio/);
  assert.ok(done.guidance.sources.some(source => source.url === lottery.DV_OFFICIAL_URL));
  assert.equal(net.calls.some(call => call.path === '/eligibility/evaluate'), false, 'nada se evalúa en contygo');
});

test('México: sin cónyuge de un país que participa, termina ahí y pide revisar la lista oficial', async () => {
  const country = await say({ answers: { [lottery.COUNTRY_FIELD]: 'mx' } });
  assert.equal(country.field, lottery.SPOUSE_FIELD);
  const done = await say({ answers: { [lottery.COUNTRY_FIELD]: 'mx' }, field: lottery.SPOUSE_FIELD, answer: false });
  assert.equal(done.complete, true);
  assert.equal(done.lottery.status, 'no-country');
  assert.match(done.message, /Revisa la lista oficial de este año/);
  assert.equal(done.guidance.status, 'review');
});

test('México con cónyuge de un país que participa: sigue, sin volver a preguntar el estado civil', async () => {
  const answers = { [lottery.COUNTRY_FIELD]: 'mx', [lottery.SPOUSE_FIELD]: true, [lottery.STUDIES_FIELD]: 'oficio', [lottery.PASSPORT_FIELD]: false };
  const next = await say({ answers });
  assert.equal(next.field, lottery.CHILDREN_FIELD, 'casado por el país del cónyuge');
  const done = await say({ answers, field: lottery.CHILDREN_FIELD, answer: '0' });
  assert.equal(done.lottery.viaSpouse, true);
  assert.equal(done.lottery.people, 2);
  assert.match(done.message, /Antes de inscribirte, saca tu pasaporte/);
  assert.match(done.guidance.detail, /país de nacimiento de tu cónyuge/);
});

test('sin secundaria ni oficio no puede participar: lo dice con claridad y no pregunta más', async () => {
  const done = await say({ answers: { [lottery.COUNTRY_FIELD]: 'pe' }, field: lottery.STUDIES_FIELD, answer: 'ninguna' });
  assert.equal(done.complete, true);
  assert.equal(done.lottery.status, 'no-studies');
  assert.match(done.message, /se necesita la secundaria completa/);
});

test('lo que sabe el bot no habla de contrato ni de dinero; una duda de costos tiene su respuesta propia', async () => {
  const knowledge = serviceKnowledge(lottery.LOTTERY_SERVICE, []);
  assert.doesNotMatch(knowledge, /Revisar mi contrato|contrato pide/);
  assert.doesNotMatch(knowledge, /\$|dólar|honorario|precio|cuota|\btasas?\b|\bpagos?\b|cobra/i);
  assert.match(knowledge, /dvprogram\.state\.gov/);
  modelReply = { heard: '¿Cuánto cuesta?', reply: lottery.LOTTERY_COST_REPLY, covered: true };
  const response = await (await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'loteria-dv-2027', question: '¿Cuánto cuesta?' }))).json();
  assert.equal(response.reply, lottery.LOTTERY_COST_REPLY);
  assert.ok(modelCalls[0].config.systemInstruction.includes(`reply es exactamente «${lottery.LOTTERY_COST_REPLY}»`), 'la regla de costos de la lotería, no la del contrato');
});

test('fuera del sitio: oculta del catálogo visible, y sus links van a la portada sin redirección permanente', async () => {
  const { VISIBLE_SERVICES } = require('../lib/contygo-catalog.ts');
  assert.ok(!VISIBLE_SERVICES.some(item => item.id === lottery.LOTTERY_SERVICE));
  assert.equal(VISIBLE_SERVICES.length, 14);
  const { default: config } = await import(require('node:url').pathToFileURL(require('node:path').join(__dirname, '..', 'next.config.mjs')).href);
  const redirects = await config.redirects();
  for (const source of ['/loteria-de-visas', '/guia-loteria-de-visas']) {
    const rule = redirects.find(item => item.source === source);
    assert.equal(rule.destination, '/');
    assert.equal(rule.permanent, false, 'temporal: un navegador no debe recordarla si el servicio vuelve');
  }
});

// 29-10-2026: el Noveno Circuito suspendió la orden; nada puede prometer la apertura ni una fecha.
test('con la inscripción en pausa, el cierre y el catálogo no prometen apertura ni fechas', () => {
  const closing = closingLines('loteria-dv-2027').join(' ');
  assert.match(closing, /en pausa/);
  assert.doesNotMatch(closing, /puede empezar hoy/);
  const service = CONTYGO_SERVICES.find(item => item.id === lottery.LOTTERY_SERVICE);
  assert.match(service.season.dates, /en pausa/);
  assert.doesNotMatch(`${service.season.dates} ${service.season.headline}`, /noviembre|diciembre/);
});

test('el cierre abre los dos caminos: «Elegir cómo inscribirme», gratis o con ContyGo', () => {
  assert.equal(closingVariant('loteria-dv-2027', null, null, null, null), null);
  assert.equal(closingAction('loteria-dv-2027'), 'Elegir cómo inscribirme');
  assert.match(closingLines('loteria-dv-2027').join(' '), /hazla tú mismo, gratis, o deja que ContyGo la haga por ti/);
  const script = closingScript('Ana', 'loteria-dv-2027');
  assert.equal(script.match(/Toca /g).length, 1);
  assert.doesNotMatch(script, /contrato/);
});
