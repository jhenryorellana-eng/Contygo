const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ids, catalog, SIGNING_URL, mockFetch, contygoDefaults, browser, freshModules } = require('./helpers/contygo-harness.cjs');

// Endurecimiento tras la revisión: etiquetas reales de us_state, canje sin esperar al catálogo, tolerancia de
// fechas, REQUEST_IN_PROGRESS, CAPTCHA del lead, límites con purga, caché de fallos y lista blanca de escrituras.
// Todo con fetch simulado: nada llega a contygo.app.

const checkout = require('../lib/contygo-api/checkout.ts');
const client = require('../lib/contygo-api/client.ts');
const catalogLib = require('../lib/contygo-api/catalog.ts');
const serverLib = require('../lib/contygo-api/server.ts');
const logLib = require('../lib/contygo-api/log.ts');
const agentServer = require('../lib/agent/server.ts');
const leadRoute = require('../app/api/contratar/lead/route.ts');
const startRoute = require('../app/api/contratar/iniciar/route.ts');
const confirmRoute = require('../app/api/contratar/confirmar/route.ts');
const pricesRoute = require('../app/api/contratar/precios/route.ts');

const EXTERNAL_REF = 'web-2f7c1b9e-8a41-4d7e-9f10-1c2d3e4f5a6b';
const uuid = () => crypto.randomUUID();
const { NextRequest } = require('next/server');

async function withEnv(patch, run) {
  const saved = {};
  for (const key of Object.keys(patch)) { saved[key] = process.env[key]; if (patch[key] === undefined) delete process.env[key]; else process.env[key] = patch[key]; }
  try { return await run(); } finally { for (const key of Object.keys(saved)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
}
/** Reloj simulado: Date.now() avanza solo cuando se le dice. */
function fakeClock() {
  const real = Date.now;
  let offset = 0;
  Date.now = () => real() + offset;
  return { advance: ms => { offset += ms; }, restore: () => { Date.now = real; } };
}
function captureConsole() {
  const lines = { log: [], warn: [], error: [] };
  const original = { log: console.log, warn: console.warn, error: console.error };
  for (const level of Object.keys(lines)) console[level] = (...args) => lines[level].push(args.map(String).join(' '));
  return { lines, restore: () => Object.assign(console, original) };
}

const contractForm = (patch = {}) => ({
  firstName: 'Ana', lastName: 'Pérez López', email: 'ana.perez@e2e.local', phone: '(305) 555-0199',
  address: { line1: '100 Main St', city: 'Miami', state: 'FL', zip: '33101' }, locale: 'es',
  servicePlanId: ids.visaPlan, parties: [{ role: 'minor', firstName: 'Luis', lastName: 'Pérez', dateOfBirth: '2014-04-03' }],
  consent: { accepted: true, at: new Date(Date.now() - 30_000).toISOString() }, ...patch,
});
const startBody = (patch = {}) => ({
  serviceId: 'visa-juvenil', externalRef: EXTERNAL_REF, form: contractForm(), answers: { [ids.visaQ]: true },
  idempotencyKey: uuid(), captchaToken: 'token-ok', ...patch,
});
const leadBody = (patch = {}) => ({ serviceId: 'visa-juvenil', externalRef: EXTERNAL_REF, displayName: 'Ana Pérez', phone: '+1 305 555 0199', answers: { [ids.visaQ]: true }, ...patch });
const post = async (route, b, url, body) => b.keep(await route.POST(b.request(url, body)));
const leadPuts = net => net.calls.filter(call => call.method === 'PUT' && call.path.startsWith('/leads/'));
const catalogCalls = net => net.calls.filter(call => call.path === '/catalog');
const SITE = { NEXT_PUBLIC_SITE_URL: 'https://landing.invalid' };
const SECRET = 'secret-not-a-dummy-0000000000000000';

let net;
test.beforeEach(() => {
  freshModules();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.CONTYGO_CHECKOUT_ENABLED;
  net = mockFetch(); contygoDefaults(net);
});

// ---------------- 1 · etiquetas reales de us_state: {code, name: {es, en}} ----------------

test('us_state: contygo publica {code, name:{es,en}}; el rótulo sale de name (label queda como respaldo)', () => {
  const real = { id: 'q1', kind: 'us_state', prompt: { es: '¿En qué estado vives?', en: null },
    options: [{ code: 'TX', name: { es: 'Texas', en: 'Texas' } }, { code: 'NY', name: { es: 'Nueva York', en: 'New York' } }, { code: 'GU', name: { es: null, en: 'Guam' } }] };
  const view = catalogLib.publicQuestion(real);
  assert.deepEqual(view.options, [{ code: 'TX', label: 'Texas' }, { code: 'NY', label: 'Nueva York' }, { code: 'GU', label: 'Guam' }]);
  const legacy = catalogLib.publicQuestion({ ...real, options: [{ code: 'FL', label: { es: 'Florida', en: 'Florida' } }, { code: 'OH', label: 'Ohio' }, { code: 'WY' }] });
  assert.deepEqual(legacy.options, [{ code: 'FL', label: 'Florida' }, { code: 'OH', label: 'Ohio' }, { code: 'WY', label: 'WY' }]);
  // Y se puede responder con el nombre tal cual lo rotula contygo.
  assert.equal(checkout.normalizeAnswer({ kind: 'state', options: real.options }, 'Nueva York'), 'NY');
  assert.equal(checkout.normalizeAnswer({ kind: 'state', options: real.options }, 'new york'), 'NY');
});

// ---------------- 2 · el canje no espera al catálogo ----------------

test('/confirmar canjea el código sin pedir el catálogo antes; el nombre del servicio solo se busca si hay que avisar', async () => {
  const b = browser();
  const ask = (await (await post(startRoute, b, '/api/contratar/iniciar', startBody())).json()).outcome;
  assert.equal(ask.step, 'ASK_CODE');
  // Instancia fría (sin catálogo) y catálogo caído.
  catalogLib.resetCatalogCache();
  net.on('GET', '/catalog', { status: 500, body: { error: { code: 'INTERNAL' } } });
  const sent = net.calls.length;
  const ok = (await (await post(confirmRoute, b, '/api/contratar/confirmar', { body: ask.body, verificationId: ask.verificationId, ticket: ask.ticket, code: '481920', idempotencyKey: uuid() })).json()).outcome;
  assert.equal(ok.step, 'SIGN');
  assert.equal(net.calls.slice(sent).some(call => call.path === '/catalog'), false, 'un canje que sale bien no toca el catálogo');

  // Si contygo pide una persona, el nombre se busca DESPUÉS del canje y su fallo no estorba.
  net.on('POST', '/contracts', call => call.json.verificationCode
    ? { status: 409, body: { error: { code: 'CLIENT_NEEDS_HUMAN', message: '…' } } }
    : { status: 409, body: { error: { code: 'X' } } });
  catalogLib.resetCatalogCache();
  const mark = net.calls.length;
  const human = (await (await post(confirmRoute, b, '/api/contratar/confirmar', { body: ask.body, verificationId: ask.verificationId, ticket: ask.ticket, code: '481920', idempotencyKey: uuid() })).json()).outcome;
  assert.equal(human.step, 'HUMAN');
  const after = net.calls.slice(mark);
  const redeem = after.findIndex(call => call.path === '/contracts');
  const lookup = after.findIndex(call => call.path === '/catalog');
  assert.ok(redeem === 0, 'el canje es lo primero que sale');
  assert.ok(lookup > redeem, 'el catálogo, si se pide, va después');
  assert.equal(leadPuts(net).length >= 1, true, 'el aviso al lead sale aunque el catálogo falle');
});

// ---------------- 3 · fechas: un día de tolerancia por la zona horaria ----------------

test('fechas: la UTC de hoy y la del navegador pueden diferir un día; se tolera en los dos sentidos', () => {
  const today = '2026-10-05';
  const future = { kind: 'date', dateMode: 'future_event' }, past = { kind: 'date', dateMode: 'birthdate' };
  assert.equal(checkout.normalizeAnswer(future, '2026-10-05', today), '2026-10-05');
  assert.equal(checkout.normalizeAnswer(future, '2026-10-04', today), '2026-10-04', 'ayer UTC = hoy en América');
  assert.equal(checkout.normalizeAnswer(future, '2026-10-03', today), null, 'dos días atrás ya no es un hecho por venir');
  assert.equal(checkout.normalizeAnswer(past, '2026-10-05', today), '2026-10-05');
  assert.equal(checkout.normalizeAnswer(past, '2026-10-06', today), '2026-10-06', 'mañana UTC = hoy al este de UTC');
  assert.equal(checkout.normalizeAnswer(past, '2026-10-07', today), null, 'dos días adelante sigue siendo el futuro');
  // Cruces de mes y de año.
  assert.equal(checkout.isTodayOrFutureDate('2026-12-31', '2027-01-01'), true);
  assert.equal(checkout.isTodayOrFutureDate('2026-12-30', '2027-01-01'), false);
  assert.equal(checkout.isPastOrTodayDate('2027-01-01', '2026-12-31'), true);
  assert.equal(checkout.isPastOrTodayDate('2027-01-02', '2026-12-31'), false);
  assert.equal(checkout.isPastOrTodayDate('2026-03-01', '2026-02-28'), true);
});

// ---------------- 4 · REQUEST_IN_PROGRESS es «ocupado» ----------------

test('mapContractResponse: REQUEST_IN_PROGRESS = IN_PROGRESS (ocupado, no error)', () => {
  const response = { status: 409, data: null, error: { code: 'REQUEST_IN_PROGRESS' }, retryAfter: 2 };
  assert.deepEqual(checkout.mapContractResponse(response, 'second'), { step: 'RETRY_LATER', reason: 'busy', retryAfter: 2 });
  assert.deepEqual(checkout.mapContractResponse({ ...response, retryAfter: null }, 'first'), { step: 'RETRY_LATER', reason: 'busy', retryAfter: 1 });
});

// ---------------- 5 · /lead con CAPTCHA (acción «lead») ----------------

function turnstile(net, { action = 'lead', hostname = 'landing.invalid', token = 'lead-ok' } = {}) {
  net.on('POST', 'https://challenges.cloudflare.com/turnstile/v0/siteverify', call => ({ status: 200, body: { success: call.json.response === token, action, hostname } }));
}

test('/lead en producción: sin token o con token malo, 403 y nada llega al CRM', async () => {
  turnstile(net);
  await withEnv({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: SECRET, ...SITE }, async () => {
    const b = browser();
    const missing = await post(leadRoute, b, '/api/contratar/lead', leadBody());
    assert.equal(missing.status, 403);
    assert.match((await missing.json()).error, /^captcha_(missing|failed)$/);
    const bad = await post(leadRoute, b, '/api/contratar/lead', leadBody({ captchaToken: 'token-malo' }));
    assert.equal(bad.status, 403);
    assert.equal((await bad.json()).error, 'captcha_failed');
    assert.equal(leadPuts(net).length, 0);
    const ok = await post(leadRoute, b, '/api/contratar/lead', leadBody({ captchaToken: 'lead-ok' }));
    assert.equal(ok.status, 200);
    assert.equal(leadPuts(net).length, 1);
    const verify = net.calls.filter(call => call.url.includes('siteverify')).at(-1);
    assert.equal(verify.json.secret, SECRET);
  });
});

test('/lead: un token de otra acción (contratar) no vale; sin clave en producción, 503', async () => {
  turnstile(net, { action: 'contratar' });
  await withEnv({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: SECRET, ...SITE }, async () => {
    const res = await post(leadRoute, browser(), '/api/contratar/lead', leadBody({ captchaToken: 'lead-ok' }));
    assert.equal(res.status, 403, 'el token de /iniciar no sirve para /lead');
    assert.equal(leadPuts(net).length, 0);
  });
  await withEnv({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: undefined, ...SITE }, async () => {
    const res = await post(leadRoute, browser(), '/api/contratar/lead', leadBody({ captchaToken: 'lead-ok' }));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'captcha_not_configured');
    assert.equal(leadPuts(net).length, 0);
  });
});

test('/lead fuera de producción sin TURNSTILE_SECRET_KEY: se omite, como hasta ahora', async () => {
  await withEnv({ NODE_ENV: 'development', TURNSTILE_SECRET_KEY: undefined }, async () => {
    const res = await post(leadRoute, browser(), '/api/contratar/lead', leadBody());
    assert.equal(res.status, 200);
    assert.equal(leadPuts(net).length, 1);
  });
});

test('/iniciar sigue exigiendo la acción «contratar»', async () => {
  turnstile(net, { action: 'lead', token: 'token-ok' });
  await withEnv({ TURNSTILE_SECRET_KEY: SECRET, ...SITE }, async () => {
    assert.equal((await post(startRoute, browser(), '/api/contratar/iniciar', startBody())).status, 403, 'un token de /lead no abre /iniciar');
  });
});

// ---------------- 6 · IPv6 por /64, purga por ventana y tope ----------------

const reqWith = ip => new NextRequest('https://landing.invalid/api/x', { headers: { 'x-forwarded-for': ip } });

test('clientIp agrupa IPv6 por /64 (los dos clientIp) y deja IPv4 igual', () => {
  for (const clientIp of [serverLib.clientIp, agentServer.clientIp]) {
    const a = clientIp(reqWith('2001:db8:abcd:12:1:2:3:4'));
    assert.equal(a, clientIp(reqWith('2001:DB8:abcd:12::9')), 'mismo /64');
    assert.equal(a, clientIp(reqWith('2001:db8:abcd:0012:ffff:ffff:ffff:ffff, 10.0.0.1')));
    assert.notEqual(a, clientIp(reqWith('2001:db8:abcd:13:1:2:3:4')), 'otro /64');
    assert.equal(clientIp(reqWith('198.51.100.7, 10.0.0.1')), '198.51.100.7');
    assert.equal(clientIp(reqWith('::ffff:198.51.100.7')), '198.51.100.7');
    assert.equal(clientIp(reqWith('[2001:db8::1]')), clientIp(reqWith('2001:db8::2')));
  }
});

test('checkLimits purga por ventana vencida (no por 24 h) y tiene tope', () => {
  const clock = fakeClock();
  try {
    for (let i = 0; i < 3000; i++) serverLib.checkLimits([{ key: `a:${i}`, windowSeconds: 60, max: 5 }]);
    assert.equal(serverLib.limitsSize(), 3000);
    clock.advance(61_000);
    serverLib.checkLimits([{ key: 'fresh', windowSeconds: 60, max: 5 }]);
    assert.ok(serverLib.limitsSize() <= 2, `las ventanas vencidas se purgan (hay ${serverLib.limitsSize()})`);
    // Con ventanas largas (nada vence) el tamaño no crece sin fin.
    for (let i = 0; i < 30_000; i++) serverLib.checkLimits([{ key: `b:${i}`, windowSeconds: 3600, max: 5 }]);
    assert.ok(serverLib.limitsSize() <= 10_000, `tope (hay ${serverLib.limitsSize()})`);
    // Los límites siguen funcionando: la entrada reciente sigue contando.
    const key = 'recent';
    for (let i = 0; i < 5; i++) assert.equal(serverLib.checkLimits([{ key, windowSeconds: 3600, max: 5 }]), null);
    assert.equal(serverLib.checkLimits([{ key, windowSeconds: 3600, max: 5 }]).status, 429);
  } finally { clock.restore(); }
});

test('los cubos de lib/agent/server.ts también se purgan y tienen tope', () => {
  const clock = fakeClock();
  try {
    for (let i = 0; i < 3000; i++) assert.equal(agentServer.rateLimit(`ip:${i}`, 5, 60_000), true);
    clock.advance(61_000);
    agentServer.rateLimit('nuevo', 5, 60_000);
    assert.ok(agentServer.bucketsSize() <= 2, `purga (hay ${agentServer.bucketsSize()})`);
    for (let i = 0; i < 30_000; i++) agentServer.rateLimit(`largo:${i}`, 5, 3_600_000);
    assert.ok(agentServer.bucketsSize() <= 10_000, `tope (hay ${agentServer.bucketsSize()})`);
    for (let i = 0; i < 5; i++) assert.equal(agentServer.rateLimit('reciente', 5, 3_600_000), true);
    assert.equal(agentServer.rateLimit('reciente', 5, 3_600_000), false);
  } finally { clock.restore(); }
});

test('/confirmar valida el ticket ANTES de crear la clave por verificación', async () => {
  const b = browser();
  const ask = (await (await post(startRoute, b, '/api/contratar/iniciar', startBody())).json()).outcome;
  const base = serverLib.limitsSize();
  const bogus = { body: ask.body, verificationId: 'X'.repeat(40), ticket: '9999999999.firma-falsa', code: '481920', idempotencyKey: uuid() };
  const res = await post(confirmRoute, b, '/api/contratar/confirmar', bogus);
  assert.equal((await res.json()).outcome.step, 'RESTART');
  assert.equal(serverLib.limitsSize() - base, 1, 'solo la clave por IP; la de verificación no se crea con un ticket falso');
  const good = { body: ask.body, verificationId: ask.verificationId, ticket: ask.ticket, code: '000000', idempotencyKey: uuid() };
  const before = serverLib.limitsSize();
  await post(confirmRoute, b, '/api/contratar/confirmar', good);
  assert.equal(serverLib.limitsSize() - before, 1, 'con ticket válido sí se crea la clave por verificación (la de IP ya existía)');
  // El techo por verificación sigue en pie: 8 intentos y el siguiente es 429.
  let last;
  for (let i = 0; i < 9; i++) last = await post(confirmRoute, b, '/api/contratar/confirmar', { ...good, idempotencyKey: uuid() });
  assert.equal(last.status, 429);
});

// ---------------- 7 · caché de fallos del catálogo, /precios y el log de configuración ----------------

test('loadCatalog guarda los fallos 30-60 s; no los de plazo; sirve la copia vieja si la hay', async () => {
  const clock = fakeClock();
  try {
    net.on('GET', '/catalog', { status: 500, body: { error: { code: 'INTERNAL' } } });
    await assert.rejects(catalogLib.loadCatalog(), { name: 'CatalogUnavailableError', code: 'INTERNAL' });
    const n = catalogCalls(net).length;
    await assert.rejects(catalogLib.loadCatalog(), { name: 'CatalogUnavailableError', code: 'INTERNAL' });
    await assert.rejects(catalogLib.loadCatalog(), { name: 'CatalogUnavailableError' });
    assert.equal(catalogCalls(net).length, n, 'dentro de la ventana no se vuelve a llamar a contygo');
    clock.advance(61_000);
    await assert.rejects(catalogLib.loadCatalog());
    assert.ok(catalogCalls(net).length > n, 'pasada la ventana se reintenta');

    // Un plazo agotado es cosa de esa petición, no del catálogo: no se guarda.
    catalogLib.resetCatalogCache();
    const m = catalogCalls(net).length;
    await assert.rejects(catalogLib.loadCatalog({ deadline: Date.now() + 100 }), { code: 'DEADLINE' });
    net.on('GET', '/catalog', { status: 200, body: catalog });
    assert.equal((await catalogLib.loadCatalog()).length, 3, 'una petición con más plazo sí llega a contygo');
    assert.equal(catalogCalls(net).length, m + 1);

    // Con copia vieja se sigue sirviendo, y el fallo también se recuerda.
    clock.advance(6 * 60_000);
    net.on('GET', '/catalog', { status: 500, body: { error: { code: 'INTERNAL' } } });
    assert.equal((await catalogLib.loadCatalog()).length, 3, 'copia vieja');
    const k = catalogCalls(net).length;
    assert.equal((await catalogLib.loadCatalog()).length, 3);
    assert.equal(catalogCalls(net).length, k, 'ni siquiera con copia vieja se insiste dentro de la ventana');
  } finally { clock.restore(); }
});

test('/precios: un catálogo caído no se multiplica por petición (ni con otra query)', async () => {
  net.on('GET', '/catalog', { status: 500, body: { error: { code: 'INTERNAL' } } });
  const log = captureConsole();
  try {
    for (let i = 0; i < 6; i++) assert.equal((await pricesRoute.GET(new NextRequest(`https://landing.invalid/api/contratar/precios?x=${i}`))).status, 503);
  } finally { log.restore(); }
  assert.equal(catalogCalls(net).length, 1);
});

test('[contygo:config]: a lo sumo una línea por código y minuto en cada instancia', () => {
  const clock = fakeClock();
  const log = captureConsole();
  try {
    for (let i = 0; i < 20; i++) logLib.logConfig('catalog', 'FORBIDDEN');
    logLib.logConfig('eligibility', 'FORBIDDEN');
    logLib.logConfig('catalog', 'UNAUTHORIZED');
    assert.deepEqual(log.lines.error, ['[contygo:config] catalog FORBIDDEN', '[contygo:config] catalog UNAUTHORIZED']);
    clock.advance(61_000);
    logLib.logConfig('catalog', 'FORBIDDEN');
    assert.equal(log.lines.error.length, 3);
    logLib.logConfig('x', 'raro; <script>');
    assert.equal(log.lines.error.at(-1), '[contygo:config] x raroscript');
  } finally { log.restore(); clock.restore(); }
});

// ---------------- 8 · writesBlocked como lista blanca; la clave solo va a contygo.app en producción ----------------

test('SEC-08 · writesBlocked: lista blanca (localhost/127.0.0.1) fuera de producción', async () => {
  const none = { VERCEL_ENV: undefined, CONTYGO_ALLOW_WRITES: undefined, CONTYGO_API_BASE: undefined };
  const blocked = (patch, expected, label) => withEnv({ ...none, ...patch }, () => {
    assert.equal(client.writesBlocked('POST', '/contracts'), expected, label);
    assert.equal(client.writesBlocked('PUT', '/leads/web-x'), expected, label);
  });
  const api = host => `${host}/api/integrations/v1`;
  await blocked({ CONTYGO_API_BASE: api('http://localhost:3999') }, false, 'localhost');
  await blocked({ CONTYGO_API_BASE: api('http://127.0.0.1:3999') }, false, '127.0.0.1');
  await blocked({ CONTYGO_API_BASE: api('https://contygo.app.') }, true, 'contygo.app. con punto final');
  await blocked({ CONTYGO_API_BASE: api('https://contygo.app') }, true, 'contygo.app');
  await blocked({ CONTYGO_API_BASE: api('https://x-legal-prod.vercel.app') }, true, 'el alias vercel.app de producción');
  await blocked({ CONTYGO_API_BASE: api('https://dev.contygo.example') }, true, 'un host DEV cualquiera ya no abre nada');
  await blocked({ CONTYGO_API_BASE: api('http://203.0.113.9') }, true, 'una IP');
  await blocked({ CONTYGO_API_BASE: api('http://localhost.evil.example') }, true, 'localhost como prefijo');
  await blocked({ CONTYGO_API_BASE: api('http://127.0.0.1.evil.example') }, true, '127.0.0.1 como prefijo');
  await blocked({ CONTYGO_API_BASE: 'no es una url' }, true, 'base inválida');
  await blocked({ VERCEL_ENV: 'preview', CONTYGO_API_BASE: api('https://contygo.app.') }, true, 'preview con punto final');
  await blocked({ VERCEL_ENV: 'preview', CONTYGO_API_BASE: api('http://127.0.0.1:3999') }, false, 'preview contra un simulador local');
  await blocked({ VERCEL_ENV: 'production' }, false, 'producción');
  await blocked({ CONTYGO_ALLOW_WRITES: '1' }, false, 'prueba coordinada');
  await withEnv({ ...none, CONTYGO_API_BASE: api('https://dev.contygo.example') }, () => {
    assert.equal(client.writesBlocked('GET', '/catalog'), false);
    assert.equal(client.writesBlocked('POST', '/eligibility/evaluate'), false);
  });
});

test('SEC-08 · en producción CONTYGO_API_BASE se ignora salvo que su host sea exactamente contygo.app', async () => {
  const bases = [
    'https://evil.example/api/integrations/v1',
    'https://contygo.app.evil.example/api/integrations/v1',
    'http://127.0.0.1:3999/api/integrations/v1',
    'http://contygo.app/api/integrations/v1',
    'https://user:pw@contygo.app/api/integrations/v1',
    'https://contygo.app:8443/api/integrations/v1',
    'https://contygo.app/api/integrations/v1',
    'https://contygo.app./api/integrations/v1',
    'https://CONTYGO.APP/api/integrations/v1',
  ];
  for (const base of bases) {
    await withEnv({ VERCEL_ENV: 'production', CONTYGO_API_BASE: base }, async () => {
      const sent = net.calls.length;
      await client.contygoApi.catalog();
      const url = new URL(net.calls[sent].url);
      assert.equal(url.hostname, 'contygo.app', `la clave solo va a contygo.app: ${base} → ${url}`);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.port, '');
      assert.equal(url.username, '');
    });
  }
  // El enlace de firma de confianza sigue la misma regla.
  await withEnv({ VERCEL_ENV: 'production', CONTYGO_API_BASE: 'http://127.0.0.1:3999/api/integrations/v1', NODE_ENV: 'development' }, () => {
    assert.equal(checkout.isTrustedSigningUrl(SIGNING_URL), true);
    assert.equal(checkout.isTrustedSigningUrl('http://127.0.0.1:3999/firma/x'), false);
  });
  await withEnv({ VERCEL_ENV: undefined, CONTYGO_API_BASE: 'http://127.0.0.1:3999/api/integrations/v1', NODE_ENV: 'development' }, () => {
    assert.equal(checkout.isTrustedSigningUrl('http://127.0.0.1:3999/firma/x'), true, 'en local sigue valiendo');
    assert.equal(checkout.isTrustedSigningUrl(SIGNING_URL), false);
  });
});

// ---------------- 9 · Turnstile: acción exacta y hostname en lista blanca ----------------

test('SEC-09 · verifyCaptcha exige action exacta y hostname permitido', async () => {
  const verify = (answer, { action = 'contratar', env = {} } = {}) => withEnv({ TURNSTILE_SECRET_KEY: SECRET, NODE_ENV: 'production', ...SITE, ...env }, async () => {
    net.on('POST', 'https://challenges.cloudflare.com/turnstile/v0/siteverify', { status: 200, body: answer });
    return serverLib.verifyCaptcha('tok', '198.51.100.9', action);
  });
  const ok = { success: true, action: 'contratar', hostname: 'landing.invalid' };
  assert.deepEqual(await verify(ok), { ok: true, code: 'captcha_ok' });
  assert.equal((await verify({ ...ok, action: 'lead' })).code, 'captcha_failed', 'otra acción');
  assert.equal((await verify({ ...ok, action: '' })).code, 'captcha_failed', 'acción vacía');
  assert.equal((await verify({ success: true, hostname: 'landing.invalid' })).code, 'captcha_failed', 'sin acción');
  assert.equal((await verify({ ...ok, hostname: undefined })).code, 'captcha_failed', 'sin hostname');
  assert.equal((await verify({ ...ok, hostname: 'evil.example' })).code, 'captcha_failed', 'otro host');
  assert.equal((await verify({ ...ok, hostname: 'localhost' })).code, 'captcha_failed', 'localhost en producción');
  assert.equal((await verify({ ...ok, success: false })).code, 'captcha_failed');
  assert.deepEqual(await verify({ ...ok, action: 'lead' }, { action: 'lead' }), { ok: true, code: 'captcha_ok' }, 'la acción esperada la fija quien llama');
  assert.equal((await verify({ ...ok, hostname: 'LANDING.INVALID.' })).ok, true, 'sin distinguir mayúsculas ni punto final');
  // Fuera de producción, localhost y 127.0.0.1 valen.
  for (const hostname of ['localhost', '127.0.0.1']) assert.equal((await verify({ ...ok, hostname }, { env: { NODE_ENV: 'development' } })).ok, true, hostname);
  assert.equal((await verify({ ...ok, hostname: 'evil.example' }, { env: { NODE_ENV: 'development' } })).ok, false);
  // Las claves de prueba de Cloudflare (solo fuera de producción) devuelven su propio hostname.
  const dummy = '1x0000000000000000000000000000000AA';
  assert.equal((await verify({ ...ok, hostname: 'example.com' }, { env: { NODE_ENV: 'development', TURNSTILE_SECRET_KEY: dummy } })).ok, true);
  // …y tampoco devuelven acción: la receta de desarrollo con las claves de prueba tiene que pasar.
  assert.equal((await verify({ success: true, hostname: 'example.com' }, { env: { NODE_ENV: 'development', TURNSTILE_SECRET_KEY: dummy }, action: 'lead' })).ok, true, 'clave de prueba sin acción');
  assert.equal((await verify({ ...ok, hostname: 'example.com' }, { env: { TURNSTILE_SECRET_KEY: dummy } })).ok, false, 'en producción no hay excepción');
  assert.equal((await verify({ success: true, hostname: 'landing.contygo.app' }, { env: { TURNSTILE_SECRET_KEY: dummy } })).ok, false, 'en producción, sin acción no vale');
});
