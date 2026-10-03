/* ============================================================
   ContyGo · qué se dice en pantalla con cada respuesta (guía §5)
   Lo decide el código, no el modelo de IA. Sin dependencias del
   servidor: lo usa la ficha del navegador.
   ============================================================ */

export type ScreenOutcome =
  | { step: "INVALID" }
  | { step: "NEEDS_ANSWERS" }
  | { step: "ASK_CODE"; maskedEmail: string }
  | { step: "SIGN"; clientCreated: boolean; serviceAlreadyLive: string | null; firstName: string }
  | { step: "ALREADY_DONE"; caseNumber: string }
  | { step: "WRONG_CODE"; attemptsLeft: number | null }
  | { step: "RESTART" }
  | { step: "HUMAN" }
  | { step: "NOT_ELIGIBLE" }
  | { step: "UNAVAILABLE" }
  | { step: "INVALID_PARTIES"; role: string | null }
  | { step: "SIGN_LINK_PENDING"; caseNumber: string; firstName?: string }
  | { step: "UNAVAILABLE_ONLINE" }
  | { step: "RETRY_LATER"; reason: "destination" | "verification" | "general" | "busy" | "conflict" | "fresh_key"; retryAfter?: number | null }
  | { step: "ERROR" };

/** Texto neutro para CLIENT_NEEDS_HUMAN: nunca se explica el motivo ni se promete que alguien llamará. */
export const HUMAN_MESSAGE = "Para terminar tu contratación, escríbenos por WhatsApp.";

/** «unos segundos», «unos 5 minutos», «una hora»: lo que dice Retry-After, en palabras. */
export function waitText(retryAfter?: number | null): string {
  const seconds = typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 0;
  if (!seconds) return "unos minutos";
  if (seconds < 90) return "unos segundos";
  if (seconds < 3000) return `unos ${Math.max(2, Math.round(seconds / 60))} minutos`;
  if (seconds < 5400) return "una hora";
  return `unas ${Math.round(seconds / 3600)} horas`;
}

/** Mensaje prellenado de WhatsApp: el servicio y la referencia corta del intento (sin datos de la persona). */
export const whatsappHelpMessage = (serviceName: string, ref?: string | null) =>
  `Hola, estaba contratando ${serviceName} en la web de ContyGo y necesito ayuda${ref ? ` (ref. ${ref})` : ""}.`;

export function outcomeMessage(outcome: ScreenOutcome, roleLabel?: string): { title: string; detail?: string } {
  switch (outcome.step) {
    case "INVALID": return { title: "Revisa los campos marcados." };
    case "NEEDS_ANSWERS": return { title: "Antes de contratar necesitamos tus respuestas a las preguntas del servicio.", detail: "Cierra y vuelve a abrir el servicio para responderlas; solo toma un momento." };
    case "ASK_CODE": return { title: `Te enviamos un código de 6 dígitos a ${outcome.maskedEmail || "tu correo"}.`, detail: "Escríbelo aquí. Vale durante 15 minutos." };
    case "SIGN": return outcome.clientCreated
      ? { title: `¡Listo${outcome.firstName ? `, ${outcome.firstName}` : ""}! Tu contrato está preparado.` }
      : { title: "¡Ya eres cliente nuestro!", detail: "Añadimos este servicio a tu cuenta." };
    case "ALREADY_DONE": return { title: `Tu contrato ya está preparado (caso ${outcome.caseNumber}).`, detail: "Si no te llegó el enlace para firmarlo, te lo reenviamos." };
    case "WRONG_CODE": return { title: "El código no es correcto.", detail: outcome.attemptsLeft === null ? "Revísalo e inténtalo de nuevo." : `Te ${outcome.attemptsLeft === 1 ? "queda 1 intento" : `quedan ${outcome.attemptsLeft} intentos`}.` };
    case "RESTART": return { title: "El código caducó. Te enviamos uno nuevo." };
    case "HUMAN": return { title: HUMAN_MESSAGE };
    case "NOT_ELIGIBLE": return { title: "Con estas respuestas no podemos iniciar este servicio en línea.", detail: "¿Tienes dudas? Escríbenos por WhatsApp." };
    case "UNAVAILABLE_ONLINE": return { title: "La contratación en línea no está disponible en este momento.", detail: "Escríbenos por WhatsApp y te ayudamos a terminar." };
    case "SIGN_LINK_PENDING": return { title: `Tu contrato está preparado (caso ${outcome.caseNumber}).`, detail: "Toca «Enviarme el enlace» para recibir el enlace de firma." };
    case "UNAVAILABLE": return { title: "Este servicio no está disponible ahora mismo." };
    case "INVALID_PARTIES": return { title: `Revisa las personas del expediente${roleLabel ? `: falta ${roleLabel.toLowerCase()}` : ""}.` };
    case "RETRY_LATER":
      switch (outcome.reason) {
        case "general": return { title: "Estamos recibiendo muchas solicitudes; inténtalo en unos minutos." };
        case "destination": return { title: "Por seguridad, espera unos minutos antes de intentarlo de nuevo.", detail: `Puedes volver a intentarlo en ${waitText(outcome.retryAfter)}.` };
        case "verification": return { title: "Ya te enviamos varios códigos.", detail: `Usa el último que recibiste, o espera ${waitText(outcome.retryAfter ?? 3600)} para pedir otro. También puedes escribirnos por WhatsApp.` };
        case "fresh_key": return { title: "No pudimos confirmarlo todavía.", detail: "Toca «Enviar mi código» otra vez. Si te llegan dos correos, usa el código más reciente." };
        case "conflict": return { title: "Algo cambió mientras tanto.", detail: "Toca el botón otra vez para volver a intentarlo." };
        default: return { title: "No pudimos confirmarlo todavía.", detail: "Inténtalo de nuevo en unos segundos." };
      }
    case "ERROR": return { title: "No pudimos completar tu solicitud.", detail: "Puedes intentarlo de nuevo o escribirnos por WhatsApp." };
  }
}

export const serviceAlreadyLiveMessage = (caseNumber: string) => `Ya tienes este trámite en curso (caso ${caseNumber}). Abrimos uno nuevo como pediste.`;

/** What the browser does with an answer of /api/contratar/reenviar (the same for the checkout and the «gracias» page). */
export type ResendReading =
  | { kind: "link"; signingUrl: string }
  | { kind: "notice"; tone: "success" | "info" | "error"; title: string; detail?: string; keepKey: boolean; signed?: boolean };
type ResendOutcome = { step?: string; signingUrl?: string; reason?: string; retryAfter?: number | null };

/** `keepKey`: repeat the next attempt with the SAME Idempotency-Key (busy, in progress, a cut). */
export function readResend(status: number, outcome: ResendOutcome | undefined, retryAfterHeader?: number | null): ResendReading {
  if (!outcome) {
    if (status === 429) return { kind: "notice", tone: "error", keepKey: false, ...outcomeMessage({ step: "RETRY_LATER", reason: "destination", retryAfter: retryAfterHeader }) };
    // 502, 504, 503, a page that is not JSON: our own route did not answer; the link may well be on its way.
    if (status === 0 || status >= 500 || status === 200) return { kind: "notice", tone: "info", keepKey: true, ...outcomeMessage({ step: "RETRY_LATER", reason: "busy" }) };
    return { kind: "notice", tone: "error", keepKey: false, title: "No pudimos reenviar el enlace.", detail: "Inténtalo de nuevo o escríbenos por WhatsApp." };
  }
  switch (outcome.step) {
    case "SIGN_LINK":
      if (outcome.signingUrl) return { kind: "link", signingUrl: outcome.signingUrl };
      break;
    case "ALREADY_SIGNED": return { kind: "notice", tone: "success", keepKey: false, signed: true, title: "Tu contrato ya está firmado." };
    case "NOT_RESENDABLE": return { kind: "notice", tone: "info", keepKey: false, title: "Este contrato ya no se puede reenviar desde aquí.", detail: "Escríbenos por WhatsApp y lo revisamos contigo." };
    case "IN_PROGRESS": return { kind: "notice", tone: "info", keepKey: true, title: "Estamos preparando tu enlace.", detail: "Toca el botón otra vez en unos segundos." };
    case "UNAVAILABLE_ONLINE": return { kind: "notice", tone: "info", keepKey: false, ...outcomeMessage({ step: "UNAVAILABLE_ONLINE" }) };
    case "RETRY_LATER":
      if (outcome.reason === "busy") return { kind: "notice", tone: "info", keepKey: true, ...outcomeMessage({ step: "RETRY_LATER", reason: "busy" }) };
      return { kind: "notice", tone: "error", keepKey: false, ...outcomeMessage({ step: "RETRY_LATER", reason: "destination", retryAfter: outcome.retryAfter ?? retryAfterHeader }) };
  }
  return { kind: "notice", tone: "error", keepKey: false, title: "No pudimos reenviar el enlace.", detail: "Inténtalo de nuevo o escríbenos por WhatsApp." };
}
