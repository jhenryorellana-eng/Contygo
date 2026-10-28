// Escribir siempre funciona (28-10-2026): con el saldo de Gemini agotado, el bot no entendía «En Perú» ni respondía en el
// modo escritura. Una respuesta escrita clara se lee sin la IA (lib/agent/typed-answer.ts); sin IA, la voz pide escribir y
// una duda escrita va a un asesor, en lugar de «no te entendí».
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const { readTypedAnswer } = require('../lib/agent/typed-answer.ts');
const lottery = require('../lib/agent/lottery-intake.ts');
const { visaQuestions } = require('../lib/agent/service-intake.ts');

// Gemini sin saldo: toda llamada falla, como el 402 «prepayment credits are depleted».
let modelCalls = 0;
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async () => { modelCalls++; throw new Error('402 RESOURCE_EXHAUSTED'); } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' || request === './server' ? server : load.call(this, request, ...args); };
for (const path of ['../lib/agent/doubts.ts', '../app/api/agent/service-intake/route.ts', '../app/api/agent/service-doubt/route.ts']) delete require.cache[require.resolve(path)];
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
const doubtRoute = require('../app/api/agent/service-doubt/route.ts');
Module._load = load;

const questions = lottery.lotteryFlow({ [lottery.COUNTRY_FIELD]: 'pe' }).questions;
const ask = id => questions.find(question => question.id === id);

test('una respuesta escrita con palabras propias se entiende sin la IA', () => {
  const country = questions[0];
  assert.equal(readTypedAnswer(country, 'En Perú'), 'pe');
  assert.equal(readTypedAnswer(country, 'Nací en Lima, Perú'), 'pe');
  assert.equal(readTypedAnswer(country, 'república dominicana'), 'do');
  const studies = ask('dv.estudios');
  assert.equal(readTypedAnswer(studies, 'Sí, terminé la secundaria'), 'secundaria');
  assert.equal(readTypedAnswer(studies, 'tengo dos años de experiencia en un oficio'), 'oficio');
  assert.equal(readTypedAnswer(ask('dv.estado_civil'), 'Casada'), 'casado');
  assert.equal(readTypedAnswer(ask('dv.estado_civil'), 'soltera'), 'soltero');
  assert.equal(readTypedAnswer(ask('dv.hijos'), 'tengo dos hijos'), '2');
  assert.equal(readTypedAnswer(ask('dv.hijos'), '4'), '4');
  const yesno = ask('dv.pasaporte');
  assert.equal(readTypedAnswer(yesno, 'sí, lo tengo vigente'), true);
  assert.equal(readTypedAnswer(yesno, 'No tengo'), false);
  const [residence] = visaQuestions({});
  assert.equal(readTypedAnswer(residence, 'Claro, vive aquí con nosotros'), true);
  const birth = visaQuestions({ residence: true }).find(question => question.kind === 'date');
  assert.equal(readTypedAnswer(birth, 'el 15 de marzo de 2010'), '2010-03-15');
});

test('lo que no está claro no se adivina: va a la IA o se pregunta otra vez', () => {
  assert.equal(readTypedAnswer(ask('dv.estudios'), 'No terminé la secundaria'), null, 'un «no» delante no elige la opción contraria');
  assert.equal(readTypedAnswer(ask('dv.pasaporte'), 'no sé'), null);
  assert.equal(readTypedAnswer(ask('dv.pasaporte'), '¿Para qué piden el pasaporte?'), null, 'una pregunta es una duda');
  assert.equal(readTypedAnswer(questions[0], 'En España'), null);
});

let b;
const say = async body => (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'loteria-dv-2027', ...body }))).json();
test.beforeEach(() => { freshModules(); contygoDefaults(mockFetch()); b = browser(); b.newIp(); modelCalls = 0; });

test('sin saldo en Gemini, escribir «En Perú» avanza a la siguiente pregunta', async () => {
  const reply = await say({ answers: {}, field: lottery.COUNTRY_FIELD, answer: 'En Perú' });
  assert.equal(reply.ok, true);
  assert.equal(reply.answers[lottery.COUNTRY_FIELD], 'pe');
  assert.equal(reply.field, 'dv.estudios');
  assert.equal(modelCalls, 0, 'una respuesta clara ni siquiera llama a la IA');
});

test('sin IA, una respuesta por voz pide escribir y una duda escrita va a un asesor', async () => {
  const spoken = await say({ answers: {}, field: lottery.COUNTRY_FIELD, audio: { data: Buffer.from('audio de prueba').toString('base64'), mimeType: 'audio/webm' } });
  assert.equal(spoken.typeInstead, true);
  assert.match(spoken.message, /no puedo entender audios: escríbeme tu respuesta/);
  assert.equal(spoken.field, lottery.COUNTRY_FIELD);
  const money = await say({ answers: {}, field: lottery.COUNTRY_FIELD, answer: '¿Cuánto cuesta inscribirme?' });
  assert.match(money.message, /cuesta solo un dólar/, 'el precio de la inscripción se sabe sin la IA');
  assert.equal(money.field, lottery.COUNTRY_FIELD);
  const other = await say({ answers: {}, field: lottery.COUNTRY_FIELD, answer: '¿Ustedes trabajan los domingos?' });
  assert.match(other.message, /un asesor te las responde por WhatsApp/);
  assert.doesNotMatch(other.message, /no te entendí/);
});

test('sin IA, las dudas del final también responden lo que se sabe', async () => {
  const ask = async question => (await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'loteria-dv-2027', question }))).json();
  const money = await ask('¿Cuánto me cobran por inscribirme?');
  assert.equal(money.ok, true);
  assert.match(money.reply, /cuesta solo un dólar/);
  const unknown = await ask('¿Ustedes trabajan los domingos?');
  assert.equal(unknown.covered, false);
  assert.match(unknown.reply, /WhatsApp/);
});
