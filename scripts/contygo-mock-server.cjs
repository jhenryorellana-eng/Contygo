// contygo SIMULADO para probar el recorrido completo sin crear nada real (ni leads, ni clientes, ni contratos).
// Uso: node scripts/contygo-mock-server.cjs  y, en otra terminal, arranca la web con
//   CONTYGO_API_BASE=http://127.0.0.1:3999/api/integrations/v1 npm run dev
// Código de verificación válido: 481920 (cualquier otro da VERIFICATION_INVALID). Registro en %TEMP%/contygo-mock.log.
// Catálogo: copia del real del 29-09-2026 (scripts/fixtures), con el kind de cada pregunta. El resto: ejemplos de la guía y del OpenAPI.
// Para ver las preguntas nuevas del catálogo de producción (us_state y future_event), el servicio visa-juvenil-basico
// recibe dos preguntas más (solo en este simulador). Desactívalo con MOCK_PLAIN_CATALOG=1.
// Correos mágicos (cualquier dominio) para recorrer los caminos raros desde la pantalla:
//   nolink@…  → 201 sin signingUrl (la ficha ofrece «Enviarme el enlace»)
//   ratelimit@… → 429 VERIFICATION_RATE_LIMITED (3 códigos por hora)
//   human@…  → 409 CLIENT_NEEDS_HUMAN
//   error@…  → 422 con un código desconocido (ERROR, con «Reintentar»)
//   forbidden@… → 403 FORBIDDEN (no disponible en línea)
//   hasaccount@… → tras el código, 409 CLIENT_NEEDS_HUMAN con details {resolution:'email_has_account', phoneHint:'42'} (la ficha pide corregir el teléfono)
//   phoneinuse@… → tras el código, 409 CLIENT_NEEDS_HUMAN con details {resolution:'phone_in_use'}
//   returning@… → tras el código, 201 con clientCreated:false («Te reconocimos»)
//   slow502@… → la 1.ª llamada con ese correo corta la conexión (la ficha reintenta con clave nueva)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'contygo-catalog-2026-09-29.json'), 'utf8'));
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','PR','GU','VI','AS','MP'];
const STATE_NAMES = { TX: 'Texas', FL: 'Florida', CA: 'California', NY: 'Nueva York', PR: 'Puerto Rico', DC: 'Distrito de Columbia' };
if (!process.env.MOCK_PLAIN_CATALOG) {
  const visa = catalog.services.find(service => service.slug === 'visa-juvenil-basico');
  if (visa) visa.eligibilityQuestions.push(
    { id: 'aaaaaaaa-0000-4000-8000-000000000001', kind: 'us_state', prompt: { es: '¿En qué estado vive el menor?', en: 'Which state does the minor live in?' }, options: STATES.map(code => ({ code, label: { es: STATE_NAMES[code] ?? code, en: STATE_NAMES[code] ?? code } })) },
    { id: 'aaaaaaaa-0000-4000-8000-000000000002', kind: 'date', dateMode: 'future_event', minNotice: { days: 30 }, prompt: { es: '¿Cuándo es la próxima audiencia en la corte?', en: 'When is the next court hearing?' } },
  );
}
const log = path.join(require('node:os').tmpdir(), 'contygo-mock.log');
fs.writeFileSync(log, '');
const note = entry => fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
const VERIFICATION_ID = 'mockVerificationId-000000000000000000';
let signed = false;
const cutOnce = new Set();

http.createServer((req, res) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    const url = req.url.replace(/^\/api\/integrations\/v1/, '');
    const body = raw ? JSON.parse(raw) : null;
    const send = (status, payload, headers = {}) => {
      note({ method: req.method, url, idem: req.headers['idempotency-key'] ?? null, auth: /^Bearer cg_live_/.test(req.headers.authorization ?? ''), body, status, code: payload?.error?.code ?? null });
      res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(payload));
    };
    if (req.method === 'GET' && url === '/me') return send(200, { principal: { id: 'mock', name: 'Web · simulado', channel: 'web' }, org: { id: 'mock', name: 'UsaLatinoPrime' }, actingAs: { staffUserId: 'mock', displayName: 'Agente' } });
    if (req.method === 'GET' && url === '/catalog') return send(200, catalog, { 'cache-control': 'private, max-age=60' });
    if (req.method === 'POST' && url === '/eligibility/evaluate') {
      const bad = body.answers.filter(a => a.value === false).map(a => a.questionId);
      return send(200, { eligible: bad.length === 0, missingQuestionIds: [], disqualifiedQuestionIds: bad, disqualified: bad.map(questionId => ({ questionId, reason: 'answer' })), notices: [], anchorYmd: null, anchorWaived: false });
    }
    if (req.method === 'PUT' && url.startsWith('/leads/')) return send(201, { leadId: '9b0e0000-0000-4000-8000-000000000001', created: true, linked: false, status: 'open', contactedAt: null, warnings: [] });
    if (req.method === 'POST' && url === '/contracts') {
      const email = String(body.client?.email ?? '');
      if (!/^\+1\d{10}$/.test(body.client?.phoneE164 ?? '')) return send(400, { error: { code: 'INVALID_REQUEST', message: 'Invalid', details: { fields: [{ path: 'client.phoneE164', reason: 'unsupported_country' }] } } });
      if (/^forbidden@/i.test(email)) return send(403, { error: { code: 'FORBIDDEN', message: 'Key cannot create contracts' } });
      if (/^ratelimit@/i.test(email) && !body.verificationId) return send(429, { error: { code: 'VERIFICATION_RATE_LIMITED', message: 'Too many codes' } }, { 'retry-after': '3600' });
      if (/^human@/i.test(email) && !body.verificationId) return send(409, { error: { code: 'CLIENT_NEEDS_HUMAN', message: 'Needs a person' } });
      if (/^error@/i.test(email) && !body.verificationId) return send(422, { error: { code: 'SOMETHING_ELSE', message: 'Unexpected' } });
      if (/^slow502@/i.test(email) && !body.verificationId && !cutOnce.has(email)) { cutOnce.add(email); note({ method: req.method, url, cut: true }); return req.socket.destroy(); }
      if (!body.verificationId) return send(409, { error: { code: 'CLIENT_VERIFICATION_REQUIRED', message: 'Code sent', details: { verificationId: VERIFICATION_ID, maskedEmail: body.client.email.replace(/^(.).*@/, '$1***@'), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() } } });
      if (body.verificationCode !== '481920') return send(409, { error: { code: 'VERIFICATION_INVALID', message: 'Wrong code', details: { attemptsLeft: 4 } } });
      // Como x-legal: la pista solo llega tras un código válido, y el teléfono 555-0142 es el «de la cuenta» (termina en 42).
      if (/^hasaccount@/i.test(email) && !body.client.phoneE164.endsWith('42')) return send(409, { error: { code: 'CLIENT_NEEDS_HUMAN', message: 'Needs a person', details: { resolution: 'email_has_account', phoneHint: '42' } } });
      if (/^phoneinuse@/i.test(email) && !body.client.phoneE164.endsWith('77')) return send(409, { error: { code: 'CLIENT_NEEDS_HUMAN', message: 'Needs a person', details: { resolution: 'phone_in_use' } } });
      if (/^returning@/i.test(email)) return send(201, { clientCreated: false, caseId: '44444444-4444-4444-8444-444444444444', caseNumber: 'U26-000134', contractId: '55555555-5555-4555-8555-555555555555', clientId: '66666666-6666-4666-8666-666666666666', signingUrl: 'https://127.0.0.1:3999/firma/demo-token', warnings: [] });
      if (/^nolink@/i.test(email)) return send(201, { clientCreated: true, caseId: '44444444-4444-4444-8444-444444444444', caseNumber: 'U26-000133', contractId: '55555555-5555-4555-8555-555555555555', clientId: '66666666-6666-4666-8666-666666666666', warnings: [] });
      return send(201, { clientCreated: true, caseId: '44444444-4444-4444-8444-444444444444', caseNumber: 'U26-000133', contractId: '55555555-5555-4555-8555-555555555555', clientId: '66666666-6666-4666-8666-666666666666', signingUrl: 'https://127.0.0.1:3999/firma/demo-token', warnings: [] });
    }
    if (req.method === 'GET' && url.startsWith('/contracts/')) return send(200, { contractId: '55555555-5555-4555-8555-555555555555', caseId: '44444444-4444-4444-8444-444444444444', caseNumber: 'U26-000133', status: signed ? 'signed' : 'sent', sentAt: new Date().toISOString(), signedAt: null, signingExpiresAt: new Date(Date.now() + 14 * 864e5).toISOString(), downpayment: { status: 'pending', amountCents: 50000, paidAt: null }, externalRef: 'web-x' });
    if (req.method === 'POST' && url.endsWith('/link')) return send(200, { contractId: '55555555-5555-4555-8555-555555555555', signingUrl: 'https://127.0.0.1:3999/firma/demo-token-2', expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(), rotated: false });
    send(404, { error: { code: 'NOT_FOUND' } });
  });
}).listen(3999, '127.0.0.1', () => console.log('contygo simulado en http://127.0.0.1:3999'));
