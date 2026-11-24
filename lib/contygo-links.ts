/**
 * «Carta de servicios» (/links, 23-11-2026): what the team has at hand to answer a client — every service with its
 * price and its shortest link, laid out like a menu. The owner asked for it on the site instead of a loose HTML file.
 *
 * Prices of the services are never written here: the page reads them live (lib/contygo-api/prices-client.ts), so the
 * card cannot go stale when the platform changes them. The Club and the session with Henry are other products, with
 * no entry in the catalogue: their prices are the ones their own pages showed on `EXTRAS_SEEN_ON`.
 */
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { LANDING_NEEDS } from "@/lib/agent/landing-chat-ui";

export const LINKS_HOST = "landing.contygo.app";
/** The day the Club's and the session's prices were read on club.contygo.app and citas.contygo.app. */
export const EXTRAS_SEEN_ON = "23 de noviembre de 2026";

export type LinkPlan = { name: string; dollars: number; per?: string };
export type LinkItem = {
  key: string;
  name: string;
  /** Without protocol, as it is read and typed: landing.contygo.app/permiso. */
  url: string;
  art: string;
  about: string;
  /** A catalogue service: its price comes live, by this slug. */
  slug?: string;
  /** A product outside the catalogue: its own fixed prices. */
  plans?: LinkPlan[];
  top?: boolean;
  /** The line before the link in the message for the client. */
  say: string;
  /** What the team is asked next, from the catalogue: who it is for, what it includes and what it does not. */
  who?: string;
  includes?: readonly string[];
  mind?: readonly string[];
};
export type LinkSection = { id: string; chip: string; title: string; note: string; items: LinkItem[] };

const CONTRACT = "Míralo y haz tu contrato aquí:";
/** The same three the assistant offers first (LANDING_NEEDS): one source for «más pedido». */
const TOP_IDS = new Set(LANDING_NEEDS.filter(need => need.top).map(need => need.ids[0]));

/** [service id, the short path that redirects to its guide (next.config.mjs), its clay picture, the name the team uses, one line]. */
const service = (id: string, path: string, art: string, name: string, about: string): LinkItem => {
  const found = CONTYGO_SERVICES.find(item => item.id === id);
  if (!found) throw new Error(`contygo-links: no service «${id}» in the catalogue`);
  return { key: id, name, url: `${LINKS_HOST}/${path}`, art, about, slug: found.slug, top: TOP_IDS.has(id), say: CONTRACT, who: found.audience, includes: found.includes, mind: found.exclusions };
};

export const LINK_SECTIONS: readonly LinkSection[] = [
  { id: "jovenes", chip: "Niños y jóvenes", title: "Niños y jóvenes", note: "Visa juvenil (SIJS): custodia, petición y residencia del menor.", items: [
    service("visa-juvenil", "visa-juvenil", "servicio-visa-juvenil", "Visa Juvenil Premium", "Custodia en corte estatal, I-360 y ajuste I-485 del menor, en un solo proceso."),
    service("i-360", "i360", "servicio-i-360", "I-360 · Inmigrante Juvenil Especial (SIJS)", "La petición SIJS ante USCIS, con la orden del juez estatal."),
    service("i-485", "i485", "servicio-i-485", "Ajuste de Estatus I-485 (SIJ)", "La residencia del menor, con la I-360 ya aprobada."),
  ] },
  { id: "asilo", chip: "Asilo y trabajo", title: "Asilo y permiso de trabajo", note: "Para quien va a pedir asilo o ya lo pidió.", items: [
    service("permiso-de-trabajo", "permiso", "servicio-permiso-de-trabajo", "Permiso de Trabajo (I-765)", "La solicitud I-765 por asilo pendiente, categoría (c)(8)."),
    service("asilo", "asilo", "servicio-asilo", "Asilo Político", "La solicitud I-589, la declaración y las evidencias de su historia."),
    service("reforzar-asilo", "reforzar-asilo", "servicio-reforzar-asilo", "Reforzar Asilo", "Para quien ya presentó su I-589: se revisa y se refuerza el respaldo del caso."),
    service("evaluacion-asilo", "evaluacion-asilo", "servicio-evaluacion-asilo", "Evaluación de Asilo", "Un informe en PDF, hecho con IA, a partir de sus documentos."),
  ] },
  { id: "corte", chip: "Corte", title: "Corte de inmigración", note: "Audiencias, cambios de corte y decisiones en contra.", items: [
    service("apelacion", "apelacion", "servicio-apelacion", "Apelación (BIA)", "El paquete para apelar ante la BIA cuando el juez decidió en contra."),
    service("reapertura", "reapertura", "servicio-reapertura", "Re-apertura (in absentia)", "La moción para reabrir una orden dada por no ir a la audiencia."),
    service("cambio-corte", "cambio-corte", "servicio-cambio-corte", "Cambio de Corte", "La moción para pasar el caso a otra corte después de una mudanza."),
    service("preparacion-audiencia", "audiencia", "servicio-preparacion-audiencia", "Preparación de Audiencia", "Una sesión de 45 minutos con Henry antes de la audiencia."),
  ] },
  { id: "impuestos", chip: "Impuestos y negocio", title: "Impuestos y negocio", note: "El ITIN, la declaración y la empresa propia.", items: [
    service("itin", "itin", "servicio-itin", "Número ITIN", "La solicitud del número fiscal individual ante el IRS."),
    service("impuestos", "impuestos", "servicio-impuestos", "Declaración de Impuestos", "La declaración de impuestos, individual o de la familia."),
    service("llc", "llc", "servicio-llc", "Creación de LLC", "La LLC en Florida y su número EIN."),
  ] },
  { id: "mas", chip: "Comunidad y más", title: "También en ContyGo", note: "La comunidad, la cita con Henry y el ingreso de los clientes.", items: [
    { key: "club", name: "Comunidad ContyGo Club", url: "club.contygo.app", art: "producto-club", about: "La comunidad de pago, con sesiones en vivo. Precio de los primeros 100 miembros.",
      plans: [{ name: "Mensual", dollars: 25, per: " al mes" }, { name: "Anual", dollars: 250, per: " al año" }], say: "Conoce la comunidad y únete aquí:" },
    { key: "cita", name: "Asesoría personalizada con Henry", url: "citas.contygo.app", art: "producto-henry", about: "60 minutos por Zoom, a solas con Henry. Un solo pago.",
      plans: [{ name: "Cita", dollars: 150 }], say: "Elige el día y reserva tu cita aquí:" },
    { key: "entrar", name: "Ingresar al sistema", url: "contygo.app/entrar", art: "producto-servicios", about: "La entrada de los clientes que ya tienen cuenta.", say: "Entra a tu cuenta de ContyGo aquí:" },
    { key: "portada", name: "Portada de la página", url: LINKS_HOST, art: "categoria-todos", about: "Para quien todavía no sabe qué trámite necesita: ahí lo ayuda el asistente.", say: "Conoce ContyGo y haz tu contrato tú mismo aquí:" },
  ] },
];
