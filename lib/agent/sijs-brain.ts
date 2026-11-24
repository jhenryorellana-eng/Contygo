/* ============================================================
   El cerebro SIJS dentro del asistente del equipo (23-11-2026). Lo que el recolector de ContyGo («el Cerebro»,
   otro proyecto) reunió de cada estado en sus fuentes oficiales —las vías judiciales para la orden estatal, hasta qué
   edad llega cada una y por qué ley, los requisitos y tasas de la corte, los formularios y la corte de cada condado—
   exportado a lib/agent/data/sijs-brain.json por scripts/build-sijs-brain.cjs. SOLO servidor: son 700 KB.

   El dueño lo dio por bueno ese día para que el equipo responda con ello: «aprueba toda la información confirmada de
   todos los estados». Cada dato sigue diciendo de dónde sale, y los que la fábrica no terminó de comprobar lo dicen.
   Como en el Cerebro, el código pone los datos y el modelo solo redacta: aquí se elige qué fichas van al modelo
   (la tabla nacional, y la ficha y las cortes del estado y el condado que la pregunta nombra).
   ============================================================ */
import raw from "./data/sijs-brain.json";

export const BRAIN_APPROVED_ON = "23 de noviembre de 2026";

type Source = { u: string; q: string };
export type BrainRoute = { name: string; kind: string | null; courts: string[]; age: number | null; basis: string | null; statute: string | null; venue: string | null; conditions: string[]; who: string[]; ok: boolean; src: Source[] };
type BrainReq = { kind: string; text: string; usd: number | null; courts: string[]; ok: boolean; src: string[] };
type BrainForm = { n: string | null; t: string; u: string; use: string };
type BrainCourt = { type: string | null; court: string; at?: string; ok: boolean };
export type BrainState = { name: string; from: "v3" | "v1"; collected: string; majorityAge: number | null; sijsStatute: boolean | null; routes: BrainRoute[]; reqs: BrainReq[]; forms: BrainForm[]; counties: Record<string, BrainCourt[]> };
const BRAIN = raw as unknown as { builtOn: string; states: Record<string, BrainState> };

export const brainStates = (): Readonly<Record<string, BrainState>> => BRAIN.states;
export const brainState = (code: string): BrainState | null => (Object.prototype.hasOwnProperty.call(BRAIN.states, code) ? BRAIN.states[code] : null);

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** How each state is written by people, besides its Spanish name. */
const ENGLISH: Readonly<Record<string, string[]>> = {
  DC: ["district of columbia", "washington dc", "washington d.c.", "washington, dc", "washington, d.c."], HI: ["hawaii"], LA: ["louisiana"], MI: ["michigan"], MS: ["mississippi"], MO: ["missouri"],
  NH: ["new hampshire"], NJ: ["new jersey"], NM: ["new mexico"], NY: ["new york"], NC: ["north carolina"], ND: ["north dakota"], OR: ["oregon"], PA: ["pennsylvania"], SC: ["south carolina"], SD: ["south dakota"], WV: ["west virginia"],
};
/** Two capital letters that are also Spanish or English words: a state only by its name. */
const AMBIGUOUS_CODES = new Set(["DE", "LA", "ME", "MI", "AL", "IN", "OR", "OK", "HI", "MA", "PA", "ID", "OH"]);
const NAMES: { code: string; name: string }[] = Object.entries(BRAIN.states)
  .flatMap(([code, state]) => [plain(state.name), ...(ENGLISH[code] ?? [])].map(name => ({ code, name })))
  .sort((a, b) => b.name.length - a.name.length);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The states a question names (by name, or by its two capital letters), in the order they appear; at most three. */
export function findStates(question: string): string[] {
  let text = ` ${plain(question)} `; const found: { code: string; at: number }[] = [];
  // Longest names first, and each one is blanked once found: «Virginia Occidental» is not also «Virginia».
  for (const { code, name } of NAMES) {
    const match = new RegExp(`(?<![a-z])${escape(name)}(?![a-z])`).exec(text);
    if (!match) continue;
    if (!found.some(item => item.code === code)) found.push({ code, at: match.index });
    text = text.slice(0, match.index) + " ".repeat(name.length) + text.slice(match.index + name.length);
  }
  // Codes only in a text that is not all capitals, where «TX» is written on purpose.
  if (/[a-z]/.test(question)) for (const match of Array.from(question.matchAll(/(?<![A-Za-z])([A-Z]{2})(?![A-Za-z])/g))) {
    const code = match[1];
    if (brainState(code) && !AMBIGUOUS_CODES.has(code) && !found.some(item => item.code === code)) found.push({ code, at: (match.index ?? 0) + 1 });
  }
  return found.sort((a, b) => a.at - b.at).slice(0, 3).map(item => item.code);
}

/** The counties of a state that a question names: after «condado de …»/«… County», or a distinctive name on its own. */
export function findCounties(question: string, code: string): string[] {
  const state = brainState(code); if (!state) return [];
  const text = ` ${plain(question)} `, stateName = plain(state.name);
  return Object.keys(state.counties).filter(county => {
    const name = plain(county); if (name === stateName) return new RegExp(`(condado|county)( de)? ${escape(name)}(?![a-z])|(?<![a-z])${escape(name)} county`).test(text);
    const word = new RegExp(`(?<![a-z])${escape(name)}(?![a-z])`);
    if (!word.test(text)) return false;
    return name.length >= 6 || new RegExp(`(condado|county)( de)? ${escape(name)}(?![a-z])|(?<![a-z])${escape(name)} county`).test(text);
  }).slice(0, 2);
}

const CUSTODY = "estar bajo custodia del estado";
const mark = (ok: boolean) => (ok ? "verificado en la fuente oficial" : "recopilado de la fuente oficial");
const ageText = (age: number | null) => (age === null ? "edad límite sin determinar en lo recopilado" : `hasta antes de cumplir ${age} años`);
const routeLine = (route: BrainRoute) => [
  `· ${route.name}${route.kind ? ` (${route.kind})` : ""}: ${ageText(route.age)}${route.statute ? `, ${route.statute}` : ""}.`,
  route.courts.length ? ` Corte: ${route.courts.join(" / ")}.` : "",
  route.conditions.length ? ` Condiciones: ${route.conditions.join("; ")}.` : "",
].join("");

/** One line per state: which routes reach which age. The table the team is asked about every day. */
export function nationalTable(): string {
  const lines = Object.entries(BRAIN.states).map(([code, state]) => {
    if (!state.routes.length) return `- ${state.name} (${code}): sin vías recopiladas todavía.`;
    const adult = state.routes.filter(route => (route.age ?? 0) > 18), minor = state.routes.filter(route => route.age !== null && route.age <= 18), open = state.routes.filter(route => route.age === null);
    // A route that only reaches youths already in the state's custody is not a door a family can knock on.
    const general = adult.filter(route => !route.conditions.includes(CUSTODY)), custody = adult.filter(route => route.conditions.includes(CUSTODY));
    const name = (route: BrainRoute) => `${route.name}${route.statute ? ` [${route.statute}]` : ""}${route.conditions.length ? ` (condiciones: ${route.conditions.join("; ")})` : ""}`;
    const top = (routes: BrainRoute[]) => Math.max(...routes.map(route => route.age ?? 0));
    const parts = [
      general.length ? `hay vía hasta antes de los ${top(general)}: ${general.slice(0, 2).map(name).join(" | ")}` : "",
      custody.length ? `solo para jóvenes que ya están bajo custodia del estado hay vía hasta antes de los ${top(custody)}: ${custody.slice(0, 1).map(name).join("")}` : "",
      minor.length ? `${adult.length ? "las demás vías" : "las vías recopiladas"} llegan solo hasta antes de los ${top(minor)}${adult.length ? "" : `: ${minor.slice(0, 2).map(route => route.name).join(" | ")}`}` : "",
      open.length ? `${open.length} vía(s) sin edad límite determinada${!adult.length && !minor.length ? `: ${open.slice(0, 2).map(route => route.name).join(" | ")}` : ""}` : "",
    ].filter(Boolean);
    // The national run of September did not record each route's conditions: its rows are a first reading.
    if (state.from === "v1") parts.push("dato de la corrida nacional de septiembre, sin el detalle de condiciones de cada vía: confirmar con Henry antes de darlo por seguro");
    return `- ${state.name} (${code}): ${parts.join("; ")}.`;
  });
  return [
    `TABLA POR ESTADO DE LA ORDEN ESTATAL PARA LA VISA JUVENIL (recopilada por el Cerebro de ContyGo en las leyes y cortes de cada estado; aprobada por la dirección el ${BRAIN_APPROVED_ON}):`,
    "La edad es la de la corte estatal para dar la orden; aparte, la petición federal I-360 se presenta antes de cumplir 21 y estando soltero.",
    ...lines,
  ].join("\n");
}

/** Everything collected about one state, and the court of the counties asked about. */
export function stateSheet(code: string, counties: string[] = []): string {
  const state = brainState(code); if (!state) return "";
  const fees = state.reqs.filter(req => req.kind === "tasa" || req.kind === "exencion_tasa"), rest = state.reqs.filter(req => req.kind !== "tasa" && req.kind !== "exencion_tasa");
  const reqLine = (req: BrainReq) => `· [${req.kind.replace(/_/g, " ")}] ${req.text}${req.usd !== null ? ` (USD ${req.usd})` : ""}${req.courts.length ? ` — ${req.courts.join(" / ")}` : ""}${req.src[0] ? ` Fuente: ${req.src[0]}` : ""}`;
  const names = Object.keys(state.counties);
  return [
    `FICHA DE ${state.name.toUpperCase()} (${code}) — datos del Cerebro de ContyGo, recogidos el ${state.collected} en fuentes oficiales; aprobados por la dirección el ${BRAIN_APPROVED_ON}.`,
    state.majorityAge ? `Mayoría de edad en el estado: ${state.majorityAge}.` : "",
    state.sijsStatute === true ? "El estado tiene una ley propia para los hallazgos SIJS." : "",
    state.routes.length ? "Vías para la orden estatal:" : "Vías para la orden estatal: no hay ninguna recopilada todavía; lo confirma Henry.",
    ...state.routes.flatMap(route => [
      `${routeLine(route)} (${mark(route.ok)})`,
      route.venue ? `  Dónde se presenta: ${route.venue}` : "",
      route.who.length ? `  Quién puede presentar: ${route.who.join(" | ")}` : "",
      ...route.src.map(source => `  Fuente: ${source.u} — «${source.q}»`),
    ]),
    fees.length ? "Tasas de la corte y exenciones:" : "", ...fees.slice(0, 10).map(reqLine),
    rest.length ? "Otros requisitos de presentación:" : "", ...rest.slice(0, 14).map(reqLine),
    state.forms.length ? "Formularios oficiales:" : "", ...state.forms.slice(0, 14).map(form => `· ${form.n ? `${form.n} — ` : ""}${form.t}: ${form.u}`),
    ...counties.flatMap(county => [`Corte del condado de ${county}:`, ...(state.counties[county] ?? []).slice(0, 6).map(court => `· ${court.court}${court.type ? ` (${court.type})` : ""}${court.at ? ` — ${court.at}` : ""} (${mark(court.ok)})`)]),
    !counties.length && names.length ? `Cortes por condado: están recopiladas para ${names.length} condados de ${state.name}; para darlas hace falta el nombre del condado.` : "",
    !names.length ? "Cortes por condado: no están recopiladas para este estado." : "",
  ].filter(Boolean).join("\n");
}

/** What the brain adds to the assistant's knowledge for one question: the table, and the sheets of the places it names. */
export function brainFor(question: string, extra: { state?: string; county?: string } = {}): { text: string; states: string[] } {
  const states = findStates(question);
  if (extra.state && brainState(extra.state) && !states.includes(extra.state)) states.unshift(extra.state);
  const sheets = states.slice(0, 2).map(code => {
    const counties = findCounties(`${question} ${extra.state === code && extra.county ? `condado de ${extra.county}` : ""}`, code);
    return stateSheet(code, counties);
  });
  return { text: [nationalTable(), ...sheets].join("\n\n"), states: states.slice(0, 2) };
}

export const BRAIN_RULES = [
  "Para la Visa Juvenil el CONOCIMIENTO trae la TABLA POR ESTADO y, si la pregunta nombra un estado, su FICHA: responde con esos datos, citando la ley entre corchetes o paréntesis tal como viene y, si hay «Fuente:», su enlace.",
  "Una vía hasta los 21 con condiciones (por ejemplo, estar bajo custodia del estado o ya tener un caso abierto) NO es una vía general: di siempre sus condiciones. Si un estado no tiene edad determinada o no tiene vías recopiladas, dilo así; no lo des por aceptado ni por rechazado.",
  "Si el dato de un estado viene marcado como de la corrida nacional de septiembre, dilo: es una primera lectura y Henry la confirma. Cuando respondas por muchos estados a la vez, usa sus nombres, no solo las siglas, y separa los que tienen ese aviso.",
  "Si para responder bien necesitas la FICHA de un estado (o la corte de un condado) que no está en el CONOCIMIENTO —por ejemplo, la pregunta nombra una ciudad—, no adivines: devuelve lookup con el código de dos letras del estado y, si lo sabes, el condado; reply dice en una frase qué vas a buscar.",
].join(" ");
