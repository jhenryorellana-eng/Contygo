// El link de cada servicio (/visa-juvenil, /apelacion-bia, /llc-florida…), para los anuncios y para mandárselo
// a un cliente: abre la landing con la guía del servicio ya en pantalla, conserva la dirección del embudo
// antiguo y su vista previa (og:image) es la de ese servicio. Sin red: render estático.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { CONTYGO_SERVICES } = require('../lib/contygo-catalog.ts');
const { SERVICES } = require('../lib/services.ts');
const { getServiceGuideUrl } = require('../lib/contygo.ts');
const { getRebuildServiceFilm } = require('../lib/contygo-rebuild-media.ts');
const page = require('../app/[slug]/page.tsx');
const ContygoLanding = require('../components/contygo/v7/ContygoLanding.tsx').default;

const root = path.resolve(__dirname, '..');
const links = CONTYGO_SERVICES.map(service => getServiceGuideUrl(service.id));

/** Ancho y alto de un JPEG, leídos de su marcador SOF. */
function jpegSize(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.readUInt16BE(0), 0xffd8, `${file} no es JPEG`);
  for (let at = 2; at < bytes.length;) {
    const marker = bytes.readUInt16BE(at);
    if (marker >= 0xffc0 && marker <= 0xffc3) return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  throw new Error(`${file} sin marcador SOF`);
}

test('cada uno de los doce servicios tiene su link; los del embudo antiguo conservan su dirección', () => {
  assert.equal(new Set(links).size, 12);
  for (const service of CONTYGO_SERVICES) assert.equal(getServiceGuideUrl(service.id), `/${service.legacySlug ?? service.slug}`, service.id);
  // Los anuncios y los links ya enviados apuntan a estas direcciones: ninguna se pierde.
  for (const legacy of SERVICES) assert.ok(links.includes(`/${legacy.slug}`), legacy.slug);
  assert.deepEqual(page.generateStaticParams(), links.map(link => ({ slug: link.slice(1) })));
  assert.equal(page.dynamicParams, false, 'un slug que no existe da 404');
  for (const id of ['unknown', '__proto__', 'constructor']) assert.equal(getServiceGuideUrl(id), null);
});

test('ningún link queda tapado por un redirect o una ruta fija, y el slug de contygo.app y el id llegan a él', async () => {
  const { default: config } = await import(pathToFileURL(path.join(root, 'next.config.mjs')).href);
  const redirects = new Map((await config.redirects()).map(item => [item.source, item.destination]));
  const routes = fs.readdirSync(path.join(root, 'app'), { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.name.startsWith('[')).map(entry => `/${entry.name}`);
  for (const link of links) {
    assert.ok(!redirects.has(link), `${link} redirige a otro sitio`);
    assert.ok(!routes.includes(link), `${link} choca con una ruta fija`);
  }
  for (const service of CONTYGO_SERVICES) {
    const link = getServiceGuideUrl(service.id);
    for (const alias of new Set([`/${service.slug}`, `/${service.id}`])) {
      assert.equal(alias === link ? link : redirects.get(alias), link, `${alias} → ${link}`);
    }
  }
});

test('el link abre la landing con su servicio: ese y no otro', () => {
  for (const service of CONTYGO_SERVICES) {
    const element = page.default({ params: { slug: getServiceGuideUrl(service.id).slice(1) } });
    assert.equal(element.type, ContygoLanding, service.id);
    assert.deepEqual(element.props, { initialServiceId: service.id }, service.id);
  }
});

test('la vista previa de WhatsApp: nombre del servicio e imagen propia de 1200×630', () => {
  for (const service of CONTYGO_SERVICES) {
    const link = getServiceGuideUrl(service.id);
    const metadata = page.generateMetadata({ params: { slug: link.slice(1) } });
    assert.equal(metadata.title, `${service.name} · ContyGo`);
    assert.equal(metadata.robots, undefined, 'se indexa como antes lo hacía el embudo');
    assert.equal(metadata.alternates.canonical, link);
    assert.equal(metadata.openGraph.url, link);
    const [image] = metadata.openGraph.images;
    assert.equal(image.url, `/contygo/compartir/${service.id}.jpg`);
    assert.deepEqual(jpegSize(path.join(root, 'public', image.url)), { width: 1200, height: 630 }, service.id);
    assert.deepEqual(metadata.twitter.images, [image.url]);
    // Solo promete un vídeo el servicio que lo tiene; los demás abren directamente en las preguntas.
    assert.equal(metadata.description.includes('guía en vídeo'), Boolean(getRebuildServiceFilm(service.id).src), service.id);
  }
});

test('ViewContent al llegar por el link: espera al Pixel (y al consentimiento), dispara una sola vez y se rinde a los 30 s', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { trackBrowserWhenReady } = require('../lib/meta/pixel-client.ts');
  const storage = new Map();
  const calls = [];
  global.window = { localStorage: { getItem: key => storage.get(key) ?? null }, setTimeout: (fn, ms) => setTimeout(fn, ms) };
  const pixelLoads = () => { window.fbq = (...args) => calls.push(args); };
  const data = { content_ids: ['apelacion'] };
  try {
    // Con consentimiento guardado: el Pixel llega después del primer efecto.
    storage.set('meta_consent', 'granted');
    trackBrowserWhenReady('ViewContent', data);
    assert.equal(calls.length, 0);
    t.mock.timers.tick(1000);
    pixelLoads();
    t.mock.timers.tick(5000);
    assert.deepEqual(calls, [['track', 'ViewContent', data]]);

    // Acepta el banner a los 5 s: el evento sale entonces.
    calls.length = 0; delete window.fbq; storage.clear();
    trackBrowserWhenReady('ViewContent', data);
    t.mock.timers.tick(5000);
    storage.set('meta_consent', 'granted'); pixelLoads();
    t.mock.timers.tick(500);
    assert.equal(calls.length, 1);

    // Sin consentimiento en 30 s: no sale nunca, ni aunque se acepte después.
    calls.length = 0; delete window.fbq; storage.clear();
    trackBrowserWhenReady('ViewContent', data);
    t.mock.timers.tick(31_000);
    storage.set('meta_consent', 'granted'); pixelLoads();
    t.mock.timers.tick(60_000);
    assert.equal(calls.length, 0);
  } finally { delete global.window; }
});

test('al entrar por el link, el marino de marca tapa la landing hasta que se abre la guía; sin link, no hay velo', () => {
  const linked = renderToStaticMarkup(React.createElement(ContygoLanding, { initialServiceId: 'apelacion' }));
  assert.match(linked, /data-open="true" aria-hidden="true">/);
  assert.match(linked, /<noscript><style>\.[^{]+\{display:none\}<\/style><\/noscript>/, 'sin JavaScript la guía no abre: el velo no puede tapar la landing');
  const plain = renderToStaticMarkup(React.createElement(ContygoLanding));
  assert.doesNotMatch(plain, /data-open=/);
  const unknown = renderToStaticMarkup(React.createElement(ContygoLanding, { initialServiceId: 'no-existe' }));
  assert.doesNotMatch(unknown, /data-open=/);
});
