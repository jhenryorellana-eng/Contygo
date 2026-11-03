// El chat de la esquina de la portada (03-11-2026): responde preguntas rápidas con lo aprobado, nunca sale del catálogo
// visible, y sin la IA responde lo que sabe seguro o lo deja a un asesor. La invitación a WhatsApp la pone la pantalla.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const chat = require('../lib/agent/landing-chat.ts');

// The model, controlled by each test: a reply, a failure (402) or nothing configured.
let model = null, calls = [], enabled = true;
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, get agentEnabled() { return enabled; }, getGenAI: () => ({ models: { generateContent: async request => {
  calls.push(request);
  if (model instanceof Error) throw model;
  return { text: JSON.stringify(model) };
} } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' || request === './server' ? server : load.call(this, request, ...args); };
delete require.cache[require.resolve('../app/api/agent/landing-chat/route.ts')];
const route = require('../app/api/agent/landing-chat/route.ts');
Module._load = load;

let b;
const ask = async (question, extra = {}, headers) => {
  const response = await route.POST(b.request('/api/agent/landing-chat', { question, ...extra }, headers ? { headers } : undefined));
  return { status: response.status, ...(await response.json()) };
};
test.beforeEach(() => { freshModules(); contygoDefaults(mockFetch()); b = browser(); b.newIp(); model = null; calls = []; enabled = true; });

test('con la IA: responde con su texto y señala un servicio solo si la portada lo muestra', async () => {
  model = { reply: 'El ITIN es tu número de identificación fiscal; te ayudamos a pedirlo.', covered: true, serviceIds: ['itin', 'impuestos', 'itin', 'llc', 'asilo'] };
  const one = await ask('¿Qué es el ITIN?');
  assert.equal(one.ok, true);
  assert.deepEqual(one.serviceIds, ['itin', 'impuestos', 'llc'], 'sin repetir y hasta tres');
  model = { reply: 'Te cuento de la lotería.', covered: true, serviceIds: ['loteria-dv-2027'] };
  const hidden = await ask('¿Y la lotería de visas?');
  assert.equal(hidden.serviceIds, undefined, 'un servicio oculto no se ofrece');
  const prompt = calls[0].config.systemInstruction;
  assert.match(prompt, /No preguntes si quiere hablar con un asesor/);
  assert.match(prompt, /No des asesoría legal/);
  assert.doesNotMatch(prompt, /Lotería de Visas DV-2027 \(id/, 'lo oculto no está en lo que sabe');
});

test('sin la IA (402): lo que sabe seguro, y lo demás a un asesor', async () => {
  model = new Error('402 RESOURCE_EXHAUSTED');
  const price = await ask('¿Cuánto cuesta?');
  assert.equal(price.covered, true);
  assert.match(price.reply, /desde \$250/);
  const itin = await ask('Necesito sacar mi ITIN');
  assert.deepEqual(itin.serviceIds, ['itin']);
  const guarantee = await ask('¿ContyGo garantiza la aprobación?');
  assert.match(guarantee.reply, /^No\./);
  const other = await ask('¿Trabajan los domingos?');
  assert.equal(other.covered, false);
  assert.equal(other.reply, chat.LANDING_NO_ANSWER);
  enabled = false;
  const off = await ask('¿Puedo hacerlo desde mi celular?');
  assert.match(off.reply, /^Sí\./, 'sin clave de Gemini también responde lo aprobado');
});

test('una respuesta rara del modelo no llega a la pantalla', async () => {
  model = { reply: '', covered: true };
  const empty = await ask('¿Qué hace ContyGo por mí?');
  assert.match(empty.reply, /documentos/, 'se usa la respuesta aprobada');
  assert.equal(chat.readLandingReply({ reply: 'x'.repeat(701), covered: true }), null);
});

test('solo la propia página, una pregunta corta y sin abusar', async () => {
  assert.equal((await ask('Hola', {}, { origin: 'https://otra.invalid' })).status, 403);
  assert.equal((await ask('')).status, 400);
  assert.equal((await ask('x'.repeat(501))).status, 400);
  model = { reply: 'Hola.', covered: true };
  let last;
  for (let i = 0; i < 21; i++) last = await ask(`Pregunta ${i}`);
  assert.equal(last.status, 429);
});

test('el mensaje a WhatsApp lleva la pregunta corta y nada más', () => {
  assert.equal(chat.advisorMessage(), 'Hola, vengo de la web de ContyGo y quiero hablar con un asesor.');
  const long = chat.advisorMessage(`¿Puedo   pedir asilo? ${'a'.repeat(400)}`);
  assert.ok(long.length < 260);
  assert.match(long, /Mi pregunta: «¿Puedo pedir asilo\?/);
  assert.equal(chat.readLandingHistory([{ q: 'a', a: 'b' }, 'x', { q: 1 }, { q: 'c', a: 'd' }, { q: 'e', a: 'f' }, { q: 'g', a: 'h' }, { q: 'i', a: 'j' }]).length, 4);
});

test('el cierre a WhatsApp lleva el servicio, las respuestas en corto y la referencia, sin pasarse de largo', () => {
  const message = chat.closingMessage('Asilo Político', [{ question: '¿Entraste hace menos de un año?', answer: 'Sí' }, { question: '¿Tienes audiencia?', answer: 'No' }], 'WEB-AB12CD');
  assert.match(message, /contrato de Asilo Político\. Mis respuestas: ¿Entraste hace menos de un año\? Sí; ¿Tienes audiencia\? No\. \(ref\. WEB-AB12CD\)$/);
  const many = chat.closingMessage('Asilo Político', Array.from({ length: 40 }, (_, i) => ({ question: `¿Pregunta número ${i}?`, answer: 'Respuesta larga '.repeat(4) })));
  assert.ok(many.length < 760, 'cabe en un mensaje');
  const visible = require('../lib/contygo-catalog.ts').VISIBLE_SERVICES;
  for (const need of chat.LANDING_NEEDS) {
    for (const id of need.ids) assert.ok(visible.some(item => item.id === id), id);
    // Each stage of the road names services of that need, and together they cover all of them.
    if (need.refine) {
      for (const step of need.refine) for (const id of step.ids) assert.ok(need.ids.includes(id), `${need.label}: ${id}`);
      assert.deepEqual(new Set(need.refine.flatMap(step => step.ids)), new Set(need.ids), need.label);
    }
  }
});

