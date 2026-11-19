// Black Friday 2026: el anuncio vive hasta el final del viernes 27 de noviembre, en la hora de Utah.
require('./helpers/contygo-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { BLACK_FRIDAY, blackFridayPhase, blackFridayWait } = require('../lib/black-friday.ts');

test('el viernes anunciado es Black Friday: el día después del cuarto jueves de noviembre', () => {
  const day = new Date(`${BLACK_FRIDAY.day}T12:00:00Z`);
  assert.equal(day.getUTCDay(), 5, 'es viernes');
  const thursday = new Date(day.getTime() - 86_400_000);
  assert.equal(Math.ceil(thursday.getUTCDate() / 7), 4, 'el jueves anterior es el cuarto del mes');
  assert.equal(thursday.getUTCMonth(), 10);
  assert.equal(BLACK_FRIDAY.label, 'viernes 27 de noviembre');
});

test('antes se anuncia, ese día es «hoy» y desde el sábado desaparece (hora de Utah, UTC−7)', () => {
  const at = iso => blackFridayPhase(new Date(iso));
  assert.equal(at('2026-11-19T18:00:00Z'), 'antes');
  assert.equal(at('2026-11-27T06:59:59Z'), 'antes', 'jueves 23:59:59 en Utah');
  assert.equal(at('2026-11-27T07:00:00Z'), 'hoy', 'viernes 00:00 en Utah');
  assert.equal(at('2026-11-28T06:59:59Z'), 'hoy', 'viernes 23:59:59 en Utah');
  assert.equal(at('2026-11-28T07:00:00Z'), 'fuera', 'sábado 00:00 en Utah');
  assert.equal(at('2027-11-20T12:00:00Z'), 'fuera', 'no vuelve solo al año siguiente');
});

test('la cuenta atrás apunta al primer y al último instante de ese viernes en Utah', () => {
  const start = Date.parse(BLACK_FRIDAY.startsAt), end = Date.parse(BLACK_FRIDAY.endsAt);
  assert.equal(blackFridayPhase(new Date(start - 1)), 'antes');
  assert.equal(blackFridayPhase(new Date(start)), 'hoy');
  assert.equal(blackFridayPhase(new Date(end - 1)), 'hoy');
  assert.equal(blackFridayPhase(new Date(end)), 'fuera');
});

test('«Faltan N días» cuenta días de calendario en Utah', () => {
  const wait = iso => blackFridayWait(new Date(iso));
  assert.equal(wait('2026-11-19T19:00:00Z'), 'Faltan 8 días', 'jueves 19 a mediodía');
  assert.equal(wait('2026-11-26T06:00:00Z'), 'Faltan 2 días', 'miércoles 25 a las 23:00');
  assert.equal(wait('2026-11-26T07:30:00Z'), 'Es mañana', 'jueves 26 a las 00:30');
  assert.equal(wait('2026-11-27T06:59:00Z'), 'Es mañana', 'jueves 26 a las 23:59');
  assert.equal(wait('2026-11-27T15:00:00Z'), 'Solo hoy');
  assert.equal(wait('2026-11-28T15:00:00Z'), '');
});
