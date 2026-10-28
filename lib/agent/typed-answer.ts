/* ============================================================
   Una respuesta escrita con palabras propias, sin la IA (28-10-2026)
   «En Perú», «sí, vive aquí», «casada», «tengo dos hijos»: el bot las entiende aunque Gemini no responda (sin saldo,
   caído o lento), y así el modo escritura nunca se queda sin entender una respuesta clara.
   Solo lo inequívoco: ante la duda devuelve null y la respuesta sigue a Gemini o a «no te entendí».
   ============================================================ */
import { parseWrittenDate } from "./adjustment-intake";
import type { IntakeQuestion } from "./service-intake";

const plain = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
/** Palabras que no deciden nada: «en Perú», «pues soy casada», «tengo dos». */
const FILLER = new Set(["en", "de", "del", "la", "el", "los", "las", "un", "una", "y", "yo", "soy", "estoy", "naci", "nacio", "es", "mi", "pues", "bueno", "mira", "este", "eh", "ok", "vale", "tengo", "tenemos", "creo", "que", "hola", "actualmente", "ahora"]);
const core = (text: string) => plain(text).split(" ").filter(word => word && !FILLER.has(word));
/** ¿`part` aparece entera, palabra por palabra y seguida, dentro de `whole`? */
function within(part: string[], whole: string[]) {
  if (!part.length || part.length > whole.length) return false;
  for (let start = 0; start + part.length <= whole.length; start++) if (part.every((word, index) => whole[start + index] === word)) return true;
  return false;
}

const YES = /^(si|sip|claro|correcto|exacto|asi es|afirmativo|por supuesto|desde luego|efectivamente|yes)\b/;
const NO = /^(no|nop|nunca|negativo|jamas|todavia no|aun no|tampoco)\b/;
const UNSURE = /^(no se|no lo se|no estoy segur|quiza|tal vez|a lo mejor|depende)/;

function readYesNo(text: string): boolean | null {
  const said = plain(text);
  if (!said || UNSURE.test(said)) return null;
  const yes = YES.test(said), no = NO.test(said);
  return yes === no ? null : yes;
}

/** La opción que la persona nombró: su rótulo dentro de lo que escribió, o lo que escribió dentro de un solo rótulo. */
function readOption(text: string, options: { code: string; label: string }[]): string | null {
  // «Sí, terminé la secundaria»: el «sí» de delante no elige nada (el «no» sí cuenta, y se queda).
  const said = core(text).filter((word, index, all) => !(index === 0 && all.length > 1 && (word === "si" || word === "claro")));
  if (!said.length) return null;
  const byCode = options.find(option => plain(option.code) === said.join(" "));
  if (byCode) return byCode.code;
  const labelled = options.map(option => ({ code: option.code, words: core(option.label) })).filter(option => option.words.length);
  // 1. Un rótulo entero dentro de la respuesta («Nací en Lima, Perú»). Si caben varios, el más largo, solo si contiene a los demás.
  const named = labelled.filter(option => within(option.words, said));
  if (named.length) {
    const longest = named.reduce((a, b) => (b.words.length > a.words.length ? b : a));
    return named.every(option => within(option.words, longest.words)) ? longest.code : null;
  }
  // 2. La respuesta dentro de un solo rótulo («casada» → «Casado o casada»); entre varios, el más corto si es el único así de corto.
  const holders = labelled.filter(option => within(said, option.words));
  if (holders.length === 1) return holders[0].code;
  if (holders.length > 1) {
    const shortest = Math.min(...holders.map(option => option.words.length));
    const best = holders.filter(option => option.words.length === shortest);
    if (best.length === 1 && said.length >= best[0].words.length - 2) return best[0].code;
  }
  return null;
}

/** Lo que la persona escribió, convertido al valor de la pregunta; null si no está claro (o si es una pregunta). */
export function readTypedAnswer(question: IntakeQuestion, text: string): string | boolean | null {
  if (typeof text !== "string" || !text.trim() || text.length > 300 || /[¿?]/.test(text)) return null;
  if (question.kind === "yesno") return readYesNo(text);
  if ((question.kind === "choice" || question.kind === "state") && question.options?.length) return readOption(text, question.options);
  if (question.kind === "date") return parseWrittenDate(text.replace(/^(?:fue |es |nacio |naci |el )+/i, ""), { dateMode: question.dateMode ?? "past" });
  return null;
}
