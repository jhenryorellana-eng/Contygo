// contygo SIMULADO para probar el recorrido completo sin crear nada real (ni leads, ni clientes, ni contratos).
// Uso: node scripts/contygo-mock-server.cjs  y, en otra terminal, arranca la web con
//   CONTYGO_API_BASE=http://127.0.0.1:3999/api/integrations/v1 npm run dev
// Código de verificación válido: 481920 (cualquier otro da VERIFICATION_INVALID). Registro en %TEMP%/contygo-mock.log.
// Catálogo: copia del real del 29-09-2026 (scripts/fixtures), con el kind de cada pregunta. El resto: ejemplos de la guía y del OpenAPI.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'contygo-catalog-2026-09-29.json'), 'utf8'));
const log = path.join(require('node:os').tmpdir(), 'contygo-mock.log');
fs.writeFileSync(log, '');
const note = entry => fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
const VERIFICATION_ID = 'mockVerificationId-000000000000000000';
let signed = false;

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
      return send(200, { eligible: bad.length === 0, missingQuestionIds: [], disqualifiedQuestionIds: bad, notices: [], anchorYmd: null });
    }
    if (req.method === 'PUT' && url.startsWith('/leads/')) return send(201, { leadId: '9b0e0000-0000-4000-8000-000000000001', created: true, linked: false, status: 'open', contactedAt: null, warnings: [] });
    if (req.method === 'POST' && url === '/contracts') {
      if (!body.verificationId) return send(409, { error: { code: 'CLIENT_VERIFICATION_REQUIRED', message: 'Code sent', details: { verificationId: VERIFICATION_ID, maskedEmail: body.client.email.replace(/^(.).*@/, '$1***@'), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() } } });
      if (body.verificationCode !== '481920') return send(409, { error: { code: 'VERIFICATION_INVALID', message: 'Wrong code', details: { attemptsLeft: 4 } } });
      return send(201, { clientCreated: true, caseId: '44444444-4444-4444-8444-444444444444', caseNumber: 'U26-000133', contractId: '55555555-5555-4555-8555-555555555555', clientId: '66666666-6666-4666-8666-666666666666', signingUrl: 'https://127.0.0.1:3999/firma/demo-token', warnings: [] });
    }
    if (req.method === 'GET' && url.startsWith('/contracts/')) return send(200, { contractId: '55555555-5555-4555-8555-555555555555', caseId: '44444444-4444-4444-8444-444444444444', caseNumber: 'U26-000133', status: signed ? 'signed' : 'sent', sentAt: new Date().toISOString(), signedAt: null, signingExpiresAt: new Date(Date.now() + 14 * 864e5).toISOString(), downpayment: { status: 'pending', amountCents: 50000, paidAt: null }, externalRef: 'web-x' });
    if (req.method === 'POST' && url.endsWith('/link')) return send(200, { contractId: '55555555-5555-4555-8555-555555555555', signingUrl: 'https://127.0.0.1:3999/firma/demo-token-2', expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(), rotated: false });
    send(404, { error: { code: 'NOT_FOUND' } });
  });
}).listen(3999, '127.0.0.1', () => console.log('contygo simulado en http://127.0.0.1:3999'));
