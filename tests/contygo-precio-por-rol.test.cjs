// Precio por rol (contygo, 2026-10): plans[].pricingRules + paymentOptions[].byRoleCount.
// La landing solo elige una fila publicada; nunca suma ni combina dinero.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, catalog, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');
const pay = require('../lib/contygo-api/payment-options.ts');
const checkout = require('../lib/contygo-api/checkout.ts');
const catalogLib = require('../lib/contygo-api/catalog.ts');
const { outcomeMessage } = require('../lib/contygo-api/messages.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');

const row = (total, count, down, per, last) => ({
  totalCents: total, downpaymentCents: down, installmentCount: count, installmentsAfterDownpayment: count - 1, perInstallmentCents: per, lastInstallmentCents: last,
});
const OPT = 'fbb0dc08-0000-4000-8000-0000000000d1';
/** Premium $3,500 en 6 pagos; el rol «minor» es escalonado: 1 → 3,500 · 2 → 5,000 · 3 → 5,500 · 4+ → no cotizable. */
const quoted = (roleKey, count, total) => ({ roleKey, count, status: 'quoted', ...row(total, 6, 100000, Math.round((total - 100000) / 5), Math.round((total - 100000) / 5)) });
const notQuotable = (roleKey, count) => ({ roleKey, count, status: 'not_quotable' });
const tiered = roleKey => ({ roleKey, mode: 'tiered', includedCount: 0, unitPriceCents: null, beyondUnitPriceCents: null, tiers: [{ roleCount: 1, adjustmentCents: 0 }, { roleCount: 2, adjustmentCents: 150000 }, { roleCount: 3, adjustmentCents: 200000 }] });
const option = {
  installmentOptionId: OPT, isDefault: true, frequency: 'monthly', ...row(350000, 6, 100000, 50000, 50000),
  byRoleCount: [quoted('minor', 1, 350000), quoted('minor', 2, 500000), quoted('minor', 3, 550000), notQuotable('minor', 4), notQuotable('minor', 5)],
};
const plan = { id: 'p', extraPartyPriceCents: 0, pricingRules: [tiered('minor')], paymentOptions: [option] };
const minors = count => [{ role: 'lead' }, ...Array.from({ length: count }, () => ({ role: 'minor' })), { role: 'witness' }];

const clone = value => JSON.parse(JSON.stringify(value));
const withRolePricing = (patch = {}) => {
  const cat = clone(catalog);
  Object.assign(cat.services[0].plans[0], { pricingRules: [tiered('minor')], paymentOptions: [option] }, patch);
  return cat;
};

test.beforeEach(() => { freshModules(); delete process.env.TURNSTILE_SECRET_KEY; delete process.env.CONTYGO_WEBHOOK_SECRET; });

// ---------------- normalización ----------------

test('normalizador: pricingRules y byRoleCount válidos se conservan; lo mal formado se descarta', () => {
  const dirty = {
    ...option,
    byRoleCount: [
      quoted('minor', 2, 500000), notQuotable('minor', 4),
      { ...quoted('minor', 3, 550000), totalCents: '550000' }, // desglose inválido
      { ...quoted('minor', 1, 350000), count: 0 },              // cuenta fuera de rango
      { roleKey: 'minor', count: 6, status: 'maybe' },          // estado desconocido
      { count: 7, status: 'not_quotable' },                     // sin roleKey
      null, 'x',
    ],
  };
  const rules = [tiered('minor'), { roleKey: 'x', mode: 'weird' }, { ...tiered('y'), includedCount: -1 }, { mode: 'linear' }, null, 7];
  const normalized = pay.normalizePlan({ id: 'p', priceCents: 1, pricingRules: rules, paymentOptions: [dirty] });
  assert.deepEqual(normalized.pricingRules.map(rule => rule.roleKey), ['minor']);
  assert.deepEqual(normalized.paymentOptions[0].byRoleCount.map(item => `${item.roleKey}:${item.count}:${item.status}`), ['minor:2:quoted', 'minor:4:not_quotable']);
});

test('normalizador: sin reglas o con algo que no es una lista → [] y la opción sin byRoleCount', () => {
  assert.deepEqual(pay.normalizePlan({ id: 'p' }).pricingRules, []);
  assert.deepEqual(pay.normalizePlan({ id: 'p', pricingRules: 'x' }).pricingRules, []);
  const [odd] = pay.normalizePlan({ id: 'p', paymentOptions: [{ ...option, byRoleCount: 'x' }] }).paymentOptions;
  assert.equal('byRoleCount' in odd, false);
  const [empty] = pay.normalizePlan({ id: 'p', paymentOptions: [{ ...option, byRoleCount: [] }] }).paymentOptions;
  assert.equal('byRoleCount' in empty, false);
});

// ---------------- elección de la fila ----------------

test('la fila se elige por el número de menores: 1 → 3,500 · 2 → 5,000 · 3 → 5,500', () => {
  const total = count => {
    const quote = pay.quoteForPlan(plan, option, minors(count));
    assert.equal(quote.kind, 'row', `${count} menores`);
    return quote.row.totalCents;
  };
  assert.deepEqual([1, 2, 3].map(total), [350000, 500000, 550000]);
  assert.equal(pay.quoteForPlan(plan, option, minors(2)).row.installmentCount, 6, 'el desglose de pago es el de la fila');
});

test('4 menores o más → no cotizable; lead y testigos no cuentan; sin menores → números base', () => {
  assert.deepEqual(pay.quoteForPlan(plan, option, minors(4)), { kind: 'not_quotable', roleKey: 'minor', count: 4 });
  assert.equal(pay.quoteForPlan(plan, option, minors(5)).kind, 'not_quotable');
  assert.equal(pay.quoteForPlan(plan, option, [{ role: 'lead' }, { role: 'witness' }, { role: 'witness' }, { role: 'witness' }]).row, option, 'testigos y tutor: $0');
  assert.equal(pay.quoteForPlan(plan, option, []).row, option);
});

test('una cantidad sin fila publicada (ni not_quotable) no se inventa: unknown', () => {
  assert.deepEqual(pay.quoteForPlan(plan, option, minors(9)), { kind: 'unknown' });
  assert.deepEqual(pay.quoteForPlan(plan, { ...option, byRoleCount: undefined }, minors(2)), { kind: 'unknown' });
});

test('varios roles con regla a la vez: sin fila combinada no se calcula; se enseña el precio base', () => {
  const two = { ...plan, pricingRules: [tiered('minor'), tiered('spouse')] };
  const withSpouse = { ...option, byRoleCount: [...option.byRoleCount, quoted('spouse', 1, 400000)] };
  const quote = pay.quoteForPlan(two, withSpouse, [...minors(2), { role: 'spouse' }]);
  assert.equal(quote.kind, 'base_only');
  assert.equal(quote.row, withSpouse, 'los números base, sin sumar nada');
  // Un solo rol con personas → su fila, aunque haya dos reglas.
  assert.equal(pay.quoteForPlan(two, withSpouse, minors(2)).row.totalCents, 500000);
  // Si alguno es no cotizable, lo es en cualquier combinación.
  assert.deepEqual(pay.quoteForPlan(two, withSpouse, [...minors(4), { role: 'spouse' }]), { kind: 'not_quotable', roleKey: 'minor', count: 4 });
});

test('sin pricingRules se conserva el comportamiento legacy (extraPartyPriceCents + byExtraParties)', () => {
  const legacyRows = [{ ...row(300000, 6, 50000, 50000, 50000), extraPartyCount: 1 }];
  const legacyOption = { ...option, byRoleCount: undefined, byExtraParties: legacyRows };
  const legacyPlan = { extraPartyPriceCents: 5000, pricingRules: [] };
  assert.equal(pay.quoteForPlan(legacyPlan, legacyOption, [{ role: 'x' }]).row.totalCents, 300000);
  assert.deepEqual(pay.quoteForPlan(legacyPlan, legacyOption, [{ role: 'x' }, { role: 'x' }]), { kind: 'unknown' });
  assert.equal(pay.quoteForPlan({ extraPartyPriceCents: 0 }, legacyOption, minors(7)).row, legacyOption, 'sin precio por persona valen los base');
  // Con reglas, extraPartyPriceCents y byExtraParties se ignoran.
  const mixed = { ...legacyPlan, pricingRules: [tiered('minor')] };
  assert.equal(pay.quoteForPlan(mixed, { ...option, byExtraParties: legacyRows }, minors(2)).row.totalCents, 500000);
  assert.equal(pay.hasRolePricing(legacyPlan), false);
  assert.equal(pay.hasRolePricing(plan), true);
});

// ---------------- vista pública y petición ----------------

test('la vista pública conserva pricingRules y byRoleCount', () => {
  const [service] = pay.normalizeCatalog(withRolePricing().services);
  const view = catalogLib.publicServiceView(service);
  assert.deepEqual(view.plans[0].pricingRules.map(rule => rule.roleKey), ['minor']);
  assert.equal(view.plans[0].paymentOptions[0].byRoleCount.length, 5);
  assert.equal(view.plans[0].paymentOptions[0].byRoleCount[3].status, 'not_quotable');
});

test('una opción con id null sigue sin enviar el campo, también con precio por rol', () => {
  const plain = { ...option, installmentOptionId: null };
  const quoteRequest = selection => pay.installmentIdForRequest({ paymentOptions: [plain, { ...option, isDefault: false }] }, selection);
  assert.equal(quoteRequest(''), undefined);
  assert.equal(quoteRequest(OPT), OPT);
});

// ---------------- PRICE_NOT_QUOTABLE ----------------

test('422 PRICE_NOT_QUOTABLE se mapea a su propio paso, no a un error genérico', () => {
  const mapped = checkout.mapContractResponse({ status: 422, data: null, error: { code: 'PRICE_NOT_QUOTABLE', details: { roleKey: 'minor', count: 4 } }, retryAfter: null });
  assert.deepEqual(mapped, { step: 'PRICE_NOT_QUOTABLE' });
  const message = outcomeMessage(mapped);
  assert.equal(message.title, 'Para esa cantidad, consulta el precio con la oficina.');
  assert.match(message.detail, /WhatsApp/);
  assert.equal(pay.PAYMENT_NOTE_NOT_QUOTABLE, message.title, 'la tarjeta y el aviso dicen lo mismo');
});

test('el servidor deja pasar PRICE_NOT_QUOTABLE hasta el navegador y no avisa a ventas', async () => {
  const net = mockFetch(); contygoDefaults(net);
  net.on('GET', '/catalog', { status: 200, body: withRolePricing() });
  net.on('POST', '/contracts', () => ({ status: 422, body: { error: { code: 'PRICE_NOT_QUOTABLE', message: '…', details: { roleKey: 'minor', count: 4 } } } }));
  const b = browser();
  const body = {
    serviceId: 'visa-juvenil', externalRef: 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b', answers: { [ids.visaQ]: true }, attribution: {},
    idempotencyKey: crypto.randomUUID(), captchaToken: 'token-ok',
    form: {
      firstName: 'Ana', middleName: '', lastName: 'Pérez López', email: 'ana.perez@gmail.com', phone: '+13055550199',
      address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es', servicePlanId: ids.visaPlan, installmentOptionId: OPT,
      parties: Array.from({ length: 4 }, (_, index) => ({ role: 'minor', firstName: ['Luis', 'Marta', 'Pedro', 'Rosa'][index], lastName: 'Pérez' })),
      consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() },
    },
  };
  const response = await b.keep(await startRoute.POST(b.request('/api/contratar/iniciar', body)));
  const result = (await response.json()).outcome; assert.equal(result.step, 'PRICE_NOT_QUOTABLE', JSON.stringify(result));
  assert.equal(net.calls.filter(item => item.method === 'PUT' && item.path.startsWith('/leads/')).length <= 1, true);
});
