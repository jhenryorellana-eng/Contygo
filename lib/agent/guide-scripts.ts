/* Guía por voz del recorrido (28-09-2026).
   Frases fijas y aprobadas: se graban una sola vez con la voz de ContyGo
   (scripts/prepare-visa-live-voice.cjs → public/contygo/audio/live) y suenan al instante.
   Cada tramo puede señalar un campo de la pantalla («target»): mientras se pronuncia, ese campo se
   ilumina. Nunca llevan datos de la persona ni prometen resultados; no dicen «ya eres cliente»
   antes del código de verificación (reglas de la API de contratación). */
export type GuideSegment = { text: string; target?: string };

export const GUIDE_LINES = {
  // Pantalla «Ya diste el primer paso»
  revealContact: [
    { text: "¡Muy bien!" },
    { text: "Para seguir, dinos tu nombre", target: "name" },
    { text: "y tu número de contacto.", target: "phone" },
    { text: "Así podemos ayudarte si lo necesitas." },
  ],
  // Contrato, paso a paso
  contractName: [
    { text: "Empecemos tu contrato." },
    { text: "Escribe tu nombre", target: "firstName" },
    { text: "y tus apellidos,", target: "lastName" },
    { text: "tal como aparecen en tus documentos." },
  ],
  contractContact: [
    { text: "Ahora, tu correo electrónico.", target: "email" },
    { text: "Ahí te enviaremos un código para confirmar que eres tú.", target: "email" },
    { text: "Y tu teléfono de Estados Unidos.", target: "phone" },
  ],
  contractAddress: [
    { text: "Escribe la dirección donde vives:", target: "line1" },
    { text: "la calle y el número;", target: "line1" },
    { text: "luego la ciudad,", target: "city" },
    { text: "el estado", target: "state" },
    { text: "y el código postal.", target: "zip" },
  ],
  contractPeople: [
    { text: "Ahora, las personas de tu expediente." },
    { text: "Escribe sus nombres como aparecen en sus documentos.", target: "people" },
  ],
  contractPlan: [
    { text: "Este es tu paquete, con su precio publicado.", target: "plan" },
    { text: "Si hay opciones de pago, elige la que prefieras.", target: "pay" },
    { text: "Las tasas del gobierno, cuando aplican, van aparte." },
  ],
  contractReview: [
    { text: "Revisa que tus datos estén bien.", target: "summary" },
    { text: "Si todo está correcto, marca la casilla de aceptación", target: "consent" },
    { text: "y toca Enviar mi código.", target: "submit" },
  ],
  contractCode: [
    { text: "Te enviamos un código de seis números a tu correo.", target: "code" },
    { text: "Escríbelo aquí para confirmar que eres tú.", target: "code" },
    { text: "Si no lo ves, revisa el correo no deseado." },
  ],
  contractDone: [
    { text: "¡Listo! Tu contrato está preparado." },
    { text: "Toca Firmar mi contrato para leerlo y firmarlo cuando estés listo.", target: "sign" },
  ],
  contractDoneNoLink: [
    { text: "¡Listo! Tu contrato está preparado." },
    { text: "Toca Enviarme el enlace y te lo mandamos a tu correo.", target: "sign" },
  ],
} satisfies Record<string, GuideSegment[]>;

export type GuideLineId = keyof typeof GUIDE_LINES;
export const guideText = (segments: GuideSegment[]) => segments.map(segment => segment.text).join(" ");
/** All guide lines, for the voice pre-render script. */
export const GUIDE_VOICE_SCRIPTS = Object.values(GUIDE_LINES).map(guideText);
