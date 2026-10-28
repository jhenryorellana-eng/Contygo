/* ============================================================
   Lo que el bot sabe de un servicio para responder dudas (21-10-2026)
   La ficha del servicio (lib/contygo-catalog), lo que se entrega (lib/contygo-deliverables), los
   nombres de sus paquetes en contygo (GET /catalog), los hechos comprobados (service-faq) y las
   respuestas que el equipo apruebe. Nada de la persona. Es texto para el modelo, no para la pantalla.
   Sin precios ni formas de pago (25-10-2026): están en el vídeo del proceso, y el bot no habla de dinero (DOUBT_RULES).
   ============================================================ */
import { CONTRACT_SERVICES, serviceVariants, type ContygoService } from "@/lib/contygo-catalog";
import { CONTYGO_DELIVERABLES } from "@/lib/contygo-deliverables";
import { text } from "@/lib/contygo-api/checkout";
import type { CatalogService } from "@/lib/contygo-api/types";
import { GENERAL_FACTS, SERVICE_FACTS, type Faq } from "./service-faq";
import { serviceScript } from "./service-scripts";

const list = (items: readonly string[]) => items.map(item => `- ${item}`).join("\n");
/** Lines about money stay out of what the bot knows: it does not talk about costs (DOUBT_RULES). */
const MONEY = /\$|\b(tasas?|honorarios?|precios?|pagos?|cuotas?|dólares?)\b/i;
const moneyless = (items: readonly string[]) => items.filter(item => !MONEY.test(item));

function serviceBlock(local: ContygoService, remote?: CatalogService | null) {
  const deliverables = CONTYGO_DELIVERABLES[local.id];
  const plans = remote?.plans.map(plan => text(plan.name)).filter(Boolean) ?? [];
  return [
    `SERVICIO: ${local.name}`,
    `Qué es: ${local.description}`,
    `Para quién: ${local.audience}`,
    `Incluye:\n${list(moneyless(local.includes))}`,
    `No incluye:\n${list(moneyless(local.exclusions))}`,
    ...(plans.length ? [`Paquetes en ContyGo: ${plans.join("; ")}.`] : []),
    ...(deliverables ? [`Documentos que se suelen pedir (ejemplos; ContyGo confirma la lista):\n${list(deliverables.documents)}`, `Qué se prepara:\n${list(moneyless(deliverables.outputs))}`] : []),
  ].join("\n");
}

/**
 * Everything the bot may state about one service of the landing: its own sheet and its variants (Visa Juvenil
 * Premium), the names of its live packages, the checked facts and the team's approved answers. `remotes` are contygo's services
 * (by slug); a variant without its remote still has its sheet.
 */
export function serviceKnowledge(serviceId: string, remotes: CatalogService[] = [], approved: Faq[] = []): string {
  const family = serviceVariants(serviceId);
  const services = family.length ? family : CONTRACT_SERVICES.filter(service => service.id === serviceId);
  const blocks = services.map(service => serviceBlock(service, remotes.find(remote => remote.slug === service.slug)));
  // A free service (the lottery) has no contract at the end of its guide: the contract facts would mislead the bot.
  const free = services.some(service => service.free);
  const facts = [...GENERAL_FACTS.filter(fact => !free || !/contrat/i.test(fact)), ...(SERVICE_FACTS[serviceId] ?? [])];
  // The usual doubts of the service's script are answers the team checked against the sources.
  const checked = [...(serviceScript(serviceId)?.doubts ?? []), ...approved];
  return [
    ...blocks,
    `HECHOS COMPROBADOS:\n${list(facts)}`,
    ...(checked.length ? [`RESPUESTAS APROBADAS POR EL EQUIPO:\n${checked.map(item => `P: ${item.question}\nR: ${item.answer}`).join("\n")}`] : []),
  ].join("\n\n");
}
