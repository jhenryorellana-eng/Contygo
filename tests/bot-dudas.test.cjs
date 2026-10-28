// El bot responde dudas (21-10-2026): en cualquier momento de la entrevista (y vuelve a su pregunta) y al final,
// en «¿Te queda alguna duda?». Solo con lo que sabe del servicio; si no, lo dice y ofrece WhatsApp.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { ids, catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const { serviceKnowledge } = require('../lib/agent/service-knowledge.ts');
const { CONTRACT_SERVICES } = require('../lib/contygo-catalog.ts');
const { readDoubt, cleanReply, DOUBT_RULES, COST_REPLY } = require('../lib/agent/doubts.ts');

// El modelo se sustituye: cada prueba dice qué responde y se guarda lo que recibió.
let modelReply = null, modelCalls = [];
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async request => { modelCalls.push(request); if (modelReply instanceof Error) throw modelReply; return { text: JSON.stringify(Array.isArray(modelReply) ? modelReply.shift() : modelReply) }; } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' || request.endsWith('/agent/server') || request === './server' ? server : load.call(this, request, ...args); };
for (const path of ['../lib/agent/doubts.ts', '../app/api/agent/service-intake/route.ts', '../app/api/agent/service-doubt/route.ts']) delete require.cache[require.resolve(path)];
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
const doubtRoute = require('../app/api/agent/service-doubt/route.ts');
Module._load = load;

let b, net;
test.beforeEach(() => { freshModules(); net = mockFetch(); contygoDefaults(net); b = browser(); b.newIp(); modelReply = null; modelCalls = []; });

test('lo que sabe el bot: la ficha, los nombres de los paquetes y los hechos comprobados; nada de la persona ni de dinero', () => {
  const apelacion = serviceKnowledge('apelacion', catalog.services);
  assert.match(apelacion, /SERVICIO: Apelación/);
  assert.match(apelacion, /Paquetes en ContyGo: Sin abogado\./, 'el nombre del paquete vivo de contygo, sin su precio');
  assert.match(apelacion, /30 días siguientes a la decisión del juez/);
  assert.match(apelacion, /No es un bufete de abogados/);
  const visa = serviceKnowledge('visa-juvenil', catalog.services);
  assert.match(visa, /SERVICIO: Visa Juvenil Premium/);
  assert.doesNotMatch(serviceKnowledge('itin', []), /Paquetes en ContyGo/, 'sin catálogo, sin paquetes');
  const itin = serviceKnowledge('itin', [], [{ question: '¿Cuánto tarda?', answer: 'Unas semanas.' }]);
  assert.match(itin, /RESPUESTAS APROBADAS POR EL EQUIPO:\nP: ¿Qué es el ITIN\?\nR: Es tu número de identificación fiscal/, 'primero las dudas habituales del guion');
  assert.match(itin, /\nP: ¿Cuánto tarda\?\nR: Unas semanas\.$/, 'después, las que apruebe el equipo');
});

// 25-10-2026: «el precio y demás está en el vídeo 2»: el bot no habla de dinero, solo del proceso y las preguntas frecuentes.
test('el bot no sabe ni dice nada de dinero: el precio y las formas de pago están en el vídeo que sigue a la llamada', () => {
  for (const { id } of CONTRACT_SERVICES) {
    const knowledge = serviceKnowledge(id, catalog.services);
    assert.doesNotMatch(knowledge, /\$|dólar|honorario|precio|cuota|\btasas?\b|\bpagos?\b|cobra/i, `${id}: sin dinero en lo que sabe`);
  }
  assert.ok(DOUBT_RULES.includes(`reply es exactamente «${COST_REPLY}»`), 'una duda de costos tiene su respuesta fija');
  assert.match(COST_REPLY, /vídeo que viene después de esta llamada/);
});

test('la respuesta del modelo se limpia y se acota', () => {
  assert.deepEqual(readDoubt({ heard: ' ¿Son abogados? ', reply: '**No.** Somos una plataforma.', covered: true }), { heard: '¿Son abogados?', reply: 'No. Somos una plataforma.', covered: true });
  assert.equal(readDoubt({ reply: '   ' }), null);
  assert.equal(readDoubt({ reply: 'Hola', covered: 'sí' }).covered, false, 'covered solo si lo dice de verdad');
  assert.equal(cleanReply('x'.repeat(900)).length, 600);
  assert.match(DOUBT_RULES, /No des asesoría legal/);
});

const intake = async body => (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'apelacion', answers: {}, ...body }))).json();

test('en la entrevista: una duda en vez de una respuesta tiene su respuesta y vuelve la misma pregunta', async () => {
  modelReply = { intent: 'question', value: '', clear: false, heard: '¿Cuánto cuesta?', reply: 'La apelación cuesta $700 de honorarios, en un solo pago.', covered: true };
  const turn = await intake({ field: ids.apelQ, answer: '¿cuánto cuesta?' });
  assert.equal(turn.field, ids.apelQ, 'la pregunta sigue en curso');
  assert.deepEqual(turn.answers, {}, 'ninguna respuesta cambia');
  assert.equal(turn.complete, false);
  assert.match(turn.message, /^La apelación cuesta \$700 de honorarios, en un solo pago\. Volviendo a tu caso: ¿Cuál es la fecha de la decisión del juez\?/);
  assert.deepEqual(turn.doubt, { heard: '¿Cuánto cuesta?', reply: 'La apelación cuesta $700 de honorarios, en un solo pago.', covered: true });
  const prompt = modelCalls[0].config.systemInstruction;
  assert.match(prompt, /CONOCIMIENTO:\nSERVICIO: Apelación/, 'el modelo recibe lo que sabe del servicio');
  assert.match(prompt, /No hables de dinero/, 'y la regla de no hablar de costos');
});

test('en la entrevista: una pregunta escrita que el modelo tomó por respuesta confusa se responde igual', async () => {
  modelReply = [{ intent: 'answer', value: '', clear: false }, { heard: '¿Y si no puedo pagar la tasa?', reply: 'Existe una solicitud de exención, el formulario EOIR-26A.', covered: true }];
  const turn = await intake({ field: ids.apelQ, answer: '¿Y si no puedo pagar la tasa?' });
  assert.equal(turn.field, ids.apelQ);
  assert.match(turn.message, /^Existe una solicitud de exención, el formulario EOIR-26A\. Volviendo a tu caso: ¿Cuál es la fecha de la decisión del juez\?/);
  assert.equal(modelCalls.length, 2, 'una segunda llamada, solo para la duda');
  assert.match(modelCalls[1].config.systemInstruction, /CONOCIMIENTO:\nSERVICIO: Apelación/);
  modelReply = { intent: 'answer', value: '', clear: false };
  const plain = await intake({ field: ids.apelQ, answer: 'no me acuerdo bien' });
  assert.match(plain.message, /^Perdona, no te entendí bien/, 'sin signos de pregunta, se vuelve a preguntar');
  assert.equal(modelCalls.length, 3);
});

test('en la entrevista: una respuesta sigue siendo una respuesta', async () => {
  modelReply = { intent: 'answer', value: '2026-10-10', clear: true };
  const turn = await intake({ field: ids.apelQ, answer: 'fue el diez de octubre' });
  assert.equal(turn.answers[ids.apelQ], '2026-10-10');
  assert.equal(turn.doubt, undefined);
});

const ask = async body => (await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', ...body }))).json();

test('«¿Te queda alguna duda?»: responde con lo que sabe y avisa cuando no lo sabe', async () => {
  modelReply = { heard: '¿Son abogados?', reply: 'No, ContyGo no es un bufete de abogados.', covered: true };
  assert.deepEqual(await ask({ question: '¿Son abogados?' }), { ok: true, heard: '¿Son abogados?', reply: 'No, ContyGo no es un bufete de abogados.', covered: true });
  assert.match(modelCalls[0].config.systemInstruction, /CONOCIMIENTO:\nSERVICIO: Apelación/);
  modelReply = { heard: '¿Cuánto tarda la BIA?', reply: 'No tengo ese dato exacto. Un asesor te lo confirma por WhatsApp.', covered: false };
  assert.equal((await ask({ question: '¿Cuánto tarda la BIA?' })).covered, false);
  modelReply = new Error('offline');
  assert.deepEqual(await ask({ question: '¿Y si pierdo?' }), { ok: true, heard: '¿Y si pierdo?', reply: 'No tengo ese dato exacto. Un asesor te lo confirma por WhatsApp.', covered: false }, 'sin modelo, la salida honesta');
});

test('la ruta de dudas: mismo origen, servicio válido y una duda de verdad', async () => {
  const foreign = await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: 'hola' }, { headers: { origin: 'https://evil.example' } }));
  assert.equal(foreign.status, 403);
  assert.equal((await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'nada', question: 'hola' }))).status, 400);
  assert.equal((await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: '   ' }))).status, 400);
  assert.equal((await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: 'x'.repeat(601) }))).status, 400);
  assert.equal((await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', audio: { data: '!!', mimeType: 'audio/webm' } }))).status, 400);
  assert.equal(modelCalls.length, 0, 'nada de eso llega al modelo');
});
