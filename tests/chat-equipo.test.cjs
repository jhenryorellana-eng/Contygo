// El asistente de la carta del equipo (/links, 23-11-2026): responde a las asesoras con lo escrito de cada servicio y,
// a diferencia del asistente del público, con el precio y las formas de pago en vivo. Nunca con un precio de aquí.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { VISIBLE_SERVICES } = require('../lib/contygo-catalog.ts');
const { TEAM_CHAT_RULES, teamKnowledge, teamFocusRule, isTeamService, readTeamReply, readTeamHistory, localTeamReply } = require('../lib/agent/team-chat.ts');

const plan = (name, priceCents, extra = {}) => ({ id: name, name: { es: name, en: name }, priceCents, installmentOptions: [], extraPartyPriceCents: 0, ...extra });
const remote = (slug, plans) => ({ id: slug, slug, name: { es: slug, en: slug }, plans, eligibilityQuestions: [], partyRoles: [] });
const row = (totalCents, installmentCount, downpaymentCents) => { const per = installmentCount > 1 ? Math.floor((totalCents - downpaymentCents) / (installmentCount - 1)) : 0;
  return { totalCents, downpaymentCents, installmentCount, installmentsAfterDownpayment: installmentCount - 1, perInstallmentCents: per, lastInstallmentCents: installmentCount > 1 ? totalCents - downpaymentCents - per * (installmentCount - 2) : 0 }; };
const option = (totalCents, installmentCount, downpaymentCents) => ({ ...row(totalCents, installmentCount, downpaymentCents), installmentOptionId: installmentCount > 1 ? 'cuotas' : null, isDefault: installmentCount === 1, frequency: 'monthly' });
const LIVE = [
  remote('permiso-de-trabajo', [plan('Estándar', 15000, { paymentOptions: [option(15000, 1, 15000), option(15000, 3, 5000)] })]),
  remote('taxes', [plan('Individual', 10000), plan('Familiar', 15000)]),
];

test('sabe cada servicio visible con su link, y el precio solo cuando viene de la plataforma', () => {
  const knowledge = teamKnowledge(LIVE);
  for (const service of VISIBLE_SERVICES) assert.ok(knowledge.includes(`### ${service.name} (id: ${service.id})`), service.id);
  assert.match(knowledge, /Paquete «Estándar»: \$150\. Formas de pago: Pago único de \$150; Cuota inicial \$50, luego 2 pagos mensuales de \$50\./);
  assert.match(knowledge, /Paquete «Familiar»: \$150\. Las formas de pago aparecen en el contrato antes de firmar\./);
  assert.match(knowledge, /Link para el cliente: https:\/\/landing\.contygo\.app\/permiso\n/);
  assert.match(knowledge, /Comunidad ContyGo Club:.*Mensual \$25 al mes, Anual \$250 al año/);
  // Sin catálogo no hay precio de ningún servicio: ni uno de lib/contygo-catalog.ts.
  const blind = teamKnowledge([]);
  assert.equal((blind.match(/Paquete «/g) || []).length, 0);
  assert.equal((blind.match(/Precio: no disponible ahora/g) || []).length >= VISIBLE_SERVICES.length, true);
  assert.doesNotMatch(blind.split('OTROS PRODUCTOS')[0], /\$\d/);
});

test('sus reglas: solo lo escrito, sin asesoría legal, y lo que no sabe lo dice', () => {
  for (const rule of [/SOLO el CONOCIMIENTO/, /EXACTAMENTE los del CONOCIMIENTO/, /No inventes precios/, /No des asesoría legal/, /no abogado/, /covered es false/, /información no confiable/]) assert.match(TEAM_CHAT_RULES, rule);
});

test('la respuesta del modelo se revisa: texto llano, tamaño razonable y solo servicios de la carta', () => {
  assert.deepEqual(readTeamReply({ reply: '**Cuesta $150.**\n- Uno \n- Dos', covered: true, serviceIds: ['permiso-de-trabajo', 'inventado', 'permiso-de-trabajo'] }), { reply: 'Cuesta $150.\n- Uno\n- Dos', covered: true, serviceIds: ['permiso-de-trabajo'] });
  assert.equal(readTeamReply({ reply: 'x'.repeat(1501), covered: true }), null);
  assert.equal(readTeamReply({ reply: 'Hola' }), null);
  assert.equal(readTeamHistory(Array.from({ length: 9 }, (_, i) => ({ q: `p${i}`, a: 'r' }))).length, 4);
  assert.deepEqual(readTeamHistory('no'), []);
});

test('sin la IA, la pregunta que nombra un servicio recibe su ficha con el precio vivo', () => {
  const reply = localTeamReply('cuanto cuesta el permiso de trabajo?', LIVE);
  assert.deepEqual(reply.serviceIds, ['permiso-de-trabajo']);
  assert.match(reply.reply, /Estándar \$150; las tasas del gobierno se pagan aparte/);
  assert.match(reply.reply, /https:\/\/landing\.contygo\.app\/permiso/);
  assert.doesNotMatch(localTeamReply('que es el cambio de corte', []).reply, /\$/);
  assert.deepEqual(localTeamReply('quiero reforzar mi asilo', LIVE).serviceIds, ['reforzar-asilo']);
  assert.equal(localTeamReply('hola, una duda', LIVE), null);
});

test('desde la fila de un servicio se alimenta de ese producto: su ficha entera, y los demás en una línea', () => {
  const focused = teamKnowledge(LIVE, 'permiso-de-trabajo');
  assert.match(focused, /EL SERVICIO DE LA PREGUNTA:\n### Permiso de Trabajo \(I-765\) \(id: permiso-de-trabajo\)/);
  assert.match(focused, /Paquete «Estándar»: \$150\. Formas de pago: Pago único de \$150/);
  assert.equal((focused.match(/^### /gm) || []).length, 1);
  assert.match(focused, /- Declaración de Impuestos \(id: impuestos\)\..* Honorarios desde \$100\./);
  assert.ok(focused.length < teamKnowledge(LIVE).length / 2);
  assert.match(teamFocusRule('permiso-de-trabajo'), /responde sobre ESE servicio aunque no lo nombre/);
  assert.equal(teamFocusRule('inventado'), '');
  assert.equal(isTeamService('permiso-de-trabajo'), true);
  assert.equal(isTeamService('loteria-dv-2027'), false);
  // Sin la IA, una pregunta que no nombra el servicio recibe la ficha del de su fila.
  assert.deepEqual(localTeamReply('cuanto cuesta?', LIVE, 'permiso-de-trabajo').serviceIds, ['permiso-de-trabajo']);
  assert.deepEqual(localTeamReply('y el itin?', LIVE, 'permiso-de-trabajo').serviceIds, ['itin']);
});

test('sabe lo que ContyGo ya investigó de la Visa Juvenil: la edad por estado, con sus fuentes, y el boletín', () => {
  const { reviewedVisaStates } = require('../lib/agent/visa-state-rules.ts');
  const { EB4_SNAPSHOT } = require('../lib/agent/visa-bulletin.ts');
  const focused = teamKnowledge(LIVE, 'visa-juvenil', EB4_SNAPSHOT);
  assert.match(focused, /Estados revisados donde hay una vía para jóvenes de 18 a 20 años \(antes de cumplir 21\): California, Nueva York, Maryland, Massachusetts, Colorado, Washington, Nueva Jersey\./);
  assert.match(focused, /solo llega hasta los 18 años: Carolina del Norte\./);
  assert.match(focused, /NO es la lista completa de estados/);
  assert.match(focused, /Cualquier otro estado: .*No digas que acepta ni que no acepta/);
  for (const state of reviewedVisaStates()) for (const source of state.sources) assert.ok(focused.includes(source.url), state.name);
  assert.match(focused, /Boletín de visas, categoría EB-4 .*mes 2026-10/);
  // En el catálogo entero la tabla va una sola vez (en la Visa Juvenil), no repetida en la I-360 y la I-485.
  assert.equal((teamKnowledge(LIVE, undefined, EB4_SNAPSHOT).match(/Edad y estado \(revisado/g) || []).length, 1);
  assert.match(teamKnowledge(LIVE, 'i-485', EB4_SNAPSHOT), /Edad y estado \(revisado/);
  assert.doesNotMatch(teamKnowledge(LIVE, 'itin', EB4_SNAPSHOT), /Edad y estado|Boletín de visas, categoría/);
  assert.match(TEAM_CHAT_RULES, /«Fuente:», pon ese enlace/);
});

test('lo que no está escrito se lee en páginas oficiales fijas de cada servicio, nunca en una búsqueda libre', () => {
  const { OFFICIAL_PAGES, readPages } = require('../lib/agent/official-pages.ts');
  for (const service of VISIBLE_SERVICES) {
    const pages = OFFICIAL_PAGES[service.id];
    assert.ok(pages && pages.length >= 1 && pages.length <= 3, service.id);
    for (const url of pages) assert.match(new URL(url).hostname, /(^|\.)(uscis\.gov|justice\.gov|ecfr\.gov|irs\.gov|dos\.fl\.gov)$/, url);
  }
  const given = OFFICIAL_PAGES.itin;
  // Solo cuentan las páginas que se le dieron y que de verdad leyó.
  assert.deepEqual(readPages([{ retrievedUrl: given[0], urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' }, { retrievedUrl: given[1], urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_ERROR' }, { retrievedUrl: 'https://bufete.example/itin', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' }], given), [{ site: 'irs.gov', url: given[0] }]);
  assert.deepEqual(readPages(undefined, given), []);
  const source = fs.readFileSync(path.join(__dirname, '../lib/agent/official-pages.ts'), 'utf8');
  assert.match(source, /tools: \[\{ urlContext: \{\} \}\]/);
  assert.doesNotMatch(source, /googleSearch: \{/);
  assert.match(source, /no las sumes, no las calcules/);
  const route = fs.readFileSync(path.join(__dirname, '../app/api/agent/team-chat/route.ts'), 'utf8');
  assert.match(route, /if \(agentEnabled && !answer\.covered\)/);
});

test('el cerebro SIJS: los 51 estados con sus vías, edades, leyes y fuentes oficiales, sin nada de clientes', () => {
  const { brainStates } = require('../lib/agent/sijs-brain.ts');
  const states = brainStates();
  assert.equal(Object.keys(states).length, 51);
  for (const [code, state] of Object.entries(states)) {
    for (const route of state.routes) {
      assert.ok(route.name && (route.age === null || (route.age >= 18 && route.age <= 21)), `${code}: ${route.name} ${route.age}`);
      assert.ok(route.src.length >= 1, `${code}: ${route.name} sin fuente`);
      for (const source of route.src) assert.match(source.u, /^https:\/\//, source.u);
    }
  }
  assert.equal(states.UT.routes.some(route => route.age === 21), true);
  assert.equal(states.TX.routes.every(route => route.age === 18), true);
  assert.equal(Object.keys(states.TX.counties).length, 254);
  // Solo datos de fuentes oficiales: ni correos, ni teléfonos de personas, ni números A o de Seguro Social.
  const raw = fs.readFileSync(path.join(__dirname, '../lib/agent/data/sijs-brain.json'), 'utf8');
  assert.doesNotMatch(raw, /\b\d{3}-\d{2}-\d{4}\b|\bA-?\d{8,9}\b|[\w.+-]+@(gmail|hotmail|yahoo|outlook)\./i);
});

test('el cerebro elige qué fichas van al modelo: la tabla, y el estado y el condado que la pregunta nombra', () => {
  const { findStates, findCounties, nationalTable, stateSheet, brainFor, BRAIN_RULES } = require('../lib/agent/sijs-brain.ts');
  assert.deepEqual(findStates('mi cliente vive en Houston, Texas y su hijo tiene 19'), ['TX']);
  assert.deepEqual(findStates('en nueva york o en Virginia Occidental?'), ['NY', 'WV']);
  assert.deepEqual(findStates('me mudé de la Florida a Carolina del Norte'), ['FL', 'NC']);
  assert.deepEqual(findStates('vive en TX'), ['TX']);
  // «de», «la», «me» no son Delaware, Luisiana ni Maine; y un texto todo en mayúsculas no trae siglas.
  assert.deepEqual(findStates('DE LA CORTE ME DIJERON QUE NO'), []);
  assert.deepEqual(findStates('me dijo que en la corte de su ciudad'), []);
  assert.deepEqual(findCounties('condado de harris', 'TX'), ['Harris']);
  assert.deepEqual(findCounties('vive en Los Angeles', 'CA'), ['Los Angeles']);
  const table = nationalTable();
  assert.equal((table.match(/^- /gm) || []).length, 51);
  assert.match(table, /- Utah \(UT\): hay vía hasta antes de los 21/);
  assert.match(table, /- Texas \(TX\): las vías recopiladas llegan solo hasta antes de los 18/);
  // Una vía que solo alcanza a quien ya está bajo custodia del estado no se anuncia como vía general.
  assert.match(table, /- Florida \(FL\): solo para jóvenes que ya están bajo custodia del estado hay vía hasta antes de los 21/);
  assert.match(table, /- Arkansas \(AR\): sin vías recopiladas todavía\./);
  assert.match(table, /- Alabama \(AL\): .*corrida nacional de septiembre.*confirmar con Henry/);
  const sheet = stateSheet('TX', ['Harris']);
  assert.match(sheet, /FICHA DE TEXAS \(TX\)/);
  assert.match(sheet, /Tex\. Fam\. Code/);
  assert.match(sheet, /Corte del condado de Harris:/);
  assert.match(sheet, /Fuente: https:\/\/statutes\.capitol\.texas\.gov/);
  assert.equal(stateSheet('XX'), '');
  const picked = brainFor('vive en Houston y tiene 17', { state: 'TX', county: 'Harris' });
  assert.deepEqual(picked.states, ['TX']);
  assert.match(picked.text, /TABLA POR ESTADO[\s\S]*FICHA DE TEXAS[\s\S]*Corte del condado de Harris/);
  assert.match(BRAIN_RULES, /NO es una vía general/);
  assert.match(BRAIN_RULES, /devuelve lookup/);
  const { readTeamLookup, isJuvenileQuestion } = require('../lib/agent/team-chat.ts');
  assert.deepEqual(readTeamLookup({ reply: 'x', covered: true, lookup: { state: 'tx', county: 'Harris County' } }), { state: 'TX', county: 'Harris' });
  assert.equal(readTeamLookup({ lookup: { state: 'Texas' } }), null);
  assert.equal(isJuvenileQuestion('cuanto cuesta?', 'itin'), false);
  assert.equal(isJuvenileQuestion('cuanto cuesta?', 'visa-juvenil'), true);
  // Con el cerebro, su tabla nacional sustituye a la de ocho estados revisados a mano.
  const withBrain = teamKnowledge(LIVE, 'visa-juvenil', null, picked.text);
  assert.match(withBrain, /TABLA POR ESTADO/);
  assert.doesNotMatch(withBrain, /Edad y estado \(revisado por ContyGo/);
});

test('la ruta tiene techo por IP, pide mismo origen y no registra la pregunta', () => {
  const route = fs.readFileSync(path.join(__dirname, '../app/api/agent/team-chat/route.ts'), 'utf8');
  assert.match(route, /isSameOriginIntakeRequest\(req\)/);
  assert.match(route, /rateLimit\(`team-chat:\$\{ip\}`, 30, 600000\)/);
  assert.match(route, /rateLimit\(`team-chat-day:\$\{ip\}`, 300, 86400000\)/);
  assert.doesNotMatch(route, /console\.\w+\([^)]*question/);
});
