/* ============================================================
   UsaLatinoPrime — Tipos del dominio
   ============================================================ */

export type Tone = "success" | "urgent" | "contact" | "denied";

export type QuestionKind = "yesno" | "choice" | "checklist";

export interface ChoiceOption {
  value: string;
  label: string;
  /** Sólo en preguntas cuyo resultado depende directamente de la opción elegida. */
  tone?: Tone;
  message?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  text: string;
  options?: ChoiceOption[];
  items?: ChecklistItem[];
}

/** Respuestas por id de pregunta: cadena (yesno/choice) o lista (checklist). */
export type Answers = Record<string, string | string[] | undefined>;

export interface ResultData {
  tone: Tone;
  message: string;
}

export interface Service {
  id: string;
  /** Segmento de URL propio del servicio (p. ej. "visa-juvenil" → /visa-juvenil). */
  slug: string;
  icon: IconName;
  name: string;
  tagline: string;
  desc: string;
  /** Ruta del video específico del servicio (en /public). Opcional. */
  video?: string;
  /** WhatsApp propio del servicio (solo dígitos). Si se omite, usa el número general. */
  whatsappDigits?: string;
  questions: Question[];
  evaluate: (answers: Answers, service: Service) => ResultData;
}

/** Nombres de los iconos de línea disponibles (ver lib/services.ts → ICONS). */
export type IconName =
  | "appeal"
  | "child"
  | "folder"
  | "card"
  | "shield"
  | "shieldPlus"
  | "pin"
  | "id"
  | "receipt";
