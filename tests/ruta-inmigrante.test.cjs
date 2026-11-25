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
const { ROUTE_STEPS, ROUTE_SERVICE_IDS, OWNER_PENDING, ALLIES, stepOpen, stepServices } = require('../lib/contygo-route.ts');
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
    'Cinco pasos para crecer', 'Elige tu tramo',
    'No vendemos seguros, inversiones, préstamos ni propiedades', 'Reg. 14304807-IC00', 'El registro no constituye un aval del Estado de Utah', 'USA LATINO PRIME LLC · Highland, Utah']) {
    assert.ok(page.includes(text), text);
  }
  // El titular, con las mismas palabras (cada línea es una pieza, para entrar una tras otra).
  assert.equal(/<h1[^>]*>(.*?)<\/h1>/.exec(page)[1].replace(/<[^>]+>/g, ''), 'La ruta del inmigrante, paso a paso, ContyGo.');
  assert.ok(page.includes('href="#ruta"') && page.includes('Ver todos los servicios') && page.includes('Únete a la comunidad de ContyGo'));
  // El banner de Black Friday salió de la página (dueño, 24-11-2026); su franja y su letrero llevan a la ruta.
  assert.ok(!page.includes('id="black-friday"') && !page.includes('href="#black-friday"'));
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
  if (OWNER_PENDING.freeWorkPermit === null) { assert.doesNotMatch(page, /Empieza gratis|Empezar gratis|empieza gratis/); assert.ok(page.includes('Permiso de trabajo</strong>')); }
  if (OWNER_PENDING.clubSeatsLeft === null) assert.doesNotMatch(page, /Quedan \d/);
  // Sin precio ni duración de la sesión, su tarjeta solo lleva el aviso, sin nada delante (20-11-2026).
  if (OWNER_PENDING.sessionTerms === null) assert.ok(page.includes('>Orientación, no asesoría legal<'));
  // La licencia de conducir salió de la página (dueño, 23-11-2026), y con ella su aliado: sin aliados, no hay franja.
  assert.ok(!/licencia de conducir|SG Services/i.test(page) && !require('node:fs').existsSync('public/contygo/v8/servicio-licencia-conducir.webp'));
  assert.equal(page.includes('Nuestros aliados'), ALLIES.length > 0);
  for (const ally of ALLIES) assert.ok(page.includes(ally.name) && (OWNER_PENDING.allyLogo !== null || page.includes(`>${ally.initials}<`)), ally.name);
  // En la hoja del paso 1, los servicios estrella en el orden del dueño (24-11-2026): Visa Juvenil, Apelación ante la BIA,
  // Reforzamiento de asilo y el permiso de trabajo, bajo su letrero «Los más vendidos» y cada uno con su estrella.
  // Los tres primeros son los mismos que el asistente ofrece primero.
  const { LANDING_NEEDS } = require('../lib/agent/landing-chat-ui.ts');
  const tops = LANDING_NEEDS.filter(need => need.top);
  assert.deepEqual(tops.map(need => need.label), ['Visa Juvenil', 'Apelación ante la BIA', 'Reforzamiento de asilo']);
  const sheet = page.slice(page.indexOf('Los más vendidos'), page.indexOf('Elige tu tramo'));
  assert.ok(sheet.startsWith('Los más vendidos') && sheet.includes('Nuestros cuatro servicios estrella'));
  let at = 0;
  for (const label of [...tops.map(need => need.label), 'Permiso de trabajo']) { const found = sheet.indexOf(`${label}</strong>`, at); assert.ok(found > at, label); at = found; }
  for (const need of tops) assert.ok(sheet.includes(need.hint), need.label);
  assert.equal((sheet.match(/Más pedido/g) || []).length, 3);
  assert.equal((sheet.match(/Servicio estrella/g) || []).length, 4);
  assert.equal((sheet.match(/data-star="/g) || []).length, 4);
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

test('los casos en la página: solo el contador y las historias aprobadas con permiso; el panel sigue siendo del dueño', () => {
  // 22-11-2026: «que no salga en la página principal, sino en el dashboard de Henry». 24-11-2026, el dueño lo cambia: «la
  // idea es que el contador aparezca ahí para que los clientes cuando ingresen puedan ver nuestros casos ganados… y un
  // botón donde les abra el mismo "presentar en vivo" que le sale a Henry».
  const fs = require('node:fs');
  const { CONTYGO_RESULTS, RESULTS_SAMPLE, REVIEWS_SAMPLE, BOARD_FROM, resultsPublic } = require('../lib/contygo-results.ts');
  // La sección sale para todos desde el primer momento (el dueño, 24-11-2026: «esto debe salir para todos los usuarios, o
  // sea los posibles clientes»). Sin cifras en el contador se apoya en la única cifra que el dueño confirmó, con sus
  // palabras («clientes atendidos», nunca «casos ganados»); ni un cero ni un dato de muestra.
  const casos = page.slice(page.indexOf('id="casos"'), page.indexOf('id="casos"') + 2600);
  assert.ok(page.includes('id="casos"') && casos.includes('con Henry al frente') && casos.includes('>+500<') && casos.includes('>clientes atendidos<'));
  assert.ok(casos.includes('no es una cuenta de casos aprobados') && !casos.includes('casos ganados') && !page.includes('Aprobados, ') && !page.includes('de muestra'));
  for (const review of REVIEWS_SAMPLE) assert.ok(!page.includes(review.comment), review.name);
  const landing = fs.readFileSync('components/contygo/v7/ContygoLanding.tsx', 'utf8'), board = fs.readFileSync('components/contygo/v7/TrustBoard.tsx', 'utf8');
  assert.ok(landing.includes('{fresh && <TrustBoard />}'));
  assert.ok(board.includes('await read("/api/felicitaciones")') && board.includes('read(`/api/felicitaciones?ejemplo=${encodeURIComponent(pass)}`, { cache: "no-store" })') && board.includes('if (!data) return SERVED ? (') && board.includes('un resultado anterior no garantiza el tuyo'));
  assert.ok(board.includes('<CongratsShow variant="public"') && !/SAMPLE/.test(board), 'la presentación pública nunca trae ejemplos');
  // Henry al frente (el dueño lo eligió entre cuatro maneras): su foto, su nombre y su título tal como es.
  assert.ok(board.includes('Consultor de inmigración registrado en Utah') && fs.existsSync('public/contygo/casos/henry-cruzados.webp'));
  // La lista pública es otra ruta, de solo lectura: lo aprobado por el dueño y con el permiso de su autor, y el contador.
  const route = fs.readFileSync('app/api/reviews/route.ts', 'utf8'), admin = fs.readFileSync('app/api/admin/reviews/route.ts', 'utf8');
  assert.ok(!/export async function GET/.test(route) && /export async function POST/.test(route));
  assert.ok(admin.indexOf('isAdminRequest(req)') > 0 && admin.indexOf('isAdminRequest(req)') < admin.indexOf('adminListReviews('));
  const open = fs.readFileSync('app/api/felicitaciones/route.ts', 'utf8'), photo = fs.readFileSync('app/api/felicitaciones/[id]/foto/route.ts', 'utf8'), reviews = fs.readFileSync('lib/reviews.ts', 'utf8');
  assert.ok(/export async function GET/.test(open) && !/export async function (POST|PUT|DELETE)/.test(open));
  assert.ok(open.includes('publicReviews()') && !open.includes('updatedBy'));
  // Los ejemplos solo salen en la vista previa del dueño: con ?ejemplo=1 Y su sesión, marcados y sin guardarse en caché.
  assert.ok(open.includes('const allowed = (asked === "1" && isAdminRequest(req)) || isPreviewKey(asked);') && open.includes('allowed ? example() : await build()'));
  assert.equal((open.match(/example\(\)/g) || []).length, 2, 'los ejemplos no se usan en ningún otro camino');
  assert.ok(open.includes('"Cache-Control": "private, no-store"') && board.includes('Modo ejemplo.'));
  assert.ok(photo.includes('publicReviewPhoto(params.id)'));
  assert.ok(reviews.includes('review.status === "approved" && review.consent === true'));
  assert.ok(fs.readFileSync('components/contygo/v7/ShareStory.tsx', 'utf8').includes('su página'), 'el permiso que firma el cliente nombra la página');
  // La presentación lee de esa lista y dice siempre que nada está garantizado. Los datos de muestra solo salen dentro del
  // panel, cuando el dueño los pide («Ver ejemplos», 24-11-2026) o en desarrollo, bajo un aviso de que no son clientes
  // reales y con cada historia y cada foto marcada como ejemplo; nunca mezclados con las reales.
  const show = fs.readFileSync('components/contygo/v7/CongratsShow.tsx', 'utf8');
  assert.ok(show.includes('/api/admin/reviews?status=approved') && show.includes('un resultado anterior no garantiza el tuyo') && show.includes('La decisión es de la autoridad'));
  assert.ok(show.includes('const sample = !open && state !== "loading" && state !== "signin" && (example || (DEV && approved.length === 0));') && show.includes('process.env.NODE_ENV === "development"'), 'los ejemplos, nunca en la variante pública');
  assert.ok(show.includes('const stories = sample ? REVIEWS_SAMPLE : approved;'), 'los ejemplos sustituyen a las reales, no se mezclan');
  // (En la vista previa del dueño sobre la landing, `demo`, las historias llevan la misma etiqueta «Ejemplo».)
  assert.ok(show.includes('no son clientes reales') && show.includes('example={sample || demo}') && show.includes('setDemo(body.example === true)'));
  for (const review of REVIEWS_SAMPLE) if (review.image) { assert.match(review.image, /^\/contygo\/ejemplos\//, review.name); assert.ok(fs.existsSync('public' + review.image), review.image); }
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
  // La promesa va arriba, justo tras el hero y antes de los productos, y va una sola vez: la segunda entrada del final
  // («¿Listo? Tu contrato…», con sus trámites y las preguntas de siempre) la quitó el dueño el 23-11-2026 («no tiene
  // sentido repetirlo 2 veces»). El menú «Preguntas» abre el asistente, que responde las preguntas aprobadas.
  assert.ok(page.includes('Haz tu contrato tú mismo.') && page.indexOf('id="contrato"') > page.indexOf('id="inicio"') && page.indexOf('id="contrato"') < page.indexOf('id="ruta"'));
  assert.ok(!page.includes('id="preguntas"') && !page.includes('data-thread="faq"') && !page.includes('¿Listo?') && !page.includes('Lo que más nos preguntan'));
  assert.ok(/<a href="#contrato">Preguntas<\/a>/.test(page) && !page.includes('href="#preguntas"'), 'nada apunta a la sección que ya no está');
  assert.ok(!page.includes('Preguntar también') && !page.includes('Escríbele al equipo'), 'la lista que terminaba en WhatsApp ya no está');
  assert.ok(landingFaqs('$250', null).length >= 4 && fs.readFileSync('lib/agent/landing-chat.ts', 'utf8').includes('PREGUNTAS FRECUENTES (respuestas aprobadas)'), 'las preguntas de siempre las responde el asistente');
  // Sin esa sección, el hilo verde sigue: baja por su margen hasta el cierre.
  const thread = fs.readFileSync('components/contygo/v7/GreenThread.tsx', 'utf8');
  assert.ok(!/!faq \|\|/.test(thread) && /else knots\.push\(knot\(lane, end - 150, DOWN\)\)/.test(thread));
  // La escena: un mundo de plastilina donde el contrato viaja por cinco estaciones (el estilo lo eligió el dueño).
  const journey = fs.readFileSync('components/contygo/v7/ContractJourney.tsx', 'utf8');
  for (const word of ['Tocas', 'Respondes', 'Se llena', 'Confirmas', 'Firmas']) assert.ok(page.includes(word), word);
  for (const art of Array.from(journey.matchAll(/art: "(\w+)"/g), found => found[1])) assert.ok(fs.statSync(`public/contygo/v8/viaje/${art}.webp`).size > 8000, art);
  assert.ok(page.includes('Empezar mi contrato') && !/\d:\d\d/.test(journey), 'el botón siempre a la vista; sin reloj simulado');
  // En el teléfono de cada escena van pantallas reales del asistente, y el asistente acompaña en las frases.
  const real = Array.from(journey.matchAll(/\["(p\d)",/g), found => found[1]);
  assert.ok(real.length >= 8 && real.every(file => fs.statSync(`public/contygo/v8/proceso/${file}.webp`).size > 5000));
  assert.ok((journey.match(/Tu asistente|tu asistente/g) || []).length >= 3 && page.includes('Con tu asistente'));
  // El primer plano no se estira: la escena se dibuja a su tamaño de cerca y se encoge para verse entera; sin filtros encima.
  const sceneCss = fs.readFileSync('components/contygo/v7/ContractJourney.module.css', 'utf8');
  assert.ok(/\.scene\{[^}]*width:calc\(var\(--base\) \* var\(--lay\)\)/.test(sceneCss) && /--s0:calc\(1 \/ var\(--lay\)\)/.test(sceneCss), 'se encoge, no se amplía');
  assert.ok(!/\.art\{[^}]*filter/.test(sceneCss) && !/\.shot img\{[^}]*filter/.test(sceneCss), 'ningún filtro sobre lo que la cámara acerca');
  assert.ok(/borderRadius: `\$\{rx\}% \/ \$\{ry\}%`/.test(journey), 'cada pantalla lleva el radio medido de su teléfono');
  // Fluidez: solo se dibujan la estación en pantalla y su vecina; el tamaño de dibujo tiene tope en píxeles reales;
  // y nada dentro de la escena cambia de pintura con el scroll (opacidades y filtros van por estado, no por variable).
  assert.ok(/\.stop\[data-away\]\{visibility:hidden\}/.test(sceneCss) && journey.includes('data-away') && /const most = \d+ \/ \(base \* Math\.min\(3, window\.devicePixelRatio/.test(journey));
  for (const rule of ['.inner:after', '.glass:after', '.view:before']) { const body = sceneCss.slice(sceneCss.indexOf(rule + '{')); assert.ok(!/opacity:calc\([^)]*var\(--z\)/.test(body.slice(0, body.indexOf('}'))), rule); }
  assert.ok(!/filter:blur\(calc\([^)]*var\(--a\)/.test(sceneCss), 'el desenfoque de lejos es fijo');
  // Quien pide menos movimiento, o tiene una pantalla muy baja, no se queda con la sección quieta: pasa las estaciones de lado.
  const world = fs.readFileSync('components/contygo/v7/ContractJourney.module.css', 'utf8');
  assert.ok(/@media\(min-height:520px\) and \(prefers-reduced-motion:no-preference\)\{[^}]*\.run\{height:/.test(world) && /scroll-snap-type:x mandatory/.test(world));
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
