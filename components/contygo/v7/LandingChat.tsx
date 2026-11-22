"use client";

/* El asistente de cierre de la portada (03-11-2026): abajo a la derecha. Entiende qué necesita la persona, le propone el
   servicio (hasta tres, con su escultura y su «desde»), le hace allí mismo las preguntas del recorrido de ese servicio
   (/api/agent/service-intake, las mismas de la guía: las de evaluación y las del guion de cada servicio) y termina
   siempre en dos caminos: crear su contrato por su cuenta —abre ese servicio directamente en el contrato con sus
   respuestas ya puestas— o que la atienda una persona por WhatsApp, con el servicio, sus respuestas en corto y la
   referencia. Después de cualquier respuesta suelta también ofrece al asesor: lo pone la pantalla, no la IA, así que
   está aunque el modelo falle.
   Diseño (03-11-2026, segunda versión): el hilo verde de la página sigue dentro del chat. Arriba marca los tres pasos
   (tu trámite, tus preguntas, tu contrato) y la conversación cuelga de él. El botón es el símbolo de ContyGo —el check
   con su cola— que se dibuja solo, como un nodo vivo del recorrido; en escritorio lleva al lado una línea que se escribe
   sola con los trámites. Las imágenes son la cinta verde del hero: una burbuja de diálogo y el contrato con su sello.
   El contrato, dentro (22-11-2026): el dueño quiere «un sistema de autocompletado de contrato» que la persona haga
   sola desde la web. «Llenar mi contrato aquí» ya no salta a otra pantalla: la ficha del contrato (la misma de la
   guía, ContractCheckout, con sus pasos, su voz, su código y su firma) se abre en la conversación con las respuestas
   ya puestas, y a su lado la hoja del contrato se va llenando sola (ContractSheet). Una duda a mitad del contrato se
   responde sin mover la ficha. Lo que quedó a medias se recuerda dos días en este aparato. También: los vídeos de
   cada servicio se ven aquí mismo, «Escuchar» lee las respuestas en voz alta (ChatVoice), se puede dictar donde el
   navegador lo permite, y la página lo abre con lo que la persona ya dijo (assistantBus). Los contratos hechos
   aquí viajan marcados (`utm_via=asistente-web`).
   En el celular es una hoja sobre la página; el botón sube por encima de la barra «Elige tu trámite» y del aviso de
   cookies, y se aparta mientras hay un servicio abierto. La conversación vive solo en esta pestaña. */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { waLink, crmWaLink } from "@/lib/config";
import { VISIBLE_SERVICES, serviceVariants, type ContygoService } from "@/lib/contygo-catalog";
import { getRebuildPlatformFilm, getRebuildServiceFilm, type RebuildFilm } from "@/lib/contygo-rebuild-media";
import { formatVideoDuration } from "@/lib/contygo-presentation";
import { fromPriceLabel, useServicePrices } from "@/lib/contygo-api/prices-client";
import { newExternalRef, publicRef, saveJourney } from "@/lib/contygo-api/browser";
import { CONTRACT_TIME, CONTRACT_TIME_SHORT, LANDING_GREETING, LANDING_NEEDS, advisorMessage, closingMessage, type LandingNeed } from "@/lib/agent/landing-chat-ui";
import { answerLabel, withAnswer, type SummaryItem } from "@/lib/agent/answer-summary";
import type { IntakeQuestion } from "@/lib/agent/service-intake";
import type { VisaIntakeSession } from "../juvenil/VisaJuvenilExperience";
import { trackBrowser } from "@/lib/meta/pixel-client";
import type { ContractSnapshot } from "../contract/ContractCheckout";
import ContractSheet from "./ContractSheet";
import { ASSISTANT_EVENT, clearResume, readResume, saveResume, type AssistantAsk, type AssistantResume } from "./assistantBus";
import s from "./LandingChat.module.css";

// The contract and the voice arrive only when the person reaches them: the page does not carry them.
const ContractCheckout = dynamic(() => import("../contract/ContractCheckout"), { ssr: false, loading: () => <p className={s.preparing} role="status">Preparando tu contrato…</p> });
const ChatVoice = dynamic(() => import("./ChatVoice"), { ssr: false });

type Props = { hidden: boolean; raised: boolean; onService: (item: ContygoService, element: HTMLElement) => void };
type Outcome = Pick<VisaIntakeSession, "eligible" | "guidance" | "escalate" | "unavailableOnline" | "priority" | "asylum" | "hearing">;
/** A turn of the service's questions, as /api/agent/service-intake answers it (only what the chat reads). */
type Turn = Outcome & { ok?: boolean; answers: VisaIntakeSession["answers"]; question: IntakeQuestion | null; total?: number; answered?: number; complete?: boolean; message?: string };
/** The service's questions in progress: its reference, the answers so far and the question on screen. */
type Flow = { serviceId: string; ref: string; answers: VisaIntakeSession["answers"]; summary: SummaryItem[]; question: IntakeQuestion | null; answered: number; total: number; retried: boolean };
type Item =
  | { id: number; kind: "bot"; text: string; step?: string }
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "refine"; need: LandingNeed; picked?: string }
  | { id: number; kind: "services"; ids: string[] }
  | { id: number; kind: "advisor"; question?: string }
  | { id: number; kind: "close"; serviceId: string; ok: boolean; detail: string; outcome: Outcome; flow: Flow }
  /** The service's films, to watch here. */
  | { id: number; kind: "video"; serviceId: string }
  /** After a loose answer: the needs again, so the next step is the person's service and not a goodbye. */
  | { id: number; kind: "needs" }
  /** The contract itself, filled in here: the same form as the guide's (ContractCheckout), with the chat's answers in it. */
  | { id: number; kind: "contract"; serviceId: string; seed: Seed };
/** What the contract starts from: the chat's reference, its answers and what they decided. */
type Seed = { ref: string; answers: VisaIntakeSession["answers"]; outcome: Outcome };
/** The browser's dictation, where it exists (Chrome, Safari): only what the chat uses of it. */
type Dictation = { lang: string; interimResults: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start(): void; stop(): void };
const dictation = (): (new () => Dictation) | null => { const w = window as unknown as { SpeechRecognition?: new () => Dictation; webkitSpeechRecognition?: new () => Dictation }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null; };
/** The films of a service that exist: what it is, and how it is done in the app. */
const filmsOf = (id: string) => [{ label: "El servicio", film: getRebuildServiceFilm(id) }, { label: "Cómo se hace en la app", film: getRebuildPlatformFilm(id) }].filter((item): item is { label: string; film: RebuildFilm & { src: string } } => Boolean(item.film.src) && !item.film.provisional);
type Draft = Item extends infer T ? T extends Item ? Omit<T, "id"> : never : never;

const TEASER_KEY = "contygo.chat-teaser";
const ERROR_TEXT = "Se me cortó la conexión. Una persona del equipo te responde ahora por WhatsApp.";
/** What the button writes beside itself on the first visit: what people come for, then the offer. */
const TYPED = ["¿Asilo o corte?", "¿Permiso de trabajo?", "¿Visa Juvenil?", "¿Tu ITIN?", `En ${CONTRACT_TIME}`];
/* The button (22-11-2026): «que llame más la atención, para que el usuario que entre sepa que puede hacer su contrato
   él mismo y en menos de 3 minutos». It now says so, on a green pill. Of three looks on the local page (the pill, the
   symbol as a small contract filling itself, the promise turning around the symbol like a seal) the owner chose the
   pill: «me gusta la 1». */
const Clock = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const STEPS = ["Tu trámite", "Tus preguntas", "Tu contrato"];
const art = (name: string) => `/contygo/chat/${name}.webp`;
const find = (id: string) => VISIBLE_SERVICES.find(item => item.id === id);
/** The answers already send this person to a person, not to the online contract (as the contract itself would). */
const needsPerson = (turn: Outcome) => Boolean(turn.escalate || turn.unavailableOnline || turn.eligible === false || turn.asylum?.advisor || turn.hearing?.advisor
  || (turn.priority?.previo && turn.priority.status === "unknown"));

const WhatsApp = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2 4.6 4.6 0 0 0 1 2.5 10.6 10.6 0 0 0 4.1 3.6c1.5.6 2.1.7 2.9.6a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.5-.3Z" /></svg>;
const Close = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
const Send = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Restart = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Tick = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Speaker = ({ on }: { on: boolean }) => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />{on ? <path d="M16 9a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /> : <path d="m16.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />}</svg>;
const Mic = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.9" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>;
const Play = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5Z" fill="currentColor" /></svg>;

/** A service's films inside the chat: one at a time, with its captions; then, straight to its questions. */
function Films({ serviceId, onReady, disabled }: { serviceId: string; onReady: () => void; disabled: boolean }) {
  const films = filmsOf(serviceId), [at, setAt] = useState(0), current = films[at];
  if (!current) return null;
  return <div className={s.films}>
    {films.length > 1 && <div className={s.filmTabs} role="group" aria-label="Qué vídeo ver">{films.map((item, index) => <button key={item.label} type="button" aria-pressed={at === index} onClick={() => setAt(index)}>{item.label}{item.film.duration ? <small>{formatVideoDuration(item.film.duration)}</small> : null}</button>)}</div>}
    <video key={current.film.src} className={s.film} src={current.film.src} poster={current.film.poster} controls playsInline preload="none">{current.film.captions && <track kind="captions" src={current.film.captions} srcLang="es" label="Español" default />}</video>
    <button type="button" className={s.go} onClick={onReady} disabled={disabled}><span>Ya lo vi, quiero mi contrato</span><i aria-hidden="true"><Arrow /></i></button>
  </div>;
}


/** ContyGo's symbol, drawn: the tail of the «y» first, then the check. */
function Mark({ className }: { className?: string }) {
  return <svg className={`${s.mark} ${className ?? ""}`} viewBox="0 0 100 100" aria-hidden="true">
    <path className={s.markTail} pathLength={1} d="M43 67C35 81 31 89 15 89" />
    <path className={s.markCheck} pathLength={1} d="M19 41 43 64 83 15" />
  </svg>;
}

/** The line beside the button types what people come for, once, and stays on the offer. Without motion: the offer. */
function useTypedLine(active: boolean) {
  const [text, setText] = useState(TYPED[TYPED.length - 1]);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let phrase = 0, chars = 0, deleting = false, timer = 0;
    const tick = () => {
      const target = TYPED[phrase];
      if (!deleting) {
        chars++;
        setText(target.slice(0, chars));
        if (chars === target.length) {
          if (phrase === TYPED.length - 1) return;
          deleting = true; timer = window.setTimeout(tick, 1100); return;
        }
        timer = window.setTimeout(tick, 48);
      } else {
        chars = Math.max(0, chars - 2);
        setText(target.slice(0, chars) || " ");
        if (!chars) { deleting = false; phrase++; }
        timer = window.setTimeout(tick, chars ? 22 : 240);
      }
    };
    setText(" ");
    timer = window.setTimeout(tick, 500);
    return () => window.clearTimeout(timer);
  }, [active]);
  return text;
}

/** A date is sent with its own button: the phone's wheels and the computer's day/month/year boxes change the value
 *  on the way to the real date, and sending on every change would send a date the person never chose. */
function DateAnswer({ bounds, onAnswer }: { bounds: { min?: string; max?: string }; onAnswer: (value: string) => void }) {
  const [value, setValue] = useState("");
  const valid = /^(19|20)\d{2}-\d{2}-\d{2}$/.test(value) && (!bounds.min || value >= bounds.min) && (!bounds.max || value <= bounds.max);
  return <form className={s.dateAnswer} onSubmit={event => { event.preventDefault(); if (valid) onAnswer(value); }}>
    <input className={s.field} type="date" aria-label="Elige la fecha" value={value} {...bounds} onChange={event => setValue(event.target.value)} />
    <button type="submit" disabled={!valid}>Listo</button>
  </form>;
}

export default function LandingChat({ hidden, raised, onService }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // First visit of the tab: the button calls once (the symbol drawn again, the typed line). Its float and beat are CSS.
  const [calling, setCalling] = useState(false);
  // How much of the screen the cookie notice takes from the bottom (0 when it is not there).
  const [banner, setBanner] = useState(0);
  // The welcome's pictures load only when the person reaches for the button (hover, touch, focus), not with the page.
  const [primed, setPrimed] = useState(false);
  const prime = () => setPrimed(true);
  const showArt = primed || open;
  const prices = useServicePrices();
  const typed = useTypedLine(calling);
  const nextId = useRef(1), panel = useRef<HTMLElement>(null), list = useRef<HTMLDivElement>(null), launcher = useRef<HTMLButtonElement>(null);
  /* The contract in the chat: what its form holds so far (for the sheet that fills itself). */
  const [snap, setSnap] = useState<ContractSnapshot | null>(null);
  // «Escuchar»: the assistant reads its messages aloud. Off until the person turns it on.
  const [listen, setListen] = useState(false);
  // Dictation: whether this browser has it, and whether it is listening now.
  const [canTalk, setCanTalk] = useState(false), [hearing, setHearing] = useState(false);
  const ear = useRef<Dictation | null>(null);
  // What was left unfinished on this device (two days): the welcome offers to go on.
  const [resume, setResume] = useState<AssistantResume<Seed, SummaryItem[]> | null>(null);
  // A doubt asked while the contract is open: its answer shows over the form, without moving it.
  const [aside, setAside] = useState<{ q: string; a: string } | null>(null);
  // What the page asked for when it opened the chat (a need, a question, a service).
  const asked = useRef<AssistantAsk | null>(null), [askTurn, setAskTurn] = useState(0);

  const add = useCallback((...next: Draft[]) => setItems(current => [...current, ...next.map(item => ({ ...item, id: nextId.current++ }) as Item)]), []);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(TEASER_KEY) === "1"; } catch { /* Private mode: it may call again. */ }
    if (seen) return;
    const timer = window.setTimeout(() => setCalling(true), 7000);
    return () => window.clearTimeout(timer);
  }, []);
  const quiet = useCallback(() => { setCalling(false); try { sessionStorage.setItem(TEASER_KEY, "1"); } catch { /* Not kept. */ } }, []);
  // The cookie notice sits at the bottom of the screen: the button waits above it.
  useEffect(() => {
    const check = () => { const notice = document.querySelector("[data-consent-banner]"); setBanner(notice ? Math.max(0, Math.round(window.innerHeight - notice.getBoundingClientRect().top)) : 0); };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true });
    window.addEventListener("resize", check);
    return () => { observer.disconnect(); window.removeEventListener("resize", check); };
  }, []);
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);
  useEffect(() => { setResume(readResume<Seed, SummaryItem[]>()); setCanTalk(Boolean(dictation())); return () => ear.current?.stop(); }, []);
  // The page opens the chat (the section «Dime qué necesitas», the button at the foot, an invitation).
  useEffect(() => {
    const onAsk = (event: Event) => { asked.current = (event as CustomEvent<AssistantAsk>).detail ?? {}; setPrimed(true); setOpen(true); setAskTurn(turn => turn + 1); };
    window.addEventListener(ASSISTANT_EVENT, onAsk);
    return () => window.removeEventListener(ASSISTANT_EVENT, onAsk);
  }, []);
  // Closed, the panel is out of reach of the keyboard and screen readers.
  useEffect(() => { if (panel.current) panel.current.inert = !open; }, [open]);
  // Each new message slides into view; the welcome stays at the top until the first one.
  useEffect(() => {
    const box = list.current;
    if (!box || !items.length) return;
    const last = box.querySelector<HTMLElement>("[data-last]");
    // Its place in the list by layout (offsetTop), not on screen: the entrance animation moves it while it plays.
    let top = 0;
    for (let node: HTMLElement | null = last; node && node !== box; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
    top = last ? top - 16 : box.scrollHeight;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [items, busy]);
  useEffect(() => {
    if (!open) return;
    quiet();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); launcher.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, quiet]);

  const contact = () => { try { trackBrowser("Contact", { content_name: "chat-portada" }); } catch { /* Pixel off. */ } };
  const close = () => { setOpen(false); launcher.current?.focus(); };

  const askRef = useRef<(question: string) => Promise<void>>(async () => {});
  /** A question or a story in the person's words: the chat answers, proposes services and, always, a person. */
  async function ask(question: string) {
    const text = question.replace(/\s+/g, " ").trim().slice(0, 500);
    if (!text || busy) return;
    const history = items.flatMap((item, index) => {
      const next = items[index + 1];
      return item.kind === "user" && next?.kind === "bot" ? [{ q: item.text, a: next.text }] : [];
    }).slice(-4);
    // With the contract open, a doubt does not move the form: its answer shows over it.
    const duringContract = items.some(item => item.kind === "contract");
    if (!duringContract) add({ kind: "user", text });
    setDraft(""); setBusy(true);
    try {
      const response = await fetch("/api/agent/landing-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, history }) });
      const data = await response.json().catch(() => null) as { ok?: boolean; reply?: string; serviceIds?: string[] } | null;
      if (!response.ok || !data?.ok || !data.reply) throw new Error("no_reply");
      if (duringContract) { setAside({ q: text, a: data.reply }); return; }
      const ids = (data.serviceIds ?? []).filter(id => find(id));
      // Without a service to propose, the next step is still the person's own: which one is theirs.
      add({ kind: "bot", text: data.reply }, ...(ids.length ? [{ kind: "services" as const, ids }] : [{ kind: "needs" as const }]), { kind: "advisor", question: text });
    } catch {
      if (duringContract) setAside({ q: text, a: ERROR_TEXT });
      else add({ kind: "bot", text: ERROR_TEXT }, { kind: "advisor", question: text });
    } finally { setBusy(false); }
  }

  askRef.current = ask;

  function chooseNeed(need: LandingNeed) {
    if (busy || flow) return;
    if (need.refine) { add({ kind: "user", text: need.label }, { kind: "refine", need }); return; }
    add({ kind: "user", text: need.label }, { kind: "bot", text: need.ids.length === 1 ? "Este es tu servicio. Revisemos si calificas: son unas preguntas rápidas." : "Para eso tienes estos servicios. Elige el tuyo y revisamos si calificas." }, { kind: "services", ids: need.ids }, { kind: "advisor" });
  }
  function refine(item: Extract<Item, { kind: "refine" }>, step: { label: string; ids: string[] }) {
    if (item.picked || busy || flow) return;
    setItems(current => current.map(entry => entry.id === item.id ? { ...entry, picked: step.label } : entry));
    add({ kind: "user", text: step.label }, { kind: "bot", text: step.ids.length === 1 ? "Para eso es este servicio. Revisemos si calificas: son unas preguntas rápidas." : "Para eso tienes estos servicios. Elige el tuyo y revisamos si calificas." }, { kind: "services", ids: step.ids }, { kind: "advisor" });
  }

  /** One turn of the service's questions: the same call and the same questions as the guide (its evaluation and its script). */
  async function turn(serviceId: string, body: Record<string, unknown>): Promise<Turn> {
    const response = await fetch("/api/agent/service-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, ...body }) });
    const data = await response.json().catch(() => null) as Turn | null;
    if (!response.ok || !data?.ok) throw new Error("turn_failed");
    return data;
  }
  /** What the server answered: the next question (or the same one, asked again), or the end with its two ways out. */
  function settle(serviceId: string, data: Turn, current: Flow, asked?: IntakeQuestion, first = false) {
    const repeated = Boolean(asked && data.question?.id === asked.id && !data.complete);
    const next: Flow = { ...current, answers: data.answers ?? current.answers, question: data.complete ? null : data.question, total: data.total ?? current.total, answered: data.answered ?? current.answered, retried: repeated };
    if (!data.complete && !data.escalate && data.question) {
      setFlow(next);
      // The first question goes alone (the chat already said hello); the next ones keep the server's words: its «got it»,
      // its «say it again» or its answer to a doubt, before the question.
      const text = first ? data.question.text : data.message || data.question.text;
      add({ kind: "bot", text, step: next.total ? `Pregunta ${Math.min(next.answered + 1, next.total)} de ${next.total}` : undefined });
      return;
    }
    setFlow(null);
    const outcome: Outcome = { eligible: data.eligible, guidance: data.guidance, escalate: data.escalate, unavailableOnline: data.unavailableOnline, priority: data.priority, asylum: data.asylum, hearing: data.hearing };
    const ok = !needsPerson(outcome);
    add({ kind: "close", serviceId, ok, outcome, flow: next,
      detail: ok ? "Lo revisas con calma antes de firmar: alcance, precio y condiciones."
        : data.guidance?.title ? `${data.guidance.title}. Una persona del equipo lo revisa contigo y te dice cómo seguir.`
        : "Una persona del equipo revisa tu caso contigo y te dice cómo seguir." });
  }
  async function startFlow(serviceId: string) {
    const service = find(serviceId);
    if (!service || busy || flow) return;
    const fresh: Flow = { serviceId, ref: newExternalRef(), answers: {}, summary: [], question: null, answered: 0, total: 0, retried: false };
    add({ kind: "user", text: `Revisar si califico para ${service.name}` });
    setBusy(true);
    try {
      const data = await turn(serviceId, { answers: {} });
      if (data.total) add({ kind: "bot", text: `Perfecto. Son ${data.total === 1 ? "una pregunta rápida" : `${data.total} preguntas rápidas`} sobre ${service.name}. Toca tu respuesta o escríbela con tus palabras.` });
      settle(serviceId, data, fresh, undefined, true);
    } catch { add({ kind: "bot", text: ERROR_TEXT }, { kind: "advisor" }); }
    finally { setBusy(false); }
  }
  async function answer(value: unknown, typedAnswer?: string) {
    const current = flow, question = current?.question;
    if (!current || !question || busy) return;
    add({ kind: "user", text: typedAnswer ?? answerLabel(question, value) ?? String(value) });
    setBusy(true);
    try {
      const data = await turn(current.serviceId, { answers: current.answers, field: question.id, answer: typedAnswer ?? value, ...(current.retried ? { retried: true } : {}) });
      // The summary keeps what the server took as the answer, in words (a typed «sí, vive aquí» becomes «Sí»).
      const taken = data.answers?.[question.id];
      const summary = taken !== undefined && (data.question?.id !== question.id || data.complete) ? withAnswer(current.summary, question, taken) : current.summary;
      settle(current.serviceId, data, { ...current, summary }, question);
    } catch { add({ kind: "bot", text: ERROR_TEXT }, { kind: "advisor" }); setFlow(null); }
    finally { setBusy(false); }
  }

  /** The contract opens here, in the chat, with what the person already answered. It is remembered on this device. */
  function openContract(serviceId: string, seed: Seed, summary: SummaryItem[]) {
    setSnap(null); setAside(null); setFlow(null);
    setItems(current => [...current.filter(item => item.kind !== "contract"), { id: nextId.current++, kind: "contract", serviceId, seed }]);
    saveResume({ serviceId, seed, summary }); setResume(null);
  }
  /** «Llenar mi contrato aquí». A service with two versions (its picker lives in the guide) still opens there. */
  function toContract(item: Extract<Item, { kind: "close" }>, element: HTMLElement) {
    const service = find(item.serviceId);
    if (!service) return;
    const { outcome } = item;
    if (serviceVariants(service.id).length <= 1) { openContract(service.id, { ref: item.flow.ref, answers: item.flow.answers, outcome }, item.flow.summary); return; }
    const session: VisaIntakeSession = { watched: true, quick: true, externalRef: item.flow.ref, answers: item.flow.answers, messages: [], complete: true, field: null, doubtsDone: true,
      eligible: outcome.eligible ?? null, summary: item.flow.summary,
      ...(outcome.guidance ? { guidance: outcome.guidance } : {}), ...(outcome.priority ? { priority: outcome.priority } : {}),
      ...(outcome.asylum ? { asylum: outcome.asylum } : {}), ...(outcome.hearing ? { hearing: outcome.hearing } : {}) };
    saveJourney<VisaIntakeSession>({ serviceId: service.id, stage: "decision", session, origin: "chat" });
    setOpen(false);
    onService(service, element);
  }
  function restart() {
    if (busy) return;
    setFlow(null); setItems([]); setDraft(""); setSnap(null); setAside(null); clearResume(); setResume(null);
    list.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Dictation into the box: the person reads what was heard and sends it. A second tap stops it. */
  function talk() {
    const Hear = dictation();
    if (!Hear) return;
    if (ear.current) { ear.current.stop(); return; }
    const hear = new Hear();
    hear.lang = "es-US"; hear.interimResults = true;
    hear.onresult = event => setDraft(Array.from(event.results, result => result[0].transcript).join(" ").replace(/\s+/g, " ").trim().slice(0, 500));
    hear.onend = hear.onerror = () => { ear.current = null; setHearing(false); };
    ear.current = hear; setHearing(true);
    try { hear.start(); } catch { ear.current = null; setHearing(false); }
  }
  // What the page asked for, once the chat is open.
  useEffect(() => {
    const ask = asked.current;
    if (!ask || !open) return;
    asked.current = null;
    if (ask.listen) setListen(true);
    if (ask.serviceId) void startFlow(ask.serviceId);
    else if (ask.need) { const need = LANDING_NEEDS.find(item => item.label === ask.need); if (need) chooseNeed(need); }
    else if (ask.question) void askRef.current(ask.question);
    if (ask.talk) talk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askTurn, open]);
  // The form says what it holds: the sheet shows it; done, there is nothing left to resume; a name, the welcome uses it.
  const onProgress = useCallback((next: ContractSnapshot) => setSnap(next), []);
  const firstName = snap?.firstName ?? "", finished = snap?.stage === "done";
  useEffect(() => {
    if (finished) { clearResume(); return; }
    const saved = firstName ? readResume<Seed, SummaryItem[]>() : null;
    if (saved && saved.firstName !== firstName) saveResume({ serviceId: saved.serviceId, seed: saved.seed, summary: saved.summary, firstName });
  }, [firstName, finished]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.replace(/\s+/g, " ").trim();
    if (!text || busy) return;
    if (flow?.question) { setDraft(""); void answer(text, text); } else void ask(text);
  };

  const lastAdvisor = [...items].reverse().find(item => item.kind === "advisor")?.id;
  const lastBot = [...items].reverse().find(item => item.kind === "bot")?.id;
  const lastId = items.at(-1)?.id;
  const closed = items.some(item => item.kind === "close");
  const contract = items.find((item): item is Extract<Item, { kind: "contract" }> => item.kind === "contract") ?? null, desk = Boolean(contract);
  const contractService = contract ? find(contract.serviceId) : undefined;
  const stage = desk ? 2 : flow ? 1 : closed ? 2 : 0;
  const lastBotItem = items.find(item => item.id === lastBot);
  const resumeService = resume ? find(resume.serviceId) : undefined;
  const today = new Date();
  const isoDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const q = flow?.question ?? null;
  const unknown = q?.allowUnknown ? <button type="button" className={s.option} data-soft onClick={() => void answer("UNKNOWN")}><i aria-hidden="true" />{q.unknownLabel ?? (q.kind === "date" ? "No la sé" : "Aún no lo sé")}</button> : null;
  const options = (choices: { code: string; label: string }[]) => choices.length <= 6
    ? choices.map(option => <button key={option.code} type="button" className={s.option} onClick={() => void answer(option.code)}><i aria-hidden="true" />{option.label}</button>)
    : <select className={s.field} defaultValue="" aria-label="Elige una opción" onChange={event => { if (event.target.value) void answer(event.target.value); }}>
      <option value="" disabled>Elige una opción</option>
      {choices.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
    </select>;
  const controls: ReactNode = !q || busy ? null
    : q.kind === "yesno" ? <div className={s.yesno}><button type="button" onClick={() => void answer(true)}>Sí</button><button type="button" onClick={() => void answer(false)}>No</button></div>
    : (q.kind === "choice" || q.kind === "state") && q.options?.length ? <div className={s.options}>{options(q.options)}{unknown}</div>
    : q.kind === "date" ? <div className={s.options}><DateAnswer key={q.id} bounds={q.dateMode === "future_event" ? { min: isoDay } : { max: isoDay }} onAnswer={value => void answer(value)} />{unknown}</div>
    : null;

  return <div className={s.chat} data-hidden={hidden || undefined} data-raised={raised || undefined} data-banner={banner > 0 || undefined} data-open={open || undefined} style={banner ? { "--banner": `${banner}px` } as CSSProperties : undefined}>
    {open && <div className={s.backdrop} aria-hidden="true" onClick={() => setOpen(false)} />}
    <section ref={panel} className={s.panel} data-desk={desk || undefined} role="dialog" aria-label="Asistente de ContyGo" aria-hidden={!open}>
      <header className={s.head}>
        <div className={s.identity}>
          <span className={s.avatar}><Mark /></span>
          <span className={s.title}><strong>{desk && firstName ? `${firstName}, tu contrato` : "Asistente ContyGo"}</strong><small><i aria-hidden="true" />{desk && snap?.stage === "form" ? `Paso ${snap.stepIndex + 1} de ${snap.steps}: ${snap.stepLabel.toLowerCase()}` : desk ? "Tu contrato, aquí mismo" : `Tu contrato, en ${CONTRACT_TIME}`}</small></span>
          {!desk && <button type="button" className={s.headButton} data-on={listen || undefined} aria-pressed={listen} onClick={() => setListen(value => !value)} aria-label={listen ? "Dejar de escuchar las respuestas" : "Escuchar las respuestas en voz alta"} title={listen ? "Dejar de escuchar" : "Escuchar las respuestas"}><Speaker on={listen} /></button>}
          {items.length > 0 && <button type="button" className={s.headButton} onClick={restart} aria-label="Empezar de nuevo" title="Empezar de nuevo"><Restart /></button>}
          <button type="button" className={s.headButton} onClick={close} aria-label="Cerrar el chat"><Close /></button>
        </div>
        <ol className={s.rail} style={{ "--fill": stage / 2 } as CSSProperties} aria-label="Tu recorrido">
          {STEPS.map((label, index) => <li key={label} data-state={index < stage ? "done" : index === stage ? "current" : "next"} aria-current={index === stage ? "step" : undefined}>
            <i aria-hidden="true">{index < stage && <Tick />}</i><span>{label}</span>
          </li>)}
        </ol>
      </header>
      {/* The contract's sheet, filling itself: one line that opens on a phone, the whole sheet beside the chat on a wide screen. */}
      {desk && contractService && <div className={s.deskTop}><ContractSheet compact service={contractService.name} data={snap} /></div>}
      {listen && !desk && open && lastBotItem?.kind === "bot" && <ChatVoice text={lastBotItem.text} turn={lastBotItem.id} />}
      <div className={s.body}>
      <div ref={list} className={s.list} role="log" aria-live="polite">
        {!desk && <div className={s.welcome}>
          {showArt && <img className={s.welcomeArt} src={art("cinta-burbuja")} alt="" width={512} height={512} draggable={false} />}
          {/* What was left unfinished on this device: it goes on from there. */}
          {resume && resumeService && !items.length && <div className={s.resume}>
            <strong>{resume.firstName ? `Seguimos donde quedaste, ${resume.firstName}.` : "Seguimos donde quedaste."}</strong>
            <small>Tu contrato de {resumeService.name} te espera, con tus respuestas.</small>
            <button type="button" className={s.go} onClick={() => openContract(resume.serviceId, resume.seed, resume.summary)}><span>Continuar mi contrato</span><i aria-hidden="true"><Arrow /></i></button>
            <button type="button" className={s.more} onClick={() => { clearResume(); setResume(null); }}>Empezar de nuevo</button>
          </div>}
          <h3 className={s.ask}>¿Qué trámite quieres resolver hoy?</h3>
          <p className={s.greeting}>{LANDING_GREETING}</p>
          <div className={s.needs}>{LANDING_NEEDS.map(need => <button key={need.label} type="button" className={s.need} onClick={() => chooseNeed(need)} disabled={busy || Boolean(flow)}>
            <span className={s.tile}>{showArt && <img src={`/contygo/v8/${need.art}.webp`} alt="" width={512} height={512} draggable={false} />}</span>
            <span className={s.needText}><strong>{need.label}</strong><small>{need.hint}</small></span>
            <span className={s.chevron} aria-hidden="true"><Arrow /></span>
          </button>)}</div>
          <a className={s.person} href={waLink(advisorMessage())} target="_blank" rel="noopener noreferrer" onClick={contact}><span><WhatsApp /></span>Prefiero hablar con una persona</a>
        </div>}
        {items.length > 0 && <div className={s.track}>
          {items.map(item => {
            const last = item.id === lastId || undefined;
            if (item.kind === "user") return <div key={item.id} className={s.user} data-last={last}><p>{item.text}</p></div>;
            if (item.kind === "bot") return <div key={item.id} className={s.bot} data-live={item.id === lastBot || undefined} data-last={last}>
              {item.step && <small className={s.stepLabel}>{item.step}</small>}
              <p>{item.text}</p>
            </div>;
            if (item.kind === "refine") return <div key={item.id} className={s.bot} data-live={!item.picked || undefined} data-last={last}>
              <p>{item.need.ask}</p>
              <div className={s.options}>{item.need.refine!.map(step => <button key={step.label} type="button" className={s.option} data-picked={item.picked === step.label || undefined} disabled={Boolean(item.picked) || busy || Boolean(flow)} onClick={() => refine(item, step)}><i aria-hidden="true" />{step.label}</button>)}</div>
            </div>;
            if (item.kind === "services") return <div key={item.id} className={s.services} data-last={last}>{item.ids.map(id => {
              const service = find(id);
              if (!service) return null;
              const from = service.free ? null : fromPriceLabel(prices, service.slug);
              return <article key={id} className={s.service}>
                <span className={s.serviceTop}>
                  <span className={s.tile}><img src={`/contygo/v8/servicio-${id}.webp`} alt="" width={512} height={512} draggable={false} /></span>
                  <span className={s.needText}><strong>{service.name}</strong>{(service.free || from) && <small className={s.price}>{service.free ? "Gratis" : <>desde <b>{from}</b></>}</small>}</span>
                </span>
                <button type="button" className={s.go} onClick={() => void startFlow(id)} disabled={busy || Boolean(flow)}><span>Revisar si califico</span><i aria-hidden="true"><Arrow /></i></button>
                {filmsOf(id).length > 0 && <button type="button" className={s.watch} onClick={() => add({ kind: "user", text: `Ver el vídeo de ${service.name}` }, { kind: "video", serviceId: id })} disabled={busy || Boolean(flow)}><i aria-hidden="true"><Play /></i>Ver el vídeo aquí</button>}
                <button type="button" className={s.more} onClick={event => { setOpen(false); onService(service, event.currentTarget); }}>Ver el servicio completo</button>
              </article>;
            })}</div>;
            if (item.kind === "video") return <div key={item.id} className={s.bot} data-last={last}><Films serviceId={item.serviceId} disabled={busy || Boolean(flow)} onReady={() => void startFlow(item.serviceId)} /></div>;
            if (item.kind === "needs") return lastId !== undefined && item.id >= lastId - 1 ? <div key={item.id} className={s.bot} data-last={last}>
              <p>¿Vemos cuál es tu trámite? Tu contrato lo llenamos aquí mismo.</p>
              <div className={s.options}>{LANDING_NEEDS.map(need => <button key={need.label} type="button" className={s.option} disabled={busy || Boolean(flow)} onClick={() => chooseNeed(need)}><i aria-hidden="true" />{need.label}</button>)}</div>
            </div> : null;
            if (item.kind === "contract") { const service = find(item.serviceId); return service ? <div key={item.id} className={s.contract} data-last={last}>
              <ContractCheckout key={item.id} service={service} via="asistente-web" answers={item.seed.answers} eligible={item.seed.outcome.eligible ?? null} externalRef={item.seed.ref} priority={item.seed.outcome.priority} asylum={item.seed.outcome.asylum} hearing={item.seed.outcome.hearing} onProgress={onProgress} />
            </div> : null; }
            if (item.kind === "advisor") return desk ? null : item.id === lastAdvisor && !flow && !busy
              ? <a key={item.id} className={s.alt} data-last={last} href={waLink(advisorMessage(item.question))} target="_blank" rel="noopener noreferrer" onClick={contact}><WhatsApp />Prefiero que me atienda una persona</a> : null;
            const service = find(item.serviceId);
            if (!service) return null;
            const answered = item.flow.summary.length;
            const message = closingMessage(service.name, item.flow.summary, publicRef(item.flow.ref));
            return <div key={item.id} className={s.milestone} data-last={last}><div className={s.case} data-ok={item.ok || undefined}>
              <img className={s.caseArt} src={art(item.ok ? "cinta-contrato" : "cinta-persona")} alt="" width={512} height={512} draggable={false} />
              <span className={s.chip}>{service.name}</span>
              <strong className={s.caseTitle}>{item.ok ? "Ya puedes crear tu contrato" : "Sigamos con una persona del equipo"}</strong>
              <ul className={s.checklist}>
                <li data-done><i aria-hidden="true"><Tick /></i>Elegiste tu servicio</li>
                <li data-done={answered > 0 || undefined}><i aria-hidden="true">{answered > 0 && <Tick />}</i>{answered ? `Respondiste ${answered === 1 ? "1 pregunta" : `${answered} preguntas`}` : "Sin preguntas previas"}</li>
                <li data-next><i aria-hidden="true" />{item.ok ? "Tu contrato" : "Una persona revisa tu caso"}</li>
              </ul>
              <p className={s.caseText}>{item.detail}</p>
              {answered > 0 && <details className={s.answers}>
                <summary>Ver mis respuestas</summary>
                <ul>{item.flow.summary.map(entry => <li key={entry.id}><span>{entry.question}</span><b>{entry.answer}</b></li>)}</ul>
              </details>}
              {item.ok
                ? <button type="button" className={s.go} disabled={desk} onClick={event => toContract(item, event.currentTarget)}><span>Llenar mi contrato aquí</span><i aria-hidden="true"><Arrow /></i></button>
                : <a className={s.go} href={crmWaLink(message)} target="_blank" rel="noopener noreferrer" onClick={contact}><span>Hablar con una persona</span><i aria-hidden="true"><WhatsApp /></i></a>}
              {item.ok && <a className={s.alt} href={crmWaLink(message)} target="_blank" rel="noopener noreferrer" onClick={contact}><WhatsApp />Prefiero que me atienda una persona</a>}
              <small className={s.ref}>{item.ok ? (answered ? "Tus respuestas ya van en tu contrato." : "Tu contrato se abre aquí mismo.") : "Le llegan tus respuestas y tu referencia."} Referencia {publicRef(item.flow.ref)}</small>
            </div></div>;
          })}
          {controls && <div className={s.reply}>{controls}</div>}
          {busy && !desk && <div className={s.bot} data-live><p className={s.typing} aria-label="Escribiendo"><i /><i /><i /></p></div>}
        </div>}
      </div>
      {desk && contractService && <aside className={s.side}><ContractSheet service={contractService.name} data={snap} /><p>Se llena mientras respondes. Lo revisas todo antes de firmar.</p></aside>}
      </div>
      {/* A doubt asked with the contract open: answered here, the form stays where it was. */}
      {aside && <div className={s.aside} role="status"><small>{aside.q}</small><p>{aside.a}</p><button type="button" onClick={() => setAside(null)} aria-label="Cerrar la respuesta"><Close /></button></div>}
      <form className={s.composer} onSubmit={submit}>
        <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} placeholder={hearing ? "Te escucho…" : busy ? "Un momento…" : desk ? "¿Una duda? Pregúntame" : q ? controls ? "O escribe tu respuesta" : "Escribe tu respuesta aquí" : "Cuéntame tu caso o pregunta"} aria-label={desk ? "Escribe tu duda" : q ? "Escribe tu respuesta" : "Cuéntame tu caso o pregunta"} disabled={busy} enterKeyHint="send" />
        {canTalk && <button type="button" className={s.mic} data-on={hearing || undefined} aria-pressed={hearing} onClick={talk} disabled={busy} aria-label={hearing ? "Dejar de dictar" : "Dictar con mi voz"}><Mic /></button>}
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar"><Send /></button>
      </form>
      <p className={s.legal}>Respuestas automáticas. No es asesoría legal.</p>
    </section>
    {calling && !open && <button type="button" className={s.teaser} onPointerDown={prime} onClick={() => setOpen(true)} aria-label="Abrir el asistente de ContyGo">
      <span aria-hidden="true">{typed}</span>
    </button>}
    <button ref={launcher} type="button" className={s.launcher} data-calling={calling || undefined} onPointerEnter={prime} onPointerDown={prime} onFocus={prime} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? "Cerrar el chat" : `Haz tu contrato tú mismo, en ${CONTRACT_TIME}: abrir el asistente de ContyGo`}>
      <span className={s.node} data-open={open || undefined}>
        <i className={s.ring} aria-hidden="true" /><i className={s.ring} aria-hidden="true" />
        <Mark key={calling ? "call" : "rest"} className={s.launcherMark} />
        <Close />
      </span>
      <span className={s.launcherText} aria-hidden="true"><strong>{resume && resumeService ? "Sigue con tu contrato" : "Haz tu contrato tú mismo"}</strong><small><Clock />{resume && resumeService ? "Te falta poco" : `En ${CONTRACT_TIME}`}</small></span>
      <b className={s.minutes} aria-hidden="true">{CONTRACT_TIME_SHORT}</b>
    </button>
  </div>;
}
