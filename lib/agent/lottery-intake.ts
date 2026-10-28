/* ============================================================
   Lotería de Visas DV-2027 (26-10-2026): ¿puedo participar y qué preparo?
   El primer producto para la comunidad: la persona puede inscribirse sola, gratis (el vídeo 2 le enseña el paso a
   paso), o pedir que ContyGo lo haga. Fuentes y fechas: docs/loteria-dv-2027.md. La lista de países es la de la DV-2026
   hasta el anuncio oficial de la DV-2027 (a más tardar el 29-10-2026); por eso un país fuera de la lista no se descarta
   en firme: se le pide revisar la lista oficial.
   Las preguntas, en orden (sus claves llevan «dv.»: no salen hacia contygo):
   1. ¿En qué país naciste? (cuenta el país de nacimiento, no la nacionalidad).
   2. Si ese país no participa: ¿tu cónyuge nació en uno que sí? (se puede usar su país).
   3. ¿Secundaria completa, o dos años de experiencia en un oficio calificado en los últimos cinco?
   4. ¿Pasaporte vigente? (obligatorio desde el 10-04-2026: sin él, primero hay que sacarlo).
   5. Estado civil (el cónyuge siempre se incluye, salvo que sea ciudadano o residente, o haya separación legal).
   6. Hijos solteros menores de 21 (todos se incluyen, aunque no vayan a viajar).
   ============================================================ */
import type { IntakeQuestion, JourneyGuidance, ServiceAnswers } from "./service-intake";
import { normalizeIntakeAnswer } from "./service-intake";

export const LOTTERY_SERVICE = "loteria-dv-2027";
export const DV_OFFICIAL_URL = "https://dvprogram.state.gov/";
export const DV_INSTRUCTIONS_URL = "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry.html";
export const LOTTERY_GUIDE_PATH = "/guia-loteria-de-visas";
/** Its answer to a question about costs (the rest of the services send it to the second film and the contract). */
export const LOTTERY_COST_REPLY = "Inscribirte en el sitio oficial cuesta solo un dólar, que se paga al gobierno, y con nuestra guía lo haces tú mismo, gratis. Si prefieres que ContyGo lo haga por ti, al final te mostramos esa opción.";

export const COUNTRY_FIELD = "dv.pais";
export const SPOUSE_FIELD = "dv.conyuge_pais";
export const STUDIES_FIELD = "dv.estudios";
export const PASSPORT_FIELD = "dv.pasaporte";
export const MARITAL_FIELD = "dv.estado_civil";
export const CHILDREN_FIELD = "dv.hijos";

/** Latin America in the DV-2026 lists: participating, and not (Mexico, Colombia, Venezuela… sent too many immigrants). */
const COUNTRIES: { code: string; label: string; eligible: boolean }[] = [
  { code: "pe", label: "Perú", eligible: true }, { code: "ar", label: "Argentina", eligible: true }, { code: "bo", label: "Bolivia", eligible: true },
  { code: "cl", label: "Chile", eligible: true }, { code: "ec", label: "Ecuador", eligible: true }, { code: "gt", label: "Guatemala", eligible: true },
  { code: "ni", label: "Nicaragua", eligible: true }, { code: "cr", label: "Costa Rica", eligible: true }, { code: "pa", label: "Panamá", eligible: true },
  { code: "py", label: "Paraguay", eligible: true }, { code: "uy", label: "Uruguay", eligible: true }, { code: "bz", label: "Belice", eligible: true },
  { code: "mx", label: "México", eligible: false }, { code: "co", label: "Colombia", eligible: false }, { code: "ve", label: "Venezuela", eligible: false },
  { code: "sv", label: "El Salvador", eligible: false }, { code: "hn", label: "Honduras", eligible: false }, { code: "cu", label: "Cuba", eligible: false },
  { code: "do", label: "República Dominicana", eligible: false }, { code: "br", label: "Brasil", eligible: false }, { code: "ht", label: "Haití", eligible: false },
  { code: "otro", label: "Otro país", eligible: true },
];
export const countryLabel = (code: unknown) => COUNTRIES.find(country => country.code === code)?.label ?? null;

const COUNTRY: IntakeQuestion = { id: COUNTRY_FIELD, kind: "choice", text: "Para empezar, ¿en qué país naciste? Cuenta el país donde naciste, no tu nacionalidad ni dónde vives hoy.", retryText: "¿En qué país naciste?", options: COUNTRIES.map(({ code, label }) => ({ code, label })) };
const SPOUSE: IntakeQuestion = { id: SPOUSE_FIELD, kind: "yesno", text: "Las personas nacidas en tu país no han podido participar en las últimas ediciones. Pero si estás casado o casada con alguien que nació en un país que sí participa, como Perú, Argentina o Chile, puedes usar su país. ¿Es tu caso?", retryText: "¿Tu cónyuge nació en un país que sí participa, como Perú, Argentina o Chile?" };
const STUDIES: IntakeQuestion = { id: STUDIES_FIELD, kind: "choice", text: "¿Terminaste la secundaria? Si no, ¿tienes al menos dos años de experiencia, en los últimos cinco, en un oficio que requiera formación?", retryText: "¿Terminaste la secundaria, o tienes dos años de experiencia en un oficio?",
  options: [{ code: "secundaria", label: "Terminé la secundaria o tengo más estudios" }, { code: "oficio", label: "No terminé, pero tengo dos años de experiencia en un oficio" }, { code: "ninguna", label: "Ninguna de las dos" }] };
const PASSPORT: IntakeQuestion = { id: PASSPORT_FIELD, kind: "yesno", text: "¿Tienes pasaporte vigente? Desde este año, la inscripción pide sus datos y una copia escaneada." };
const MARITAL: IntakeQuestion = { id: MARITAL_FIELD, kind: "choice", text: "¿Cuál es tu estado civil?", options: [
  { code: "soltero", label: "Soltero o soltera" }, { code: "casado", label: "Casado o casada" }, { code: "casado_ciudadano", label: "Casado o casada con ciudadano o residente de Estados Unidos" },
  { code: "divorciado", label: "Divorciado o divorciada" }, { code: "viudo", label: "Viudo o viuda" }, { code: "separado", label: "Separado legalmente" }] };
const CHILDREN: IntakeQuestion = { id: CHILDREN_FIELD, kind: "choice", text: "¿Cuántos hijos solteros menores de veintiún años tienes? Cuentan también los adoptados y los hijastros, aunque no vivan contigo ni vayan a viajar.", retryText: "¿Cuántos hijos solteros menores de veintiún años tienes?",
  options: [{ code: "0", label: "Ninguno" }, { code: "1", label: "Uno" }, { code: "2", label: "Dos" }, { code: "3", label: "Tres" }, { code: "4", label: "Cuatro o más" }] };

export type LotteryStatus = "yes" | "check" | "no-country" | "no-studies";
/** What the browser keeps: it decides the closing and the checklist. `people`: photos to prepare (one per person). */
export interface LotteryOutcome { status: LotteryStatus; country: string | null; viaSpouse: boolean; passport: boolean | null; spouse: boolean; children: number; childrenPlus: boolean; people: number }

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const valid = (question: IntakeQuestion, value: unknown) => (value === undefined ? null : normalizeIntakeAnswer(question, value));

export const normalizeLotteryAnswer = normalizeIntakeAnswer;

/** The questions in play, the answers that still count (in order) and the outcome (null while something is missing). */
export function lotteryFlow(input: unknown): { questions: IntakeQuestion[]; answers: ServiceAnswers; outcome: LotteryOutcome | null } {
  const raw = isRecord(input) ? input : {};
  const answers: ServiceAnswers = {};
  const country = valid(COUNTRY, raw[COUNTRY_FIELD]) as string | null;
  const known = COUNTRIES.find(item => item.code === country);
  const blocked = known ? !known.eligible : false;
  const questions: IntakeQuestion[] = [COUNTRY, ...(blocked ? [SPOUSE] : [])];
  const base = { country: known?.label ?? null, viaSpouse: false, passport: null, spouse: false, children: 0, childrenPlus: false, people: 1 };
  if (!country) return { questions: [...questions, STUDIES, PASSPORT, MARITAL, CHILDREN], answers, outcome: null };
  answers[COUNTRY_FIELD] = country;
  let viaSpouse = false;
  if (blocked) {
    const spouse = valid(SPOUSE, raw[SPOUSE_FIELD]);
    if (typeof spouse !== "boolean") return { questions: [...questions, STUDIES, PASSPORT, MARITAL, CHILDREN], answers, outcome: null };
    answers[SPOUSE_FIELD] = spouse;
    // Without a spouse from a participating country there is nothing to prepare: the list of this year decides.
    if (!spouse) return { questions, answers, outcome: { ...base, status: "no-country" } };
    viaSpouse = true;
  }
  // Married through the spouse's country: no need to ask the marital status again.
  const rest = viaSpouse ? [STUDIES, PASSPORT, CHILDREN] : [STUDIES, PASSPORT, MARITAL, CHILDREN];
  const all = [...questions, ...rest];
  const studies = valid(STUDIES, raw[STUDIES_FIELD]);
  if (typeof studies !== "string") return { questions: all, answers, outcome: null };
  answers[STUDIES_FIELD] = studies;
  if (studies === "ninguna") return { questions: [...questions, STUDIES], answers, outcome: { ...base, viaSpouse, status: "no-studies" } };
  const passport = valid(PASSPORT, raw[PASSPORT_FIELD]);
  if (typeof passport !== "boolean") return { questions: all, answers, outcome: null };
  answers[PASSPORT_FIELD] = passport;
  let married = viaSpouse;
  if (!viaSpouse) {
    const marital = valid(MARITAL, raw[MARITAL_FIELD]);
    if (typeof marital !== "string") return { questions: all, answers, outcome: null };
    answers[MARITAL_FIELD] = marital;
    married = marital === "casado";
  }
  const children = valid(CHILDREN, raw[CHILDREN_FIELD]);
  if (typeof children !== "string") return { questions: all, answers, outcome: null };
  answers[CHILDREN_FIELD] = children;
  const count = Number(children);
  return { questions: all, answers, outcome: { ...base, viaSpouse, passport, spouse: married, children: count, childrenPlus: count >= 4,
    people: 1 + (married ? 1 : 0) + count, status: country === "otro" ? "check" : "yes" } };
}

const NEXT_VIDEO = "En el siguiente vídeo te mostramos, paso a paso, cómo inscribirte en el sitio oficial.";
const people = (outcome: LotteryOutcome) => {
  const who = ["tú", outcome.spouse ? "tu cónyuge" : null, outcome.children ? (outcome.children === 1 ? "tu hijo" : "tus hijos") : null].filter(Boolean) as string[];
  const list = who.length > 1 ? `${who.slice(0, -1).join(", ")} y ${who.at(-1)}` : who[0];
  const photos = outcome.childrenPlus ? "una foto reciente por cada persona" : outcome.people === 1 ? "una foto reciente tuya" : `${outcome.people} fotos recientes, una por persona`;
  return { list, photos };
};

/** The agent's last line before the second film. */
export function lotteryFinish(outcome: LotteryOutcome) {
  if (outcome.status === "no-country") return `Con tu país de nacimiento no se ha podido participar en las últimas ediciones. Revisa la lista oficial de este año: si tu país aparece, podrás inscribirte. ${NEXT_VIDEO}`;
  if (outcome.status === "no-studies") return "Para participar se necesita la secundaria completa, o dos años de experiencia en un oficio que requiera formación. Si más adelante cumples uno de los dos, podrás inscribirte. En el siguiente vídeo te mostramos cómo funciona la inscripción.";
  const { list, photos } = people(outcome);
  const passport = outcome.passport === false ? " Antes de inscribirte, saca tu pasaporte: sin pasaporte vigente no se puede." : "";
  const lead = outcome.status === "check" ? "Revisa que tu país esté en la lista oficial de este año. Si aparece, puedes participar." : "¡Puedes participar en la Lotería de Visas 2027!";
  return `${lead} Prepara ${photos} (${list}), y tu pasaporte vigente.${passport} ${NEXT_VIDEO}`;
}

const SOURCES = [{ title: "Departamento de Estado · Programa de Visas de Diversidad (instrucciones oficiales)", url: DV_INSTRUCTIONS_URL }, { title: "Sitio oficial de inscripción y de resultados (Entrant Status Check)", url: DV_OFFICIAL_URL }];
const PHOTO_RULES = "Cada foto: a color, cuadrada de 600 por 600 píxeles, de máximo 240 KB, tomada en los últimos seis meses, de frente, con fondo blanco y sin lentes.";
const ALWAYS = "Solo cuenta la inscripción en dvprogram.state.gov; una sola por persona. Al terminar, guarda tu número de confirmación: con él consultas el resultado. Nadie puede garantizarte que salgas seleccionado. ContyGo no es el gobierno.";

/** The orientation at the end («Ver mi orientación inicial»): whether the person can take part, and the checklist. */
export function lotteryGuidance(outcome: LotteryOutcome): JourneyGuidance {
  const guidance = (status: JourneyGuidance["status"], title: string, lines: (string | null)[]): JourneyGuidance =>
    ({ status, title, detail: [...lines.filter((line): line is string => Boolean(line)), ALWAYS].join(" "), sources: SOURCES });
  if (outcome.status === "no-country") return guidance("review", "Revisa la lista oficial de este año", [`Cuenta el país de nacimiento${outcome.country ? ` (${outcome.country})` : ""}, y en las últimas ediciones no ha podido participar.`, "Si estás casado o casada con alguien de un país que sí participa, puedes usar su país.", "La lista oficial de la Lotería 2027 la publica el Departamento de Estado."]);
  if (outcome.status === "no-studies") return guidance("review", "Te falta el requisito de estudios o de trabajo", ["Se pide la secundaria completa (12 años de estudios), o dos años de experiencia, en los últimos cinco, en un oficio que requiera al menos dos años de formación."]);
  const { list, photos } = people(outcome);
  return guidance("potential", outcome.status === "check" ? "Puedes participar si tu país está en la lista" : "Puedes participar: esto es lo que necesitas", [
    outcome.viaSpouse ? "Te inscribes con el país de nacimiento de tu cónyuge: los dos van en la misma inscripción." : null,
    `Fotos: ${photos} (${list}).`, PHOTO_RULES,
    outcome.passport === false ? "Pasaporte: sácalo antes de inscribirte; se piden sus datos y una copia escaneada de la página con tu foto y tu firma." : "Pasaporte vigente: sus datos y una copia escaneada de la página con tu foto y tu firma.",
    outcome.spouse ? "De tu cónyuge: nombre completo, fecha, ciudad y país de nacimiento." : null,
    outcome.children ? "De cada hijo soltero menor de 21: nombre, fecha, ciudad y país de nacimiento. Incluir a todos es obligatorio, aunque no vayan a viajar." : null,
    "Tuyos: nombre tal como en tu pasaporte, dirección, correo y nivel de estudios.",
  ]);
}

/** Public lines (no personal data) to warm while the film plays. */
export const lotteryVoiceScripts = () => [SPOUSE, STUDIES, PASSPORT, MARITAL, CHILDREN].map(question => `Gracias. ${question.text}`);
