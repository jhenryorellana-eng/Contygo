const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Carga las rutas TypeScript sin generar archivos ni conectarse a Supabase.
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (mod, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  mod._compile(output, filename);
};

process.env.SUPABASE_URL = 'https://supabase.invalid';
process.env.SUPABASE_ANON_KEY = 'test-public-key';
process.env.SUPABASE_ADMIN_SECRET = 'test-secret-only-not-a-production-credential';
const { NextRequest } = require('next/server');
const identity = require('../lib/lead-identity.ts');
const capture = require('../app/api/contacts/capture/route.ts');
const whatsapp = require('../app/ir/whatsapp/route.ts');
const cid = '10000000-0000-4000-8000-000000000001';
const otherCid = '10000000-0000-4000-8000-000000000002';
const calls = [];
const originalFetch = global.fetch;
global.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  assert.equal(url.host, 'supabase.invalid');
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ path: url.pathname, body });
  let data;
  if (url.pathname.endsWith('/ulp_assign_advisor_secure')) data = [{ id: 'advisor-a', name: 'A', whatsapp: '15555550100' }];
  else if (url.pathname.endsWith('/ulp_crm_contact_create')) data = cid;
  else if (url.pathname.endsWith('/ulp_crm_contact_get')) data = [{ id: cid, advisor_id: 'advisor-b' }];
  else if (url.pathname.endsWith('/ulp_advisors')) {
    const id = url.searchParams.get('id').slice(3);
    data = [{ id, name: id, whatsapp: id === 'advisor-b' ? '15555550200' : '15555550100' }];
  } else if (url.pathname.endsWith('/ulp_record_lead')) data = body.p_id;
  else assert.fail(`Unexpected request: ${url.pathname}`);
  return Response.json(data);
};
test.after(() => { global.fetch = originalFetch; });

test('la cookie firmada rechaza cambios, otro propósito y vencimiento', () => {
  const token = identity.encodeLeadCookie(cid, 'contact');
  assert.equal(identity.readLeadCookie(token, 'contact'), cid);
  assert.equal(identity.readLeadCookie(token.replace(cid, otherCid), 'contact'), null);
  assert.equal(identity.readLeadCookie(token, 'visitor'), null);
  assert.equal(identity.readLeadCookie(cid, 'contact'), null);
  const now = Date.now;
  Date.now = () => now() + 31 * 864e5;
  try { assert.equal(identity.readLeadCookie(token, 'contact'), null); }
  finally { Date.now = now; }
});

test('captura y WhatsApp mantienen la asesora del contacto y envían el primer clic', async () => {
  calls.length = 0;
  const saved = await capture.POST(new NextRequest('https://landing.invalid/api/contacts/capture', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1' },
    body: JSON.stringify({ name: 'Cliente de prueba', phone: '15555550300', serviceId: 'itin', answers: {} }),
  }));
  assert.equal(saved.status, 200);
  assert.equal(saved.cookies.get('ulp_adv').value, 'advisor-b');
  assert.equal(identity.readLeadCookie(saved.cookies.get('ulp_cid').value, 'contact'), cid);
  const cookie = saved.cookies.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const before = calls.length;
  const result = await whatsapp.GET(new NextRequest('https://landing.invalid/ir/whatsapp?svc=itin', {
    headers: { cookie, 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '192.0.2.1' },
  }));
  assert.equal(result.status, 302);
  // /ir/whatsapp ya no reparte por asesoras: siempre va al único número (lib/config.ts) y no toca la base de ULP.
  assert.ok(result.headers.get('location').startsWith('https://wa.me/13853927656'));
  assert.equal(calls.length, before);
});

test('una cookie de contacto falsificada no cambia el destino ni consulta el historial', async () => {
  calls.length = 0;
  const result = await whatsapp.GET(new NextRequest('https://landing.invalid/ir/whatsapp', {
    headers: { cookie: `ulp_cid=${cid}`, 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '192.0.2.2' },
  }));
  assert.ok(result.headers.get('location').startsWith('https://wa.me/13853927656'));
  assert.equal(calls.length, 0);
});

test('los bots no consumen turnos ni registran clics', async () => {
  calls.length = 0;
  const result = await whatsapp.GET(new NextRequest('https://landing.invalid/ir/whatsapp', {
    headers: { 'user-agent': 'facebookexternalhit/1.1', 'x-forwarded-for': '192.0.2.3' },
  }));
  assert.equal(result.status, 302);
  assert.equal(calls.length, 0);
});
