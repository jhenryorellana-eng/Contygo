/* ============================================================
   Las preguntas frecuentes de la portada, con sus respuestas aprobadas (sección «Preguntar también es avanzar»).
   Las leen la portada y el chat de la esquina (lib/agent/landing-chat.ts), para que digan lo mismo.
   ============================================================ */
/** The landing-wide «desde» (hero figures, bottom button, FAQ) is the owner's figure (12-10-2026), not the cheapest
 *  live price: the $50 asylum evaluation and the $100 tax return are not what the page offers families. */
export const LANDING_FROM_CENTS = 25000;
// Prices are live (GET /catalog through /api/contratar/precios): with no price loaded, the text just does not quote one.
export const landingFaqs = (from: string | null, visaFrom: string | null): [string, string][] => [
  ["¿Qué hace ContyGo por mí?", "Te acompaña en la preparación de los documentos y formularios incluidos en tu servicio. La plataforma organiza la información que aportas y te permite conocer tus siguientes pasos. Revisa el alcance específico antes de contratar."],
  ["¿Cuánto cuesta?", `Cada servicio publica sus honorarios antes de empezar${from ? `: desde ${from}${visaFrom ? `; Visa Juvenil Premium, ${visaFrom}` : ""}` : ""}. Las tasas del gobierno, cuando aplican, van aparte y se indican en tu contrato.`],
  ["¿Puedo hacerlo desde mi celular?", "Sí. Puedes conocer el servicio, aportar información y documentos y consultar tus siguientes pasos desde tu cuenta. Si tu proceso requiere originales o actuaciones externas, recibirás las indicaciones correspondientes."],
  ["¿Hay una persona que me acompañe?", "Sí. Puedes comunicarte con el equipo a través de Soporte en tu cuenta. Antes de contratar, también puedes resolver tus dudas por WhatsApp."],
  ["¿Cuándo empieza mi servicio?", "Después de crear tu cuenta, revisar y firmar tu contrato y confirmar el pago inicial correspondiente. Antes de hacerlo podrás consultar el alcance, el precio y las condiciones."],
  ["¿Qué es un consultor de inmigración registrado?", "Una persona registrada ante el Estado de Utah para dar asistencia no legal en trámites migratorios, como completar formularios oficiales y organizar documentos. No es abogado: no da asesoría legal ni representa ante una corte o USCIS."],
  ["¿ContyGo garantiza la aprobación de mi trámite?", "No. ContyGo ofrece preparación documental y acompañamiento. Las decisiones y los tiempos de las autoridades no dependen de nosotros. Las condiciones del servicio y de reembolso se explican en tu contrato."],
];
