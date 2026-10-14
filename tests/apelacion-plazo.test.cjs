// Apelación con la decisión fuera de plazo (13-10-2026): un cliente llegaba al final y la ficha decía «no podemos iniciar este
// servicio en línea» después de que el agente dijera «¡Listo!» y el cierre invitara a revisar el contrato. Ahora, cuando contygo
// dice que no, el agente lo dice antes del vídeo y el cierre y la ficha llevan a un asesor por WhatsApp.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { ids, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const intake = require('../lib/agent/service-intake.ts');
const { closingAction, closingLines, closingScript, closingVariant } = require('../components/contygo/juvenil/closingSpeech.ts');
const { ineligibleMessage, outcomeMessage } = require('../lib/contygo-api/messages.ts');

// El proveedor de IA se sustituye: estas pruebas no llaman a Gemini.
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async () => { throw new Error('offline'); } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' ? server : load.call(this, request, ...args); };
delete require.cache[require.resolve('../app/api/agent/service-intake/route.ts')];
const { POST } = require('../app/api/agent/service-intake/route.ts');
Module._load = load;

let b, net;
const say = async body => (await POST(b.request('/api/agent/service-intake', { serviceId: 'apelacion', answers: {}, ...body }))).json();
const ymd = days => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
test.beforeEach(() => { freshModules(); net = mockFetch(); contygoDefaults(net); b = browser(); b.newIp(); });

test('fuera de plazo, el agente lo dice antes del vídeo en vez de «¡Listo!»', async () => {
  net.on('POST', '/eligibility/evaluate', { status: 200, body: { eligible: false, missingQuestionIds: [], disqualifiedQuestionIds: [ids.apelQ], disqualified: [{ questionId: ids.apelQ, reason: 'deadline_passed' }], notices: [], anchorYmd: null } });
  const done = await say({ field: ids.apelQ, answer: ymd(40) });
  assert.equal(done.complete, true);
  assert.equal(done.eligible, false);
  assert.equal(done.message, 'Gracias por responder. Por la fecha que nos diste, conviene revisar bien el plazo de este trámite. Antes de contratar, un asesor revisa tu caso contigo por WhatsApp. En el siguiente vídeo te mostramos cómo te acompañamos.');
  assert.doesNotMatch(done.message, /¡Listo!/);
});

test('dentro de plazo, el final de siempre', async () => {
  const done = await say({ field: ids.apelQ, answer: ymd(5) });
  assert.equal(done.eligible, true);
  assert.equal(done.message, intake.SERVICE_FINISH);
});

test('sin motivo de contygo, una frase neutra', () => {
  assert.match(intake.ineligibleFinish({ eligible: false, missingQuestionIds: [], disqualifiedQuestionIds: [], notices: [], anchorYmd: null }), /^Gracias por responder\. Con lo que nos contaste, este servicio conviene revisarlo con más detalle\. Antes de contratar/);
});

test('el cierre: con un «no» de contygo, «Hablar con un asesor» y no «Revisar mi contrato»', () => {
  assert.equal(closingVariant('apelacion', null, null, null, false), 'apelacion-asesor');
  assert.equal(closingVariant('cambio-corte', null, null, null, false), 'asesor');
  assert.equal(closingVariant('apelacion', null, null, null, true), null);
  assert.equal(closingVariant('apelacion', null, null, null, null), null, 'sin evaluación, el cierre de siempre');
  assert.equal(closingVariant('evaluacion-asilo', null, null, null, false), null, 'la evaluación conserva su cierre');
  assert.equal(closingVariant('i-485', { status: 'waiting', previo: true, near: true }, null, null, false), 'near', 'los cierres propios mandan');
  for (const variant of ['asesor', 'apelacion-asesor']) {
    assert.equal(closingAction('apelacion', variant), 'Hablar con un asesor');
    assert.doesNotMatch(closingLines('apelacion', variant).join(' '), /contrato/);
  }
  assert.match(closingScript('Ana', 'apelacion', 'apelacion-asesor'), /^Ana, tu próximo paso.*un asesor revisa tu plazo contigo.*Toca Hablar con un asesor/);
});

test('la ficha dice qué pasa y deja el aviso general para cuando el contrato lo rechaza', () => {
  assert.equal(ineligibleMessage('apelacion').title, 'Revisemos tu plazo para apelar.');
  assert.match(ineligibleMessage('apelacion').detail, /WhatsApp/);
  assert.match(ineligibleMessage('itin').detail, /Un asesor revisa tu caso por WhatsApp/);
  assert.equal(outcomeMessage({ step: 'NOT_ELIGIBLE' }).title, 'Con estas respuestas no podemos iniciar este servicio en línea.');
});
