// Formas de pago: contygo calcula el desglose (plans[].paymentOptions); la landing solo elige la fila y la escribe.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const pay = require('../lib/contygo-api/payment-options.ts');
const checkout = require('../lib/contygo-api/checkout.ts');
const catalogLib = require('../lib/contygo-api/catalog.ts');
const serviceRoute = require('../app/api/contratar/servicio/route.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');

const row = (total, count, down, per, last, extra) => ({
  totalCents: total, downpaymentCents: down, installmentCount: count, installmentsAfterDownpayment: count - 1, perInstallmentCents: per, lastInstallmentCents: last, ...(extra === undefined ? {} : { extraPartyCount: extra }),
});
const OPT_A = 'fbb0dc08-0000-4000-8000-0000000000c1', OPT_B = 'fbb0dc08-0000-4000-8000-0000000000c2';
/** 6 pagos de $2,500: anticipo 500 + 5 de 400. */
const optionA = { installmentOptionId: OPT_A, isDefault: false, frequency: 'monthly', ...row(250000, 6, 50000, 40000, 40000) };
/** Con resto: 8 pagos, anticipo 500, 7 de 285.71 y el último de 285.74. */
const optionB = { installmentOptionId: OPT_B, isDefault: true, frequency: 'monthly', ...row(250000, 8, 50000, 28571, 28574) };
const single = { installmentOptionId: null, isDefault: true, frequency: 'monthly', ...row(10000, 1, 10000, 0, 0) };

const clone = value => JSON.parse(JSON.stringify(value));
const withPayments = (paymentOptions, patch = {}) => {
  const cat = clone(catalog);
  Object.assign(cat.services[0].plans[0], { paymentOptions }, patch);
  return cat;
};

test.beforeEach(() => { freshModules(); delete process.env.TURNSTILE_SECRET_KEY; delete process.env.CONTYGO_WEBHOOK_SECRET; });

// ---------------- elección de la fila ----------------

test('fila de números: k=0 son los base de la opción; k>0 su fila; sin fila → null', () => {
  const withRows = { ...optionA, byExtraParties: [row(300000, 6, 50000, 50000, 50000, 1), row(350000, 6, 50000, 60000, 60000, 2)] };
  assert.equal(pay.breakdownFor(withRows, 0), withRows);
  assert.equal(pay.breakdownFor(withRows, 1).totalCents, 300000);
  assert.equal(pay.breakdownFor(withRows, 2).perInstallmentCents, 60000);
  assert.equal(pay.breakdownFor(withRows, 3), null);
  assert.equal(pay.breakdownFor(optionA, 1), null, 'sin byExtraParties no se inventa nada');
  assert.equal(pay.breakdownFor(withRows, -1), null);
  assert.equal(pay.breakdownFor(withRows, 1.5), null);
});

test('fila por paquete: sin precio por persona adicional valen los números base; con precio y sin fila → null', () => {
  assert.equal(pay.breakdownForPlan({ extraPartyPriceCents: 0 }, optionA, 4), optionA);
  const withRows = { ...optionA, byExtraParties: [row(300000, 6, 50000, 50000, 50000, 1)] };
  assert.equal(pay.breakdownForPlan({ extraPartyPriceCents: 5000 }, withRows, 1).totalCents, 300000);
  assert.equal(pay.breakdownForPlan({ extraPartyPriceCents: 5000 }, withRows, 2), null);
});

test('opción por defecto: la isDefault, si no la primera, si no hay ninguna null', () => {
  assert.equal(pay.defaultPaymentOption({ paymentOptions: [optionA, optionB] }), optionB);
  assert.equal(pay.defaultPaymentOption({ paymentOptions: [optionA, { ...optionB, isDefault: false }] }), optionA);
  assert.equal(pay.defaultPaymentOption({ paymentOptions: [] }), null);
  assert.equal(pay.defaultPaymentOption({}), null);
  assert.equal(pay.defaultPaymentOption(undefined), null);
});

test('borrador restaurado: paquete inválido → el primero; opción inválida o ausente → la por defecto; id null → ""', () => {
  const plans = [{ id: 'p1', paymentOptions: [optionA, optionB] }, { id: 'p2', paymentOptions: [single] }, { id: 'p3' }];
  assert.deepEqual(pay.reconcileSelection(plans, 'p1', OPT_A), { planId: 'p1', installmentId: OPT_A }, 'una válida se respeta');
  assert.deepEqual(pay.reconcileSelection(plans, 'p1', 'ya-no-existe'), { planId: 'p1', installmentId: OPT_B });
  assert.deepEqual(pay.reconcileSelection(plans, 'p1', ''), { planId: 'p1', installmentId: OPT_B }, 'vacío con varias opciones → la por defecto');
  assert.deepEqual(pay.reconcileSelection(plans, 'borrado', OPT_A), { planId: 'p1', installmentId: OPT_B }, 'paquete inválido → el primero con su opción por defecto');
  assert.deepEqual(pay.reconcileSelection(plans, 'p2', 'x'), { planId: 'p2', installmentId: '' }, 'id null → ""');
  assert.deepEqual(pay.reconcileSelection(plans, 'p2', ''), { planId: 'p2', installmentId: '' });
  assert.deepEqual(pay.reconcileSelection(plans, 'p3', OPT_A), { planId: 'p3', installmentId: '' }, 'API antigua: sin opciones → ""');
  assert.deepEqual(pay.reconcileSelection([], 'p1', OPT_A), { planId: '', installmentId: '' });
});

test('el id de la petición: solo una opción con id lo envía; null se omite', () => {
  const plan = { paymentOptions: [optionA, optionB] };
  assert.equal(pay.installmentIdForRequest(plan, OPT_A), OPT_A);
  assert.equal(pay.installmentIdForRequest({ paymentOptions: [single] }, ''), undefined, 'id null → se omite (null es un 400)');
  assert.equal(pay.installmentIdForRequest(plan, 'otra'), undefined, 'una opción desconocida no viaja');
  assert.equal(pay.installmentIdForRequest({}, OPT_A), undefined, 'API antigua: nada que enviar');
});

// ---------------- textos ----------------

test('formato: sin decimales si es exacto, dos si no (una cuota nunca se redondea)', () => {
  assert.equal(pay.formatMoney(50000), '$500');
  assert.equal(pay.formatMoney(150000), '$1,500');
  assert.equal(pay.formatMoney(28571), '$285.71');
  assert.equal(pay.formatMoney(28570), '$285.70');
  assert.equal(pay.formatMoney(5), '$0.05');
});

test('texto: pago único = «Pago único» + total', () => {
  assert.deepEqual(pay.paymentLabel(single, 'monthly'), { title: 'Pago único', detail: 'Total $100', line: 'Pago único de $100' });
});

test('texto: cuota inicial + N-1 pagos; singular y plural; semanal; «el último» solo si difiere', () => {
  const equal = pay.paymentLabel(optionA, 'monthly');
  assert.equal(equal.title, 'Cuota inicial $500');
  assert.equal(equal.detail, 'luego 5 pagos mensuales de $400');
  assert.equal(equal.line, 'Cuota inicial $500, luego 5 pagos mensuales de $400');
  const remainder = pay.paymentLabel(optionB, 'monthly');
  assert.equal(remainder.detail, 'luego 7 pagos mensuales de $285.71, el último de $285.74');
  const one = pay.paymentLabel(row(100000, 2, 20000, 80000, 80000), 'monthly');
  assert.equal(one.detail, 'luego 1 pago mensual de $800', 'singular');
  const weekly = pay.paymentLabel(row(100000, 5, 20000, 20000, 20000), 'weekly');
  assert.equal(weekly.detail, 'luego 4 pagos semanales de $200');
  assert.equal(pay.paymentLabel(row(100000, 2, 20000, 80000, 80000), 'weekly').detail, 'luego 1 pago semanal de $800');
  // El conteo INCLUYE el anticipo: «6» son anticipo + 5, nunca «6 pagos» además del anticipo.
  assert.ok(!/6 pagos/.test(equal.line));
});

test('texto sin dinero cuando falta la fila, y nota de personas adicionales', () => {
  assert.equal(pay.paymentShape(single), 'Pago único');
  assert.equal(pay.paymentShape(optionA), 'Cuota inicial y 5 pagos mensuales');
  assert.equal(pay.paymentShape({ installmentCount: 2, installmentsAfterDownpayment: 1, frequency: 'weekly' }), 'Cuota inicial y 1 pago semanal');
  assert.equal(pay.extraPartiesNote(0, 5000), null);
  assert.equal(pay.extraPartiesNote(2, 0), null);
  assert.equal(pay.extraPartiesNote(1, 5000), 'Incluye 1 persona adicional');
  assert.equal(pay.extraPartiesNote(3, 5000), 'Incluye 3 personas adicionales');
});

// ---------------- normalizador ----------------

test('normalizador: arrays ausentes → [], opciones inválidas fuera, formas inválidas omitidas', () => {
  const bad = [
    { ...optionA, installmentOptionId: undefined }, // id ausente
    { ...optionA, installmentCount: 0 },
    { ...optionA, installmentsAfterDownpayment: 9 }, // incoherente con installmentCount
    { ...optionA, perInstallmentCents: -5 },
    { ...optionA, totalCents: '250000' },
    { ...optionA, frequency: 'daily' },
    { ...optionA, isDefault: 'yes' },
    null, 'x', 5,
  ];
  const good = { ...optionB, byExtraParties: [row(260000, 8, 50000, 30000, 30000, 1), { ...row(1, 1, 1, 0, 0), extraPartyCount: 0 }, { nope: true }] };
  const [plan] = pay.normalizeCatalog([{ id: 's', slug: 's', plans: [{ id: 'p', name: { es: 'P' }, priceCents: 1, paymentOptions: [...bad, good, single] }] }])
    .map(service => service.plans[0]);
  assert.deepEqual(plan.paymentOptions.map(option => option.installmentOptionId), [OPT_B, null]);
  assert.equal(plan.paymentOptions[0].byExtraParties.length, 1, 'solo la fila válida (k ≥ 1)');
  assert.deepEqual(plan.installmentOptions, []);
  assert.equal(plan.extraPartyPriceCents, 0);
  // byExtraParties que no es una lista → se omite el campo, no la opción.
  const [odd] = pay.normalizePlan({ id: 'p', paymentOptions: [{ ...optionA, byExtraParties: 'x' }] }).paymentOptions;
  assert.equal('byExtraParties' in odd, false);
  // paymentOptions que no es una lista → [].
  assert.deepEqual(pay.normalizePlan({ id: 'p', paymentOptions: { a: 1 } }).paymentOptions, []);
  // installmentOptions inválidas (sin id, frecuencia rara) se descartan; las válidas se conservan igual que hoy.
  const kept = pay.normalizePlan({ id: 'p', installmentOptions: [{ id: 'i1', installmentCount: 5, downpaymentCents: null, frequency: 'weekly' }, { id: '', installmentCount: 5, downpaymentCents: 1, frequency: 'weekly' }, { id: 'i3', installmentCount: 5, downpaymentCents: 1, frequency: 'x' }] });
  assert.deepEqual(kept.installmentOptions, [{ id: 'i1', installmentCount: 5, downpaymentCents: null, frequency: 'weekly' }]);
  // Servicios sin id/slug se ignoran; sin listas → [].
  const services = pay.normalizeCatalog([{ id: 's', slug: 'x' }, { slug: 'sin-id' }, null, 7]);
  assert.equal(services.length, 1);
  assert.deepEqual([services[0].plans, services[0].eligibilityQuestions, services[0].partyRoles], [[], [], []]);
});

test('un paquete sin installmentOptions ya no tumba /servicio ni la validación del checkout', async () => {
  const cat = clone(catalog);
  delete cat.services[0].plans[0].installmentOptions;
  const net = mockFetch(); contygoDefaults(net);
  net.on('GET', '/catalog', { status: 200, body: cat });
  const b = browser();
  const response = await b.keep(await serviceRoute.POST(b.request('/api/contratar/servicio', { serviceId: 'visa-juvenil' })));
  assert.equal(response.status, 200);
  const view = await response.json();
  assert.deepEqual(view.service.plans[0].installmentOptions, []);
  assert.deepEqual(view.service.plans[0].paymentOptions, []);
  const services = await catalogLib.loadCatalog();
  assert.equal(checkout.validateContractForm({ ...baseForm(), installmentOptionId: 'x' }, services[0]).ok, false);
  assert.equal(checkout.validateContractForm(baseForm(), services[0]).ok, true);
});

// ---------------- /servicio ----------------

test('/servicio pasa paymentOptions al navegador y conserva installmentOptions', async () => {
  const cat = withPayments([optionA, { ...optionB, byExtraParties: [row(260000, 8, 50000, 30000, 30000, 1)] }], { extraPartyPriceCents: 10000 });
  const net = mockFetch(); contygoDefaults(net);
  net.on('GET', '/catalog', { status: 200, body: cat });
  const b = browser();
  const view = await (await b.keep(await serviceRoute.POST(b.request('/api/contratar/servicio', { serviceId: 'visa-juvenil' })))).json();
  const plan = view.service.plans[0];
  assert.equal(plan.paymentOptions.length, 2);
  assert.deepEqual(plan.paymentOptions.map(option => option.installmentOptionId), [OPT_A, OPT_B], 'el orden del administrador');
  assert.equal(plan.paymentOptions[1].byExtraParties[0].totalCents, 260000);
  assert.deepEqual(plan.installmentOptions, catalog.services[0].plans[0].installmentOptions, 'installmentOptions intacto');
  assert.equal(plan.extraPartyPriceCents, 10000);
  assert.equal(b.jar.size, 0);
});

test('/servicio sin paymentOptions (API antigua) → [] y la ficha usa la nota del contrato', async () => {
  const net = mockFetch(); contygoDefaults(net);
  const view = await (await serviceRoute.POST(browser().request('/api/contratar/servicio', { serviceId: 'visa-juvenil' }))).json();
  assert.deepEqual(view.service.plans[0].paymentOptions, []);
  assert.equal(pay.defaultPaymentOption(view.service.plans[0]), null);
});

// ---------------- cuerpo de POST /contracts ----------------

async function sendStart(net, cat, form) {
  net.on('GET', '/catalog', { status: 200, body: cat });
  const b = browser();
  const body = {
    serviceId: 'visa-juvenil', externalRef: 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b', form: { ...baseForm(), ...form }, answers: { [ids.visaQ]: true },
    attribution: {}, idempotencyKey: crypto.randomUUID(), captchaToken: 'token-ok',
  };
  const response = await b.keep(await startRoute.POST(b.request('/api/contratar/iniciar', body)));
  return (await response.json()).outcome;
}
function baseForm() {
  return {
    firstName: 'Ana', middleName: '', lastName: 'Pérez López', email: 'ana.perez@gmail.com', phone: '+13055550199',
    address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es', servicePlanId: ids.visaPlan,
    parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez' }],
    consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() },
  };
}

test('POST /contracts lleva installmentOptionId solo cuando la opción elegida tiene id; nunca montos', async () => {
  const cat = withPayments([optionA, optionB]);
  const net = mockFetch(); contygoDefaults(net);
  const outcome = await sendStart(net, cat, { installmentOptionId: OPT_A });
  assert.equal(outcome.step, 'ASK_CODE');
  const [call] = net.calls.filter(item => item.path === '/contracts');
  assert.equal(call.json.installmentOptionId, OPT_A);
  assert.ok(!/totalCents|perInstallment|downpayment|amount/i.test(call.body), 'la landing no manda dinero');

  freshModules(); net.reset(); contygoDefaults(net);
  const none = await sendStart(net, withPayments([single]), {});
  assert.equal(none.step, 'ASK_CODE');
  assert.equal('installmentOptionId' in net.calls.filter(item => item.path === '/contracts')[0].json, false, 'id null → se omite');
});

test('el servidor acepta ids de paymentOptions (o de installmentOptions en catálogos antiguos) y rechaza los demás', async () => {
  const net = mockFetch(); contygoDefaults(net);
  assert.equal((await sendStart(net, withPayments([optionA, optionB]), { installmentOptionId: 'ajena' })).step, 'INVALID');
  freshModules(); net.reset(); contygoDefaults(net);
  // Catálogo antiguo: sin paymentOptions, el id vale si está en installmentOptions.
  assert.equal((await sendStart(net, catalog, { installmentOptionId: ids.installment })).step, 'ASK_CODE');
});
