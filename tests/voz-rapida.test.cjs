// «El agente de voz demora un poco en responder» (25-10-2026): con la voz encendida, un turno de la llamada trae su
// propia voz en la misma respuesta, y la sesión de voz se conecta mientras se entiende la respuesta.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { ids, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const { cleanReply } = require('../lib/agent/doubts.ts');
const { closingSpeech } = require('../lib/agent/call-time.ts');
const { INTAKE_VOICE_SCRIPTS } = require('../lib/agent/visa-intake.ts');
const { readVoicedReply } = require('../components/contygo/juvenil/liveSpeechReader.ts');

// El modelo y la sesión de voz se sustituyen: se anota en qué orden ocurre cada cosa.
let modelReply = null, events = [], live = null, connectFails = false;
const part = { inlineData: { mimeType: 'audio/pcm;rate=24000', data: Buffer.alloc(200, 16).toString('base64') } };
function fakeLive() {
  const state = { callbacks: null, sent: [], closes: 0 };
  state.session = { close() { state.closes++; }, sendClientContent(value) { state.sent.push(value); events.push('texto a la voz'); } };
  return state;
}
const ai = {
  models: { generateContent: async request => { events.push('modelo'); await new Promise(resolve => setImmediate(resolve)); return { text: JSON.stringify(modelReply), request }; } },
  live: { connect: async args => { events.push('conectar voz'); if (connectFails) throw new Error('offline'); live = fakeLive(); live.callbacks = args.callbacks; return live.session; } },
};
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ai };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' || request.endsWith('/agent/server') || request === './server' ? server : load.call(this, request, ...args); };
for (const path of ['../lib/agent/doubts.ts', '../lib/agent/voiced-reply.ts', '../app/api/agent/service-intake/route.ts', '../app/api/agent/service-doubt/route.ts']) delete require.cache[require.resolve(path)];
const intakeRoute = require('../app/api/agent/service-intake/route.ts');
const doubtRoute = require('../app/api/agent/service-doubt/route.ts');
Module._load = load;

let b;
test.beforeEach(() => { freshModules(); contygoDefaults(mockFetch()); b = browser(); b.newIp(); modelReply = null; events = []; live = null; connectFails = false; });

const voiced = { headers: { 'x-voiced-reply': '1' } };
/** Reads the turn and, after it, the voice; the fake session answers once the text reaches it. */
async function readAll(response) {
  const { data, voice } = await readVoicedReply(response);
  if (!voice) return { data, voice: [] };
  const reader = voice.body.getReader();
  const voiceEvents = [];
  let text = '';
  const answer = setInterval(() => { if (live?.sent.length && !live.answered) { live.answered = true; live.callbacks.onmessage({ serverContent: { modelTurn: { parts: [part] }, turnComplete: true } }); } }, 1);
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; text += new TextDecoder().decode(value); }
  } finally { clearInterval(answer); }
  for (const line of text.split('\n')) if (line.trim()) voiceEvents.push(JSON.parse(line).type);
  return { data, voice: voiceEvents };
}

test('con la voz encendida: la voz se conecta mientras se entiende la respuesta y llega en la misma respuesta', async () => {
  modelReply = { intent: 'answer', value: '2026-10-10', clear: true, heard: '', ack: 'Entendido, el 10 de octubre.', reply: '' };
  const response = await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: 'fue el diez de octubre', elapsed: 20 }, voiced));
  assert.match(response.headers.get('content-type'), /application\/x-ndjson/);
  const { data, voice } = await readAll(response);
  assert.deepEqual(events.slice(0, 2), ['conectar voz', 'modelo'], 'la voz no espera a la respuesta para conectarse');
  assert.equal(data.answers[ids.apelQ], '2026-10-10');
  assert.equal(data.speech, data.message, 'dice lo que muestra la pantalla');
  assert.equal(JSON.parse(live.sent[0].turns[0].parts[0].text).texto_a_leer, data.message);
  assert.deepEqual(voice, ['audio', 'done']);
  assert.equal(live.closes, 1);
});

test('sin la voz: la respuesta de siempre, sin sesión de voz', async () => {
  modelReply = { intent: 'answer', value: '2026-10-10', clear: true, heard: '', ack: 'Entendido.', reply: '' };
  const response = await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'apelacion', answers: {}, field: ids.apelQ, answer: 'fue el diez de octubre' }));
  assert.match(response.headers.get('content-type'), /application\/json/);
  const data = await response.json();
  assert.equal(data.speech, undefined);
  assert.deepEqual(events, ['modelo']);
});

test('al terminar las preguntas, la voz dice el cierre con los segundos que mandó el navegador', async () => {
  // Apelación: con la fecha y el resto de sus preguntas respondidas, el turno cierra con «¿Te queda alguna duda?».
  let turn = await (await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'apelacion', answers: {} }))).json();
  for (let i = 0; i < 10 && turn.field; i++) {
    const question = turn.question;
    const answer = question.kind === 'date' ? '2026-10-10' : question.kind === 'yesno' ? true : question.kind === 'choice' ? question.options[0].code : 'Una respuesta';
    modelReply = { intent: 'answer', value: typeof answer === 'boolean' ? 'yes' : answer, clear: true, heard: '', ack: '', reply: '' };
    const response = await intakeRoute.POST(b.request('/api/agent/service-intake', { serviceId: 'apelacion', answers: turn.answers, field: turn.field, answer, elapsed: 30 }, voiced));
    turn = (await readAll(response)).data;
  }
  assert.equal(turn.complete, true);
  assert.equal(turn.speech, closingSpeech(turn, 30));
  assert.match(turn.speech, /Te cuento algo que suelen preguntarnos/, 'antes del minuto, la duda habitual');
});

test('las dudas: la respuesta y «¿Tienes otra duda?», o el aviso de tiempo pasado DOUBTS_BUDGET_S', async () => {
  modelReply = { heard: '¿Son abogados?', reply: 'No, ContyGo no es un bufete de abogados.', covered: true };
  let { data, voice } = await readAll(await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: '¿Son abogados?', elapsed: 40 }, voiced)));
  assert.equal(data.speech, 'No, ContyGo no es un bufete de abogados. ¿Tienes otra duda?');
  assert.deepEqual(voice, ['audio', 'done']);
  ({ data } = await readAll(await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: '¿Son abogados?', elapsed: 140 }, voiced))));
  assert.match(data.speech, /Se nos acaba el tiempo de esta llamada/);
  modelReply = { heard: 'no, ninguna', reply: 'Perfecto, sigamos.', covered: true, done: true };
  ({ data } = await readAll(await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: 'no, ninguna', elapsed: 40 }, voiced))));
  assert.equal(data.speech, 'Perfecto, sigamos.');
});

test('lo grabado de antemano no se genera: la respuesta va sola y la sesión se suelta', async () => {
  modelReply = { heard: 'no', reply: INTAKE_VOICE_SCRIPTS[1], covered: true, done: true };
  const response = await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: 'no', elapsed: 40 }, voiced));
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal((await response.json()).speech, INTAKE_VOICE_SCRIPTS[1]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(live.closes, 1, 'la sesión conectada de antemano se cierra');
  assert.equal(live.sent.length, 0);
});

test('si la voz no conecta, el turno llega igual y su voz avisa del error (el navegador la pide aparte)', async () => {
  connectFails = true;
  modelReply = { heard: '¿Son abogados?', reply: 'No, ContyGo no es un bufete de abogados.', covered: true };
  const response = await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: '¿Son abogados?' }, voiced));
  const { data, voice } = await readVoicedReply(response);
  assert.equal(data.reply, 'No, ContyGo no es un bufete de abogados.');
  assert.deepEqual(JSON.parse(new TextDecoder().decode((await voice.body.getReader().read()).value)), { type: 'error', code: 'live_unavailable' });
});

test('otra web no abre una sesión de voz', async () => {
  const response = await doubtRoute.POST(b.request('/api/agent/service-doubt', { serviceId: 'apelacion', question: 'hola' }, { headers: { 'x-voiced-reply': '1', origin: 'https://evil.example' } }));
  assert.equal(response.status, 403);
  assert.deepEqual(events, []);
});

test('el modelo ligero a veces escribe las tildes en HTML: se leen y se muestran como texto', () => {
  assert.equal(cleanReply('Existe una solicitud de exenci&oacute;n, el formulario EOIR-26A &amp; la tasa.'), 'Existe una solicitud de exención, el formulario EOIR-26A & la tasa.');
  assert.equal(cleanReply('&iquest;Tienes otra duda? &#191;S&#xED;?'), '¿Tienes otra duda? ¿Sí?');
  assert.equal(cleanReply('&#0; &nosuch; &#99999999;'), '&0; &nosuch; &99999999;', 'lo que no es una letra no se convierte (y # se quita como siempre)');
});

test('el navegador separa el turno de su voz; una respuesta normal no trae voz', async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({ start(c) { c.enqueue(encoder.encode('{"ok":true,"spe')); c.enqueue(encoder.encode('ech":"Hola"}\n{"type":"audio"')); c.enqueue(encoder.encode(',"data":"","sampleRate":24000}\n')); c.close(); } });
  const { data, voice } = await readVoicedReply(new Response(body, { headers: { 'content-type': 'application/x-ndjson' } }));
  assert.deepEqual(data, { ok: true, speech: 'Hola' });
  assert.equal(await voice.text(), '{"type":"audio","data":"","sampleRate":24000}\n');
  const plain = await readVoicedReply(new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }));
  assert.deepEqual(plain, { data: { ok: true } });
});
