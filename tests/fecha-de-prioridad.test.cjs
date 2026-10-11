const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const bulletinLib = require('../lib/agent/visa-bulletin.ts');
const adjustment = require('../lib/agent/adjustment-intake.ts');

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

// Las páginas reales de USCIS del 10-10-2026 (índice y tabla de octubre).
const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const INDEX = fixture('uscis-aos-charts-indice-2026-10.html');
const CHART = fixture('uscis-aos-charts-octubre-2026.html');

// El servicio I-485 tal como lo da GET /catalog de contygo (29-09-2026), con ids de prueba.
const q = { i360: 'a1a1a1a1-0000-4000-8000-000000000001', bulletin: 'a1a1a1a1-0000-4000-8000-000000000002', single: 'a1a1a1a1-0000-4000-8000-000000000003', removal: 'a1a1a1a1-0000-4000-8000-000000000004' };
const i485 = {
  id: 'a1a1a1a1-0000-4000-8000-0000000000ff', slug: 'i-485', name: { es: 'Ajuste de estatus I-485 (SIJ)', en: null },
  plans: [{ id: 'a1a1a1a1-0000-4000-8000-0000000000a1', name: { es: 'Estándar', en: null }, priceCents: 150000, extraPartyPriceCents: 0, installmentOptions: [] }],
  eligibilityQuestions: [
    { id: q.i360, kind: 'yes_no', prompt: { es: '¿El I-360 del menor está aprobado?', en: null } },
    { id: q.bulletin, kind: 'yes_no', prompt: { es: '¿La fecha de prioridad del I-360 está vigente en el Visa Bulletin (EB-4)?', en: 'Is the I-360 priority date current in the Visa Bulletin (EB-4)?' } },
    { id: q.single, kind: 'yes_no', prompt: { es: '¿El menor sigue soltero?', en: null } },
    { id: q.removal, kind: 'yes_no', prompt: { es: '¿El menor tiene un proceso de deportación abierto o una orden final de deportación?', en: null } },
  ],
  partyRoles: [],
};
// Para contygo, «sí» a deportación descalifica; aquí basta con que «no» al boletín descalifique (como en producción).
const evaluate = call => {
  const answers = Object.fromEntries(call.json.answers.map(item => [item.questionId, item.value]));
  const bad = [q.i360, q.bulletin, q.single].filter(id => answers[id] === false).concat(answers[q.removal] === true ? [q.removal] : []);
  const missing = i485.eligibilityQuestions.map(item => item.id).filter(id => answers[id] === undefined);
  return { status: 200, body: { eligible: !bad.length && !missing.length, missingQuestionIds: missing, disqualifiedQuestionIds: bad, disqualified: bad.map(questionId => ({ questionId, reason: 'answer' })), notices: [], anchorYmd: null } };
};

let b, net;
const thisMonth = () => bulletinLib.currentMonth();
const october = { ...bulletinLib.EB4_SNAPSHOT };
const post = async body => (await POST(b.request('/api/agent/service-intake', { serviceId: 'i-485', ...body }))).json();
const say = (answers, field, answer) => post({ answers, field, answer });
test.beforeEach(() => {
  freshModules(); net = mockFetch(); contygoDefaults(net);
  net.on('GET', '/catalog', { status: 200, body: { services: [...catalog.services, i485] } });
  net.on('POST', '/eligibility/evaluate', evaluate);
  b = browser(); b.newIp(); calls = []; provider = async () => { throw new Error('offline'); };
  // El boletín del mes en curso, con la fila EB-4 de octubre de 2026: las pruebas no dependen de la fecha.
  bulletinLib.setBulletinForTests({ ...october, month: thisMonth() });
});
test.after(() => bulletinLib.setBulletinForTests(undefined));

// ---------------- Lectura de USCIS ----------------

test('USCIS: el índice dice qué tabla manda este mes y dónde está; la página trae la fila EB-4', () => {
  assert.deepEqual(bulletinLib.parseChartsIndex(INDEX), {
    chart: 'filing',
    chartUrl: 'https://www.uscis.gov/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/when-to-file-your-adjustment-of-status-application-for-family-sponsored-or-employment-based-129',
    bulletinUrl: 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/2027/visa-bulletin-for-october-2026.html',
  });
  const page = bulletinLib.parseChartPage(CHART);
  assert.equal(page.month, '2026-10');
  assert.equal(page.chart, 'filing');
  assert.deepEqual(page.columns.map(column => column.cutoff), ['2025-01-01', '2025-01-01', '2025-01-01', '2025-01-01', '2025-01-01']);
  assert.match(page.columns[0].header, /^All Chargeability/);
  assert.deepEqual(page.columns.map(({ header, cutoff }) => ({ header, cutoff })).slice(1).map(column => column.header), ['CHINA- mainland born', 'INDIA', 'MEXICO', 'PHILIPPINES']);
  assert.deepEqual(page, { month: october.month, chart: october.chart, columns: page.columns }, 'la copia verificada coincide con la página real');
  assert.deepEqual(page.columns.map(column => column.cutoff), october.columns.map(column => column.cutoff));
});

test('USCIS: fechas «01JAN25», «C» y «U»; un HTML distinto no se adivina', () => {
  assert.equal(bulletinLib.parseCutoff('01JAN25'), '2025-01-01');
  assert.equal(bulletinLib.parseCutoff('15DEC22'), '2022-12-15');
  assert.equal(bulletinLib.parseCutoff('C'), 'C');
  assert.equal(bulletinLib.parseCutoff('U'), 'U');
  assert.equal(bulletinLib.parseCutoff('2025-01-01'), null);
  assert.equal(bulletinLib.parseChartPage(CHART.replace('<th scope="row">4th</th>', '<th scope="row">Fourth</th>')), null, 'sin fila «4th» no hay dato');
  assert.equal(bulletinLib.parseChartPage(CHART.replace(/<td>01JAN25<\/td>/, '<td>pronto</td>')), null, 'una celda rara invalida la tabla');
  assert.equal(bulletinLib.parseChartsIndex(INDEX.replace(/Current Month/g, 'Este mes')), null);
});

test('USCIS: se descarga con memoria; si falla, la copia verificada; un mes viejo no se usa', async () => {
  bulletinLib.setBulletinForTests(undefined);
  const html = body => new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  const urls = [];
  global.fetch = async url => { urls.push(String(url)); return html(String(url).endsWith('filing-charts-from-the-visa-bulletin') ? INDEX : CHART); };
  const live = await bulletinLib.loadEb4Bulletin();
  assert.equal(live.source, 'live');
  assert.equal(live.month, '2026-10');
  assert.equal(urls.length, 2);
  await bulletinLib.loadEb4Bulletin();
  assert.equal(urls.length, 2, 'seis horas en memoria');
  bulletinLib.setBulletinForTests(undefined);
  global.fetch = async () => new Response('Attention Required! | Cloudflare', { status: 403 });
  const fallback = await bulletinLib.loadEb4Bulletin();
  assert.equal(fallback.source, 'snapshot');
  assert.equal(bulletinLib.isUsable({ ...october, month: '2026-10' }, new Date('2026-10-10T12:00:00Z')), true);
  assert.equal(bulletinLib.isUsable({ ...october, month: '2026-10' }, new Date('2026-11-02T12:00:00Z')), true, 'los primeros días vale el del mes anterior');
  assert.equal(bulletinLib.isUsable({ ...october, month: '2026-10' }, new Date('2026-12-01T12:00:00Z')), false);
  assert.equal(bulletinLib.isUsable({ ...october, month: '2026-12' }, new Date('2027-01-15T12:00:00Z')), true, 'cambio de año');
});

// ---------------- Veredicto ----------------

test('veredicto: anterior a la fecha de corte = vigente; igual o posterior = aún no; «C» y «U»', () => {
  const flow = (date, bulletin = october) => adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: date }, bulletin).verdict.status;
  assert.equal(flow('2024-12-31'), 'current');
  assert.equal(flow('2025-01-01'), 'waiting', 'USCIS: «earlier than the date on the chart»');
  assert.equal(flow('2025-06-01'), 'waiting');
  const withAll = cutoff => ({ ...october, columns: october.columns.map(column => ({ ...column, cutoff })) });
  assert.equal(flow('2026-01-01', withAll('C')), 'current');
  assert.equal(flow('2010-01-01', withAll('U')), 'waiting');
  assert.equal(adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: 'UNKNOWN' }, october).verdict.reason, 'date');
  assert.equal(adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: '2024-01-01' }, null).verdict.reason, 'bulletin');
  assert.equal(adjustment.normalizePriorityAnswer('no la tengo a mano'), 'UNKNOWN');
  assert.equal(adjustment.normalizePriorityAnswer('1985-01-01'), null, 'una fecha imposible no pasa');
  assert.equal(adjustment.normalizePriorityAnswer('2999-01-01'), null);
});

test('veredicto: el país solo se pregunta si cambia el resultado', () => {
  const split = { ...october, columns: october.columns.map(column => column.header === 'MEXICO' ? { ...column, cutoff: '2020-01-01' } : column) };
  const early = adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: '2019-05-05' }, split);
  assert.equal(early.questions.length, 1, 'vigente en todas las columnas: no pregunta el país');
  const between = adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: '2022-05-05' }, split);
  assert.equal(between.verdict, null);
  assert.equal(between.questions[1].text, '¿El menor nació en México?');
  const id = between.questions[1].id;
  const mexico = adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: '2022-05-05', [id]: true }, split).verdict;
  assert.deepEqual([mexico.status, mexico.country], ['waiting', 'México']);
  assert.match(adjustment.verdictMessage(mexico, split), /de personas nacidas en México con fecha de prioridad anterior al 1 de enero de 2020/);
  assert.equal(adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: '2022-05-05', [id]: false }, split).verdict.status, 'current');
});

// ---------------- La conversación ----------------

test('ajuste: pregunta la fecha de prioridad, la explica, dice el resultado y nunca hace la pregunta del boletín', async () => {
  const greeting = await post({ answers: {} });
  assert.equal(greeting.field, q.i360);
  assert.equal(greeting.total, 4, 'I-360, fecha de prioridad, soltero y deportación');
  assert.ok(greeting.scripts.some(text => text.startsWith('¡Buenas noticias!') && text.endsWith('¿El menor sigue soltero?')), 'el veredicto se precarga');
  for (const finish of Object.values(adjustment.ADJUSTMENT_FINISH).slice(0, 4)) assert.ok(greeting.scripts.includes(finish), finish);
  const date = await say(greeting.answers, q.i360, true);
  assert.equal(date.field, adjustment.PRIORITY_FIELD);
  assert.equal(date.question.kind, 'date');
  assert.equal(date.question.allowUnknown, true);
  assert.equal(date.question.unknownLabel, 'No la tengo a mano');
  assert.match(date.message, /la que el gobierno asigna a tu caso para saber cuándo puedes iniciar la residencia; por eso importa el boletín de visas\. Es la «Priority Date» del I-797\. Escríbela o dímela\.$/);
  assert.ok(date.message.split(/\s+/).length <= 37, 'cabe en la pantalla del celular con el calendario debajo');
  const single = await say(date.answers, adjustment.PRIORITY_FIELD, '2024-03-15');
  assert.equal(single.field, q.single);
  assert.match(single.message, /^¡Buenas noticias! En el boletín de visas de \S+ de \d{4}, USCIS acepta ajustes EB-4 con fecha de prioridad anterior al 1 de enero de 2025, y la del menor ya está dentro\. ¿El menor sigue soltero\?$/);
  assert.equal(single.answers[q.bulletin], true, 'la respuesta del boletín la calcula el servidor');
  const removal = await say(single.answers, q.single, true);
  assert.equal(removal.message, `Gracias. ${i485.eligibilityQuestions[3].prompt.es}`, 'el veredicto se dice una sola vez');
  const done = await say(removal.answers, q.removal, false);
  assert.equal(done.complete, true);
  assert.equal(done.eligible, true);
  assert.equal(done.message, adjustment.ADJUSTMENT_FINISH.current);
  assert.deepEqual(done.priority, { status: 'current', month: adjustment.monthLabel(thisMonth()), previo: false });
  assert.equal(done.guidance.title, 'La fecha de prioridad del menor está vigente');
  assert.ok(done.guidance.sources.some(source => /uscis\.gov/.test(source.url)));
  const sent = net.calls.filter(call => call.path === '/eligibility/evaluate').at(-1).json.answers;
  assert.deepEqual(sent, [{ questionId: q.i360, value: true }, { questionId: q.bulletin, value: true }, { questionId: q.single, value: true }, { questionId: q.removal, value: false }], 'la fecha no sale hacia contygo');
  assert.equal(calls.length, 0, 'los botones no usan Gemini');
});

test('ajuste: fecha próxima → «muy cerca», con la distancia, y el contrato previo para llegar listo', async () => {
  const base = { [q.i360]: true };
  const single = await say(base, adjustment.PRIORITY_FIELD, '2025-06-01');
  assert.match(single.message, /^Tu fecha está muy cerca: en el boletín de visas de \S+ de \d{4}, USCIS acepta ajustes EB-4 con fecha de prioridad anterior al 1 de enero de 2025, y la del menor está a solo 5 meses de esa fecha\. ¿El menor sigue soltero\?$/);
  assert.equal(single.answers[q.bulletin], false);
  // Lo que mande el navegador para la pregunta del boletín no cuenta.
  const forged = await post({ answers: { ...single.answers, [q.bulletin]: true } });
  assert.equal(forged.answers[q.bulletin], false);
  const done = await say({ ...single.answers, [q.single]: true }, q.removal, false);
  assert.equal(done.complete, true);
  assert.equal(done.eligible, false);
  assert.equal(done.message, adjustment.ADJUSTMENT_FINISH.near);
  assert.match(done.message, /muy cerca.*contrato previo.*siguiente vídeo.*garantías y la oferta/);
  assert.deepEqual([done.priority.status, done.priority.near, done.priority.previo], ['waiting', true, true]);
  assert.equal(done.guidance.title, 'Tu fecha de prioridad está muy cerca');
  assert.match(done.guidance.detail, /puede avanzar, detenerse o retroceder/, 'nunca promete un plazo');
});

test('ajuste: fecha aún en el futuro → otro tono, sin número, y el contrato previo', async () => {
  const single = await say({ [q.i360]: true }, adjustment.PRIORITY_FIELD, '2026-03-01');
  assert.match(single.message, /La del menor todavía está lejos de esa fecha, y el boletín cambia cada mes\. ¿El menor sigue soltero\?$/);
  const done = await say({ ...single.answers, [q.single]: true }, q.removal, false);
  assert.equal(done.message, adjustment.ADJUSTMENT_FINISH.far);
  assert.deepEqual([done.priority.near, done.priority.previo], [false, true]);
  assert.equal(done.guidance.title, 'Tu fecha de prioridad aún está en el futuro');
});

test('próxima: hasta NEAR_MONTHS después de la fecha del boletín; «U» nunca es próxima', () => {
  assert.equal(adjustment.NEAR_MONTHS, 6);
  assert.equal(adjustment.monthsAfter('2025-01-01', '2025-01-01'), 0);
  assert.equal(adjustment.monthsAfter('2025-01-01', '2025-01-02'), 1);
  assert.equal(adjustment.monthsAfter('2025-01-01', '2025-07-01'), 6);
  assert.equal(adjustment.monthsAfter('2025-01-01', '2025-07-02'), 7);
  const flow = (date, bulletin = october) => adjustment.adjustmentFlow({ [adjustment.PRIORITY_FIELD]: date }, bulletin).verdict;
  assert.equal(flow('2025-07-01').near, true);
  assert.equal(flow('2025-07-02').near, false);
  assert.equal(flow('2025-01-01').gapMonths, 0);
  assert.match(adjustment.verdictMessage(flow('2025-01-01'), october), /a solo un mes de esa fecha/);
  const unavailable = { ...october, columns: october.columns.map(column => ({ ...column, cutoff: 'U' })) };
  assert.equal(flow('2010-01-01', unavailable).near, undefined);
});

test('la fecha se puede escribir o decir: con el mes en palabras, como la imprime el I-797, o sin ambigüedad', () => {
  assert.equal(adjustment.parseWrittenDate('15 de marzo de 2024'), '2024-03-15');
  assert.equal(adjustment.parseWrittenDate('El 3 de Setiembre del 2023.'), '2023-09-03');
  assert.equal(adjustment.parseWrittenDate('March 15, 2024'), '2024-03-15');
  assert.equal(adjustment.parseWrittenDate('Mar 15 2024'), '2024-03-15');
  assert.equal(adjustment.parseWrittenDate('15/03/2024'), '2024-03-15');
  assert.equal(adjustment.parseWrittenDate('03/15/2024'), '2024-03-15', 'formato de EE. UU.');
  assert.equal(adjustment.parseWrittenDate('03/04/2024'), null, 'día y mes intercambiables: no se adivina');
  assert.equal(adjustment.parseWrittenDate('31 de febrero de 2024'), null);
  assert.equal(adjustment.normalizePriorityAnswer('15 de marzo de 2024'), '2024-03-15');
});

test('ajuste: una fecha escrita no necesita a Gemini; si es ambigua, la pregunta corta pide el mes en palabras', async () => {
  const typed = await say({ [q.i360]: true }, adjustment.PRIORITY_FIELD, '15 de marzo de 2024');
  assert.equal(typed.answers[adjustment.PRIORITY_FIELD], '2024-03-15');
  assert.equal(calls.length, 0);
  provider = async () => ({ text: JSON.stringify({ clear: false, value: '' }) });
  const ambiguous = await say({ [q.i360]: true }, adjustment.PRIORITY_FIELD, '03/04/2024');
  assert.equal(ambiguous.field, adjustment.PRIORITY_FIELD);
  assert.equal(ambiguous.message, `Necesito confirmar tu respuesta. Puedes elegir la fecha abajo o escribirla con el mes en palabras, por ejemplo «15 de marzo de 2024». ${adjustment.PRIORITY_RETRY}`);
  assert.match(calls[0].config.systemInstruction, /intercambiables/);
});

test('cierre del segundo vídeo: va de la mano con lo que dijo el agente', () => {
  const closing = require('../components/contygo/juvenil/closingSpeech.ts');
  const variant = priority => closing.closingVariant('i-485', priority);
  assert.equal(variant({ status: 'current', previo: false }), 'current');
  assert.equal(variant({ status: 'waiting', near: true, previo: true }), 'near');
  assert.equal(variant({ status: 'waiting', near: false, previo: true }), 'far');
  assert.equal(variant({ status: 'unknown', previo: true }), 'unknown');
  assert.equal(variant({ status: 'waiting', near: true, previo: false }), null, 'con otro reparo, el cierre general');
  assert.equal(closing.closingVariant('visa-juvenil', { status: 'current', previo: false }), null);
  assert.match(closing.closingScript('Ana', 'i-485', 'current'), /^Ana, tu próximo paso.*Tu fecha ya está vigente.*Toca Revisar mi contrato/);
  assert.match(closing.closingScript('', 'i-485', 'near'), /Tu fecha está muy cerca.*contrato previo.*Toca Revisar mi contrato/, 'el vídeo 2 termina con «Toca "Revisar mi contrato"»');
  assert.match(closing.closingScript('', 'i-485', 'far'), /Tu fecha aún está por llegar.*contrato previo.*Toca Revisar mi contrato/);
  const media = require('../lib/contygo-rebuild-media.ts');
  assert.deepEqual([media.getRebuildPlatformFilm('i-485').src, media.getRebuildPlatformFilm('i-485').duration], ['/contygo/films/ajuste-estatus-video2-v1-720p.mp4', 392.625]);
  assert.equal(media.getRebuildPlatformFilm('i-485').provisional, undefined, 'ya no es el clip provisional');
  assert.equal(closing.closingScript('', 'visa-juvenil'), closing.closingScript('', 'visa-juvenil', null), 'los demás servicios no cambian');
});

test('ajuste: «No la tengo a mano» dice dónde buscarla; con otro reparo de contygo no se ofrece el contrato previo', async () => {
  const unknown = await say({ [q.i360]: true }, adjustment.PRIORITY_FIELD, 'UNKNOWN');
  assert.match(unknown.message, /^No pasa nada\. Como referencia, en el boletín de visas de \S+ de \d{4} USCIS acepta ajustes EB-4/);
  assert.equal(q.bulletin in unknown.answers, false, 'sin fecha no se responde la pregunta del boletín');
  const typed = await say({ [q.i360]: true }, adjustment.PRIORITY_FIELD, 'no la tengo');
  assert.equal(typed.answers[adjustment.PRIORITY_FIELD], 'UNKNOWN');
  const done = await say({ ...unknown.answers, [q.single]: true }, q.removal, false);
  assert.equal(done.message, adjustment.ADJUSTMENT_FINISH.date);
  assert.deepEqual([done.priority.status, done.priority.previo], ['unknown', true]);
  // I-360 sin aprobar: manda la orientación general de contygo, no la de la fecha.
  const blocked = await say({ [q.i360]: false, [adjustment.PRIORITY_FIELD]: '2024-03-15', [q.single]: true }, q.removal, false);
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.priority.previo, false);
  assert.equal(blocked.guidance.title, 'Revisemos tu caso con más detalle');
});

test('ajuste: Gemini entiende «no sé» como UNKNOWN solo en la fecha de prioridad', async () => {
  provider = async () => ({ text: JSON.stringify({ clear: true, value: 'UNKNOWN' }) });
  const turn = await say({ [q.i360]: true }, adjustment.PRIORITY_FIELD, 'uf, el papel lo tiene mi tía');
  assert.equal(turn.answers[adjustment.PRIORITY_FIELD], 'UNKNOWN');
  assert.equal(JSON.parse(calls[0].contents[0].parts[0].text).allowUnknown, true);
  assert.match(calls[0].config.systemInstruction, /allowUnknown es true/);
});

test('ajuste: sin boletín confiable no hay veredicto ni contrato previo, y se dice', async () => {
  bulletinLib.setBulletinForTests({ ...october, month: '2001-01' });
  const turn = await say({ [q.i360]: true }, adjustment.PRIORITY_FIELD, '2024-03-15');
  assert.match(turn.message, /no pude confirmar el boletín de visas/);
  assert.equal(q.bulletin in turn.answers, false);
  const done = await say({ ...turn.answers, [q.single]: true }, q.removal, false);
  assert.deepEqual([done.priority.status, done.priority.reason, done.priority.previo, done.priority.month], ['unknown', 'bulletin', false, null]);
});
