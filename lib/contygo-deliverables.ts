import { CONTYGO_SERVICES } from "./contygo-catalog";

export type ContygoDeliverables = {
  documents: string[];
  documentNote: string;
  outputs: string[];
};

/**
 * Presentation examples, not a mandatory upload checklist or eligibility advice.
 * Source paths below are relative to the read-only product ZIP:
 * C:/Users/PepitoLee/Downloads/x-legal-main (1)/x-legal-main.
 * Runtime requirements are configured per phase and party; no live database was
 * queried. See src/backend/modules/catalog/repository.ts:1468-1476.
 * Blueprint allDocumentSlugs can retain inactive documents. Counts in admin
 * guides are document types, not a universal number of customer uploads.
 */
const catalogIncludes = (id: string): string[] =>
  [...(CONTYGO_SERVICES.find((service) => service.id === id)?.includes ?? [])];

export const CONTYGO_DELIVERABLES: Readonly<Record<string, ContygoDeliverables>> = {
  "visa-juvenil": {
    // docs/guides/visa-juvenil-basico-desde-el-admin.md:75-80,119-132,143-152,189-197.
    // docs/historial/2026-09-07-visa-juvenil-basico-en-produccion.md:42-50.
    documents: [
      "Identificación del tutor.",
      "Acta de nacimiento de cada menor.",
      "Pasaporte o identificación de cada menor.",
      "Comprobantes de domicilio e ingresos del tutor.",
      "Documentación escolar y evidencias del caso.",
    ],
    documentNote: "Son ejemplos para preparar tu caso. ContyGo confirma la lista por etapa y por menor; los documentos de testigos se piden cuando participan.",
    outputs: [
      "Una declaración jurada del tutor y una por cada menor.",
      "Declaraciones de testigos cuando corresponda.",
      "Expediente documental de custodia estatal.",
      "Formulario I-360 y expediente de respaldo por menor.",
    ],
  },
  "i-360": {
    // docs/historial/2026-07-31-handoff-sesion-i-360.md:16-24.
    // I-94/CBP are not marketed as universal requirements; historical correction:
    // docs/historial/2026-07-31-auditoria-i-360-y-extraccion-ia.md:125-127.
    documents: [
      "Orden estatal certificada.",
      "Acta de nacimiento del menor.",
      "Fotografías tipo pasaporte.",
      "Comprobante de domicilio.",
    ],
    documentNote: "Estos ejemplos no son la lista completa. ContyGo confirma los documentos y respaldos adicionales que corresponden a cada menor.",
    outputs: [
      "Un formulario I-360 por menor.",
      "Expediente con la orden estatal certificada y los documentos de respaldo.",
    ],
  },
  "i-485": {
    // docs/guides/i-485-desde-el-admin.md:73,117-127,138-140,186-203.
    documents: [
      "Aviso I-797 de aprobación del I-360.",
      "Acta de nacimiento del menor.",
      "Identificación vigente con foto.",
      "Fotografías tipo pasaporte.",
      "Examen médico I-693, según las indicaciones de tu caso.",
    ],
    documentNote: "La lista se confirma por menor en ContyGo. El pasaporte, el I-94 y el sello de CBP no se piden de forma universal.",
    outputs: [
      "Un formulario I-485 por menor.",
      "Un expediente de documentos y evidencias por menor.",
    ],
  },
  asilo: {
    // Input examples only: src/backend/modules/catalog/blueprints/
    // memorandum-de-miedo-creible-cuestionario.blueprint.json:16-33.
    // Outputs: docs/historial/2026-07-05-i589-completo-fase1.md:20,34-35;
    // docs/historial/2026-07-10-asilo-fase-unica.md:12-16,35-39.
    documents: [
      "Pasaporte o identificación.",
      "Declaración sobre tu historia.",
      "Evidencias relacionadas con tu caso.",
      "Documentos migratorios que ya tengas.",
    ],
    documentNote: "Son ejemplos de respaldo. Los documentos que debes aportar se confirman según tu historia y la situación de tu caso.",
    outputs: [
      "Formulario I-589 preparado con la información de tu caso.",
      "Memorándum de Miedo Creíble.",
      "Expediente con declaración y evidencias organizadas.",
    ],
  },
  "reforzar-asilo": {
    // docs/historial/2026-07-13-reforzar-asilo-servicio-nuevo.md:7-10,19-22.
    // Later two-phase flow: docs/historial/2026-08-20-fase-de-herramienta-externa.md:11-17,23,31-36.
    documents: [
      "Copia de tu I-589 presentado, con sus anexos.",
      "Declaración jurada.",
      "Evidencias de respaldo de tu caso.",
    ],
    documentNote: "Este servicio parte de un I-589 ya presentado. ContyGo te indica qué aportar en la evaluación inicial y en la etapa de reforzamiento.",
    outputs: [
      "Informe de evaluación en PDF, con revisión del equipo.",
      "Memorándum de Miedo Creíble para reforzar el caso existente.",
      "Organización de la declaración y las evidencias de respaldo.",
    ],
  },
  "evaluacion-asilo": {
    // The external tool owns the upload checklist; it is not present in this ZIP.
    // docs/historial/2026-07-23-evaluacion-asilo-juez.md:5-17.
    // Standalone delivery is automatic, unlike the Reforzar Asilo review phase:
    // docs/historial/2026-08-20-fase-de-herramienta-externa.md:31-36.
    documents: [],
    documentNote: "La herramienta de evaluación te indica qué documentos de tu caso compartir. Podrás acceder a ella desde tu caso en ContyGo.",
    outputs: [
      "Un informe PDF generado con IA a partir de tus documentos.",
      "Acceso al informe desde tu cuenta, con un intento de evaluación por pago.",
    ],
  },
  apelacion: {
    // Inputs: docs/historial/2026-07-15-apelacion-servicio-nuevo.md:9,32.
    // Later scope removed brief/pretermision/evidence slots; do not reintroduce them:
    // docs/historial/2026-07-20-apelacion-statement-proof-of-service.md:12-14,41.
    documents: [
      "Pasaporte del apelante.",
      "Decisión y orden del juez.",
      "Documentación del asilo presentado y sus anexos.",
    ],
    documentNote: "Son ejemplos de la documentación del caso que se revisa. ContyGo confirma la lista y los respaldos que correspondan a tu apelación.",
    outputs: [
      "Formulario EOIR-26.",
      "Statement of Reasons for Appeal: razones de la apelación.",
      "Proof of Service: constancia de notificación.",
    ],
  },
  "cambio-corte": {
    // docs/historial/2026-08-06-cambio-de-corte-multiprueba-y-peticion-remota.md:9-20,55-65.
    // specs/cambio-de-corte-flujo.md:17-27,56-65,122-125.
    // The previous-address proof was explicitly deactivated.
    documents: [
      "Identificación con foto o pasaporte.",
      "Documento de ingreso: parole o NTA.",
      "Pruebas de tu nueva dirección.",
    ],
    documentNote: "ContyGo confirma los documentos de tu caso y te permite aportar varias pruebas de tu nueva dirección.",
    outputs: [
      "Formulario EOIR-33 de cambio de dirección.",
      "Moción de cambio de sede, como documento separado.",
      "Expediente preparado e impreso.",
      "Dos envíos: uno a la corte y otro al fiscal, con seguimiento.",
    ],
  },
  reapertura: {
    // Input sources: src/backend/modules/catalog/letter-packages/
    // reapertura-in-absentia__mocion-de-reapertura.letter.json:3-7,19-30.
    // docs/historial/2026-08-12-reapertura-servicio-nuevo.md:12-21,41-48,58-71.
    documents: [
      "Orden emitida por ausencia a la audiencia.",
      "Evidencias del motivo de la ausencia.",
    ],
    documentNote: "Estos ejemplos acompañan la explicación de lo ocurrido. ContyGo confirma los documentos y los datos de la corte para tu caso.",
    outputs: [
      "Moción de reapertura dirigida a la misma corte.",
      "Proof of Service y carátula del paquete.",
      "Formulario EOIR-26A cuando corresponda.",
    ],
  },
  itin: {
    // Current public scope: https://contygo.app/servicios/itin-number (2026-09-10).
    // Input lists found only in historical seeds are intentionally not promoted
    // to current requirements: docs/sot/docs/30-bd/32-migraciones-y-seeds.md:569.
    documents: [],
    documentNote: "Confirma en ContyGo qué documentos de identidad y respaldo corresponden a tu solicitud y al paquete elegido.",
    outputs: catalogIncludes("itin"),
  },
  impuestos: {
    // Current public scope: https://contygo.app/servicios/taxes (2026-09-10).
    // Historical seed is not a live checklist:
    // docs/sot/docs/30-bd/32-migraciones-y-seeds.md:568.
    documents: [],
    documentNote: "Los documentos de identidad e ingresos se confirman según tu declaración y el paquete Individual o Familiar que elijas.",
    outputs: catalogIncludes("impuestos"),
  },
  llc: {
    // Current public scope: https://contygo.app/servicios/llc-florida (2026-09-10).
    // The six-document example in docs/sot/docs/00-vision/00-producto.md:132
    // is a demo acceptance scenario, not evidence of a current customer checklist.
    documents: [],
    documentNote: "Revisa en ContyGo los datos y documentos que se solicitan para el paquete de constitución que elijas.",
    outputs: catalogIncludes("llc"),
  },
};
