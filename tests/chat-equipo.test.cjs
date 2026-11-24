// El asistente de la carta del equipo (/links, 23-11-2026): responde a las asesoras con lo escrito de cada servicio y,
// a diferencia del asistente del público, con el precio y las formas de pago en vivo. Nunca con un precio de aquí.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { VISIBLE_SERVICES } = require('../lib/contygo-catalog.ts');
const { TEAM_CHAT_RULES, teamKnowledge, readTeamReply, readTeamHistory, localTeamReply } = require('../lib/agent/team-chat.ts');

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

test('la ruta tiene techo por IP, pide mismo origen y no registra la pregunta', () => {
  const route = fs.readFileSync(path.join(__dirname, '../app/api/agent/team-chat/route.ts'), 'utf8');
  assert.match(route, /isSameOriginIntakeRequest\(req\)/);
  assert.match(route, /rateLimit\(`team-chat:\$\{ip\}`, 30, 600000\)/);
  assert.match(route, /rateLimit\(`team-chat-day:\$\{ip\}`, 300, 86400000\)/);
  assert.doesNotMatch(route, /console\.\w+\([^)]*question/);
});
