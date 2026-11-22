/* El asistente, desde cualquier parte de la página (22-11-2026): la sección «Dime qué necesitas», el botón de abajo y
   las invitaciones lo abren con lo que la persona ya dijo (una necesidad, una pregunta, un servicio), y lo que dejó a
   medias se recuerda en este aparato para seguir después. Sin servidor: todo vive en el navegador. */

export const ASSISTANT_EVENT = "contygo:assistant";
/** What the page hands to the assistant when it opens it. */
export type AssistantAsk = {
  /** The label of one of the needs (LANDING_NEEDS). */
  need?: string;
  /** A question or a story, in the person's words. */
  question?: string;
  /** Go straight to this service's questions. */
  serviceId?: string;
  /** Read the answers aloud from the start. */
  listen?: boolean;
  /** Start listening to the person (where the browser can). */
  talk?: boolean;
};
export const openAssistant = (ask: AssistantAsk = {}) => { window.dispatchEvent(new CustomEvent<AssistantAsk>(ASSISTANT_EVENT, { detail: ask })); };

/* ---- Lo que quedó a medias: el servicio, sus respuestas y por dónde iba. Dos días, en este aparato. ---- */
const RESUME_KEY = "contygo.assistant-resume", RESUME_MS = 48 * 60 * 60 * 1000;
export type AssistantResume<Seed = unknown, Summary = unknown> = { v: 1; at: number; serviceId: string; seed: Seed; summary: Summary; firstName?: string };

export function readResume<Seed, Summary>(): AssistantResume<Seed, Summary> | null {
  try {
    const saved = JSON.parse(localStorage.getItem(RESUME_KEY) ?? "null") as AssistantResume<Seed, Summary> | null;
    if (!saved || saved.v !== 1 || typeof saved.at !== "number" || typeof saved.serviceId !== "string") return null;
    if (Date.now() - saved.at > RESUME_MS) { localStorage.removeItem(RESUME_KEY); return null; }
    return saved;
  } catch { return null; }
}
export function saveResume<Seed, Summary>(resume: Omit<AssistantResume<Seed, Summary>, "v" | "at">) {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify({ v: 1, at: Date.now(), ...resume })); } catch { /* Private mode: nothing is kept. */ }
}
export function clearResume() { try { localStorage.removeItem(RESUME_KEY); } catch { /* Nothing to forget. */ } }
