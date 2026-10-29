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
  | { step: "EXISTING_CLIENT" }
  | { step: "FIX_CONTACT"; reason: "email_has_account" | "phone_in_use"; phoneHint?: string }
  | { step: "NOT_ELIGIBLE" }
  | { step: "UNAVAILABLE" }
  | { step: "INVALID_PARTIES"; role: string | null }
  | { step: "PRICE_NOT_QUOTABLE" }
  | { step: "SIGN_LINK_PENDING"; caseNumber: string; firstName?: string }
  | { step: "UNAVAILABLE_ONLINE" }
  | { step: "RETRY_LATER"; reason: "destination" | "verification" | "general" | "busy" | "conflict" | "fresh_key"; retryAfter?: number | null }
  | { step: "ERROR" };

/** Precio por rol sin cotización publicada para esa cantidad de personas (PRICE_NOT_QUOTABLE, o la misma regla aplicada en la ficha). */
export const PRICE_NOT_QUOTABLE_MESSAGE = { title: "Para esa cantidad, consulta el precio con la oficina.", detail: "Con ese número de personas el precio no está publicado en línea. Escríbenos por WhatsApp y te lo confirmamos." };

/** Texto neutro para CLIENT_NEEDS_HUMAN: nunca se explica el motivo ni se promete que alguien llamará. */
export const HUMAN_MESSAGE = "Para terminar tu contratación, escríbenos por WhatsApp.";

/** Cuenta que x-legal no enlaza sola: se dice sin rodeos que ya es cliente y se la manda a WhatsApp para que el equipo la una. */
export const EXISTING_CLIENT_MESSAGE = "Ya eres cliente de ContyGo.";
export const EXISTING_CLIENT_DETAIL = "Para añadir este servicio a tu cuenta, escríbenos por WhatsApp y lo hacemos contigo.";

/** Dónde se aprende a entrar a la cuenta (el aviso de «Ya tienes una cuenta» enlaza aquí). */
export const ACCOUNT_LOGIN_URL = "https://contygo.app/entrar";

/**
 * Qué se le dice a quien ya existe pero escribió un teléfono que no cuadra (FIX_CONTACT): el error del campo
 * «Teléfono» y el aviso. Nunca más de 2 dígitos del teléfono de la cuenta; sin pista, sin paréntesis.
 */
export function fixContactMessages(outcome: { reason: "email_has_account" | "phone_in_use"; phoneHint?: string }): { fieldError: string; title: string; detail: string } {
  if (outcome.reason === "phone_in_use") return {
    fieldError: "Con este correo no podemos usar este teléfono.",
    title: "Revisa tu teléfono.",
    detail: "Si ya eres cliente, usa el correo y el teléfono de tu cuenta; si no, prueba con otro teléfono o escríbenos por WhatsApp.",
  };
  const hint = typeof outcome.phoneHint === "string" && /^\d{2}$/.test(outcome.phoneHint) ? outcome.phoneHint : null;
  return {
    fieldError: `Este correo ya tiene una cuenta en ContyGo. Usa el teléfono de tu cuenta${hint ? ` (termina en ${hint})` : ""}.`,
    title: "Ya tienes una cuenta con este correo.",
    detail: "Escribe el teléfono que registraste y te enviaremos un código nuevo. O entra a tu cuenta.",
  };
}

/** «Te reconocimos»: el contrato quedó en la cuenta que la persona ya tenía (clientCreated=false). */
export const RECOGNIZED_MESSAGE = "Te reconocimos: añadimos este servicio a tu cuenta de ContyGo.";

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

/**
 * Ajuste de estatus con la fecha de prioridad aún sin llegar (o sin la fecha a mano): el contrato previo.
 * contygo no deja contratar en línea si la fecha no está vigente (evaluate → eligible:false, 10-10-2026),
 * así que lo prepara un asesor. Si contygo lo habilita, la ficha pasa sola al contrato en línea.
 */
export function previoMessage(status: "near" | "far" | "unknown"): { title: string; detail: string } {
  if (status === "near") return { title: "Tu fecha está muy cerca: aseguremos tu lugar.", detail: "Un asesor prepara contigo el contrato previo por WhatsApp, con sus garantías y la oferta, para que presentes en cuanto llegue tu fecha." };
  if (status === "far") return { title: "Tu contrato previo lo preparamos contigo.", detail: "Mientras llega tu fecha de prioridad, un asesor te acompaña por WhatsApp para asegurar tu lugar, con sus garantías y la oferta." };
  return { title: "Confirmemos tu fecha de prioridad.", detail: "Escríbenos por WhatsApp con el aviso I-797 a mano: revisamos la fecha contigo y aseguramos tu lugar con el contrato previo." };
}
/**
 * Reforzamiento de Asilo cuando el contrato no sale en línea: plazo de pruebas vencido, sin fecha todavía, o la
 * próxima audiencia en menos de 5 días hábiles (contygo la rechaza: event_too_close). Lo prepara un asesor.
 */
export function asylumMessage(outcome: { kind: string; track: string }): { title: string; detail: string } {
  if (outcome.kind === "late") return outcome.track === "afirmativo"
    ? { title: "Tu entrevista está muy cerca.", detail: "USCIS recibe las pruebas hasta 14 días antes de la entrevista. Un asesor revisa tu caso contigo por WhatsApp y te dice cómo seguir." }
    : { title: "Tu audiencia final está muy cerca.", detail: "Las pruebas se reciben hasta 30 días antes de la audiencia final. Un asesor revisa tu caso contigo por WhatsApp y, si el juez niega tu asilo, te acompañamos en la apelación." };
  if (outcome.kind === "nodate") return { title: "Todavía tienes tiempo: preparemos tu contrato.", detail: "Como aún no tienes fecha, un asesor prepara tu contrato contigo por WhatsApp y empezamos a reforzar tu caso." };
  if (outcome.kind === "soon") return { title: "Tu próxima audiencia es en pocos días.", detail: "Un asesor revisa tu caso contigo por WhatsApp para empezar cuanto antes." };
  return { title: "Revisemos tu caso contigo.", detail: "Un asesor te acompaña por WhatsApp para preparar tu contrato." };
}
/** Preparación de audiencia sin una audiencia programada: todavía no hay sesión que preparar; Henry orienta por WhatsApp. */
/** Cuando contygo dijo que no en la conversación (13-10-2026): la ficha no abre el contrato y lo dice claro. */
export function ineligibleMessage(serviceId: string): { title: string; detail: string } {
  return serviceId === "apelacion"
    ? { title: "Revisemos tu plazo para apelar.", detail: "Por la fecha de la decisión del juez, no podemos iniciar la apelación en línea. Un asesor revisa tu plazo contigo por WhatsApp: escríbenos hoy, cada día cuenta." }
    : { title: "Revisemos tu caso contigo.", detail: "Con estas respuestas no podemos iniciar este servicio en línea. Un asesor revisa tu caso por WhatsApp y te dice cómo seguir." };
}

/** Preparación de audiencia con la audiencia antes de la antelación que pide contygo (event_too_close). */
export const HEARING_TOO_CLOSE_MESSAGE = { title: "Tu audiencia es muy pronto para reservar en línea.", detail: "Henry necesita al menos 7 días para preparar la sesión contigo. Escríbele por WhatsApp y él te dice qué hacer." };
export const HEARING_ADVISOR_MESSAGE = { title: "Escríbele a Henry antes de reservar.", detail: "Esta preparación es para una audiencia ya programada en la corte de inmigración. Henry te orienta por WhatsApp sobre tu caso." };
/** «Crea tu contrato con un asesor» (20-10-2026): el chat del CRM, con el servicio, el nombre si lo dio y la referencia. */
export const whatsappAdvisorContractMessage = (serviceName: string, name?: string | null, ref?: string | null) =>
  `Hola, quiero crear mi contrato de ${serviceName} con un asesor.${name?.trim() ? ` Me llamo ${name.trim()}.` : ""} Vi la guía en la web de ContyGo${ref ? ` (ref. ${ref})` : ""}.`;
/** «Terminar con un asesor» (29-10-2026): quien empezó el contrato por su cuenta pasa al chat del CRM sin empezar de cero:
 *  su nombre (como en «con un asesor»), el paso donde va y la referencia, con la que el equipo encuentra sus datos en el CRM.
 *  Ni correo ni teléfono en el enlace (como los demás mensajes de WhatsApp). */
export const whatsappSwitchToAdvisorMessage = (serviceName: string, progress: { name?: string; step?: string; ref?: string | null }) =>
  [`Hola, empecé mi contrato de ${serviceName} en la web de ContyGo y quiero terminarlo con un asesor.`,
    progress.name?.trim() && `Me llamo ${progress.name.trim()}.`,
    progress.step && `Voy en: ${progress.step}.`,
    progress.ref && `(ref. ${progress.ref})`].filter(Boolean).join(" ");
/** Lotería de Visas (26-10-2026): «Que ContyGo lo haga por ti», mientras ese camino no se contrata en línea. */
export const whatsappLotteryMessage = (name?: string | null, ref?: string | null) =>
  `Hola, quiero que ContyGo haga mi inscripción en la Lotería de Visas DV-2027.${name?.trim() ? ` Me llamo ${name.trim()}.` : ""} Vi la guía en la web de ContyGo${ref ? ` (ref. ${ref})` : ""}.`;
export const whatsappHearingMessage = (serviceName: string, ref?: string | null) =>
  `Hola Henry, quiero orientación sobre ${serviceName}, que vi en la web de ContyGo${ref ? ` (ref. ${ref})` : ""}.`;
export const whatsappAsylumMessage = (serviceName: string, ref?: string | null) =>
  `Hola, quiero que revisen mi caso para ${serviceName}, que vi en la web de ContyGo${ref ? ` (ref. ${ref})` : ""}.`;
export const whatsappPrevioMessage = (serviceName: string, ref?: string | null) =>
  `Hola, quiero hacer el contrato previo de ${serviceName} que vi en la web de ContyGo${ref ? ` (ref. ${ref})` : ""}.`;

export function outcomeMessage(outcome: ScreenOutcome, roleLabel?: string): { title: string; detail?: string } {
  switch (outcome.step) {
    case "INVALID": return { title: "Revisa los campos marcados." };
    case "NEEDS_ANSWERS": return { title: "Antes de contratar necesitamos tus respuestas a las preguntas del servicio.", detail: "Cierra y vuelve a abrir el servicio para responderlas; solo toma un momento." };
    case "ASK_CODE": return { title: `Te enviamos un código de 6 dígitos a ${outcome.maskedEmail || "tu correo"}.`, detail: "Escríbelo aquí. Vale durante 15 minutos." };
    case "SIGN": return outcome.clientCreated
      ? { title: `¡Listo${outcome.firstName ? `, ${outcome.firstName}` : ""}! Tu contrato está preparado.` }
      : { title: RECOGNIZED_MESSAGE };
    case "ALREADY_DONE": return { title: `Tu contrato ya está preparado (caso ${outcome.caseNumber}).`, detail: "Si no te llegó el enlace para firmarlo, te lo reenviamos." };
    case "WRONG_CODE": return { title: "El código no es correcto.", detail: outcome.attemptsLeft === null ? "Revísalo e inténtalo de nuevo." : `Te ${outcome.attemptsLeft === 1 ? "queda 1 intento" : `quedan ${outcome.attemptsLeft} intentos`}.` };
    case "RESTART": return { title: "El código caducó. Te enviamos uno nuevo." };
    case "HUMAN": return { title: HUMAN_MESSAGE };
    case "EXISTING_CLIENT": return { title: EXISTING_CLIENT_MESSAGE, detail: EXISTING_CLIENT_DETAIL };
    case "FIX_CONTACT": { const { title, detail } = fixContactMessages(outcome); return { title, detail }; }
    case "NOT_ELIGIBLE": return { title: "Con estas respuestas no podemos iniciar este servicio en línea.", detail: "¿Tienes dudas? Escríbenos por WhatsApp." };
    case "UNAVAILABLE_ONLINE": return { title: "La contratación en línea no está disponible en este momento.", detail: "Escríbenos por WhatsApp y te ayudamos a terminar." };
    case "SIGN_LINK_PENDING": return { title: `Tu contrato está preparado (caso ${outcome.caseNumber}).`, detail: "Toca «Enviarme el enlace» para recibir el enlace de firma." };
    case "UNAVAILABLE": return { title: "Este servicio no está disponible ahora mismo." };
    case "PRICE_NOT_QUOTABLE": return PRICE_NOT_QUOTABLE_MESSAGE;
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
