/* El chat de la esquina de la portada: lo que muestra la pantalla (el saludo, las necesidades, los mensajes a WhatsApp).
   Sin nada del servidor: este archivo va al navegador. Lo que sabe el modelo y sus reglas viven en ./landing-chat. */

export const LANDING_GREETING = "Te digo cuál es tu servicio, reviso contigo si calificas y te llevo a tu contrato o con una persona del equipo.";

/** The WhatsApp message to the advisor: who it is and, if any, their question (short; nothing else of theirs). */
export function advisorMessage(question?: string) {
  const asked = question?.replace(/\s+/g, " ").trim().slice(0, 180);
  return `Hola, vengo de la web de ContyGo y quiero hablar con un asesor.${asked ? ` Mi pregunta: «${asked}»` : ""}`;
}

/** «¿Qué servicio necesito?», without the model: what people say, and the services behind it. Where several services
 *  are stages of one road (asylum and court, the minor's case), one question about where the case stands picks them. */
export type LandingNeed = { label: string; hint: string; art: string; ids: string[]; ask?: string; refine?: { label: string; ids: string[] }[] };
export const LANDING_NEEDS: LandingNeed[] = [
  { label: "Asilo o corte de inmigración", hint: "Pedir asilo, audiencias y apelaciones", art: "categoria-asilo", ids: ["asilo", "reforzar-asilo", "preparacion-audiencia", "cambio-corte", "apelacion", "reapertura", "evaluacion-asilo"],
    ask: "¿En qué punto está tu caso?", refine: [
      { label: "Aún no pido asilo", ids: ["asilo", "evaluacion-asilo"] },
      { label: "Ya presenté mi I-589", ids: ["reforzar-asilo", "evaluacion-asilo"] },
      { label: "Tengo audiencia en corte", ids: ["preparacion-audiencia"] },
      { label: "Me mudé y mi caso está en otra corte", ids: ["cambio-corte"] },
      { label: "El juez decidió en mi contra", ids: ["apelacion"] },
      { label: "Tengo una orden por no ir a mi audiencia", ids: ["reapertura"] },
    ] },
  { label: "Permiso de trabajo", hint: "Tu solicitud I-765", art: "servicio-permiso-de-trabajo", ids: ["permiso-de-trabajo"] },
  { label: "Para mi hijo menor", hint: "Visa Juvenil y su residencia", art: "categoria-familia", ids: ["visa-juvenil", "i-360", "i-485"],
    ask: "¿En qué etapa está el caso del menor?", refine: [
      { label: "Empezar desde la custodia", ids: ["visa-juvenil"] },
      { label: "Ya tengo la orden del juez estatal", ids: ["i-360"] },
      { label: "Ya me aprobaron la I-360", ids: ["i-485"] },
    ] },
  { label: "Impuestos o ITIN", hint: "Tu número ITIN o tu declaración", art: "categoria-impuestos", ids: ["itin", "impuestos"] },
  { label: "Abrir mi empresa", hint: "Tu LLC, con sus documentos", art: "categoria-empresa", ids: ["llc"] },
];

/** One answered question of the service's workflow, as the advisor reads it. */
export type AnsweredItem = { question: string; answer: string };

/** The WhatsApp message after the service's questions: the service, what the person answered (short) and the reference. */
export function closingMessage(serviceName: string, answers: AnsweredItem[], ref?: string | null) {
  const head = `Hola, vengo del chat de la web de ContyGo. Quiero que una persona me atienda para mi contrato de ${serviceName}.`;
  const lines: string[] = [];
  let size = head.length;
  for (const item of answers) {
    const line = `${item.question.replace(/\s+/g, " ").trim()} ${item.answer.replace(/\s+/g, " ").trim()}`.slice(0, 140);
    if (size + line.length > 650) break;
    lines.push(line); size += line.length + 2;
  }
  return [head, lines.length ? `Mis respuestas: ${lines.join("; ")}.` : "", ref ? `(ref. ${ref})` : ""].filter(Boolean).join(" ");
}
