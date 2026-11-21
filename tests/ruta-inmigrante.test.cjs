// «La ruta del inmigrante» (14-11-2026): la portada sigue el brief del dueño «Landing ContyGo: categorías y servicios»
// (13-11-2026). Cinco pasos, con el catálogo como paso 1; las certificaciones (Simulador ContyGo) solo se anuncian.
// Lo que el dueño aún no ha dado (OWNER_PENDING) no se inventa: ni «gratis», ni lugares que quedan, ni precios.
// 21-11-2026: el paso 1 ya no es una vitrina y dos carpetas: sus servicios van en cinco tramos (lib/contygo-tiers.ts),
// cada paso es una hoja con sus boletos y, al final, «De la mano de Henry Orellana».
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { VISIBLE_SERVICES } = require('../lib/contygo-catalog.ts');
const { ROUTE_STEPS, ROUTE_SERVICE_IDS, OWNER_PENDING, ALLIES, DRIVERS_LICENCE, stepOpen, stepServices } = require('../lib/contygo-route.ts');
const { via, COMMUNITY_URL, APPOINTMENT_URL } = require('../lib/config.ts');
const { TIERS, TIER_SERVICE_IDS, TIER_BLURBS } = require('../lib/contygo-tiers.ts');
const ContygoLanding = require('../components/contygo/v7/ContygoLanding.tsx').default;

const page = renderToStaticMarkup(React.createElement(ContygoLanding));

test('cinco pasos en el orden del brief; el primero conserva #servicios y un paso está disponible si ya tiene un servicio', () => {
  assert.deepEqual(ROUTE_STEPS.map(step => [step.id, step.name]), [
    ['servicios', 'Migratorio'], ['finanzas', 'Finanzas'], ['certificaciones', 'Certificaciones'], ['negocios', 'Negocios'], ['patrimonio', 'Patrimonio e inversión'],
  ]);
  // El catálogo decide: ITIN y taxes ya se ofrecen (Finanzas) y la LLC también (Negocios).
  assert.deepEqual(ROUTE_STEPS.map(stepOpen), [true, true, false, true, false]);
  for (const id of ROUTE_SERVICE_IDS) assert.ok(VISIBLE_SERVICES.some(item => item.id === id), `${id} está en el sitio`);
  assert.equal(new Set(ROUTE_SERVICE_IDS).size, ROUTE_SERVICE_IDS.length, 'un servicio vive en un solo paso');
  for (const step of ROUTE_STEPS) assert.ok(page.includes(`id="${step.id}"`) && page.includes(`href="#${step.id}"`), `${step.name}: su estación y su entrada en el itinerario`);
});

test('ningún servicio del sitio se queda sin tarjeta, esté en el paso que esté', () => {
  for (const service of VISIBLE_SERVICES.filter(item => !item.season)) assert.ok(page.includes(`Conocer ${service.name}`), service.id);
});

test('la portada dice lo del brief: la promesa, las tres formas, la ruta, los aliados y el aviso del registro', () => {
  for (const text of ['Consultor de inmigración registrado en Utah', '¿Cómo te ayudamos', 'Haz tu trámite en la app', 'ContyGo Club', 'Una conversación para ti', 'Orientación, no asesoría legal',
    'Cinco pasos para crecer', 'Elige tu tramo', DRIVERS_LICENCE.name, DRIVERS_LICENCE.note, `Con ${DRIVERS_LICENCE.partner}`,
    'No vendemos seguros, inversiones, préstamos ni propiedades', 'Nuestros aliados', ALLIES[0].name, 'Reg. 14304807-IC00', 'El registro no constituye un aval del Estado de Utah', 'USA LATINO PRIME LLC · Highland, Utah']) {
    assert.ok(page.includes(text), text);
  }
  // El titular, con las mismas palabras (cada línea es una pieza, para entrar una tras otra).
  assert.equal(/<h1[^>]*>(.*?)<\/h1>/.exec(page)[1].replace(/<[^>]+>/g, ''), 'La ruta del inmigrante, paso a paso, ContyGo.');
  assert.ok(page.includes('href="#ruta"') && page.includes('Empezar mi ruta'));
});

test('los cinco tramos reparten todos los servicios migratorios: ninguno queda fuera ni está dos veces', () => {
  assert.deepEqual(TIERS.map(tier => tier.id), ['autoservicio', 'medio', 'masivos', 'premium', 'alto']);
  assert.equal(new Set(TIER_SERVICE_IDS).size, TIER_SERVICE_IDS.length, 'un servicio vive en un solo tramo');
  const migratory = VISIBLE_SERVICES.filter(item => !item.season && !ROUTE_SERVICE_IDS.includes(item.id));
  for (const service of migratory) assert.ok(TIER_SERVICE_IDS.includes(service.id), `${service.id} tiene su tramo`);
  for (const id of TIER_SERVICE_IDS) assert.ok(migratory.some(item => item.id === id), `${id} es un servicio migratorio del sitio`);
  for (const tier of TIERS) assert.ok(page.includes(`id="tramo-${tier.id}"`) && page.includes(tier.name), tier.name);
  // Lo que el dueño nombró y no está en el catálogo no lleva precio ni guía: escribe al equipo.
  for (const tier of TIERS) for (const item of tier.ask) assert.ok(page.includes(`Preguntar por ${item.name}`), item.name);
});

test('cada servicio dice en una línea de qué trata, corta y sin promesas', () => {
  for (const id of [...TIER_SERVICE_IDS, ...ROUTE_SERVICE_IDS]) {
    const line = TIER_BLURBS[id];
    assert.ok(line && page.includes(line), `${id} tiene su línea en la página`);
    assert.ok(line.length <= 60, `${id}: «${line}» cabe en dos líneas de un celular`);
    // («Con I-360 aprobado» es un requisito de quien llega, no una promesa: por eso no se veta «aprobado».)
    assert.doesNotMatch(line, /garantiz|te aprueban|segur[oa] que|gratis|asesor[ií]a legal/i, id);
  }
});

test('«De la mano de Henry Orellana» dice lo que es, sin llamarlo acreditado ni asesor', () => {
  const at = page.indexOf('id="henry"'), section = page.slice(at, page.indexOf('id="recorrido"'));
  assert.ok(at > page.indexOf('id="patrimonio"'), 'va después de todos los servicios y antes de cómo funciona cada trámite');
  for (const text of ['De la mano de', 'Henry Orellana', 'CEO de ContyGo', 'Consultor de inmigración registrado en Utah', 'ContyGo está hecho con su experiencia', 'no es abogado y no puede dar asesoría legal', 'href="#registro"']) assert.ok(section.includes(text), text);
  assert.doesNotMatch(section, /acreditad|asesor /i);
  assert.doesNotMatch(page, /asesor acreditado/i);
});

test('las certificaciones solo se anuncian: las cuatro licencias, los cuatro pasos y ningún precio ni promesa', () => {
  const step = ROUTE_STEPS.find(item => item.id === 'certificaciones');
  assert.equal(stepServices(step).length, 0, 'aún no se vende nada');
  assert.deepEqual(step.licences.filter(licence => licence.first).map(licence => licence.name), ['Licencia de seguros de vida']);
  for (const text of [...step.licences.map(licence => licence.name), ...step.flow, step.freedom, 'Primero en llegar', 'Avísame cuando llegue']) assert.ok(page.includes(text), text);
  // Nadie ve el precio antes de saber si califica en su estado (brief del simulador): la landing no lo publica.
  assert.doesNotMatch(page, /\$149|garantía de aprobación|100% de aprobación|ingresos garantizados/i);
});

test('lo que el dueño no ha dado no se inventa', () => {
  if (OWNER_PENDING.freeWorkPermit === null) { assert.doesNotMatch(page, /Empieza gratis|Empezar gratis/); assert.ok(page.includes('Empieza por tu permiso de trabajo')); }
  if (OWNER_PENDING.clubSeatsLeft === null) assert.doesNotMatch(page, /Quedan \d/);
  // Sin precio ni duración de la sesión, su tarjeta solo lleva el aviso, sin nada delante (20-11-2026).
  if (OWNER_PENDING.sessionTerms === null) assert.ok(page.includes('>Orientación, no asesoría legal<'));
  if (OWNER_PENDING.allyLogo === null) assert.ok(page.includes(`>${ALLIES[0].initials}<`), 'sin logo, sus iniciales');
});

test('cada enlace al Club y a la agenda dice desde dónde se tocó, sin perder el origen', () => {
  if (COMMUNITY_URL === null || APPOINTMENT_URL === null) return;
  assert.equal(via(COMMUNITY_URL, 'hero'), COMMUNITY_URL, 'el botón del hero no cambia');
  for (const [url, medium] of [[COMMUNITY_URL, 'nav'], [COMMUNITY_URL, 'ayuda'], [COMMUNITY_URL, 'ruta'], [APPOINTMENT_URL, 'nav'], [APPOINTMENT_URL, 'ayuda']]) {
    const link = new URL(via(url, medium));
    assert.equal(link.origin, new URL(url).origin);
    assert.equal(link.searchParams.get('utm_source'), 'landing');
    assert.equal(link.searchParams.get('utm_medium'), medium);
    assert.ok(page.includes(via(url, medium).replace(/&/g, '&amp;')), `${link.hostname} · ${medium}`);
  }
});
