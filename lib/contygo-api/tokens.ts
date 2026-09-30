/* ============================================================
   ContyGo · firmas del proxy SIN base de datos (SOLO servidor)
   Guía §2 bis: el servidor no guarda nada; lo que el navegador trae
   de vuelta va firmado con un secreto propio, LANDING_TOKEN_SECRET.

   · Token del contrato (el de la guía, tal cual):
       contractId + "." + HMAC_SHA256(LANDING_TOKEN_SECRET, contractId)
     /estado y /reenviar solo aceptan este token; si no cuadra, 404.
   · Ticket de la verificación (misma técnica, pieza nuestra):
       exp + "." + HMAC(secreto, "ticket|exp|verificationId|sha256(cuerpo)")
     Ata el verificationId al cuerpo EXACTO que este servidor mandó en
     la 1.ª llamada. Así /confirmar solo canjea códigos de altas que
     pasaron por el CAPTCHA, y siempre con esos mismos bytes.
   ============================================================ */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class LandingSecretMissingError extends Error {
  constructor() { super("LANDING_TOKEN_SECRET no está configurado"); this.name = "LandingSecretMissingError"; }
}

/** Un código de contygo vale 15 minutos; el ticket, algo más para cubrir el reloj y la red. */
export const TICKET_TTL_SECONDS = 30 * 60;

function secret(): string {
  const own = process.env.LANDING_TOKEN_SECRET;
  if (own) {
    if (own.length < 32) throw new LandingSecretMissingError();
    return own;
  }
  // Solo en desarrollo, sin secreto propio: uno derivado de la clave. En producción es obligatorio.
  const key = process.env.CONTYGO_API_KEY;
  if (process.env.NODE_ENV !== "production" && key) return createHash("sha256").update(`contygo-landing-token:${key}`).digest("hex");
  throw new LandingSecretMissingError();
}

/** Antes de enviar un código: sin secreto no se podría canjear, así que no se envía. */
export function assertTokensReady() { secret(); }

const mac = (message: string) => createHmac("sha256", secret()).update(message).digest("base64url");
const same = (a: string, b: string) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const signContractToken = (contractId: string) => `${contractId}.${mac(contractId)}`;

/** El contractId del token, o null si no lo firmó este servidor. */
export function readContractToken(token: unknown): string | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const contractId = token.slice(0, dot);
  if (!/^[A-Za-z0-9-]{1,64}$/.test(contractId)) return null;
  return same(token.slice(dot + 1), mac(contractId)) ? contractId : null;
}

const bodyHash = (body: unknown) => createHash("sha256").update(JSON.stringify(body)).digest("base64url");
const ticketMessage = (exp: string, verificationId: string, body: unknown) => `ticket|${exp}|${verificationId}|${bodyHash(body)}`;

export function signVerificationTicket(verificationId: string, body: unknown, now = Date.now()) {
  const exp = String(Math.floor(now / 1000) + TICKET_TTL_SECONDS);
  return `${exp}.${mac(ticketMessage(exp, verificationId, body))}`;
}

/** true solo si el ticket es de este servidor, no caducó y el cuerpo llega byte a byte igual. */
export function checkVerificationTicket(ticket: unknown, verificationId: string, body: unknown, now = Date.now()): boolean {
  if (typeof ticket !== "string" || ticket.length > 200) return false;
  const [exp, signature, extra] = ticket.split(".");
  if (extra !== undefined || !signature || !/^\d{9,12}$/.test(exp ?? "")) return false;
  if (Number(exp) < now / 1000) return false;
  return same(signature, mac(ticketMessage(exp, verificationId, body)));
}
