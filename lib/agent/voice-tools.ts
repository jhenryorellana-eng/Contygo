/* ============================================================
   Prime — herramientas de la llamada de voz (Live API)
   El modelo las invoca cuando decide recomendar un servicio o pasar a
   una persona; la app las convierte en botones en pantalla.
   Sin dependencias del SDK (JSON Schema plano) para no cargar el
   SDK completo en el navegador.
   ============================================================ */
import { SERVICES } from "@/lib/services";

export const TOOL_RECOMMEND = "recomendar_servicio";
export const TOOL_HUMAN = "pasar_a_humano";

export const VOICE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: TOOL_RECOMMEND,
        description:
          "Muestra en la pantalla de la llamada el botón del servicio que le corresponde a la persona, para que entre a calificar en minutos. Úsala en cuanto sepas qué trámite necesita (máximo 2 servicios distintos por llamada).",
        parametersJsonSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Identificador (slug) exacto del servicio",
              enum: SERVICES.map((s) => s.slug),
            },
          },
          required: ["slug"],
        },
      },
      {
        name: TOOL_HUMAN,
        description:
          "Muestra el botón de WhatsApp para hablar con una persona del equipo. Úsala si el caso es urgente o complejo, si piden el precio exacto o si la persona pide hablar con alguien.",
        parametersJsonSchema: { type: "object", properties: {} },
      },
    ],
  },
];

/** Palabras clave para deducir el servicio si el modelo lo nombra sin llamar a la herramienta. */
const KEYWORDS: Array<{ slug: string; words: string[] }> = [
  { slug: "reforzar-asilo", words: ["reforzar", "reforzamiento"] },
  { slug: "asilo-politico", words: ["asilo"] },
  { slug: "visa-juvenil", words: ["visa juvenil", "sijs", "juvenil"] },
  { slug: "peticion-i-360", words: ["i-360", "i 360", "360"] },
  { slug: "ajuste-de-estatus", words: ["i-485", "i 485", "485", "ajuste de estatus"] },
  { slug: "apelacion-bia", words: ["apelación", "apelacion", "bia"] },
  { slug: "cambio-de-corte", words: ["cambio de corte"] },
  { slug: "itin", words: ["itin"] },
  { slug: "declaracion-de-impuestos", words: ["impuestos", "taxes", "declaración"] },
];

export function detectServiceSlug(text: string): string | null {
  const t = text.toLowerCase();
  for (const k of KEYWORDS) {
    if (k.words.some((w) => t.includes(w))) return k.slug;
  }
  return null;
}
