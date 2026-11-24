"use client";

/* The team's assistant on /links: an adviser asks what her client is asking her (cost, payments, what a service
   includes, documents, the process, the state court of a juvenile case) and gets the answer from what ContyGo has
   written, with the live price (POST /api/agent/team-chat). The same assistant sits on every service's row
   (ServiceAsk): there the question is about that service and it feeds on that product.

   While it works, the screen shows each step as the server really takes it («Buscando en el Cerebro: Texas»,
   «Leyendo la página oficial: uscis.gov»): the route sends them as lines. The answer arrives laid out — the lead, the
   lists, the amounts and the laws marked, its sources as links — and says what it leaned on. It can be copied as plain
   text for the client's chat, or listened to («Escuchar», with the landing's own voice). Nothing is kept: closing the page forgets it all. */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LINK_SECTIONS } from "@/lib/contygo-links";
import { copyText } from "./copy";
import Brain3D, { type BrainMode } from "./Brain3D";
import s from "./TeamChat.module.css";

type Source = { site: string; url: string };
type Used = { brain?: string[]; prices?: boolean };
type Step = { kind: "prices"; ok: boolean } | { kind: "brain"; states: string[]; codes?: string[]; county?: string } | { kind: "sheet"; service: string } | { kind: "writing" } | { kind: "official"; sites: string[] };
type Turn = { q: string; a?: string; covered?: boolean; serviceIds?: string[]; sources?: Source[]; used?: Used; failed?: string };
type Asked = Pick<Turn, "a" | "covered" | "serviceIds" | "sources" | "used" | "failed">;

const NAMES = new Map(LINK_SECTIONS.flatMap(section => section.items).map(item => [item.key, item.name.split(" · ")[0]]));
const STARTERS = [
  "¿En qué estados aceptan jóvenes hasta los 21 años y en cuáles solo hasta los 18?",
  "¿Cuánto cuesta el permiso de trabajo y cómo se paga?",
  "Vive en Houston y su hijo tiene 17: ¿en qué corte se presenta?",
  "No fue a su audiencia y tiene orden de deportación: ¿qué servicio le sirve?",
];
const QUICK = ["¿Qué documentos pide?", "¿Cómo se paga?", "¿Para quién es?", "¿Qué pasa después de contratar?"];
const FAILED: Record<string, string> = {
  rate_limited: "Hiciste muchas preguntas seguidas. Espera unos minutos y vuelve a preguntar.",
  invalid_question: "La pregunta es muy larga. Escríbela más corta.",
};
const NO_LINE = "No se pudo enviar. Revisa tu internet y vuelve a intentarlo.";

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Chat = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.3" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="3" /></svg>;
const Close = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const Send = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.6" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>;
const CopyIcon = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.3" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></svg>;
const Done = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;
const Out = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.6" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9" /></svg>;

/** The brain's mark, still: the answer's header. The live one, while searching, is the 3D brain (Brain3D). */
function BrainMark() {
  const nodes: [number, number][] = [[24, 8], [9, 17], [39, 17], [24, 24], [11, 35], [37, 35], [24, 41]];
  const links: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 4], [3, 5], [4, 6], [5, 6], [0, 3], [3, 6]];
  return (
    <svg className={s.mark} viewBox="0 0 48 48" aria-hidden="true">
      {links.map(([from, to], index) => <line key={index} x1={nodes[from][0]} y1={nodes[from][1]} x2={nodes[to][0]} y2={nodes[to][1]} />)}
      {nodes.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index === 3 ? 3.6 : 2.6} />)}
    </svg>
  );
}

/** What a step says while it is the one in progress, and the short name it keeps once done. */
function stepText(step: Step | null): { now: string; done: string } {
  if (!step) return { now: "Leyendo la pregunta", done: "Pregunta leída" };
  if (step.kind === "prices") return step.ok ? { now: "Trayendo los precios de hoy", done: "Precios de hoy" } : { now: "Los precios no respondieron", done: "Sin precios" };
  if (step.kind === "sheet") return { now: `Abriendo la ficha de ${step.service}`, done: "Ficha del servicio" };
  if (step.kind === "brain") {
    const where = step.states.length ? `${step.states.join(" y ")}${step.county ? `, condado de ${step.county}` : ""}` : "los 50 estados";
    return { now: `Buscando en el Cerebro: ${where}`, done: `Cerebro: ${step.states.length ? step.states.join(" y ") : "50 estados"}` };
  }
  if (step.kind === "official") return { now: `Leyendo la página oficial: ${step.sites.join(", ")}`, done: "Página oficial" };
  return { now: "Redactando la respuesta", done: "Respuesta" };
}

/** The work in progress. Steps arrive in a burst and then the wait is the writing: each one stays on screen long enough to be read. */
function Thinking({ steps }: { steps: Step[] }) {
  const [shown, setShown] = useState(-1);
  useEffect(() => {
    if (shown >= steps.length - 1) return;
    const next = setTimeout(() => setShown(value => value + 1), shown < 0 ? 380 : 620);
    return () => clearTimeout(next);
  }, [shown, steps.length]);
  const current = shown >= 0 ? steps[shown] : null, trail = shown > 0 ? steps.slice(0, shown) : [];
  const label = stepText(current);
  // What the 3D brain does follows the step on screen: it scans, lands on the state found, hurries while writing.
  const found = steps.slice(0, shown + 1).reduce<string[]>((codes, step) => step.kind === "brain" && step.codes?.length ? step.codes : codes, []);
  const mode: BrainMode = { codes: found, phase: current?.kind === "writing" ? "write" : current?.kind === "official" ? "official" : "scan" };
  return (
    <div className={s.thinking} role="status">
      <Brain3D className={s.brain3d} mode={mode} />
      <div className={s.thinkingText}>
        <span className={s.eyebrow}>El Cerebro de ContyGo</span>
        <b key={label.now} className={s.now}>{label.now}</b>
        <ul className={s.trail}>{trail.filter(step => !(step.kind === "prices" && !step.ok) && step.kind !== "writing").map((step, index) => <li key={index}>{Done}{stepText(step).done}</li>)}</ul>
      </div>
      <i className={s.scanline} aria-hidden="true" />
    </div>
  );
}

const URL_AT = /https?:\/\/[^\s)»"]+/g;
const tidy = (url: string) => url.replace(/[.,;:]+$/, "");
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** The reply, taken apart: «Fuente: …» lines become links at the foot, and what is left is paragraphs and lists. */
function layout(reply: string): { blocks: ({ kind: "p"; text: string } | { kind: "list"; items: string[] })[]; links: Source[] } {
  const links: Source[] = [];
  const text = reply.replace(/\s*Fuentes?(?: \([^)]*\))?:\s*((?:https?:\/\/\S+[ ,]*)+)/gi, (_, urls: string) => {
    for (const url of urls.match(URL_AT) ?? []) { const clean = tidy(url); if (!links.some(link => link.url === clean)) links.push({ site: host(clean), url: clean }); }
    return "";
  });
  const blocks: ReturnType<typeof layout>["blocks"] = [];
  for (const line of text.split("\n").map(item => item.trim()).filter(Boolean)) {
    const item = /^[-•·]\s+/.test(line) ? line.replace(/^[-•·]\s+/, "") : null, last = blocks[blocks.length - 1];
    if (item !== null) { if (last?.kind === "list") last.items.push(item); else blocks.push({ kind: "list", items: [item] }); }
    else blocks.push({ kind: "p", text: line });
  }
  // The first sentence is the answer in short: it leads. A long paragraph is not a headline, so only that sentence is set apart.
  // A sentence ends after a word in lower case, a number or a bracket — not after «Tex.», «Fam.» or «Stat.», the
  // capitalised abbreviations of a law's name.
  const first = blocks[0];
  if (first?.kind === "p") {
    const end = /(?:(?<![A-Za-zÁÉÍÓÚáéíóúñ])[a-záéíóúñ]{3,}|\d|[)\]»])\.\s+(?=[A-ZÁÉÍÓÚ¿¡])/.exec(first.text.slice(30));
    if (end) { const cut = 30 + end.index + end[0].length; blocks.splice(0, 1, { kind: "p", text: first.text.slice(0, cut).trim() }, { kind: "p", text: first.text.slice(cut).trim() }); }
  }
  return { blocks, links };
}

/** Inside a line: links can be tapped, amounts stand out, and a law in brackets reads as a reference. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)»"]+|\$\s?\d[\d,]*(?:\.\d+)?(?:\s(?:al mes|al año))?|\[[^\]]{3,140}\])/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (/^https?:\/\//.test(part)) { const url = tidy(part); return <span key={index}><a className={s.inlineLink} href={url} target="_blank" rel="noopener noreferrer">{host(url)}{url.length > host(url).length + 9 ? new URL(url).pathname.replace(/\/$/, "").slice(0, 28) : ""}</a>{part.slice(url.length)}</span>; }
        if (/^\$/.test(part)) return <b key={index} className={s.money}>{part}</b>;
        if (/^\[/.test(part)) return <span key={index} className={s.law}>{part.slice(1, -1)}</span>;
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function CopyAnswer({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button type="button" className={s.copy} data-state={state} onClick={async () => { setState((await copyText(text)) ? "done" : "failed"); clearTimeout(timer.current); timer.current = setTimeout(() => setState("idle"), 1700); }}>
      {state === "done" ? Done : CopyIcon}<span aria-live="polite">{state === "done" ? "Copiada" : state === "failed" ? "No se pudo" : "Copiar respuesta"}</span>
    </button>
  );
}

/** What is read aloud: the answer without its links, source lines or brackets, with lists as sentences. The voice route takes 2,000 characters. */
export function spoken(reply: string) {
  return reply
    .replace(/\s*Fuentes?(?: \([^)]*\))?:\s*(?:https?:\/\/\S+[ ,]*)+/gi, " ")
    .replace(/(?:Link para el cliente|Enlace[^:\n]{0,40}):\s*https?:\/\/\S+/gi, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[([^\]]{3,140})\]/g, " ($1) ").replace(/§+/g, " sección ")
    .split("\n").map(line => line.replace(/^[-•·]\s+/, "").trim()).filter(Boolean).map(line => /[.:;!?]$/.test(line) ? line : `${line}.`).join(" ")
    .replace(/\s+/g, " ").trim().slice(0, 1900);
}

/** One voice at a time, through one audio context opened by the tap: what an iPhone needs to play after the wait. */
let audio: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;
const Speaker = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.3" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.500V5.500L7.500 9.500z" /><path d="M15.500 9a4.200 4.200 0 0 1 0 6M18.300 6.500a8 8 0 0 1 0 11" /></svg>;

/** «Escuchar»: the answer read aloud with the landing's own voice (POST /api/agent/visa-speech). Tapping again stops it. */
function Listen({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "failed">("idle");
  const buffer = useRef<AudioBuffer | null>(null), alive = useRef(true), mine = useRef<(() => void) | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; mine.current?.(); }; }, []);

  const play = (context: AudioContext, sound: AudioBuffer) => {
    const source = context.createBufferSource(); source.buffer = sound; source.connect(context.destination);
    const stop = () => { source.onended = null; try { source.stop(); } catch { /* not started or already over */ } if (stopCurrent === stop) stopCurrent = null; mine.current = null; if (alive.current) setState("idle"); };
    source.onended = stop; stopCurrent = stop; mine.current = stop;
    source.start(); setState("playing");
  };
  const toggle = async () => {
    if (state === "playing" || state === "loading") { mine.current?.(); mine.current = null; setState("idle"); return; }
    stopCurrent?.();
    try {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) throw new Error("no_audio");
      audio ??= new Context(); const context = audio;
      void context.resume(); // inside the tap: the permission to sound lasts for what comes after the wait
      if (buffer.current) { play(context, buffer.current); return; }
      setState("loading");
      let cancelled = false; mine.current = () => { cancelled = true; };
      const response = await fetch("/api/agent/visa-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: spoken(text) }) });
      if (!response.ok) throw new Error("speech");
      const sound = await context.decodeAudioData(await response.arrayBuffer());
      buffer.current = sound;
      if (cancelled || !alive.current) return;
      stopCurrent?.(); play(context, sound);
    } catch {
      mine.current = null;
      if (alive.current) { setState("failed"); window.setTimeout(() => { if (alive.current) setState(value => value === "failed" ? "idle" : value); }, 2200); }
    }
  };
  return (
    <button type="button" className={s.listen} data-state={state} aria-pressed={state === "playing"} onClick={toggle}>
      {state === "playing" || state === "loading" ? <span className={s.bars} aria-hidden="true"><i /><i /><i /><i /></span> : Speaker}
      <span aria-live="polite">{state === "playing" ? "Detener" : state === "loading" ? "Preparando la voz" : state === "failed" ? "No se pudo" : "Escuchar"}</span>
    </button>
  );
}

function Answer({ turn, onJump }: { turn: Turn; onJump: (key: string) => void }) {
  const text = turn.a ?? "", { blocks, links } = layout(text);
  const unsure = turn.covered === false && !turn.sources;
  const brain = turn.used?.brain, sources = [...(turn.sources ?? []), ...links.filter(link => !(turn.sources ?? []).some(source => source.url === link.url))];
  return (
    <article className={s.answer} data-unsure={unsure || undefined} data-official={turn.sources ? true : undefined}>
      <header className={s.answerHead}>
        <BrainMark />
        <b>Asistente ContyGo</b>
        <span className={s.badges}>
          {brain && <i data-kind="brain">Cerebro{brain.length ? ` · ${brain.join(" y ")}` : " · 50 estados"}</i>}
          {turn.sources && <i data-kind="official">Página oficial</i>}
          {turn.used?.prices && /\$\s?\d/.test(text) && <i data-kind="prices">Precios de hoy</i>}
          {unsure && <i data-kind="unsure">Sin dato confirmado</i>}
        </span>
      </header>
      <div className={s.answerBody}>
        {blocks.map((block, index) => block.kind === "p"
          ? <p key={index} className={index === 0 && block.text.length <= 200 ? s.lead : undefined} style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}><Rich text={block.text} /></p>
          : <ul key={index} style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}>{block.items.map((item, at) => <li key={at}><Rich text={item} /></li>)}</ul>)}
      </div>
      {turn.sources && <p className={s.official}><b>Leído ahora en la página oficial.</b> Ábrela y compruébalo antes de decírselo al cliente.</p>}
      {unsure && <p className={s.unsure}>Confírmalo con Henry o con la oficina antes de responder al cliente.</p>}
      {sources.length > 0 && (
        <div className={s.sources}>
          <span>{sources.length === 1 ? "Fuente" : "Fuentes"}</span>
          {sources.slice(0, 4).map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.site}{Out}</a>)}
        </div>
      )}
      <div className={s.after}>
        <CopyAnswer text={text} />
        <Listen text={text} />
        {(turn.serviceIds ?? []).filter(id => NAMES.has(id)).map(id => <button key={id} type="button" className={s.jump} onClick={() => onJump(id)}>Ver {NAMES.get(id)}</button>)}
      </div>
    </article>
  );
}

/** One question to the assistant; `serviceId` when it is written on that service's row. Each step of the server's work goes to `onStep`. */
async function askTeam(question: string, turns: Turn[], serviceId: string | undefined, onStep: (step: Step) => void): Promise<Asked> {
  const history = turns.filter(turn => turn.a).slice(-4).map(turn => ({ q: turn.q, a: turn.a }));
  type Reply = { ok?: boolean; error?: string; reply?: string; covered?: boolean; serviceIds?: string[]; sources?: Source[]; used?: Used };
  const read = (data: Reply | null): Asked => data?.ok && data.reply
    ? { a: data.reply, covered: data.covered !== false, serviceIds: data.serviceIds ?? [], ...(data.sources?.length ? { sources: data.sources } : {}), ...(data.used ? { used: data.used } : {}) }
    : { failed: FAILED[data?.error ?? ""] ?? NO_LINE };
  try {
    const response = await fetch("/api/agent/team-chat", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ question: question.slice(0, 600), history, ...(serviceId ? { serviceId } : {}) }) });
    if (!response.body || !response.headers.get("content-type")?.includes("ndjson")) return read(await response.json().catch(() => null) as Reply | null);
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = "", done: Reply | null = null;
    for (;;) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
      const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
      for (const line of chunk.done ? [...lines, buffer] : lines) {
        if (!line.trim()) continue;
        try { const data = JSON.parse(line) as { step?: Step; done?: Reply }; if (data.step) onStep(data.step); if (data.done) done = data.done; } catch { /* a broken line: the next one still counts */ }
      }
      if (chunk.done) break;
    }
    return read(done);
  } catch { return { failed: NO_LINE }; }
}

/** The questions and answers of one conversation: the panel's, or one service's. */
function useTalk(serviceId?: string) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const ask = async (raw: string, from: Turn[] = turns) => {
    const question = raw.replace(/\s+/g, " ").trim();
    if (!question || busy) return false;
    setTurns([...from, { q: question }]); setSteps([]); setBusy(true);
    const result = await askTeam(question, from, serviceId, step => setSteps(list => [...list, step]));
    setTurns(list => list.map((turn, index) => index === list.length - 1 ? { ...turn, ...result } : turn));
    setBusy(false);
    return true;
  };
  const retry = (index: number) => { const turn = turns[index]; if (turn) void ask(turn.q, turns.filter((_, at) => at !== index)); };
  return { turns, busy, steps, ask, retry };
}

function Thread({ turns, busy, steps, retry, onJump }: { turns: Turn[]; busy: boolean; steps: Step[]; retry: (index: number) => void; onJump: (key: string) => void }) {
  return (
    <>
      {turns.map((turn, index) => (
        <div key={index} className={s.turn}>
          <p className={s.asked}>{turn.q}</p>
          {turn.a && <Answer turn={turn} onJump={onJump} />}
          {turn.failed && <p className={s.failed} role="alert">{turn.failed} <button type="button" onClick={() => retry(index)}>Preguntar de nuevo</button></p>}
        </div>
      ))}
      {busy && <Thinking steps={steps} />}
    </>
  );
}

/** The assistant on a service's own row: the question is about that service without naming it, and the answer stays there. */
export function ServiceAsk({ serviceId, name, onJump }: { serviceId: string; name: string; onJump: (key: string) => void }) {
  const { turns, busy, steps, ask, retry } = useTalk(serviceId);
  const [draft, setDraft] = useState("");
  const send = (text: string) => { if (busy || !text.trim()) return; setDraft(""); void ask(text); };
  return (
    <div className={s.own}>
      <form className={s.ownForm} onSubmit={event => { event.preventDefault(); send(draft); }}>
        <span className={s.ownIcon}>{Chat}</span>
        <input type="text" value={draft} maxLength={600} onChange={event => setDraft(event.target.value)} placeholder="Pregunta sobre este servicio" aria-label={`Pregunta al asistente sobre ${name}`} enterKeyHint="send" autoComplete="off" />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar la pregunta">{Send}</button>
      </form>
      {!turns.length && <div className={s.quick}>{QUICK.map(text => <button key={text} type="button" disabled={busy} onClick={() => send(text)}>{text}</button>)}</div>}
      {(turns.length > 0 || busy) && <div className={s.ownTalk} aria-live="polite"><Thread turns={turns} busy={busy} steps={steps} retry={retry} onJump={onJump} /></div>}
    </div>
  );
}

export default function TeamChat({ open, onOpen, onJump }: { open: boolean; onOpen: (open: boolean) => void; onJump: (key: string) => void }) {
  const { turns, busy, steps, ask, retry } = useTalk();
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    field.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onOpen(false); };
    window.addEventListener("keydown", key);
    // On a phone the panel covers the page: the page behind must not scroll under the finger.
    const phone = window.matchMedia("(max-width:759px)").matches, before = document.body.style.overflow;
    if (phone) document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); if (phone) document.body.style.overflow = before; };
  }, [open, onOpen]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: "end" }); }, [turns, busy, steps.length, open]);

  const close = () => { onOpen(false); launcher.current?.focus({ preventScroll: true }); };
  const send = (text: string) => { if (busy || !text.trim()) return; setDraft(""); void ask(text); };
  const jump = (key: string) => { close(); onJump(key); };

  return (
    <>
      <button ref={launcher} type="button" className={s.launcher} data-hidden={open || undefined} aria-expanded={open} aria-controls="asistente-equipo" aria-label="Pregunta al asistente" onClick={() => onOpen(true)}>
        {Chat}<span>Pregunta al asistente</span>
      </button>
      {open && <div className={s.shade} onClick={close} aria-hidden="true" />}
      {open && (
        <section className={s.panel} id="asistente-equipo" role="dialog" aria-modal="true" aria-label="Asistente del equipo">
          <header className={s.head}>
            <Image src="/contygo/v8/producto-henry.webp" alt="" width={48} height={48} />
            <div><h2>Asistente del equipo</h2><p>Con el Cerebro de ContyGo y los precios de hoy</p></div>
            <button type="button" className={s.close} onClick={close} aria-label="Cerrar el asistente">{Close}</button>
          </header>

          <div className={s.talk} aria-live="polite">
            {!turns.length && (
              <div className={s.start}>
                <p>Pregunta lo que tu cliente te está preguntando. Te respondo con los precios de hoy, lo que ContyGo tiene escrito de cada servicio y el Cerebro de los 50 estados.</p>
                <ul>{STARTERS.map(text => <li key={text}><button type="button" onClick={() => send(text)}>{text}</button></li>)}</ul>
              </div>
            )}
            <Thread turns={turns} busy={busy} steps={steps} retry={retry} onJump={jump} />
            <div ref={end} />
          </div>

          <form className={s.write} onSubmit={event => { event.preventDefault(); send(draft); }}>
            <textarea ref={field} value={draft} rows={1} maxLength={600} placeholder="Escribe la pregunta de tu cliente" aria-label="Tu pregunta" enterKeyHint="send"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(draft); } }} />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar la pregunta">{Send}</button>
          </form>
          <p className={s.fine}>No guarda la conversación. No decide si un cliente califica ni da asesoría legal.</p>
        </section>
      )}
    </>
  );
}
