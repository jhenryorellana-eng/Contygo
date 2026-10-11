const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const asylum = require('../lib/agent/asylum-intake.ts');
const { dayLabel } = require('../lib/agent/adjustment-intake.ts');

// El proveedor de IA se sustituye: estas pruebas no llaman a Gemini.
let calls = [];
let provider = async () => { throw new Error('offline'); };
const realServer = require('../lib/agent/server.ts');
const server = { ...realServer, agentEnabled: true, getGenAI: () => ({ models: { generateContent: async args => { calls.push(args); return provider(args); } } }) };
const load = Module._load;
Module._load = function (request, ...args) { return request === '@/lib/agent/server' ? server : load.call(this, request, ...args); };
delete require.cache[require.resolve('../app/api/agent/service-intake/route.ts')];
const { POST } = require('../app/api/agent/service-intake/route.ts');
Module._load = load;

// Reforzar Asilo tal como lo da GET /catalog de contygo el 10-10-2026: una sola pregunta, la fecha de la próxima audiencia.
const HEARING = 'cd2b9568-77fc-4e9c-886a-2b78bc8e093c';
const hearingQuestion = { id: HEARING, kind: 'date', dateMode: 'future_event', minNotice: { value: 5, unit: 'business_days' }, prompt: { es: '¿Cuál es la fecha de su próxima audiencia en corte?', en: 'What is the date of your next court hearing?' } };
const service = (questions = [hearingQuestion]) => ({
  id: 'b2b2b2b2-0000-4000-8000-0000000000ff', slug: 'reforzar-asilo', name: { es: 'Reforzar Asilo', en: null },
  plans: [{ id: 'b2b2b2b2-0000-4000-8000-0000000000a1', name: { es: 'Sin abogado', en: null }, priceCents: 60000, extraPartyPriceCents: 0, installmentOptions: [] }],
  eligibilityQuestions: questions, partyRoles: [],
});
const ymd = days => new Date(Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
// Como contygo (probado el 10-10-2026): sin fecha, falta; con la audiencia en menos de una semana, event_too_close.
const evaluate = call => {
  const date = call.json.answers.find(item => item.questionId === HEARING)?.value;
  const missing = date === undefined && currentQuestions.length ? [HEARING] : [];
  const close = date !== undefined && date < ymd(7);
  return { status: 200, body: { eligible: !missing.length && !close, missingQuestionIds: missing, disqualifiedQuestionIds: close ? [HEARING] : [], disqualified: close ? [{ questionId: HEARING, reason: 'event_too_close' }] : [], notices: [], anchorYmd: null } };
};

let b, net, currentQuestions;
// Cada turno desde otra IP: el límite de 40 turnos por IP no es lo que se prueba aquí.
const post = async body => { b.newIp(); return (await POST(b.request('/api/agent/service-intake', { serviceId: 'reforzar-asilo', ...body }))).json(); };
const say = (answers, field, answer) => post({ answers, field, answer });
const useCatalog = questions => {
  currentQuestions = questions;
  net.on('GET', '/catalog', { status: 200, body: { services: [...catalog.services.filter(item => item.slug !== 'reforzar-asilo'), service(questions)] } });
};
test.beforeEach(() => {
  freshModules(); net = mockFetch(); contygoDefaults(net);
  useCatalog([hearingQuestion]);
  net.on('POST', '/eligibility/evaluate', evaluate);
  b = browser(); b.newIp(); calls = []; provider = async () => { throw new Error('offline'); };
});
const evaluated = () => net.calls.filter(call => call.path.endsWith('/eligibility/evaluate')).pop()?.json.answers;
/** Responde en orden y devuelve cada turno. */
async function walk(...steps) {
  let answers = {}; const turns = [];
  for (const [field, answer] of steps) { const turn = await say(answers, field, answer); turns.push(turn); answers = turn.answers; }
  return turns;
}

// ---------------- Las preguntas, en el orden del dueño ----------------

test('asilo: defensivo o afirmativo, personal o familiar, la fecha y el tipo de audiencia (tres opciones)', async () => {
  const greeting = await post({ answers: {} });
  assert.equal(greeting.field, asylum.TRACK_FIELD);
  assert.equal(greeting.question.kind, 'choice');
  assert.deepEqual(greeting.question.options.map(option => option.code), ['defensivo', 'afirmativo']);
  assert.match(greeting.message, /Puedes escribir o hablar[\s\S]*¿Tu asilo es defensivo, ante un juez de inmigración, o afirmativo, ante un oficial de asilo de USCIS\?$/);
  assert.equal(greeting.total, 4);
  const [scope, date, type] = await walk([asylum.TRACK_FIELD, 'defensivo'], [asylum.SCOPE_FIELD, 'personal'], [HEARING, ymd(120)]);
  assert.equal(scope.question.text, asylum.SCOPE_QUESTION);
  assert.deepEqual(scope.question.options.map(option => option.code), ['personal', 'familiar']);
  assert.equal(date.field, HEARING, 'la fecha es la pregunta del catálogo de contygo');
  assert.deepEqual([date.question.kind, date.question.dateMode, date.question.allowUnknown, date.question.unknownLabel], ['date', 'future_event', true, 'Aún no tengo fecha']);
  assert.equal(date.question.minNotice, undefined, 'el aviso de 5 días hábiles no se muestra: el plazo real lo dice el agente');
  assert.equal(date.message, `Gracias. ${asylum.COURT_DATE_QUESTION}`);
  assert.equal(type.field, asylum.HEARING_FIELD);
  assert.deepEqual(type.question.options.map(option => option.label), ['Preliminar 1', 'Preliminar 2', 'Mérito final']);
  assert.ok(greeting.scripts.includes(`Gracias. ${asylum.INTERVIEW_DATE_QUESTION}`), 'las locuciones se precargan');
});

test('asilo: audiencia preliminar → «¡Felicitaciones! Todavía tienes tiempo», contrato en línea; a contygo solo va la fecha', async () => {
  const date = ymd(120);
  const turns = await walk([asylum.TRACK_FIELD, 'defensivo'], [asylum.SCOPE_FIELD, 'familiar'], [HEARING, date], [asylum.HEARING_FIELD, 'preliminar-1']);
  const done = turns.at(-1);
  assert.equal(done.complete, true);
  assert.equal(done.message, '¡Felicitaciones! Todavía tienes tiempo de presentar tu reforzamiento de asilo: las pruebas se pueden entregar hasta 30 días antes de tu audiencia final. Te invito a hacer tu contrato con nosotros; en el siguiente vídeo te mostramos cómo te acompañamos.');
  assert.deepEqual([done.asylum.kind, done.asylum.advisor, done.asylum.appeal, done.asylum.scope], ['time', false, false, 'familiar']);
  assert.equal(done.eligible, true);
  assert.deepEqual(evaluated(), [{ questionId: HEARING, value: date }], 'las respuestas «asilo.» no salen de la landing');
  assert.equal(done.guidance.status, 'potential');
  assert.match(done.guidance.detail, /al menos 30 días antes[\s\S]*Si estás detenido o el juez fijó otro plazo/);
  assert.equal(done.guidance.sources[0].url, asylum.EOIR_DEADLINES_URL);
});

test('asilo: mérito final con tiempo → el agente dice hasta qué día; a 30 días o menos → asesor y Apelación', async () => {
  const far = ymd(120);
  const time = (await walk([asylum.TRACK_FIELD, 'defensivo'], [asylum.SCOPE_FIELD, 'personal'], [HEARING, far], [asylum.HEARING_FIELD, 'merito'])).at(-1);
  assert.equal(time.asylum.deadline, asylum.courtDeadline(far));
  assert.match(time.message, new RegExp(`^¡Felicitaciones! Todavía tienes tiempo de presentar tu reforzamiento de asilo: las pruebas se pueden entregar hasta 30 días antes de tu audiencia final, es decir, hasta el ${dayLabel(time.asylum.deadline)}\\. Te invito`));
  const near = ymd(20);
  const late = (await walk([asylum.TRACK_FIELD, 'defensivo'], [asylum.SCOPE_FIELD, 'personal'], [HEARING, near], [asylum.HEARING_FIELD, 'merito'])).at(-1);
  assert.equal(late.eligible, true, 'contygo lo aceptaría: la regla de los 30 días la pone la evaluación');
  assert.deepEqual([late.asylum.kind, late.asylum.advisor, late.asylum.appeal], ['late', true, true]);
  assert.equal(late.message, `Tu audiencia final es el ${dayLabel(near)}, y las pruebas solo se reciben hasta 30 días antes: ya no hay tiempo de presentar el reforzamiento. Un asesor revisará tu caso contigo por WhatsApp. Si el juez niega tu asilo, el plazo para apelar es corto, y con nuestra Apelación te acompañamos.`);
  assert.equal(late.guidance.title, 'Tu audiencia final está muy cerca');
  assert.match(late.guidance.detail, /dentro de los 30 días siguientes a su decisión, o de 10/);
  assert.ok(late.guidance.sources.some(source => source.url === asylum.BIA_APPEAL_URL));
});

test('asilo: afirmativo → pregunta la entrevista (sin tipo de audiencia) y aplica los 14 días de USCIS', async () => {
  const [, date] = await walk([asylum.TRACK_FIELD, 'afirmativo'], [asylum.SCOPE_FIELD, 'personal']);
  assert.equal(date.question.text, asylum.INTERVIEW_DATE_QUESTION);
  assert.equal(date.total, 3, 'sin la pregunta del tipo de audiencia');
  const interview = ymd(30);
  const time = await say(date.answers, HEARING, interview);
  assert.equal(time.complete, true);
  assert.equal(time.asylum.deadline, ymd(16));
  assert.match(time.message, new RegExp(`USCIS recibe las pruebas hasta 14 días antes de tu entrevista, es decir, hasta el ${dayLabel(ymd(16))}\\.`));
  assert.equal(time.guidance.sources[0].url, asylum.USCIS_ASYLUM_URL);
  const late = await say(date.answers, HEARING, ymd(10));
  assert.deepEqual([late.asylum.kind, late.asylum.advisor, late.asylum.appeal], ['late', true, false]);
  assert.match(late.message, /USCIS solo recibe pruebas hasta 14 días antes/);
  assert.doesNotMatch(late.message, /Apelación/, 'en USCIS no hay juez que niegue: no se ofrece la apelación');
});

test('asilo: «Aún no tengo fecha» → todavía hay tiempo, el contrato con un asesor, y a contygo no va ninguna fecha', async () => {
  const [, date] = await walk([asylum.TRACK_FIELD, 'defensivo'], [asylum.SCOPE_FIELD, 'personal']);
  const done = await say(date.answers, HEARING, 'UNKNOWN');
  assert.equal(done.complete, true);
  assert.equal(done.answers[asylum.NO_DATE_FIELD], true);
  assert.equal(done.answers[HEARING], undefined);
  assert.deepEqual(evaluated(), []);
  assert.deepEqual([done.asylum.kind, done.asylum.advisor], ['nodate', true]);
  assert.match(done.message, /^¡Felicitaciones! Todavía tienes tiempo[\s\S]*Como aún no tienes fecha, un asesor preparará tu contrato contigo por WhatsApp\./);
  const written = await say(date.answers, HEARING, 'todavía no me dan fecha');
  assert.equal(written.asylum.kind, 'nodate', 'también escrito o dicho');
  const again = await post({ answers: done.answers });
  assert.deepEqual([again.complete, again.total], [true, 2], 'al volver, la fecha no se pregunta otra vez');
});

test('asilo: preliminar en pocos días → hay tiempo, pero contygo no deja contratar en línea: un asesor', async () => {
  const done = (await walk([asylum.TRACK_FIELD, 'defensivo'], [asylum.SCOPE_FIELD, 'personal'], [HEARING, ymd(3)], [asylum.HEARING_FIELD, 'preliminar-2'])).at(-1);
  assert.deepEqual([done.asylum.kind, done.asylum.advisor, done.eligible], ['soon', true, false]);
  assert.match(done.message, /^Todavía tienes tiempo antes de tu audiencia final, pero tu próxima audiencia es en pocos días/);
});

test('asilo: se puede escribir o decir; lo claro se entiende sin Gemini y lo dudoso se vuelve a preguntar', async () => {
  const year = new Date().getUTCFullYear() + 1;
  const turns = await walk([asylum.TRACK_FIELD, 'Es defensivo, ante el juez'], [asylum.SCOPE_FIELD, 'familiar, con mis hijos'], [HEARING, `15 de marzo de ${year}`], [asylum.HEARING_FIELD, 'la de mérito final']);
  assert.equal(calls.length, 0);
  assert.deepEqual([turns[0].answers[asylum.TRACK_FIELD], turns[1].answers[asylum.SCOPE_FIELD], turns[2].answers[HEARING], turns[3].answers[asylum.HEARING_FIELD]], ['defensivo', 'familiar', `${year}-03-15`, 'merito']);
  provider = async () => ({ text: JSON.stringify({ clear: false, value: '' }) });
  const doubt = await say(turns[2].answers, asylum.HEARING_FIELD, 'preliminar');
  assert.equal(doubt.field, asylum.HEARING_FIELD);
  assert.match(doubt.message, /^Necesito confirmar tu respuesta\. Puedes usar los botones de abajo o escribir tu respuesta\. Gracias\. ¿Qué tipo de audiencia es/);
  const both = await say({}, asylum.TRACK_FIELD, 'no sé si defensivo o afirmativo');
  assert.equal(both.field, asylum.TRACK_FIELD, 'dos opciones a la vez no se adivinan');
  const badDate = await say(turns[1].answers, HEARING, '03/04/2027');
  assert.match(badDate.message, new RegExp(`por ejemplo «15 de marzo de ${year}»`), 'el ejemplo de una audiencia es una fecha futura');
});

test('asilo: Gemini recibe las opciones y devuelve su código; uno que no existe no pasa', async () => {
  provider = async () => ({ text: JSON.stringify({ clear: true, value: 'afirmativo' }) });
  const turn = await say({}, asylum.TRACK_FIELD, 'lo presenté yo por internet');
  assert.equal(turn.answers[asylum.TRACK_FIELD], 'afirmativo');
  const payload = JSON.parse(calls[0].contents[0].parts[0].text);
  assert.deepEqual(payload.options.map(option => option.code), ['defensivo', 'afirmativo']);
  assert.match(calls[0].config.systemInstruction, /Si kind es choice, value es exactamente el code/);
  provider = async () => ({ text: JSON.stringify({ clear: true, value: 'otro' }) });
  assert.equal((await say({}, asylum.TRACK_FIELD, 'algo raro')).field, asylum.TRACK_FIELD);
});

test('asilo: sin la pregunta de fecha en el catálogo, la fecha vive en «asilo.fecha» y la regla es la misma', async () => {
  useCatalog([]);
  const done = (await walk([asylum.TRACK_FIELD, 'defensivo'], [asylum.SCOPE_FIELD, 'personal'], [asylum.LOCAL_DATE_FIELD, ymd(20)], [asylum.HEARING_FIELD, 'merito'])).at(-1);
  assert.equal(done.asylum.kind, 'late');
  assert.deepEqual(evaluated(), []);
});

test('plazos: corte 30 días (si cae en fin de semana, el lunes); USCIS 14; el último día todavía cuenta', () => {
  assert.equal(asylum.courtDeadline('2026-12-16'), '2026-11-16', 'miércoles − 30 = lunes');
  assert.equal(asylum.courtDeadline('2026-12-14'), '2026-11-16', 'cae en sábado 14-11 → lunes 16-11');
  assert.equal(asylum.courtDeadline('2026-12-15'), '2026-11-16', 'cae en domingo 15-11 → lunes 16-11');
  assert.equal(asylum.interviewDeadline('2026-11-01'), '2026-10-18');
  const flow = (date, today, hearing = 'merito') => asylum.asylumFlow({ [asylum.TRACK_FIELD]: 'defensivo', [asylum.SCOPE_FIELD]: 'personal', [asylum.LOCAL_DATE_FIELD]: date, [asylum.HEARING_FIELD]: hearing }, asylum.LOCAL_DATE_FIELD, today).verdict.status;
  assert.equal(flow('2026-12-16', '2026-11-16'), 'time', 'el día del plazo todavía se puede');
  assert.equal(flow('2026-12-16', '2026-11-17'), 'late');
  assert.equal(flow('2026-10-20', '2026-10-10', 'preliminar-1'), 'time', 'una preliminar siempre deja tiempo para la final');
});

test('cierre del segundo vídeo: va de la mano con el plazo que dijo el agente', () => {
  const closing = require('../components/contygo/juvenil/closingSpeech.ts');
  const variant = outcome => closing.closingVariant('reforzar-asilo', null, outcome);
  assert.equal(variant({ kind: 'time', advisor: false, appeal: false }), 'asilo-tiempo');
  assert.equal(variant({ kind: 'late', advisor: true, appeal: true }), 'asilo-apelacion');
  assert.equal(variant({ kind: 'late', advisor: true, appeal: false }), 'asilo-asesor');
  assert.equal(variant({ kind: 'soon', advisor: true, appeal: false }), 'asilo-pronto');
  assert.equal(variant({ kind: 'nodate', advisor: true, appeal: false }), 'asilo-sinfecha');
  assert.equal(variant(null), null);
  assert.equal(closing.closingAction('reforzar-asilo', 'asilo-tiempo'), 'Revisar mi contrato');
  assert.equal(closing.closingAction('reforzar-asilo', 'asilo-apelacion'), 'Hablar con un asesor');
  assert.equal(closing.closingAction('reforzar-asilo', 'asilo-asesor'), 'Hablar con un asesor', 'plazo vencido: no hay contrato que revisar');
  for (const contract of ['asilo-sinfecha', 'asilo-pronto']) assert.equal(closing.closingAction('reforzar-asilo', contract), 'Revisar mi contrato', 'el vídeo 2 termina con «Toca "Revisar mi contrato"»');
  const media = require('../lib/contygo-rebuild-media.ts');
  assert.deepEqual([media.getRebuildPlatformFilm('reforzar-asilo').src, media.getRebuildPlatformFilm('reforzar-asilo').provisional], ['/contygo/films/reforzamiento-asilo-video2-v1-720p.mp4', undefined]);
  assert.match(closing.closingScript('', 'reforzar-asilo', 'asilo-apelacion'), /audiencia final está muy cerca.*te acompañamos en la apelación.*Toca Hablar con un asesor/);
  assert.equal(closing.closingVariant('i-485', { status: 'current', previo: false }, { kind: 'late', advisor: true, appeal: true }), 'current', 'Ajuste no cambia');
  const messages = require('../lib/contygo-api/messages.ts');
  assert.match(messages.asylumMessage({ kind: 'late', track: 'defensivo' }).detail, /30 días antes[\s\S]*apelación/);
  assert.match(messages.whatsappAsylumMessage('Reforzar Asilo', 'WEB-ABC123'), /revisen mi caso para Reforzar Asilo.*\(ref\. WEB-ABC123\)/);
});
