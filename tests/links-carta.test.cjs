// /links, la «carta de servicios» del equipo (23-11-2026): cada servicio con su precio vivo y su link. El precio de
// un servicio nunca se escribe en la carta (se lee de la plataforma); y ningún servicio visible puede faltar en ella.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { VISIBLE_SERVICES } = require('../lib/contygo-catalog.ts');
const { LANDING_NEEDS } = require('../lib/agent/landing-chat-ui.ts');
const { LINK_SECTIONS, LINKS_HOST } = require('../lib/contygo-links.ts');
const root = path.join(__dirname, '..');
const items = LINK_SECTIONS.flatMap(section => section.items);

test('la carta lleva todos los servicios visibles, una vez, con su link corto y su figura', () => {
  const slugs = items.filter(item => item.slug).map(item => item.slug);
  assert.deepEqual([...slugs].sort(), VISIBLE_SERVICES.map(service => service.slug).sort());
  assert.equal(new Set(items.map(item => item.key)).size, items.length);
  for (const item of items) {
    assert.ok(!/^https?:/.test(item.url) && !item.url.endsWith('/'), item.url);
    assert.ok(fs.existsSync(path.join(root, 'public/contygo/v8', `${item.art}.webp`)), item.art);
    assert.ok(item.about.length > 20 && item.say.endsWith(':'), item.name);
  }
  for (const url of ['club.contygo.app', 'citas.contygo.app', 'contygo.app/entrar', LINKS_HOST]) assert.ok(items.some(item => item.url === url), url);
});

test('el precio de un servicio no está escrito en la carta; «más pedido» son los tres del asistente', () => {
  for (const item of items.filter(item => item.slug)) assert.equal(item.plans, undefined, item.name);
  assert.deepEqual(items.filter(item => item.top).map(item => item.key).sort(), LANDING_NEEDS.filter(need => need.top).map(need => need.ids[0]).sort());
});

test('la página se dibuja sin precios inventados y no es para los buscadores', () => {
  const LinksMenu = require('../components/contygo/links/LinksMenu.tsx').default;
  const html = renderToStaticMarkup(React.createElement(LinksMenu));
  assert.match(html, /Carta de servicios/);
  // Un botón por servicio (más la línea del pie que lo explica), y el mismo mensaje directo a WhatsApp.
  assert.equal((html.match(/>Copiar mensaje</g) || []).length, items.length);
  assert.equal((html.match(/href="https:\/\/wa\.me\/\?text=/g) || []).length, items.length);
  // Lo que el cliente pregunta después sale del catálogo, bajo «Qué incluye».
  assert.equal((html.match(/>Qué incluye</g) || []).length, items.filter(item => item.slug).length);
  assert.equal((html.match(/Más pedido/g) || []).length, 3);
  // Sin los precios vivos solo se ven los del Club y la asesoría, que son productos aparte.
  assert.deepEqual([...new Set(html.match(/\$[\d,]+/g))].sort(), ['$150', '$25', '$250']);
  assert.match(fs.readFileSync(path.join(root, 'app/links/page.tsx'), 'utf8'), /robots: \{ index: false, follow: false \}/);
  assert.match(fs.readFileSync(path.join(root, 'app/robots.ts'), 'utf8'), /"\/links"/);
});
