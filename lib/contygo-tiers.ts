/**
 * Los tramos del paso 1 (20-11-2026): el dueño pidió segmentar los servicios migratorios por tipo, «siguiendo el
 * concepto de la ruta». Sus cinco tipos, en su orden y con sus ejemplos:
 *   autoservicio y bajo costo (pago de anualidades) · costo medio (permisos de trabajo, cambios de corte) ·
 *   masivos (apelación, reforzamiento de asilo, preparación de audiencia, residencia I-485) · premium (visa juvenil) ·
 *   alto costo (cambio de estatus, EB-2, petición familiar).
 * Los que él no nombró los puse yo, y él los puede mover: Evaluación de Asilo en el primero (cuesta $50); Asilo
 * Político, Re-apertura e I-360 en masivos (junto a la apelación y al I-485, sus parientes).
 * `ask`: servicios que nombró y que NO están en el catálogo de contygo.app. No tienen guía, precio ni contrato aquí:
 * la página no inventa nada y su fila escribe al equipo por WhatsApp. Cuando entren al catálogo pasan a `services`.
 */
import { VISIBLE_SERVICES, type ContygoService } from "./contygo-catalog";

export type TierAsk = { name: string; art: string; message: string };
export type Tier = {
  id: "autoservicio" | "medio" | "masivos" | "premium" | "alto";
  name: string;
  /** On the rail of stops, where there is room for one word. */
  short: string;
  line: string;
  /** Catalog ids, in the order they show. */
  services: string[];
  ask: TierAsk[];
};

const ask = (name: string, art: string): TierAsk => ({ name, art, message: `Hola, quiero información sobre ${name}.` });

export const TIERS: readonly Tier[] = [
  { id: "autoservicio", name: "Autoservicio y bajo costo", short: "Autoservicio", line: "Lo resuelves tú, desde la app.",
    services: ["evaluacion-asilo"], ask: [ask("Pago de anualidades", "servicio-anualidad")] },
  { id: "medio", name: "Costo medio", short: "Medio", line: "Trámites puntuales, con su guía paso a paso.",
    services: ["permiso-de-trabajo", "cambio-corte"], ask: [] },
  { id: "masivos", name: "Servicios masivos", short: "Masivos", line: "Los que más nos piden.",
    services: ["apelacion", "reforzar-asilo", "preparacion-audiencia", "i-485", "asilo", "reapertura", "i-360"], ask: [] },
  { id: "premium", name: "Premium", short: "Premium", line: "Te acompañamos de principio a fin.",
    services: ["visa-juvenil"], ask: [] },
  { id: "alto", name: "Alto costo", short: "Alto", line: "Los procesos más largos.",
    services: [], ask: [ask("Cambio de estatus", "servicio-cambio-estatus"), ask("Visa EB-2", "servicio-eb2"), ask("Petición familiar", "categoria-familia")] },
];

/** The services of a tier that are on the site today. */
export const tierServices = (tier: Tier): ContygoService[] =>
  tier.services.map(id => VISIBLE_SERVICES.find(item => item.id === id)).filter((item): item is ContygoService => Boolean(item));
/** Every catalog service a tier holds: a migratory service outside all of them would go missing from the page. */
export const TIER_SERVICE_IDS: readonly string[] = TIERS.flatMap(tier => tier.services);

/**
 * What each service is about, in one short line under its name (two lines of a phone at most: some 44 letters) (21-11-2026: the owner asked that the person «sepa al
 * menos de qué trata un poco»). Each one condenses the catalog's own `description` and `audience`; nothing is added,
 * and nothing promises a result. A service without a line here shows its name alone.
 */
export const TIER_BLURBS: Readonly<Record<string, string>> = {
  "evaluacion-asilo": "Un informe de tu caso, con tus documentos.",
  "permiso-de-trabajo": "Para trabajar con tu asilo pendiente.",
  "cambio-corte": "Si te mudaste: pide pasar tu caso a otra corte.",
  apelacion: "Para apelar la decisión del juez.",
  "reforzar-asilo": "Ordena las pruebas de un asilo ya presentado.",
  "preparacion-audiencia": "45 minutos con Henry para saber qué esperar.",
  "i-485": "La residencia del menor con I-360 aprobado.",
  asilo: "Tu solicitud, tu declaración y tus pruebas.",
  reapertura: "Si faltaste a tu audiencia: pide reabrirlo.",
  "i-360": "La petición SIJS del menor ante USCIS.",
  "visa-juvenil": "Custodia, I-360 y residencia, en un proceso.",
  // The steps of the route after the first (their sheets use the same tickets).
  itin: "Tu número fiscal individual, ante el IRS.",
  impuestos: "Tu declaración, individual o familiar.",
  llc: "Tu LLC en Florida, con su EIN.",
};
/** A service that is not in the catalog yet says only this: the team explains it. */
export const ASK_BLURB = "Te contamos cómo funciona y cuánto cuesta.";
