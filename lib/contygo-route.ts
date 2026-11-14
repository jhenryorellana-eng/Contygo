/**
 * «La ruta del inmigrante» (14-11-2026): the five steps of the landing, from the owner's brief «Landing ContyGo:
 * categorías y servicios» (13-11-2026). Step 1 is the migratory catalog; the others say what can be started today
 * and what is coming. The step of the certifications is the landing side of «Simulador ContyGo» (brief of the same
 * day): it only announces it, with no price and no promise, because nobody pays before seeing the requirements of
 * their state. Reasons and layout: docs/contygo-v7-direccion-arte.md.
 *
 * A step is «Disponible» when at least one of its services can be started today: the catalog decides, not this file.
 * Steps 2 to 5 inform, teach and prepare. ContyGo does not sell insurance, investments, loans or property.
 */
import { VISIBLE_SERVICES, type ContygoService } from "./contygo-catalog";

export type RouteStep = {
  /** The step's address on the page (#finanzas). Step 1 keeps #servicios: ads, the chat and old links point there. */
  id: string;
  name: string;
  line: string;
  /** Its paper sculpture, in public/contygo/v8. */
  art: string;
  /** Catalog ids that can be started today, in the owner's order. Step 1 lists none: it shows the whole migratory catalog. */
  services: string[];
  /** What is coming, in the brief's words. */
  soon: string[];
  /** Certifications: the licences, the first one to arrive marked. */
  licences?: { name: string; first?: true }[];
  /** Certifications: how it will work, in four moves. */
  flow?: string[];
  /** Certifications: the person chooses their company freely (brief, «Libertad con transparencia»). */
  freedom?: string;
};

export const ROUTE_STEPS: readonly RouteStep[] = [
  { id: "servicios", name: "Migratorio", line: "La base de todo: tu estatus y lo que viene con él.", art: "categoria-asilo", services: [], soon: [] },
  { id: "finanzas", name: "Finanzas", line: "Tu vida financiera en orden.", art: "categoria-impuestos", services: ["itin", "impuestos"], soon: ["Construye tu crédito", "Educación financiera"] },
  {
    id: "certificaciones", name: "Certificaciones", line: "Prepárate para sacar tu licencia y trabajar en lo que funciona en EE. UU.", art: "categoria-certificaciones", services: [], soon: [],
    licences: [{ name: "Licencia de seguros de vida", first: true }, { name: "Licencia de seguros de salud" }, { name: "Licencia de inversiones" }, { name: "Licencia de agente de bienes raíces" }],
    flow: ["Mira el video", "Elige tu estado", "Revisa los requisitos antes de pagar", "Practica en el simulador ContyGo"],
    freedom: "Con tu licencia, eliges libremente la empresa con la que quieres trabajar.",
  },
  { id: "negocios", name: "Negocios", line: "Crea y haz crecer tu empresa.", art: "categoria-empresa", services: ["llc"], soon: ["EIN y licencias de negocio", "Taxes de tu negocio", "Marketing para tu negocio"] },
  { id: "patrimonio", name: "Patrimonio e inversión", line: "Construye tu futuro y el de tu familia.", art: "categoria-patrimonio", services: [], soon: ["Tu primera casa", "Primeros activos financieros", "Educación en inversión"] },
];

/** The services of a step that are on the site today. */
export const stepServices = (step: RouteStep): ContygoService[] =>
  step.services.map(id => VISIBLE_SERVICES.find(item => item.id === id)).filter((item): item is ContygoService => Boolean(item));
/** Step 1 is the migratory catalog, always open; any other step is open when one of its services can be started. */
export const stepOpen = (step: RouteStep) => step.id === "servicios" || stepServices(step).length > 0;
/** Every service that lives in a step other than the first: the migratory catalog leaves them out. */
export const ROUTE_SERVICE_IDS: readonly string[] = ROUTE_STEPS.flatMap(step => step.services);

/** The driver's licence (brief, 13-11-2026): a partner's service, not a migratory one. It is not in the contygo catalog,
 *  so it has no guide or contract here: «Empezar» writes to the team. */
export const DRIVERS_LICENCE = {
  name: "Licencia de conducir",
  partner: "SG Services Group",
  includes: ["Preparación para el examen, en español", "Guía para tu cita", "Talleres presenciales en Utah"],
  note: "Licencia o tarjeta de privilegio para manejar, según tu estado. No es un trámite migratorio.",
  message: "Hola, quiero empezar con mi licencia de conducir.",
} as const;

/** The partners (brief: «Cada aliado presta y responde por su propio servicio»). */
export const ALLIES = [{ name: "SG Services Group", service: "Licencias de conducir", initials: "SG" }] as const;

/**
 * What the owner still has to give (brief, «Por completar antes de publicar»). While a value is null the page leaves
 * that line out or says it another way: it never shows a made-up price, count or «gratis».
 */
export const OWNER_PENDING: {
  /** Price and length of the 1-to-1 session with Henry, as it should read: «$150 · 45 minutos». */
  sessionTerms: string | null;
  /** Founder places left in the Club, out of 100. */
  clubSeatsLeft: number | null;
  /** What «Empieza gratis: tu permiso de trabajo» includes. Until it is defined the banner does not say «gratis»:
   *  the work permit is a paid service today. */
  freeWorkPermit: string | null;
  /** The partner's logo, a file in /public. Without it, its initials. */
  allyLogo: string | null;
} = { sessionTerms: null, clubSeatsLeft: null, freeWorkPermit: null, allyLogo: null };
