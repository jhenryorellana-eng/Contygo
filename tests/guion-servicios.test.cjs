// El guion de cada servicio (21-10-2026): además de las preguntas de contygo, las que el equipo necesita para entender
// el caso, y las dudas habituales con su respuesta comprobada. Una conversación con varias preguntas, no una sola.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { ids, mockFetch, contygoDefaults, browser, freshModules, scriptDone } = require('./helpers/contygo-harness.cjs');
const { CONTYGO_SERVICES } = require('../lib/contygo-catalog.ts');
const scripts = require('../lib/agent/service-scripts.ts');
const { serviceKnowledge } = require('../lib/agent/service-knowledge.ts');
const { normalizeIntakeAnswer } = require('../lib/agent/service-intake.ts');

let provider = async () => { throw new Error('offline'); }, calls = [];
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async args => { calls.push(args); return provider(args); } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' ? server : load.call(this, request, ...args); };
delete require.cache[require.resolve('../app/api/agent/service-intake/route.ts')];
const { POST } = require('../app/api/agent/service-intake/route.ts');
Module._load = load;

let b, net;
const say = async body => (await POST(b.request('/api/agent/service-intake', body))).json();
const ymd = days => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
test.beforeEach(() => { freshModules(); net = mockFetch(); contygoDefaults(net); b = browser(); b.newIp(); calls = []; provider = async () => { throw new Error('offline'); }; });

test('cada servicio tiene su guion: preguntas bien formadas, dudas habituales y de qué hablar al final', () => {
  const local = /^(visa|asilo|audiencia)\.|^ajuste\./;
  for (const service of CONTYGO_SERVICES) {
    const script = scripts.serviceScript(service.id);
    assert.ok(script, `${service.id} tiene guion`);
    assert.ok(script.doubts.length >= 5, `${service.id}: al menos cinco dudas habituales`);
    assert.ok(script.topics.length >= 1 && scripts.doubtTopics(service.id).length <= 3, `${service.id}: los temas que ofrece al final`);
    const seen = new Set();
    for (const question of script.questions) {
      assert.ok(question.id.startsWith(`${service.id}.`), `${question.id} lleva el nombre de su servicio`);
      assert.equal(local.test(question.id) && !question.id.startsWith(`${service.id}.`), false, `${question.id} no choca con las entrevistas propias`);
      assert.equal(seen.has(question.id), false, `${question.id} no se repite`); seen.add(question.id);
      assert.ok(['yesno', 'choice', 'text', 'date'].includes(question.kind), question.id);
      assert.ok(['start', 'end'].includes(question.position), question.id);
      assert.match(question.text, /\?/, `${question.id} es una pregunta`);
      if (question.kind === 'choice') assert.ok(question.options.length >= 2, `${question.id} tiene opciones`);
    }
    for (const doubt of script.doubts) {
      assert.match(doubt.question, /\?$/, doubt.question);
      assert.doesNotMatch(doubt.answer, /\$/, `${service.id}: los honorarios salen del catálogo vivo, no del guion («${doubt.question}»)`);
    }
  }
  assert.deepEqual(scripts.serviceScript('constructor'), null);
});

test('las respuestas del guion se comprueban de nuevo: una opción o una clave inventada no pasa', () => {
  const kept = scripts.sanitizeScriptAnswers('llc', { 'llc.florida': true, 'llc.socios': 'op9', 'llc.inventada': true, 'itin.personas': 'op1' }, normalizeIntakeAnswer);
  assert.deepEqual(kept, { 'llc.florida': true });
  assert.deepEqual(scripts.sanitizeScriptAnswers('llc', 'no', normalizeIntakeAnswer), {});
  assert.equal(scripts.isScriptKey('llc', 'llc.florida'), true);
  assert.equal(scripts.isScriptKey('itin', 'llc.florida'), false);
});

test('las dudas habituales forman parte de lo que sabe el bot', () => {
  const knowledge = serviceKnowledge('cambio-corte', []);
  assert.match(knowledge, /P: ¿Sigo yendo a la corte de antes\?\nR: Sí\. Hasta que el juez apruebe el cambio/);
});

test('ITIN: saluda, hace sus preguntas una tras otra y termina; nada del guion viaja a contygo', async () => {
  const opening = await say({ serviceId: 'itin', answers: {} });
  assert.match(opening.message, /^¡Hola! Soy tu asistente de ContyGo\. Te haré unas preguntas cortas sobre Número ITIN; si tienes dudas, pregúntame cuando quieras\. Para empezar, ¿para cuántas personas necesitas el ITIN\?$/);
  assert.equal(opening.total, 4);
  assert.deepEqual(opening.question.options.map(option => option.label), ['Una', 'Dos o más']);
  const ssn = await say({ serviceId: 'itin', answers: opening.answers, field: 'itin.personas', answer: 'Una' });
  assert.equal(ssn.field, 'itin.tiene_ssn');
  assert.equal(ssn.message, 'Gracias. ¿La persona que lo necesita ya tiene número de Seguro Social?');
  const identity = await say({ serviceId: 'itin', answers: ssn.answers, field: 'itin.tiene_ssn', answer: 'no' });
  const purpose = await say({ serviceId: 'itin', answers: identity.answers, field: 'itin.identidad', answer: true });
  const done = await say({ serviceId: 'itin', answers: purpose.answers, field: 'itin.con_declaracion', answer: 'sí' });
  assert.equal(done.complete, true);
  assert.deepEqual(done.answers, { 'itin.personas': 'op1', 'itin.tiene_ssn': false, 'itin.identidad': true, 'itin.con_declaracion': true });
  assert.deepEqual(done.doubtTopics, ['qué es el ITIN', 'cuánto tarda', 'si sirve para trabajar']);
  assert.equal(calls.length, 0, 'las respuestas claras no usan Gemini');
  for (const call of net.calls.filter(item => item.path === '/eligibility/evaluate')) assert.deepEqual(call.json.answers, [], 'el guion no sale hacia contygo');
});

test('Apelación: primero la fecha de contygo; dentro de plazo sigue el guion, fuera de plazo termina ahí', async () => {
  const opening = await say({ serviceId: 'apelacion', answers: {} });
  assert.equal(opening.field, ids.apelQ, 'la pregunta de contygo va primero');
  assert.equal(opening.total, 6);
  const next = await say({ serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: ymd(5) });
  assert.equal(next.complete, false);
  assert.equal(next.field, 'apelacion.forma_decision');
  assert.match(next.message, /¿El juez te dio la decisión en la audiencia, o te llegó por correo\?$/);
  const { 'apelacion.forma_decision': _pending, ...rest } = scriptDone('apelacion');
  const done = await say({ serviceId: 'apelacion', answers: { ...rest, ...next.answers }, field: 'apelacion.forma_decision', answer: 'Me llegó por correo' });
  assert.equal(done.complete, true);
  assert.equal(done.eligible, true);
  assert.equal(done.answers['apelacion.forma_decision'], 'op2');
  const sent = net.calls.filter(call => call.path === '/eligibility/evaluate').map(call => call.json.answers);
  assert.ok(sent.every(answers => answers.every(item => item.questionId === ids.apelQ)), 'a contygo solo va su pregunta');
  net.on('POST', '/eligibility/evaluate', { status: 200, body: { eligible: false, missingQuestionIds: [], disqualifiedQuestionIds: [ids.apelQ], disqualified: [{ questionId: ids.apelQ, reason: 'deadline_passed' }], notices: [], anchorYmd: null } });
  const late = await say({ serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: ymd(40) });
  assert.equal(late.complete, true, 'fuera de plazo no se hacen preguntas que ya no sirven');
  assert.equal(late.eligible, false);
  assert.match(late.message, /un asesor revisa tu caso contigo por WhatsApp/);
  assert.deepEqual(late.doubtTopics, ['cuánto tiempo tiene para apelar', 'qué le preparamos', 'qué documentos necesita']);
});

test('una respuesta con palabras propias (kind text) la resume Gemini; vacía o confusa se vuelve a preguntar', async () => {
  const answers = { 'cambio-corte.se_mudo': true };
  net.on('GET', '/catalog', { status: 200, body: { services: [{ id: 'c0000000-0000-4000-8000-000000000001', slug: 'cambio-de-corte', name: { es: 'Cambio de corte', en: null }, plans: [], eligibilityQuestions: [], partyRoles: [] }] } });
  provider = async () => ({ text: JSON.stringify({ intent: 'answer', clear: true, value: 'Orlando, Florida', ack: 'Perfecto, Orlando.' }) });
  const city = await say({ serviceId: 'cambio-corte', answers, field: 'cambio-corte.ciudad_estado', answer: 'pues ahora vivimos en Orlando, en Florida' });
  assert.equal(city.answers['cambio-corte.ciudad_estado'], 'Orlando, Florida');
  assert.equal(city.message, 'Perfecto, Orlando. ¿Tienes algún papel con tu nueva dirección, como un contrato de renta, un recibo o una carta de tu trabajo?');
  assert.equal(JSON.parse(calls[0].contents[0].parts[0].text).kind, 'text');
  provider = async () => ({ text: JSON.stringify({ intent: 'answer', clear: false, value: '' }) });
  const unclear = await say({ serviceId: 'cambio-corte', answers, field: 'cambio-corte.ciudad_estado', answer: 'mmm' });
  assert.equal(unclear.field, 'cambio-corte.ciudad_estado');
  assert.match(unclear.message, /^Perdona, no te entendí bien\. Cuéntamelo con tus palabras\./);
  provider = async () => { throw new Error('offline'); };
  const offline = await say({ serviceId: 'cambio-corte', answers, field: 'cambio-corte.ciudad_estado', answer: '  Orlando,   Florida ' });
  assert.equal(offline.answers['cambio-corte.ciudad_estado'], 'Orlando, Florida', 'sin Gemini se guarda tal como lo escribió');
});

// 22-10-2026: cada llamada dura entre 1 y 3 minutos (lib/agent/call-time.ts).
const callTime = require('../lib/agent/call-time.ts');

test('el tiempo de la llamada: el reloj del navegador se acota y los límites son de 1 a 3 minutos', () => {
  assert.equal(callTime.CALL_MIN_S, 60);
  assert.equal(callTime.CALL_MAX_S, 180);
  assert.ok(callTime.QUESTIONS_BUDGET_S < callTime.DOUBTS_BUDGET_S && callTime.DOUBTS_BUDGET_S < callTime.CALL_MAX_S);
  assert.equal(callTime.readElapsed(42.7), 42);
  assert.equal(callTime.readElapsed(-5), 0);
  assert.equal(callTime.readElapsed('90'), 0);
  assert.equal(callTime.readElapsed(1e9), 3600);
});

test('pasado el tiempo de las preguntas, las del guion que faltan se saltan; las de contygo no', async () => {
  const late = callTime.QUESTIONS_BUDGET_S + 5;
  const done = await say({ serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: ymd(5), elapsed: late });
  assert.equal(done.complete, true, 'con la fecha de contygo, la llamada termina');
  assert.equal(done.eligible, true);
  assert.deepEqual(Object.keys(done.answers), [ids.apelQ]);
  const opening = await say({ serviceId: 'apelacion', answers: {}, elapsed: late });
  assert.equal(opening.field, ids.apelQ, 'la pregunta de contygo se hace siempre');
  const itin = await say({ serviceId: 'itin', answers: { 'itin.personas': 'op1' }, field: 'itin.tiene_ssn', answer: true, elapsed: late });
  assert.equal(itin.answers['itin.tiene_ssn'], true, 'la pregunta que se estaba respondiendo cuenta');
  assert.equal(itin.complete, true);
  const early = await say({ serviceId: 'itin', answers: { 'itin.personas': 'op1' }, field: 'itin.tiene_ssn', answer: true, elapsed: 30 });
  assert.equal(early.field, 'itin.identidad', 'a tiempo, sigue el guion');
});

test('una pregunta del guion que no se entiende dos veces se deja pasar; una de contygo se vuelve a preguntar', async () => {
  provider = async () => ({ text: JSON.stringify({ intent: 'answer', clear: false, value: '' }) });
  const first = await say({ serviceId: 'itin', answers: { 'itin.personas': 'op1' }, field: 'itin.tiene_ssn', answer: 'pues mira' });
  assert.equal(first.field, 'itin.tiene_ssn');
  assert.match(first.message, /^Perdona, no te entendí bien/);
  const second = await say({ serviceId: 'itin', answers: first.answers, field: 'itin.tiene_ssn', answer: 'pues mira', retried: true });
  assert.equal(second.answers['itin.tiene_ssn'], scripts.SKIPPED);
  assert.equal(second.field, 'itin.identidad');
  assert.equal(second.message, 'No pasa nada, sigamos. ¿Tiene pasaporte o acta de nacimiento?');
  const carried = await say({ serviceId: 'itin', answers: second.answers, field: 'itin.identidad', answer: true });
  assert.equal(carried.answers['itin.tiene_ssn'], scripts.SKIPPED, 'el navegador lo devuelve y sigue contando como respondida');
  assert.equal(carried.field, 'itin.con_declaracion');
  const contygo = await say({ serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: 'pues mira', retried: true });
  assert.equal(contygo.field, ids.apelQ);
  assert.match(contygo.message, /^Perdona, no te entendí bien/);
  assert.equal(scripts.sanitizeScriptAnswers('llc', { 'llc.socios': scripts.SKIPPED, 'itin.personas': scripts.SKIPPED }, normalizeIntakeAnswer)['llc.socios'], scripts.SKIPPED);
});

test('al terminar llega la duda habitual que el asistente cuenta si la llamada fue corta', async () => {
  const done = await say({ serviceId: 'itin', answers: scriptDone('itin') });
  assert.equal(done.complete, true);
  assert.deepEqual(done.doubtTip, scripts.serviceScript('itin').doubts[0]);
  assert.match(done.doubtTip.question, /^¿Qué es el ITIN\?$/);
});

// 23-10-2026 («le digo la fecha y me repite que no me entendió»): por voz, el bot dice qué escuchó.
test('una respuesta hablada que no queda clara: el bot dice lo que escuchó, o que no escuchó nada', async () => {
  const audio = { data: Buffer.from('synthetic test fixture').toString('base64'), mimeType: 'audio/webm' };
  provider = async () => ({ text: JSON.stringify({ intent: 'answer', clear: false, value: '', heard: 'fue el' }) });
  const partial = await say({ serviceId: 'apelacion', answers: {}, field: ids.apelQ, audio });
  assert.equal(partial.field, ids.apelQ);
  assert.equal(partial.heard, 'fue el', 'el chat muestra lo que oyó');
  assert.match(partial.message, /^Te escuché «fue el», pero no me quedó clara la respuesta\. Dímela con el día, el mes y el año/);
  provider = async () => ({ text: JSON.stringify({ intent: 'answer', clear: false, value: '', heard: '' }) });
  const silent = await say({ serviceId: 'apelacion', answers: {}, field: ids.apelQ, audio });
  assert.match(silent.message, /^Perdona, no te escuché bien\. Dímela con el día/);
  provider = async () => ({ text: JSON.stringify({ intent: 'answer', clear: false, value: '' }) });
  const written = await say({ serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: 'pues no sé' });
  assert.match(written.message, /^Perdona, no te entendí bien\./, 'escrito, como siempre');
});

// 25-10-2026: «Ya conozco mi caso» — sin vídeo 1; la llamada sigue siendo entrevista y después dudas, pero solo con las
// preguntas que evalúan el caso (las de contygo y las de la entrevista propia del servicio), ninguna del guion.
test('«Ya conozco mi caso»: solo las preguntas de evaluación, contygo evalúa y después vienen las dudas', async () => {
  const quick = await say({ serviceId: 'apelacion', answers: {}, quick: true });
  assert.equal(quick.field, ids.apelQ, 'la pregunta de contygo');
  assert.equal(quick.total, 1, 'ninguna del guion');
  assert.equal(quick.message, '¡Hola! Soy tu asistente de ContyGo. Como ya conoces tu caso, te haré solo una pregunta rápida para confirmar que calificas para Apelación (BIA), y al final resolvemos tus dudas. ¿Cuál es la fecha de la decisión del juez? (decisión final del caso)');
  const done = await say({ serviceId: 'apelacion', answers: {}, quick: true, field: ids.apelQ, answer: ymd(5) });
  assert.equal(done.complete, true, 'sin las preguntas del guion, termina ahí');
  assert.equal(done.eligible, true);
  assert.ok(net.calls.some(call => call.path === '/eligibility/evaluate'), 'contygo evalúa, como en la guía completa');
  assert.deepEqual(done.doubtTopics, ['cuánto tiempo tiene para apelar', 'qué le preparamos', 'qué documentos necesita'], 'y se ofrecen las dudas');
  const visa = await say({ serviceId: 'visa-juvenil', answers: {}, quick: true });
  assert.match(visa.message, /confirmar que calificas para Visa Juvenil, y al final resolvemos tus dudas\./);
  assert.ok(!visa.field.startsWith('visa-juvenil.'), 'la entrevista propia de Visa Juvenil, sin su guion');
  const full = await say({ serviceId: 'apelacion', answers: {} });
  assert.equal(full.total, 6, 'la guía completa conserva su guion');
});

test('ningún servicio ofrece hablar de dinero al final de la entrevista', () => {
  for (const { id } of CONTYGO_SERVICES) {
    for (const topic of scripts.doubtTopics(id)) assert.doesNotMatch(topic, /cuest|cobra|precio|tasa|pag/i, `${id}: «${topic}»`);
    const tip = scripts.doubtTip(id);
    if (tip) assert.doesNotMatch(`${tip.question} ${tip.answer}`, /\$|dólar|cuest|cobra|precio|tasa|pag/i, `${id}: la duda que cuenta sin que se la pregunten`);
  }
});
