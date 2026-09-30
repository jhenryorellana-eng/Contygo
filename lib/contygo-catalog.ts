/**
 * Public ContyGo catalog observed on 2026-09-10 at contygo.app/servicios.
 * Prices are USD service fees, not government fees. The destination app is the
 * authority for current availability, package terms, eligibility and contracting.
 * See docs/contygo-landing-contratacion.md for sources and content boundaries.
 */
export type ContygoCategory = "familia" | "asilo" | "corte" | "fiscal" | "empresa";

export type ContygoService = {
  id: string;
  slug: string;
  name: string;
  category: ContygoCategory;
  description: string;
  audience: string;
  includes: string[];
  exclusions: string[];
  price: number;
  plans: { name: string; price: number }[];
  legacySlug?: string;
};

export const CONTYGO_CATALOG_VERIFIED_AT = "2026-09-10";

export const CONTYGO_SERVICES: readonly ContygoService[] = [
  {
    id: "visa-juvenil",
    slug: "visa-juvenil-basico",
    legacySlug: "visa-juvenil",
    name: "Visa Juvenil Básico",
    category: "familia",
    description: "Organiza la custodia en corte estatal y la petición I-360 del menor en un mismo proceso.",
    audience: "Tutores y menores que necesitan preparar las etapas de custodia y petición SIJS.",
    includes: [
      "Preparación documental de la custodia estatal.",
      "Declaraciones del tutor y de cada menor; testigos cuando corresponda.",
      "Preparación del formulario I-360 y sus documentos de respaldo.",
    ],
    exclusions: ["El ajuste de estatus I-485 se contrata por separado.", "Las tasas gubernamentales no forman parte de los honorarios."],
    price: 2500,
    plans: [{ name: "Básico", price: 2500 }],
  },
  {
    id: "i-360",
    slug: "i-360",
    legacySlug: "peticion-i-360",
    name: "I-360 — Inmigrante Juvenil Especial (SIJS)",
    category: "familia",
    description: "Prepara la petición SIJS ante USCIS con la orden estatal y los documentos del menor.",
    audience: "Tutores y menores que ya cuentan con una orden estatal y necesitan preparar su I-360.",
    includes: ["Formulario I-360 por menor.", "Organización de la orden estatal certificada y documentos de respaldo.", "Preparación del expediente de la petición."],
    exclusions: ["La custodia y el ajuste I-485 son etapas distintas de esta petición.", "Las tasas gubernamentales no forman parte de los honorarios."],
    price: 1000,
    plans: [{ name: "Sin abogado", price: 1000 }],
  },
  {
    id: "i-485",
    slug: "i-485",
    legacySlug: "ajuste-de-estatus",
    name: "Ajuste de estatus I-485 (SIJ)",
    category: "familia",
    description: "Prepara la solicitud de residencia del menor con I-360 SIJ aprobado, según las condiciones de su caso.",
    audience: "Menores con I-360 SIJ aprobado que necesitan revisar las condiciones para solicitar el ajuste.",
    includes: ["Revisión de las condiciones del trámite antes de contratar.", "Formulario I-485 por menor.", "Organización de un expediente de documentos y evidencias por menor."],
    exclusions: ["La aprobación del I-360 no sustituye las condiciones del ajuste de estatus.", "Las tasas gubernamentales no forman parte de los honorarios."],
    price: 1500,
    plans: [{ name: "Estándar", price: 1500 }],
  },
  {
    id: "asilo",
    slug: "asilo-politico",
    legacySlug: "asilo-politico",
    name: "Asilo Político",
    category: "asilo",
    description: "Organiza tu solicitud I-589, tu declaración y las evidencias que respaldan tu historia.",
    audience: "Personas que necesitan preparar una solicitud de asilo en Estados Unidos.",
    includes: ["Preparación del formulario I-589.", "Organización de declaración y evidencias.", "Preparación del memorándum de Miedo Creíble y del expediente."],
    exclusions: ["El servicio no incluye representación ante USCIS o la corte.", "La decisión del trámite corresponde a las autoridades."],
    price: 1500,
    plans: [{ name: "Sin abogado", price: 1500 }],
  },
  {
    id: "reforzar-asilo",
    slug: "reforzar-asilo",
    legacySlug: "reforzar-asilo",
    name: "Reforzar Asilo",
    category: "asilo",
    description: "Revisa y organiza el respaldo de un caso de asilo que ya tiene su I-589 presentado.",
    audience: "Personas con I-589 presentado que necesitan preparar el respaldo documental de su caso.",
    includes: ["Evaluación inicial del caso.", "Revisión del I-589 presentado, declaración y evidencias.", "Cuestionario y preparación del memorándum de Miedo Creíble.", "Un contrato para la evaluación y el reforzamiento."],
    exclusions: ["No incluye preparar una nueva solicitud I-589.", "El servicio no incluye representación ante USCIS o la corte."],
    price: 600,
    plans: [{ name: "Sin abogado", price: 600 }],
  },
  {
    id: "evaluacion-asilo",
    slug: "evaluacion-asilo",
    name: "Evaluación de Asilo",
    category: "asilo",
    description: "Obtén un informe PDF elaborado con IA a partir de los documentos que compartes.",
    audience: "Personas que quieren revisar la información documental de su caso de asilo.",
    includes: ["Un intento de evaluación por pago.", "Informe PDF generado con IA.", "Acceso al informe desde tu cuenta."],
    exclusions: ["No incluye preparación ni presentación de una solicitud de asilo.", "El informe no sustituye asesoría legal ni garantiza un resultado."],
    price: 50,
    plans: [{ name: "Sin abogado", price: 50 }],
  },
  {
    id: "apelacion",
    slug: "apelacion",
    legacySlug: "apelacion-bia",
    name: "Apelación (BIA)",
    category: "corte",
    description: "Prepara el paquete documental para presentar una apelación ante la BIA.",
    audience: "Personas que necesitan preparar una apelación de una decisión del juez de inmigración.",
    includes: ["Preparación del formulario EOIR-26.", "Statement of Reasons for Appeal: razones de la apelación.", "Proof of Service: constancia de notificación.", "Organización del paquete con los documentos correspondientes."],
    exclusions: ["El servicio no incluye representación ante la BIA.", "Las tasas gubernamentales no forman parte de los honorarios."],
    price: 700,
    plans: [{ name: "Sin abogado", price: 700 }],
  },
  {
    id: "cambio-corte",
    slug: "cambio-de-corte",
    legacySlug: "cambio-de-corte",
    name: "Cambio de Corte",
    category: "corte",
    description: "Prepara la moción y los documentos para solicitar el cambio de sede de tu caso migratorio.",
    audience: "Personas que se mudaron y necesitan solicitar el traslado de su caso a otra corte.",
    includes: ["Organización de documentos de domicilio y del caso.", "Formulario EOIR-33 de cambio de dirección.", "Moción de cambio de sede, como documento separado.", "Preparación, impresión y envío del expediente a la corte y al fiscal."],
    exclusions: ["Presentar la moción no garantiza que el juez apruebe el cambio.", "El servicio no incluye representación ante la corte."],
    price: 250,
    plans: [{ name: "Sin abogado", price: 250 }],
  },
  {
    id: "reapertura",
    slug: "reapertura-in-absentia",
    name: "Apelación (Re-apertura)",
    category: "corte",
    description: "Organiza una moción de reapertura ante la corte que emitió una orden por ausencia a la audiencia.",
    audience: "Personas con una orden de deportación in absentia que necesitan preparar una solicitud de reapertura.",
    includes: ["Cuestionario sobre el motivo de la ausencia y sus evidencias.", "Preparación de la moción de reapertura.", "Proof of Service y carátula.", "EOIR-26A cuando corresponda."],
    exclusions: ["Es una moción ante la misma corte, no una apelación ante la BIA.", "El servicio no incluye representación legal ni garantiza la reapertura."],
    price: 250,
    plans: [{ name: "Sin abogado", price: 250 }],
  },
  {
    id: "itin",
    slug: "itin-number",
    legacySlug: "itin",
    name: "Número ITIN",
    category: "fiscal",
    description: "Prepara tu solicitud del número de identificación fiscal individual ante el IRS.",
    audience: "Personas que necesitan solicitar un ITIN para sus trámites fiscales.",
    includes: ["Preparación de la solicitud W-7.", "Organización de documentos de identidad y respaldo.", "Guía para los documentos que acompañan tu solicitud."],
    exclusions: ["La asignación del ITIN depende del IRS.", "Revisa en tu contrato los trámites y documentos incluidos en el paquete."],
    price: 250,
    plans: [{ name: "Individual", price: 250 }],
  },
  {
    id: "impuestos",
    slug: "taxes",
    legacySlug: "declaracion-de-impuestos",
    name: "Declaración de Impuestos",
    category: "fiscal",
    description: "Organiza tus documentos de ingresos y prepara tu declaración con un paquete individual o familiar.",
    audience: "Personas y familias que necesitan preparar su declaración de impuestos.",
    includes: ["Preparación de la declaración de impuestos.", "Organización de identificación y documentos de ingresos.", "Paquetes Individual y Familiar disponibles."],
    exclusions: ["El servicio no garantiza un reembolso fiscal.", "El alcance de tu declaración se confirma en el paquete y el contrato."],
    price: 100,
    plans: [{ name: "Individual", price: 100 }, { name: "Familiar", price: 150 }],
  },
  {
    id: "llc",
    slug: "llc-florida",
    name: "Creación de LLC",
    category: "empresa",
    description: "Prepara la constitución de tu LLC en Florida y la solicitud de su identificación fiscal EIN.",
    audience: "Personas que quieren constituir una LLC en Florida.",
    includes: ["Preparación de los Articles of Organization.", "Gestión del agente registrado y del EIN según el paquete.", "Opción de Constitución + Identidad de Marca."],
    exclusions: ["El servicio publicado corresponde a Florida.", "La identidad de marca corresponde al paquete que la incluye.", "Revisa las tasas y condiciones vigentes antes de firmar."],
    price: 500,
    plans: [{ name: "Constitución", price: 500 }, { name: "Constitución + Identidad de Marca", price: 1000 }],
  },
];
