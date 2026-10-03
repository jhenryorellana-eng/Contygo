/* ============================================================
   ContyGo · texto de la casilla de aceptación (versionado)
   La versión viaja en consent.textVersion y queda en la auditoría
   del caso. REGLA: si cambia una sola palabra del texto, cambia la
   versión en el mismo cambio. tests/contygo-api.test.cjs lo
   comprueba con la huella del texto de la casilla Y de las páginas /terminos y /privacidad
   (lib/legal/*.ts): tocar cualquiera de los tres obliga a subir la versión.

   BORRADOR: PENDIENTE DE APROBACIÓN LEGAL DEL DUEÑO. Redactado para la
   integración; la entidad legal es USA LATINO PRIME LLC y ContyGo es su marca.
   ============================================================ */
import type { Locale } from "./types";

export const CONTRACT_TERMS = {
  version: "terminos-web-2026-10-03",
  es: "Acepto los Términos y la Política de privacidad de ContyGo, marca de USA LATINO PRIME LLC. Autorizo a ContyGo a usar estos datos para crear mi cuenta, abrir mi caso y preparar el contrato de este servicio, y a enviarme a mi correo el código de verificación y el enlace para firmarlo. Entiendo que ContyGo no es un despacho de abogados y no ofrece asesoría legal.",
  en: "I accept the Terms and Privacy Policy of ContyGo, a brand of USA LATINO PRIME LLC. I authorize ContyGo to use this information to create my account, open my case and prepare the contract for this service, and to email me the verification code and the link to sign it. I understand that ContyGo is not a law firm and does not provide legal advice.",
} as const;

export const termsText = (locale: Locale) => CONTRACT_TERMS[locale];
