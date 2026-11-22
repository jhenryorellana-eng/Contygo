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

test('las felicitaciones no salen en la página: las enseña el dueño desde su panel, con su sesión', () => {
  const fs = require('node:fs');
  const { CONTYGO_RESULTS, RESULTS_SAMPLE, REVIEWS_SAMPLE, BOARD_FROM, resultsPublic } = require('../lib/contygo-results.ts');
  // Ni la sección ni sus datos de muestra, en la landing.
  assert.ok(!page.includes('id="resultados"') && !page.includes('Aprobados, ') && !page.includes('de muestra'));
  for (const review of REVIEWS_SAMPLE) assert.ok(!page.includes(review.comment), review.name);
  assert.ok(!fs.readFileSync('components/contygo/v7/ContygoLanding.tsx', 'utf8').includes('CongratsShow'));
  // No hay lista pública: la ruta de reseñas solo recibe, y la lista es del panel (pide la sesión del dueño).
  const route = fs.readFileSync('app/api/reviews/route.ts', 'utf8'), admin = fs.readFileSync('app/api/admin/reviews/route.ts', 'utf8');
  assert.ok(!/export async function GET/.test(route) && /export async function POST/.test(route));
  assert.ok(admin.indexOf('isAdminRequest(req)') > 0 && admin.indexOf('isAdminRequest(req)') < admin.indexOf('adminListReviews('));
  // La presentación lee de esa lista, dice siempre que nada está garantizado y solo usa los datos de muestra en desarrollo.
  const show = fs.readFileSync('components/contygo/v7/CongratsShow.tsx', 'utf8');
  assert.ok(show.includes('/api/admin/reviews?status=approved') && show.includes('un resultado anterior no garantiza el tuyo') && show.includes('La decisión es de la autoridad'));
  assert.ok(/const sample = DEV && /.test(show) && show.includes('process.env.NODE_ENV === "development"'));
  if (resultsPublic()) assert.ok(CONTYGO_RESULTS.verified.by && CONTYGO_RESULTS.verified.on && CONTYGO_RESULTS.verified.evidence && CONTYGO_RESULTS.updatedOn, 'cifras confirmadas: constan quién y cuándo');
  assert.ok(RESULTS_SAMPLE.length > 0 && CONTYGO_RESULTS.rows.every(row => !RESULTS_SAMPLE.some(sample => sample === row)));
  assert.ok(BOARD_FROM >= 5, 'una cuenta de dos o tres no es un tablero');
  // El permiso que firma el cliente nombra los lives.
  assert.ok(fs.readFileSync('components/contygo/v7/ShareStory.tsx', 'utf8').includes('en sus transmisiones en vivo'));
});

test('la foto de una felicitación se guarda sin sus datos ocultos, y lo que no es una foto no pasa', () => {
  const { cleanJpeg, PHOTO_MAX } = require('../lib/review-photo.ts');
  const segment = (marker, text) => { const body = Buffer.from(text); return Buffer.concat([Buffer.from([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 255]), body]); };
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), segment(0xe0, 'JFIF'), segment(0xe1, 'Exif gps 40.7608,-111.8910'), segment(0xfe, 'una nota'), segment(0xdb, 'tabla'), Buffer.from([0xff, 0xda, 0, 2]), Buffer.from('imagen'), Buffer.from([0xff, 0xd9])]);
  const clean = Buffer.from(cleanJpeg(new Uint8Array(jpeg)));
  assert.ok(!clean.includes('gps') && !clean.includes('una nota'), 'sin EXIF ni notas');
  assert.ok(clean.includes('JFIF') && clean.includes('tabla') && clean.includes('imagen') && clean[0] === 0xff && clean[1] === 0xd8, 'la imagen queda entera');
  for (const bad of ['<script>alert(1)</script>', 'GIF89a', '']) assert.equal(cleanJpeg(new Uint8Array(Buffer.from(bad))), null);
  assert.equal(cleanJpeg(new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe1, 0xff, 0xff]), Buffer.from('corto')]))), null, 'un segmento que miente sobre su tamaño');
  assert.ok(PHOTO_MAX <= 4_000_000, 'cabe en lo que admite una función de Vercel (4,5 MB por petición)');
  // La ruta exige el permiso antes de guardar una foto, y el formulario no deja enviar sin él.
  const fs = require('node:fs'), route = fs.readFileSync('app/api/reviews/route.ts', 'utf8'), form = fs.readFileSync('components/contygo/v7/ShareStory.tsx', 'utf8');
  assert.ok(route.indexOf('fail("consent")') > 0 && route.indexOf('fail("consent")') < route.indexOf('insertReview('));
  // El almacén es privado y la foto solo sale por la ruta del panel, con la sesión del dueño.
  const store = fs.readFileSync('lib/reviews.ts', 'utf8'), photo = fs.readFileSync('app/api/admin/reviews/[id]/photo/route.ts', 'utf8');
  assert.ok(!/access: "public"/.test(store) && /access: "private"/.test(store));
  assert.ok(photo.indexOf('isAdminRequest(req)') > 0 && photo.indexOf('isAdminRequest(req)') < photo.indexOf('adminReviewPhoto('));
  assert.ok(/const valid = [^;]*&& consent;/.test(form) && form.includes('Tapa tus datos antes de enviar'));
});

test('el recorrido de la app: la cámara que eligió el dueño, sin interruptores, y el hilo conserva su ancla en el teléfono', () => {
  const fs = require('node:fs'), tour = fs.readFileSync('components/contygo/v7/PlatformTour.tsx', 'utf8'), css = fs.readFileSync('components/contygo/v7/PlatformTour.module.css', 'utf8');
  assert.ok(!/data-look|cg-tour-look|loupe|\.track/.test(tour + css), 'los efectos que no se eligieron ya no están');
  assert.equal((tour.match(/data-thread="phone"/g) || []).length, 2, 'un ancla para el teléfono y otra para la pantalla ancha');
  assert.ok(page.includes('data-thread="platform"') && page.includes('data-thread="phone"'));
  // Quien pide menos movimiento, o tiene una pantalla muy baja, no se queda con la sección quieta.
  assert.ok(/@media\(max-width:899\.98px\) and \(min-height:520px\) and \(prefers-reduced-motion:no-preference\)\{[^}]*\.run\{height:/.test(css));
});

test('el asistente: su puerta donde estaban las preguntas, el contrato dentro del chat y su marca de origen', () => {
  const fs = require('node:fs');
  const { sanitizeAttribution } = require('../lib/contygo-api/lead.ts');
  const { landingFaqs } = require('../lib/contygo-landing-faq.ts');
  // La sección: el mismo sitio (menú e hilo verde), otra propuesta; las preguntas aprobadas siguen, como botones.
  assert.ok(page.includes('id="preguntas"') && page.includes('data-thread="faq"') && page.includes('Haz tu contrato tú mismo.'));
  // La promesa va arriba, justo tras el hero y antes de los productos; por dónde empezar y las preguntas, al final.
  assert.ok(page.indexOf('id="contrato"') > page.indexOf('id="inicio"') && page.indexOf('id="contrato"') < page.indexOf('id="ruta"') && page.indexOf('id="preguntas"') > page.indexOf('id="plataforma"'));
  assert.ok(!page.includes('Preguntar también') && !page.includes('Escríbele al equipo'), 'la lista que terminaba en WhatsApp ya no está');
  for (const [question] of landingFaqs('$250', null)) assert.ok(page.includes(question.replace(/&/g, '&amp;')) || page.includes(question), question);
  // El contrato de la escena es un ejemplo, y lo dice; el aviso de que no es asesoría legal sigue.
  assert.ok(page.includes('>Ejemplo<') && page.includes('no es asesoría legal'));
  // La persona sigue a un toque, en una línea.
  assert.ok(page.includes('una persona del equipo te atiende por WhatsApp'));
  // El botón del pie y la invitación bajo los servicios llevan al asistente.
  assert.ok(page.includes('Haz tu contrato tú mismo') && page.includes('¿No sabes cuál es el tuyo?') && page.includes('Empezar mi contrato'));
  // El tiempo que se promete vive en un solo sitio (lo dijo el dueño; aún sin medir).
  const { CONTRACT_TIME } = require('../lib/agent/landing-chat-ui.ts');
  assert.equal(CONTRACT_TIME, 'menos de 3 minutos');
  assert.ok(page.includes(`En ${CONTRACT_TIME}`));
  // El contrato hecho en el asistente viaja marcado, y el servidor conserva esa marca (solo claves utm_*).
  const chat = fs.readFileSync('components/contygo/v7/LandingChat.tsx', 'utf8'), form = fs.readFileSync('components/contygo/contract/ContractCheckout.tsx', 'utf8');
  assert.ok(chat.includes('via="asistente-web"') && form.includes('utm_via: via') && fs.readFileSync('components/contygo/rebuild/ServiceCinemaDialog.tsx', 'utf8').includes('via="ficha-web"'));
  assert.deepEqual(sanitizeAttribution({ sourceUrl: 'https://landing.contygo.app/?x=1', utm: { utm_source: 'meta', utm_via: 'asistente-web', otra: 'no' } }), { sourceUrl: 'https://landing.contygo.app/', utm: { utm_source: 'meta', utm_via: 'asistente-web' } });
  // Lo que queda a medias se recuerda poco tiempo y solo en el aparato; la voz y el contrato no viajan con la portada.
  const bus = fs.readFileSync('components/contygo/v7/assistantBus.ts', 'utf8');
  assert.ok(/RESUME_MS = 48 \* 60 \* 60 \* 1000/.test(bus) && bus.includes('localStorage') && !/fetch\(/.test(bus));
  assert.ok(/dynamic\(\(\) => import\("\.\.\/contract\/ContractCheckout"\)/.test(chat) && /dynamic\(\(\) => import\("\.\/ChatVoice"\)/.test(chat));
  // «Escuchar» empieza apagado.
  assert.ok(chat.includes('const [listen, setListen] = useState(false);'));
});
