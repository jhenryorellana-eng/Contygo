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
  | { step: "RETRY_LATER"; reason: "destination" | "general" | "busy" | "conflict" }
  | { step: "ERROR" };

/** Texto neutro para CLIENT_NEEDS_HUMAN: nunca se explica el motivo. */
export const HUMAN_MESSAGE = "Para completar tu solicitud, un asesor te contactará en breve.";

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
    case "NOT_ELIGIBLE": return { title: "Este trámite no aplica a tu caso.", detail: "¿Quieres hablar con un asesor?" };
    case "UNAVAILABLE": return { title: "Este servicio no está disponible ahora mismo." };
    case "INVALID_PARTIES": return { title: `Revisa las personas del expediente${roleLabel ? `: falta ${roleLabel.toLowerCase()}` : ""}.` };
    case "RETRY_LATER": return outcome.reason === "general"
      ? { title: "Estamos recibiendo muchas solicitudes; inténtalo en unos minutos." }
      : outcome.reason === "destination"
        ? { title: "Por seguridad, espera unos minutos antes de intentarlo de nuevo." }
        : { title: "No pudimos confirmarlo todavía.", detail: "Inténtalo de nuevo en unos segundos." };
    case "ERROR": return { title: "No pudimos completar tu solicitud. Un asesor te contactará." };
  }
}

export const serviceAlreadyLiveMessage = (caseNumber: string) => `Ya tienes este trámite en curso (caso ${caseNumber}). Abrimos uno nuevo como pediste.`;
