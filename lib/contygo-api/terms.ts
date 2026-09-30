/* ============================================================
   ContyGo · texto de la casilla de aceptación (versionado)
   La versión viaja en consent.textVersion y queda en la auditoría
   del caso. REGLA: si cambia una sola palabra del texto, cambia la
   versión en el mismo cambio. tests/contygo-checkout.test.cjs lo
   comprueba con la huella del texto.

   BORRADOR pendiente de revisión legal: redactado para la
   integración, no aprobado todavía por el despacho.
   ============================================================ */
import type { Locale } from "./types";

export const CONTRACT_TERMS = {
  version: "terminos-web-2026-09-28",
  es: "Acepto los Términos y la Política de privacidad de ContyGo. Autorizo a ContyGo a usar estos datos para crear mi cuenta, abrir mi caso y preparar el contrato de este servicio, y a enviarme a mi correo el código de verificación y el enlace para firmarlo. Entiendo que ContyGo no es un despacho de abogados y no ofrece asesoría legal.",
  en: "I accept ContyGo's Terms and Privacy Policy. I authorize ContyGo to use this information to create my account, open my case and prepare the contract for this service, and to email me the verification code and the link to sign it. I understand that ContyGo is not a law firm and does not provide legal advice.",
} as const;

export const termsText = (locale: Locale) => CONTRACT_TERMS[locale];
