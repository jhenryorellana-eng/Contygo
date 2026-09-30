/* ============================================================
   UsaLatinoPrime — Datos de servicios y lógica de calificación
   ============================================================ */
import type { Answers, IconName, ResultData, Service } from "./types";
import { APELACION_VIDEO, REFORZAMIENTO_ASILO_VIDEO } from "./contygo-presentation";

// ---- Iconos (line icons, stroke = currentColor) ----
export const ICONS: Record<IconName, string> = {
  appeal:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h7M6.5 7v10M3.5 12.5h6M21 7h-7M17.5 7v10M14.5 12.5h6M12 3v2"/><path d="M12 5l8 2-8 2M12 5L4 7l8 2"/></svg>',
  child:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="3"/><path d="M12 9v6M8 21v-5l-2-1.5M16 21v-5l2-1.5M9 14h6"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 13h6"/></svg>',
  card:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  shieldPlus:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8v6M9 11h6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  id: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.5-1.5 1.7-2.2 3-2.2s2.5.7 3 2.2M14 9h5M14 12h5M14 15h3"/></svg>',
  receipt:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
};

// ---- Mensajes de resultado reutilizables ----
const M_BEST = "¡Felicitaciones! Es el mejor momento para iniciar tu trámite con nosotros.";

// ---- Servicios ----
// tone: 'success' (califica) | 'urgent' (crítico) | 'contact' (no califica, igual lo invitamos a WhatsApp)
export const SERVICES: Service[] = [
  {
    id: "visa-juvenil",
    slug: "visa-juvenil",
    icon: "child",
    video: "/videos/visa-juvenil.mp4",
    name: "Visa Juvenil · SIJS",
    tagline: "De la custodia a la Green Card",
    desc: "Para menores de 21 años víctimas de abuso, abandono o negligencia por parte de uno o ambos padres.",
    questions: [
      { id: "enUSA", kind: "yesno", text: "¿Tu hijo se encuentra actualmente dentro de los Estados Unidos?" },
      { id: "menor21", kind: "yesno", text: "¿El menor tiene menos de 21 años?" },
      { id: "abandono", kind: "yesno", text: "¿Ha sufrido abuso, abandono o negligencia por parte de uno o ambos padres?" },
    ],
    evaluate(a: Answers): ResultData {
      // Califica únicamente si está en EE.UU. y es menor de 21 (la pregunta de
      // abuso/abandono no descalifica). En cualquier otro caso, no califica.
      const ok = a.enUSA === "si" && a.menor21 === "si";
      return ok
        ? { tone: "success", message: "El menor cumple los requisitos básicos de la Visa Juvenil (SIJS)." }
        : { tone: "denied", message: "Según los datos que recibimos, lamentablemente no puedes calificar para el servicio de Visa Juvenil." };
    },
  },
  {
    id: "i-360",
    slug: "peticion-i-360",
    icon: "folder",
    video: "/videos/visa-juvenil.mp4",
    name: "Petición I-360",
    tagline: "El paso ante USCIS tras la custodia",
    desc: "La petición que sigue a la resolución de custodia, dentro del proceso de Visa Juvenil.",
    questions: [
      { id: "custodia", kind: "yesno", text: "¿Ya tienes la resolución del juez otorgando la custodia del menor?" },
      { id: "menor21", kind: "yesno", text: "¿El menor tiene menos de 21 años?" },
    ],
    evaluate(a: Answers): ResultData {
      const ok = a.custodia === "si" && a.menor21 === "si";
      return ok
        ? { tone: "success", message: "Tienes lo necesario para presentar tu Formulario I-360 ante USCIS." }
        : { tone: "contact", message: "Aún falta un requisito para tu I-360. Conversemos para ver el mejor camino para tu caso." };
    },
  },
  {
    id: "i-485",
    slug: "ajuste-de-estatus",
    icon: "card",
    video: "/videos/ajuste-estatus.mp4",
    name: "I-485 · Ajuste de Estatus",
    tagline: "Tu Green Card sin salir de EE.UU.",
    desc: "Solicita la residencia permanente una vez aprobada tu petición y elegible tu fecha de prioridad.",
    questions: [
      { id: "i360ok", kind: "yesno", text: "¿Ya tienes aprobada tu Visa Juvenil (Formulario I-360)?" },
      { id: "bulletin", kind: "yesno", text: "¿Tu fecha de prioridad ya es elegible según el Visa Bulletin vigente de USCIS?" },
    ],
    evaluate(a: Answers): ResultData {
      const ok = a.i360ok === "si" && a.bulletin === "si";
      return ok
        ? { tone: "success", message: "Estás listo para presentar tu I-485 y solicitar tu residencia permanente." }
        : { tone: "contact", message: "Revisemos juntos tu Visa Bulletin y tu I-360 para preparar tu ajuste de estatus en el momento correcto." };
    },
  },
  {
    id: "asilo",
    slug: "asilo-politico",
    icon: "shield",
    video: "/videos/asilo-politico.mp4",
    name: "Asilo Político",
    tagline: "Protección para quien huyó de su país",
    desc: "Para personas que sufrieron persecución en su país de origen y buscan protección en EE.UU.",
    questions: [
      {
        id: "tiempo",
        kind: "choice",
        text: "¿Cuánto tiempo llevas dentro de los Estados Unidos?",
        options: [
          { value: "primer-ano", label: "Dentro del primer año" },
          { value: "2-5", label: "Entre 2 y 5 años" },
          { value: "5-mas", label: "5 años o más" },
        ],
      },
      { id: "persecucion", kind: "yesno", text: "¿Sufriste persecución en tu país de origen?" },
    ],
    evaluate(a: Answers): ResultData {
      if (a.persecucion === "si") {
        return { tone: "success", message: M_BEST };
      }
      return { tone: "contact", message: "Tu situación puede tener otras vías de protección. Escríbenos y la evaluamos juntos sin costo." };
    },
  },
  {
    id: "reforzar-asilo",
    slug: "reforzar-asilo",
    icon: "shieldPlus",
    video: REFORZAMIENTO_ASILO_VIDEO.src,
    name: "Reforzar Asilo",
    tagline: "Antes de tu audiencia",
    desc: "¿Tu caso de asilo ya empezó? Lo reforzamos y preparamos antes de que llegue tu audiencia.",
    questions: [
      { id: "iniciado", kind: "yesno", text: "¿Tu caso de asilo ya está iniciado ante la corte o USCIS?" },
      { id: "audiencia", kind: "yesno", text: "¿Aún no has tenido tu audiencia final?" },
    ],
    evaluate(a: Answers): ResultData {
      const ok = a.iniciado === "si" && a.audiencia === "si";
      return ok
        ? { tone: "success", message: "Estás a tiempo de reforzar tu caso antes de la audiencia. Cada día cuenta." }
        : { tone: "contact", message: "Cuéntanos en qué etapa está tu caso y vemos cómo fortalecerlo." };
    },
  },
  {
    id: "apelacion",
    slug: "apelacion-bia",
    icon: "appeal",
    video: APELACION_VIDEO.src,
    name: "Apelación · BIA",
    tagline: "Cuando un juez negó tu caso",
    desc: "Apela ante el tribunal superior (BIA). El plazo es de solo 30 días desde la decisión.",
    questions: [
      {
        id: "dias",
        kind: "choice",
        text: "¿Hace cuántos días el juez negó tu caso?",
        options: [
          { value: "1-10", label: "Entre 1 y 10 días", tone: "success", message: "¡Felicidades, estás a tiempo! Podemos hacer un trabajo minucioso y paciente para tu apelación." },
          { value: "10-20", label: "Entre 10 y 20 días", tone: "success", message: "Ya pasaron unos días, pero todavía estás a tiempo. Contáctanos hoy: no dejes pasar más tiempo." },
          { value: "20-30", label: "Entre 20 y 30 días", tone: "urgent", message: "El tiempo se está agotando. Estás en el momento crítico para decidir — hazlo ahora." },
          { value: "30-mas", label: "Más de 30 días", tone: "contact", message: "El plazo legal de 30 días podría haber vencido, pero existen excepciones. Escríbenos para revisar tu caso de inmediato." },
        ],
      },
    ],
    evaluate(a: Answers, svc: Service): ResultData {
      const opt = svc.questions[0].options?.find((o) => o.value === a.dias);
      return { tone: opt?.tone ?? "contact", message: opt?.message ?? "" };
    },
  },
  {
    id: "cambio-corte",
    slug: "cambio-de-corte",
    icon: "pin",
    video: "/videos/cambio-corte.mp4",
    name: "Cambio de Corte",
    tagline: "Tu caso, en la corte de tu ciudad",
    desc: "Si te mudaste, trasladamos tu caso a la corte de inmigración de tu nuevo estado.",
    questions: [
      { id: "otroEstado", kind: "yesno", text: "¿Estás viviendo en un estado diferente al de tu corte actual?" },
      { id: "pruebas", kind: "yesno", text: "¿Tienes pruebas de residencia del nuevo estado (recibo de servicios, contrato, etc.)?" },
    ],
    evaluate(a: Answers): ResultData {
      const ok = a.otroEstado === "si" && a.pruebas === "si";
      return ok
        ? { tone: "success", message: "Cumples los requisitos para solicitar el cambio de corte a tu nuevo estado." }
        : { tone: "contact", message: "Reúne tus pruebas de residencia y conversemos: te guiamos paso a paso." };
    },
  },
  {
    id: "itin",
    slug: "itin",
    icon: "id",
    video: "/videos/itin.mp4",
    name: "ITIN Number",
    tagline: "Tu identificación fiscal ante el IRS",
    desc: "El número de identificación fiscal para declarar impuestos sin Seguro Social.",
    questions: [
      { id: "documento", kind: "yesno", text: "¿Cuentas con pasaporte o partida de nacimiento?" },
      { id: "direccion", kind: "yesno", text: "¿Tienes una dirección en los Estados Unidos?" },
    ],
    evaluate(a: Answers): ResultData {
      const ok = a.documento === "si" && a.direccion === "si";
      return ok
        ? { tone: "success", message: "Tienes los requisitos para tramitar tu ITIN ante el IRS." }
        : { tone: "contact", message: "Te ayudamos a reunir lo que falta para tu ITIN. Escríbenos y lo resolvemos." };
    },
  },
  {
    id: "impuestos",
    slug: "declaracion-de-impuestos",
    icon: "receipt",
    video: "/videos/taxes.mp4",
    name: "Declaración de Impuestos",
    tagline: "Federal y estatal",
    desc: "Clave para tu historial migratorio. Reúne tus documentos y nosotros nos encargamos.",
    questions: [
      {
        id: "docs",
        kind: "checklist",
        text: "Marca los documentos que ya tienes listos:",
        items: [
          { id: "id", label: "ID o licencia de conducir" },
          { id: "ssn", label: "Seguro Social (SSN) o ITIN de todos los declarantes" },
          { id: "w2", label: "Formulario W-2" },
          { id: "1099nec", label: "Formulario 1099-NEC" },
          { id: "1099k", label: "Formulario 1099-K" },
          { id: "1099misc", label: "Formulario 1099-MISC" },
          { id: "ssa", label: "Formulario SSA-1099" },
        ],
      },
    ],
    evaluate(a: Answers): ResultData {
      const sel = Array.isArray(a.docs) ? a.docs : [];
      const total = 7;
      if (sel.length >= total) {
        return { tone: "success", message: "Tienes todos tus documentos: pasas la preselección para tu declaración." };
      }
      return { tone: "contact", message: "Te falta algún documento — no te preocupes. Escríbenos por WhatsApp y te ayudamos a conseguirlo." };
    },
  },
];

// ---- Búsqueda por slug / id ----
export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}
