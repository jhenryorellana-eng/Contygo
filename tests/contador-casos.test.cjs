// El contador de casos (24-11-2026): creados, pendientes y ganados por servicio. Lo lleva el encargado con su link, queda
// escrito quién y cuándo, y es lo que el marcador de la presentación en vivo enseña. Nunca una cifra de muestra fuera
// del modo ejemplo.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { VISIBLE_SERVICES } = require('../lib/contygo-catalog.ts');

test('las cifras se limpian: solo los servicios del catálogo, números enteros y dentro de rango', () => {
  const { cleanRows, counterTotals, COUNTER_SERVICES, MAX_CASES } = require('../lib/case-counter.ts');
  assert.deepEqual(COUNTER_SERVICES.map(service => service.id), VISIBLE_SERVICES.map(service => service.id));
  const rows = cleanRows({ 'permiso-de-trabajo': { created: 212.4, pending: '64', won: 141 }, llc: { created: -4, pending: 2.6, won: null }, inventado: { created: 9, pending: 9, won: 9 }, asilo: { created: 1e9, pending: NaN, won: Infinity } });
  assert.deepEqual(Object.keys(rows), VISIBLE_SERVICES.map(service => service.id));
  assert.deepEqual(rows['permiso-de-trabajo'], { created: 212, pending: 0, won: 141 });
  assert.deepEqual(rows.llc, { created: 0, pending: 3, won: 0 });
  assert.deepEqual(rows.asilo, { created: MAX_CASES, pending: 0, won: 0 });
  assert.equal('inventado' in rows, false);
  assert.deepEqual(counterTotals(cleanRows({ itin: { created: 5, pending: 2, won: 3 }, llc: { created: 1, pending: 1, won: 0 } })), { created: 6, pending: 3, won: 3 });
  assert.deepEqual(cleanRows('no').itin, { created: 0, pending: 0, won: 0 });
});

test('lo cambia el dueño con su sesión o el encargado con la llave de su link; nadie más', () => {
  const before = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = 'una-clave-de-prueba';
  try {
    const { counterKey, canEditCounter } = require('../lib/case-counter.ts');
    const key = counterKey();
    assert.match(key, /^[A-Za-z0-9_-]{26}$/);
    assert.equal(key.includes('una-clave'), false);
    const request = headers => ({ headers: { get: name => headers[name.toLowerCase()] ?? null }, cookies: { get: () => undefined } });
    assert.equal(canEditCounter(request({ 'x-contador-llave': key })), 'keeper');
    assert.equal(canEditCounter(request({ 'x-contador-llave': key.slice(0, -1) + (key.endsWith('A') ? 'B' : 'A') })), null);
    assert.equal(canEditCounter(request({})), null);
    process.env.ADMIN_PASSWORD = 'otra-clave';
    assert.notEqual(counterKey(), key, 'cambiar la contraseña del panel cambia el link');
    delete process.env.ADMIN_PASSWORD;
    assert.equal(counterKey(), null);
  } finally { if (before === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = before; }
});

test('la ruta pide permiso antes de leer o guardar, y guarda quién y cuándo', () => {
  const route = fs.readFileSync('app/api/admin/cases/route.ts', 'utf8'), lib = fs.readFileSync('lib/case-counter.ts', 'utf8');
  for (const method of ['GET', 'PUT']) { const body = route.slice(route.indexOf(`export async function ${method}`)); assert.ok(body.indexOf('canEditCounter(req)') > 0 && body.indexOf('canEditCounter(req)') < body.indexOf(method === 'GET' ? 'loadCounter()' : 'saveCounter('), method); }
  assert.match(route, /who === "owner" && key \? \{ editUrl/);
  assert.match(lib, /updatedAt: at, updatedBy: who/);
  assert.match(lib, /"contador\/casos\.json"/);
});

test('la página del encargado y el panel no son públicos, y el aviso de cookies no los tapa', () => {
  assert.match(fs.readFileSync('app/contador/page.tsx', 'utf8'), /robots: \{ index: false, follow: false \}/);
  assert.match(fs.readFileSync('app/robots.ts', 'utf8'), /"\/contador"/);
  const { isInternalPath } = require('../lib/meta/events.ts');
  for (const path of ['/contador', '/links', '/admin', '/admin/felicitaciones', '/equipo']) assert.equal(isInternalPath(path), true, path);
  for (const path of ['/', '/permiso', '/califica', '/linksalgo', null]) assert.equal(isInternalPath(path), false, String(path));
  assert.match(fs.readFileSync('components/admin/CaseCounterCard.tsx', 'utf8'), /Copiar link para Andrium/);
});

test('el marcador en vivo sale del contador; las cifras de muestra, solo en modo ejemplo', () => {
  const show = fs.readFileSync('components/contygo/v7/CongratsShow.tsx', 'utf8');
  assert.match(show, /fetch\("\/api\/admin\/cases"/);
  assert.ok(show.includes('const board: Score | null = sample ? SCORE_SAMPLE : score &&'));
  assert.match(show, /Casos creados[\s\S]*En proceso[\s\S]*Ganados/);
  assert.match(show, /qr-landing\.png/);
  assert.ok(fs.existsSync('public/contygo/qr-landing.png'));
  const { SCORE_SAMPLE } = require('../lib/contygo-results.ts');
  assert.equal(SCORE_SAMPLE.totals.created, SCORE_SAMPLE.rows.reduce((sum, row) => sum + row.created, 0));
});
