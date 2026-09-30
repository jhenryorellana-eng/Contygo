// Banco de pruebas de la contratación por API: carga TypeScript y simula contygo
// (y Turnstile) con los ejemplos de la guía y del OpenAPI. El «navegador» guarda
// cookies solo para comprobar que el proxy sin estado no pone ninguna.
// Nunca conecta a contygo.app: fetch queda sustituido.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..', '..');
if (!global.__contygoLoader) {
  global.__contygoLoader = true;
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...args) {
    return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
  };
  for (const extension of ['.ts', '.tsx']) {
    require.extensions[extension] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
  }
  require.extensions['.css'] = mod => { mod.exports = {}; };
}

process.env.CONTYGO_API_KEY = 'cg_live_test_0000000000000000000000000000';
process.env.LANDING_TOKEN_SECRET = 'secreto-de-prueba-de-la-landing-000000000000';
process.env.CONTYGO_ALLOW_WRITES = '1'; // fetch está simulado: nada llega a contygo
delete process.env.CONTYGO_API_BASE;

const BASE = 'https://contygo.app/api/integrations/v1';
const ids = {
  visa: 'fbb0dc08-0000-4000-8000-000000000001', visaPlan: 'fbb0dc08-0000-4000-8000-0000000000a1', visaQ: 'fbb0dc08-0000-4000-8000-0000000000b1',
  apel: '163a31af-0000-4000-8000-000000000002', apelPlan: '163a31af-0000-4000-8000-0000000000a2', apelQ: '163a31af-0000-4000-8000-0000000000b2',
  itin: '758f682c-0000-4000-8000-000000000003', itinPlan: '758f682c-0000-4000-8000-0000000000a3',
  installment: 'fbb0dc08-0000-4000-8000-0000000000c1',
};
// Misma forma que GET /catalog real (29-09-2026, con el kind de cada pregunta), con ids de prueba.
const catalog = {
  services: [
    {
      id: ids.visa, slug: 'visa-juvenil-basico', name: { es: 'Visa Juvenil Básico', en: null },
      plans: [{ id: ids.visaPlan, name: { es: 'Básico', en: null }, priceCents: 250000, extraPartyPriceCents: 0,
        installmentOptions: [{ id: ids.installment, installmentCount: 5, downpaymentCents: 50000, frequency: 'monthly' }] }],
      eligibilityQuestions: [{ id: ids.visaQ, kind: 'yes_no', prompt: { es: '¿El menor tiene menos de 21 años y no está casado?', en: null } }],
      partyRoles: [
        { roleKey: 'lead', label: { es: 'Tutor', en: null }, cardinality: 'single', isRequired: true },
        { roleKey: 'minor', label: { es: 'Menor', en: null }, cardinality: 'multiple', isRequired: true },
        { roleKey: 'witness', label: { es: 'Testigo', en: null }, cardinality: 'multiple', isRequired: false },
      ],
    },
    {
      id: ids.apel, slug: 'apelacion', name: { es: 'Apelación (BIA)', en: null },
      plans: [{ id: ids.apelPlan, name: { es: 'Sin abogado', en: null }, priceCents: 70000, extraPartyPriceCents: 0, installmentOptions: [] }],
      eligibilityQuestions: [{ id: ids.apelQ, kind: 'date', prompt: { es: '¿Cuál es la fecha de la decisión del juez? (decisión final del caso)', en: null } }],
      partyRoles: [
        { roleKey: 'lead', label: { es: 'Líder', en: null }, cardinality: 'single', isRequired: true },
        { roleKey: 'companion', label: { es: 'Acompañante', en: null }, cardinality: 'multiple', isRequired: false },
      ],
    },
    {
      id: ids.itin, slug: 'itin-number', name: { es: 'Número ITIN', en: null },
      plans: [{ id: ids.itinPlan, name: { es: 'Individual', en: null }, priceCents: 25000, extraPartyPriceCents: 0, installmentOptions: [] }],
      eligibilityQuestions: [], partyRoles: [],
    },
  ],
};

const SIGNING_URL = 'https://contygo.app/firma/tok_SECRETO_de_prueba_6f1a';
const VERIFICATION_ID = 'n0LqRkS3x8cH1vPz-Yb7wQeT2mUj4FdA6Kg9Ns1Oi5E';

/** Sustituye fetch. `routes` decide cada respuesta; `calls` registra lo enviado. */
function mockFetch() {
  const calls = [];
  const handlers = [];
  const respond = (status, body, headers = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
  global.fetch = async (url, init = {}) => {
    const call = { url: String(url), method: init.method ?? 'GET', headers: { ...(init.headers ?? {}) }, body: init.body ?? null };
    call.path = call.url.startsWith(BASE) ? call.url.slice(BASE.length) : call.url;
    call.json = call.body ? JSON.parse(call.body) : null;
    calls.push(call);
    for (const handler of [...handlers].reverse()) {
      if (handler.method === call.method && (typeof handler.path === 'string' ? handler.path === call.path : handler.path.test(call.path))) {
        const result = await handler.fn(call, calls.filter(item => item.path === call.path && item.method === call.method).length);
        if (result instanceof Error) throw result;
        return respond(result.status, result.body, result.headers);
      }
    }
    throw new Error(`fetch no simulado: ${call.method} ${call.url}`);
  };
  const on = (method, pathOrRegex, fn) => { handlers.push({ method, path: pathOrRegex, fn: typeof fn === 'function' ? fn : () => fn }); };
  return { calls, on, reset: () => { calls.length = 0; handlers.length = 0; } };
}

/** Respuestas por defecto: las de los ejemplos de la guía (§4) y del OpenAPI. */
function contygoDefaults(net, { existingClient = false, warnings = [] } = {}) {
  net.on('GET', '/catalog', { status: 200, body: catalog, headers: { 'cache-control': 'private, max-age=60' } });
  net.on('POST', '/eligibility/evaluate', call => ({ status: 200, body: {
    eligible: call.json.answers.every(item => item.value !== false), missingQuestionIds: [], disqualifiedQuestionIds: call.json.answers.filter(item => item.value === false).map(item => item.questionId), notices: [], anchorYmd: null,
  } }));
  net.on('PUT', /^\/leads\//, (call, n) => ({ status: n === 1 ? 201 : 200, body: { leadId: '9b0e0000-0000-4000-8000-000000000001', created: n === 1, linked: false, status: 'open', contactedAt: null, warnings: [] } }));
  net.on('POST', '/contracts', call => {
    if (!call.json.verificationId) return { status: 409, body: { error: { code: 'CLIENT_VERIFICATION_REQUIRED', message: '…', details: { verificationId: VERIFICATION_ID, maskedEmail: 'a***@gmail.com', expiresAt: '2026-09-28T15:19:05Z' } } } };
    if (call.json.verificationCode !== '481920') return { status: 409, body: { error: { code: 'VERIFICATION_INVALID', message: '…', details: { attemptsLeft: 4 } } } };
    return { status: 201, body: { clientCreated: !existingClient, caseId: '44444444-4444-4444-8444-444444444444', caseNumber: 'U26-000133', contractId: '55555555-5555-4555-8555-555555555555', clientId: '66666666-6666-4666-8666-666666666666', signingUrl: SIGNING_URL, warnings } };
  });
  net.on('POST', 'https://challenges.cloudflare.com/turnstile/v0/siteverify', call => ({ status: 200, body: { success: call.json.response === 'token-ok', action: 'contratar', hostname: 'landing.invalid' } }));
}

/** Cookie jar mínimo para encadenar peticiones como un navegador. */
function browser() {
  const jar = new Map();
  const { NextRequest } = require('next/server');
  let ip = 10;
  return {
    jar,
    request(url, body, { headers = {}, method = 'POST' } = {}) {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      return new NextRequest(`https://landing.invalid${url}`, {
        method,
        headers: { origin: 'https://landing.invalid', 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${ip}`, ...(cookie ? { cookie } : {}), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    },
    keep(response) {
      for (const [name, value] of response.cookies.getAll().map(item => [item.name, item.value])) jar.set(name, value);
      return response;
    },
    newIp() { ip += 1; },
  };
}

/** Límites, caché del estado y catálogo vacíos antes de cada prueba. */
function freshModules() {
  require(path.join(root, 'lib/contygo-api/server.ts')).resetProxyMemory();
  require(path.join(root, 'lib/contygo-api/catalog.ts')).resetCatalogCache();
}

module.exports = { root, ids, catalog, BASE, SIGNING_URL, VERIFICATION_ID, mockFetch, contygoDefaults, browser, freshModules };
