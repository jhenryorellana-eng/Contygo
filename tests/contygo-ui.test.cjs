// Capa de interfaz de la contratación: textos neutros por resultado, lectura de /reenviar, teléfono de EE. UU.
// y precios vivos. Sin red: solo funciones puras y render estático.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { outcomeMessage, readResend, waitText, whatsappHelpMessage } = require('../lib/contygo-api/messages.ts');
const prices = require('../lib/contygo-api/prices-client.ts');
const { default: PhoneField } = require('../components/contygo/guide/PhoneField.tsx');
const { waLink } = require('../lib/config.ts');

const EVERY_OUTCOME = [
  { step: 'INVALID' }, { step: 'NEEDS_ANSWERS' }, { step: 'ASK_CODE', maskedEmail: 'a***@e2e.local' }, { step: 'WRONG_CODE', attemptsLeft: 2 }, { step: 'RESTART' },
  { step: 'HUMAN' }, { step: 'FIX_CONTACT', reason: 'email_has_account', phoneHint: '42' }, { step: 'FIX_CONTACT', reason: 'phone_in_use' }, { step: 'NOT_ELIGIBLE' }, { step: 'UNAVAILABLE' }, { step: 'UNAVAILABLE_ONLINE' }, { step: 'ERROR' },
  { step: 'SIGN_LINK_PENDING', caseNumber: 'U26-000001' }, { step: 'INVALID_PARTIES', role: null },
  ...['destination', 'verification', 'general', 'busy', 'conflict', 'fresh_key'].map(reason => ({ step: 'RETRY_LATER', reason, retryAfter: 3600 })),
];

test('ningún texto promete que un asesor llamará ni dice «no aplica»', () => {
  for (const outcome of EVERY_OUTCOME) {
    const { title, detail = '' } = outcomeMessage(outcome);
    assert.ok(title.length > 0, outcome.step);
    assert.doesNotMatch(`${title} ${detail}`, /asesor te contactar|te contactar|te llamar|no aplica/i, `${outcome.step}/${outcome.reason ?? ''}`);
  }
});

test('copias exactas de los bloqueos', () => {
  assert.equal(outcomeMessage({ step: 'UNAVAILABLE_ONLINE' }).title, 'La contratación en línea no está disponible en este momento.');
  assert.equal(outcomeMessage({ step: 'UNAVAILABLE_ONLINE' }).detail, 'Escríbenos por WhatsApp y te ayudamos a terminar.');
  assert.equal(outcomeMessage({ step: 'NOT_ELIGIBLE' }).title, 'Con estas respuestas no podemos iniciar este servicio en línea.');
  assert.match(outcomeMessage({ step: 'NOT_ELIGIBLE' }).detail, /¿Tienes dudas\? Escríbenos por WhatsApp/);
  assert.match(outcomeMessage({ step: 'RETRY_LATER', reason: 'fresh_key' }).detail, /usa el código más reciente/);
  assert.match(outcomeMessage({ step: 'SIGN_LINK_PENDING', caseNumber: 'U26-000001' }).title, /U26-000001/);
});

test('FIX_CONTACT: la copia exacta que ve la persona, con enlace a la cuenta y salida por WhatsApp',()=>{
  const account = outcomeMessage({ step: 'FIX_CONTACT', reason: 'email_has_account', phoneHint: '42' });
  assert.equal(account.title, 'Ya tienes una cuenta con este correo.');
  assert.equal(account.detail, 'Escribe el teléfono que registraste y te enviaremos un código nuevo. O entra a tu cuenta.');
  const inUse = outcomeMessage({ step: 'FIX_CONTACT', reason: 'phone_in_use' });
  assert.equal(inUse.title, 'Revisa tu teléfono.');
  assert.match(inUse.detail, /escríbenos por WhatsApp.$/);
  assert.ok(waLink(whatsappHelpMessage('Visa Juvenil', 'WEB-AB12CD')).startsWith('https://wa.me/13853927656?text='));
});

test('un cliente reconocido (clientCreated=false) ve «Te reconocimos»',()=>{
  assert.equal(outcomeMessage({ step: 'SIGN', clientCreated: false, serviceAlreadyLive: null, firstName: 'Ana' }).title, 'Te reconocimos: añadimos este servicio a tu cuenta de ContyGo.');
});

test('verification y destination hablan con el Retry-After', () => {
  assert.match(outcomeMessage({ step: 'RETRY_LATER', reason: 'verification', retryAfter: 3600 }).detail, /una hora/);
  assert.match(outcomeMessage({ step: 'RETRY_LATER', reason: 'verification' }).detail, /una hora/);
  assert.match(outcomeMessage({ step: 'RETRY_LATER', reason: 'destination', retryAfter: 600 }).detail, /10 minutos/);
  assert.equal(waitText(20), 'unos segundos');
  assert.equal(waitText(null), 'unos minutos');
});

test('el mensaje de WhatsApp lleva el servicio y la referencia, sin datos personales', () => {
  const message = whatsappHelpMessage('Visa Juvenil', 'WEB-AB12CD');
  assert.equal(message, 'Hola, estaba contratando Visa Juvenil en la web de ContyGo y necesito ayuda (ref. WEB-AB12CD).');
  assert.equal(whatsappHelpMessage('Visa Juvenil'), 'Hola, estaba contratando Visa Juvenil en la web de ContyGo y necesito ayuda.');
  assert.ok(waLink(message).startsWith('https://wa.me/13853927656?text='));
});

test('/reenviar: cada respuesta tiene su texto y decide si se repite la misma clave', () => {
  assert.deepEqual(readResend(200, { step: 'SIGN_LINK', signingUrl: 'https://contygo.app/firma/x' }), { kind: 'link', signingUrl: 'https://contygo.app/firma/x' });
  assert.equal(readResend(200, { step: 'ALREADY_SIGNED' }).signed, true);
  assert.match(readResend(200, { step: 'NOT_RESENDABLE' }).title, /ya no se puede reenviar/);
  assert.equal(readResend(200, { step: 'IN_PROGRESS', retryAfter: 1 }).keepKey, true);
  assert.equal(readResend(200, { step: 'RETRY_LATER', reason: 'busy', retryAfter: 1 }).keepKey, true);
  assert.equal(readResend(200, { step: 'RETRY_LATER', reason: 'destination', retryAfter: 900 }).keepKey, false);
  assert.match(readResend(200, { step: 'UNAVAILABLE_ONLINE', code: 'FORBIDDEN' }).title, /no está disponible/);
  // 502, 504 o una página que no es JSON: busy, misma clave.
  for (const status of [502, 503, 504]) assert.equal(readResend(status, undefined).keepKey, true, String(status));
  assert.equal(readResend(200, undefined).keepKey, true);
  assert.equal(readResend(429, undefined, 120).keepKey, false);
});

test('el teléfono del contrato es solo +1: sin selector de país y acepta pegar +1 (305) 555-0199', () => {
  const us = renderToStaticMarkup(React.createElement(PhoneField, { usOnly: true, value: '+13055550199', onChange() {} }));
  assert.ok(!us.includes('<select'), 'sin selector');
  assert.ok(us.includes('+1') && us.includes('(305) 555-0199'));
  const international = renderToStaticMarkup(React.createElement(PhoneField, { value: '+13055550199', onChange() {} }));
  assert.ok(international.includes('<select'), 'el del lead conserva el selector');
  // Un número que no es +1 no llena el campo del contrato.
  const foreign = renderToStaticMarkup(React.createElement(PhoneField, { usOnly: true, value: '', onChange() {} }));
  assert.ok(foreign.includes('placeholder="(305) 555-0199"'));
});

test('precios: solo salen del mapa vivo; sin mapa no hay precio', () => {
  const map = { 'visa-juvenil-basico': { fromCents: 250000, plans: [{ name: { es: 'Básico' }, priceCents: 250000 }] }, 'i-360': { fromCents: 50000, plans: [{ name: { es: 'Sin abogado' }, priceCents: 50000 }, { name: { es: 'Con abogado' }, priceCents: 90000 }] } };
  assert.equal(prices.fromPriceLabel(map, 'visa-juvenil-basico'), '$2,500');
  assert.equal(prices.fromPriceLabel(null, 'visa-juvenil-basico'), null);
  assert.equal(prices.fromPriceLabel(map, 'inexistente'), null);
  assert.equal(prices.lowestCents(map), 50000);
  assert.equal(prices.lowestCents(null), null);
  assert.equal(prices.planPriceCents(map, 'i-360', 'Con abogado', 2), 90000);
  assert.equal(prices.planPriceCents(map, 'i-360', 'Otro', 2), null);
  assert.equal(prices.planPriceCents(map, 'visa-juvenil-basico', 'Cualquiera', 1), 250000);
  assert.equal(prices.planPriceCents(null, 'i-360', 'Con abogado', 2), null);
});

test('F1: un número extranjero pegado en el campo +1 sale internacional y el validador del contrato lo rechaza', () => {
  const { usOnlyPhone } = require('../components/contygo/guide/PhoneField.tsx');
  const { normalizeContractPhone } = require('../lib/contygo-api/checkout.ts');
  // Belgium and Cuba add up to exactly 10 digits: they must not become a valid +1 number.
  for (const typed of ['+32 12345678', '+53 5 234 5678', '0032 12345678']) {
    const out = usOnlyPhone(typed);
    assert.equal(out.foreign, true, typed);
    assert.ok(!out.value.startsWith('+1'), `${typed} → ${out.value}`);
    assert.equal(normalizeContractPhone(out.value), null, typed);
  }
  // A valid US paste keeps working in every shape.
  for (const typed of ['+1 (305) 555-0199', '1-305-555-0199', '3055550199', '(305) 555-0199']) {
    const out = usOnlyPhone(typed);
    assert.equal(out.foreign, false, typed);
    assert.equal(out.value, '+13055550199', typed);
    assert.equal(normalizeContractPhone(out.value), '+13055550199', typed);
  }
  assert.equal(usOnlyPhone('').value, '');
});

test('SEC-03: el consentimiento de Meta es obligatorio por defecto; solo "0" lo apaga', () => {
  const path = require.resolve('../lib/meta/events.ts');
  const saved = process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT;
  const load = value => {
    delete require.cache[path];
    if (value === undefined) delete process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT; else process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT = value;
    return require(path).REQUIRE_CONSENT;
  };
  try {
    assert.equal(load(undefined), true, 'sin variable se pide');
    assert.equal(load('1'), true);
    assert.equal(load(''), true);
    assert.equal(load('false'), true, 'solo "0" lo desactiva');
    assert.equal(load('0'), false);
  } finally {
    delete require.cache[path];
    if (saved === undefined) delete process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT; else process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT = saved;
  }
});

test('SEC-03: el Pixel no se renderiza (ni su script) antes de que haya consentimiento', () => {
  const { MetaPixel } = require('../components/meta/MetaPixel.tsx');
  assert.equal(renderToStaticMarkup(React.createElement(MetaPixel)), '', 'el primer render no trae nada de Meta');
  const { shouldTrack } = require('../lib/meta/pixel-client.ts');
  assert.equal(shouldTrack(), false, 'sin navegador no hay consentimiento');
});
