"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import type { RebuildFilm } from "@/lib/contygo-rebuild-media";
import { useVisaVoice, useVisaMicrophone } from "./useVisaVoice";
import { readVoicedReply } from "./liveSpeechReader";
import { VOICED_REPLY_HEADER } from "@/lib/agent/visa-live-config";
import type { VisaVisualTheme } from "./BrandLiquidSurface";
import { LiquidGlow } from "./ThinkingOverlay";
import VisaJourneyReveal from "./VisaJourneyReveal";
import { waLink } from "@/lib/config";
import { whatsappHelpMessage } from "@/lib/contygo-api/messages";
import { publicRef } from "@/lib/contygo-api/checkout";
import { useGuide } from "../guide/useGuide";
import ExternalVideoCaptions from "./ExternalVideoCaptions";
import type { IntakeQuestion, JourneyGuidance, ServiceAnswers } from "@/lib/agent/service-intake";
import type { PriorityOutcome } from "@/lib/agent/adjustment-intake";
import type { AsylumOutcome } from "@/lib/agent/asylum-intake";
import type { HearingOutcome } from "@/lib/agent/hearing-intake";
import { newExternalRef, pageAttribution } from "@/lib/contygo-api/browser";
import { CALL_FILLERS, closingSpeech, doubtSpeech } from "@/lib/agent/call-time";
import { useLeadCaptcha } from "./useLeadCaptcha";
import { LOTTERY_FILM_NOTICE, LOTTERY_PAUSED } from "@/lib/loteria-guide";
import { SKIPPED, withAnswer, type SummaryItem } from "@/lib/agent/answer-summary";
import shared from "../rebuild/ServiceIntroFilm.module.css";
import BrandLoader from "../rebuild/BrandLoader";
import FilmControls from "../rebuild/FilmControls";
import { useVideoWaiting } from "../rebuild/useVideoWaiting";
import s from "./VisaJuvenilExperience.module.css";

type Phase = "watch" | "packing" | "interview";
type Message = { id: number; role: "agent" | "user"; text: string };
// Las preguntas son las del catálogo de contygo: llegan del servidor (/api/agent/service-intake) con su tipo.
// Visa Juvenil antepone su entrevista original (claves «visa.»), que el servidor mezcla con las del catálogo.
// La conversación vive en este navegador (guía §2 bis): externalRef la identifica ante contygo (lead y alta).
// Ajuste de estatus: priority dice si la fecha de prioridad está vigente (cierre del segundo vídeo y ficha del contrato).
export type VisaIntakeSession = { watched: boolean; externalRef?: string; displayName?: string; phone?: string; email?: string; answers: ServiceAnswers; messages: Message[]; complete: boolean; field: string | null; question?: IntakeQuestion | null; total?: number; /** Preguntas respondidas, según el servidor (las respuestas derivadas no cuentan). */ answered?: number; guidance?: JourneyGuidance; eligible?: boolean | null; source?: "gemini" | "guided"; escalate?: boolean; unavailableOnline?: boolean; priority?: PriorityOutcome; asylum?: AsylumOutcome; hearing?: HearingOutcome; /** «¿Te queda alguna duda?» ya respondido con «No tengo dudas, seguir». */ doubtsDone?: boolean; /** «Ya conozco mi caso» (25-10-2026): sin vídeo 1; la llamada hace solo las preguntas de evaluación y después las dudas. */ quick?: boolean; /** «Tu caso en resumen» (28-10-2026): each answered question, short, with its answer in words. */ summary?: SummaryItem[] };
type IntakeTurn = { ok: true; answers: ServiceAnswers; field: string | null; question: IntakeQuestion | null; total: number; answered?: number; complete: boolean; message: string; /** With the voice on: what its voice says (lib/agent/voiced-reply.ts). */ speech?: string; source?: "gemini" | "guided"; guidance?: JourneyGuidance; eligible?: boolean | null; scripts?: string[]; escalate?: boolean; unavailableOnline?: boolean; priority?: PriorityOutcome; asylum?: AsylumOutcome; hearing?: HearingOutcome; doubt?: Doubt; heard?: string; doubtTopics?: string[]; doubtTip?: { question: string; answer: string } | null; /** The voice cannot be understood right now: the chat switches to writing. */ typeInstead?: boolean };
/** A doubt answered by the bot: what it heard, its answer, and whether it knew (if not: WhatsApp). */
type Doubt = { heard: string; reply: string; covered: boolean; done?: boolean };
/** «No», «ninguna», «seguir»… typed at «¿Te queda alguna duda?»: the guide goes on without asking the model. */
const NO_MORE_DOUBTS = /^(no|nop|ninguna|ninguno|nada|no,? gracias|no tengo( m[aá]s)? dudas?|no tengo ninguna|seguir|sigamos|continuar|listo|est[aá] bien)[.!¡ ]*$/i;
/* At the end of the questions (21-10-2026) the person may ask anything before the closing film: what the assistant
   says then lives in lib/agent/call-time.ts, which the server also voices. */
/** The voice ring around the assistant: one bar per step, each with its own reach so the ring never moves as a block. */
const RING_BARS = Array.from({ length: 44 }, (_, index) => ({ index, reach: (.45 + .55 * Math.abs(Math.sin(index * 1.7 + .4))).toFixed(2) }));
/** A reply's own voice that will not be played: the rest of its stream is let go. */
const dropVoice = (voice?: Response) => { void voice?.body?.cancel().catch(() => undefined); };
/** The reply's own voice, when it says exactly what the screen shows; otherwise it is let go and the voice is asked for. */
function ownVoice(voice: Response | undefined, voiced: string | undefined, spoken: string) {
  if (voice && voiced === spoken) return voice;
  dropVoice(voice);
  return undefined;
}
/** How long the call rings before the hello. */
const RING_MS = 1800;
/* 23-10-2026 («le digo la fecha y no me entiende»): a pause to remember a date cut the answer to «fue el…».
   A date, a state or an answer in one's own words waits longer before it is sent; so does a doubt. */
const PATIENT_KINDS = ["date", "state", "text"];
const PATIENT_SILENCE_MS = 2500;
const DOUBT_SILENCE_MS = 2000;
/** How long a reply's text waits for its voice before it shows in full anyway. */
const VOICE_LATE_MS = 2500;
const clockOf = (ms: number) => { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; };

type Props = { film: RebuildFilm; nextFilm: RebuildFilm; initialSession: VisaIntakeSession | null; onSessionChange: (session: VisaIntakeSession) => void; onPhaseChange: (phase: Phase) => void; onContinue: () => void; visualTheme?: VisaVisualTheme; replayCompletion?: boolean; serviceId?: string; serviceName?: string; /** «Ya conozco mi caso»: the way back to the full guide, starting with the service's film. */ onWatchFilm?: () => void };
const emptySession = (): VisaIntakeSession => ({ watched: false, externalRef: newExternalRef(), answers: {}, messages: [], complete: false, field: null });

function Icon({ name, className }: { name: "play" | "pause" | "arrow" | "mic" | "send" | "volume" | "mute" | "close" | "check" | "lock" | "full" | "text" | "film" | "pin"; className?: string }) {
  const paths = { play: "m9 5 10 7-10 7Z", pause: "M8 5v14M16 5v14", arrow: "M4 12h16m-6-6 6 6-6 6", mic: "M9 6a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8", send: "m3 3 18 9-18 9 3-9Zm3 9h15", volume: "m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14", mute: "m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6", close: "m6 6 12 12M18 6 6 18", check: "m5 12 4 4L19 6", lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Zm7 5v2", full: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5", text: "M4 5h16v12H9l-5 4Zm4 4h8m-8 4h5", film: "M3 5h18v14H3Zm0 4h18M7 5v4m5-4v4m5-4v4", pin: "M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14ZM12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6" };
  return <svg className={className} viewBox="0 0 24 24" fill={name === "play" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={name === "pause" ? 3 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function Nucleus() {
  return <div className={s.nucleus} aria-hidden="true"><img src="/contygo/brand/logo-dark.png" alt="" draggable={false}/></div>;
}

export default function VisaJuvenilExperience({ film, nextFilm, initialSession, onSessionChange, onPhaseChange, onContinue, visualTheme = "lagoon", replayCompletion = false, serviceId = "visa-juvenil", serviceName = "Visa Juvenil", onWatchFilm }: Props) {
  const [session, setSession] = useState<VisaIntakeSession>(() => initialSession ?? emptySession());
  const sessionRef = useRef(session);
  const [phase, setPhase] = useState<Phase>(initialSession?.watched ? "interview" : "watch");
  const [busy, setBusy] = useState(false);
  const [journey, setJourney] = useState<"chat" | "gathering" | "reveal">(initialSession?.complete ? "reveal" : "chat");
  // Turnstile invisible del lead: se resuelve mientras la persona está en el paso de contacto (revelación).
  const leadCaptcha = useLeadCaptcha(phase === "interview" && journey !== "chat");
  const [error, setError] = useState("");
  /** The bot did not know the last doubt: WhatsApp right under its answer. */
  const [doubtHelp, setDoubtHelp] = useState(false);
  /** Hands-free voice (21-10-2026): after a silence with no answer, listening waits for a tap instead of looping. */
  const [listenPaused, setListenPaused] = useState(false);
  /** The call: when the assistant first spoke, and the clock it shows. */
  const [callStart, setCallStart] = useState<number | null>(null);
  const callStartRef = useRef<number | null>(null); callStartRef.current = callStart;
  /** Seconds since the assistant first spoke; the server leaves out the script's questions once the call's time is spent. */
  const elapsed = () => callStartRef.current === null ? 0 : Math.round((Date.now() - callStartRef.current) / 1000);
  /** The question the assistant asked again after an unclear answer: the next answer to it is the second try. */
  const retriedField = useRef<string | null>(null);
  /** Unclear answers in a row to the same question: from the second, a hint says it can be written. */
  const [retries, setRetries] = useState(0);
  const silenceFor = () => { const { field, question } = sessionRef.current; return !field ? DOUBT_SILENCE_MS : question && PATIENT_KINDS.includes(question.kind) ? PATIENT_SILENCE_MS : undefined; };
  const [clock, setClock] = useState(0);
  const fillerTurn = useRef(0);
  // A voice chat (21-10-2026): the person talks; typing is the small button beside the voice.
  const [mode, setMode] = useState<"text" | "voice">(replayCompletion ? "text" : "voice");
  const [previewDone, setPreviewDone] = useState(false);
  const [draft, setDraft] = useState("");
  const [speechId, setSpeechId] = useState<number | null>(null);
  /** The reply's voice has not started after a moment (no credit, a bad network): its text shows in full. */
  const [voiceLate, setVoiceLate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [departing, setDeparting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // While the first film loads (or runs out of buffer), the brand's wait instead of a grey box (28-10-2026).
  const filmWaiting = useVideoWaiting(videoRef, phase !== "interview" && Boolean(film.src));
  const videoShell = useRef<HTMLDivElement>(null);
  const interview = useRef<HTMLElement>(null);
  const orbTarget = useRef<HTMLDivElement>(null);
  const seed = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const bridge = useRef<HTMLDivElement>(null);
  const bridgeLight = useRef<HTMLDivElement>(null);
  const departure = useRef<HTMLDivElement>(null);
  const portalVideo = useRef<HTMLVideoElement>(null);
  const portalAtmosphere = useRef<HTMLDivElement>(null);
  const hasGathered = useRef(false);
  const completionSeed = useRef<HTMLDivElement>(null);
  const completionTimeline = useRef<gsap.core.Timeline | null>(null);
  const departureTimeline = useRef<gsap.core.Timeline | null>(null);
  const leaving = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const counter = useRef(initialSession?.messages.at(-1)?.id ?? 0);
  const request = useRef<AbortController | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const alive = useRef(true);
  const packPending = useRef(false);
  const opened = useRef(Boolean(initialSession?.messages.length || initialSession?.complete));
  const heldMessages = useRef<Message[]>([]);
  const heldField = useRef<string | null>(null);
  const processing = useRef(false);
  const lastAnswerAt = useRef(0);
  const voice = useVisaVoice();
  const guide = useGuide(voice);
  const voiceRef = useRef(voice); voiceRef.current = voice;
  useEffect(() => { setVoiceLate(false); }, [speechId]);
  useEffect(() => {
    if (voice.status !== "loading" || voiceLate) return;
    const timer = window.setTimeout(() => setVoiceLate(true), VOICE_LATE_MS);
    return () => window.clearTimeout(timer);
  }, [voice.status, voiceLate, speechId]);
  const updateSession = useCallback((next: VisaIntakeSession) => { sessionRef.current = next; setSession(next); onSessionChange(next); }, [onSessionChange]);
  const greeting = useRef<Promise<IntakeTurn> | null>(null);

  /** A turn of the call. `voiced` (the voice is on): the reply brings its own voice (lib/agent/voiced-reply.ts). */
  async function requestTurn(body: Record<string, unknown>, signal?: AbortSignal, voiced = false): Promise<{ data: IntakeTurn; voice?: Response }> {
    const response = await fetch("/api/agent/service-intake", { method: "POST", headers: { "Content-Type": "application/json", ...(voiced ? { [VOICED_REPLY_HEADER]: "1" } : {}) }, body: JSON.stringify({ serviceId, ...(sessionRef.current.quick ? { quick: true } : {}), ...body }), signal });
    if (!response.ok) throw new Error("request_failed");
    const reply = await readVoicedReply<IntakeTurn>(response);
    if (!reply.data.ok || !reply.data.message) { dropVoice(reply.voice); throw new Error("invalid_response"); }
    return reply;
  }
  /** El saludo (con la primera pregunta del catálogo) se pide mientras se ve el vídeo. */
  function loadGreeting() {
    if (!greeting.current) greeting.current = requestTurn({ answers: sessionRef.current.answers ?? {} }).then(reply => reply.data).catch(error => { greeting.current = null; throw error; });
    return greeting.current;
  }

  /** A short «A ver…» while the reply is on its way (voice chat only); the reply interrupts it. */
  function sayFiller() {
    if (mode !== "voice" || voiceRef.current.muted) return;
    setSpeechId(null);
    void voiceRef.current.speak(CALL_FILLERS[fillerTurn.current++ % CALL_FILLERS.length]);
  }
  async function ask(field?: string, answer?: string | boolean | string[], audio?: { data: string; mimeType: string }) {
    if (request.current || processing.current) return;
    if (field && field !== sessionRef.current.field) return;
    if(field&&Date.now()-lastAnswerAt.current<250)return;
    if(field)lastAnswerAt.current=Date.now();
    processing.current = true;
    heldMessages.current = showHistory ? sessionRef.current.messages : sessionRef.current.messages.slice(-1);
    heldField.current = sessionRef.current.field;
    if (!audio) microphoneRef.current?.cancel();
    setListenPaused(false);
    voiceRef.current.stop();
    voiceRef.current.unlock();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(""); setShowHistory(false);
    if (field) sayFiller();
    let snapshot = sessionRef.current;
    if (field && (answer !== undefined || audio)) {
      let label = audio ? "Respuesta por voz" : String(answer);
      if (typeof answer === "boolean") label = answer ? "Sí" : "No";
      const asked = sessionRef.current.question;
      if (typeof answer === "string" && asked?.id === field && asked.kind === "state") label = asked.options?.find(option => option.code === answer)?.label ?? (answer === "UNKNOWN" ? "Aún no tengo un estado definido" : answer);
      if (typeof answer === "string" && asked?.id === field && asked.kind === "choice") label = asked.options?.find(option => option.code === answer)?.label ?? answer;
      if (answer === "UNKNOWN" && asked?.id === field && asked.kind === "date") label = asked.unknownLabel ?? "No la sé";
      if (typeof answer === "string" && /^\d{4}-\d{2}-\d{2}$/.test(answer)) { const [year, month, day] = answer.split("-"); label = `${day}/${month}/${year}`; }
      snapshot = { ...snapshot, messages: [...snapshot.messages, { id: ++counter.current, role: "user", text: label }] };
      updateSession(snapshot);
    }
    try {
      // The closing is said with the same seconds the server was given, so its voice says what the screen shows.
      const sent = elapsed();
      const { data, voice } = await requestTurn({ answers: snapshot.answers, ...(field ? { field, retried: retriedField.current === field } : {}), ...(answer !== undefined ? { answer } : {}), ...(audio ? { audio } : {}), elapsed: sent }, controller.signal, !voiceRef.current.muted);
      if (!alive.current || controller.signal.aborted) { dropVoice(voice); return; }
      retriedField.current = field && data.field === field && !data.doubt ? field : null;
      setRetries(count => retriedField.current ? count + 1 : 0);
      const id = ++counter.current;
      // The answers, not model prose, decide whether the next video is available.
      const complete = data.complete && data.field === null;
      // A doubt instead of an answer: its reply comes first and the same question follows. Spoken, it reads as said.
      const doubt = data.doubt;
      if (doubt?.heard && audio) snapshot = { ...snapshot, messages: snapshot.messages.map((message, index, all) => index === all.length - 1 && message.role === "user" ? { ...message, text: doubt.heard } : message) };
      setDoubtHelp(Boolean(doubt && !doubt.covered));
      if (audio && !doubt?.heard && data.heard) snapshot = { ...snapshot, messages: snapshot.messages.map((message, index, all) => index === all.length - 1 && message.role === "user" ? { ...message, text: data.heard! } : message) };
      const spokenMessage = complete && !snapshot.doubtsDone ? closingSpeech(data, sent) : data.message;
      // What was just answered joins «Tu caso en resumen» (not a doubt, not a question let go).
      const answeredNow = field && !doubt && snapshot.question?.id === field && data.answers[field] !== undefined && data.answers[field] !== SKIPPED ? snapshot.question : null;
      const summary = answeredNow ? withAnswer(snapshot.summary, answeredNow, data.answers[field!]) : snapshot.summary;
      const next: VisaIntakeSession = { ...snapshot, summary, watched: true, answers: data.answers, messages: [...snapshot.messages, { id, role: "agent", text: spokenMessage }], complete, field: complete ? null : data.field, question: data.question, total: data.total, answered: data.answered, guidance: data.guidance ?? snapshot.guidance, eligible: data.eligible ?? snapshot.eligible, source: data.source, escalate: Boolean(data.escalate), unavailableOnline: data.unavailableOnline ?? snapshot.unavailableOnline, priority: data.priority ?? snapshot.priority, asylum: data.asylum ?? snapshot.asylum, hearing: data.hearing ?? snapshot.hearing };
      if(complete){heldMessages.current=next.messages.slice(-1);heldField.current=null;}
      // Reveal as soon as the response arrives. No extra overlay or exit wait.
      updateSession(next); setSpeechId(id); setDraft("");
      if (data.typeInstead) { microphoneRef.current?.cancel(); setMode("text"); window.requestAnimationFrame(() => textInput.current?.focus({ preventScroll: true })); }
      void voiceRef.current.speak(spokenMessage, { voiced: ownVoice(voice, data.speech, spokenMessage) });
    } catch {
      if (alive.current && !controller.signal.aborted) setError("No pudimos enviar esa respuesta. Sigue aquí; puedes volver a intentarlo.");
    } finally {
      if (request.current === controller) {
        request.current = null; processing.current = false;
        if (alive.current && !controller.signal.aborted) setBusy(false);
      }
    }
  }
  /** «¿Te queda alguna duda?»: each doubt, written or spoken, goes to /api/agent/service-doubt; the bot answers and asks again. */
  async function askDoubt(question?: string, audio?: { data: string; mimeType: string }) {
    if (request.current || processing.current || (!question && !audio)) return;
    processing.current = true;
    if (!audio) microphoneRef.current?.cancel();
    setListenPaused(false);
    voiceRef.current.stop();
    voiceRef.current.unlock();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(""); setDoubtHelp(false);
    sayFiller();
    let snapshot: VisaIntakeSession = { ...sessionRef.current, messages: [...sessionRef.current.messages, { id: ++counter.current, role: "user", text: question ?? "Pregunta por voz" }] };
    heldMessages.current = snapshot.messages.slice(-1);
    updateSession(snapshot);
    try {
      const sent = elapsed();
      const response = await fetch("/api/agent/service-doubt", { method: "POST", headers: { "Content-Type": "application/json", ...(voiceRef.current.muted ? {} : { [VOICED_REPLY_HEADER]: "1" }) }, body: JSON.stringify({ serviceId, elapsed: sent, ...(audio ? { audio } : { question }) }), signal: controller.signal });
      const { data, voice } = response.ok ? await readVoicedReply<{ ok?: boolean; speech?: string } & Partial<Doubt>>(response).catch(() => ({ data: null, voice: undefined })) : { data: null, voice: undefined };
      if (!data?.ok || typeof data.reply !== "string") { dropVoice(voice); throw new Error("doubt_failed"); }
      if (!alive.current || controller.signal.aborted) { dropVoice(voice); return; }
      if (audio && data.heard) snapshot = { ...snapshot, messages: snapshot.messages.map((message, index, all) => index === all.length - 1 ? { ...message, text: data.heard! } : message) };
      const id = ++counter.current;
      const { text, last } = doubtSpeech({ reply: data.reply, done: data.done }, sent);
      snapshot = { ...snapshot, messages: [...snapshot.messages, { id, role: "agent", text }] };
      heldMessages.current = snapshot.messages.slice(-1);
      updateSession(data.done || last ? { ...snapshot, doubtsDone: true } : snapshot); setSpeechId(id); setDraft(""); setDoubtHelp(!data.done && !last && !data.covered);
      void voiceRef.current.speak(text, { voiced: ownVoice(voice, data.speech, text) });
    } catch {
      if (alive.current && !controller.signal.aborted) setError("No pudimos enviar tu duda. Puedes intentarlo otra vez o escribirnos por WhatsApp.");
    } finally {
      if (request.current === controller) {
        request.current = null; processing.current = false;
        if (alive.current && !controller.signal.aborted) setBusy(false);
      }
    }
  }
  /** A typed doubt; «no» or «seguir» ends the doubts right away. */
  function typedDoubt(text: string) {
    if (NO_MORE_DOUBTS.test(text.trim())) { setDraft(""); finishDoubts(); return; }
    void askDoubt(text);
  }
  /** «No tengo dudas, seguir»: the chat closes into the next step (name, email and phone). */
  function finishDoubts() {
    voice.stop(); microphone.cancel(); setDoubtHelp(false); setError("");
    heldMessages.current = sessionRef.current.messages.slice(-1);
    updateSession({ ...sessionRef.current, doubtsDone: true });
  }
  const askRef = useRef(ask); askRef.current = ask;
  const askDoubtRef = useRef(askDoubt); askDoubtRef.current = askDoubt;
  const microphone = useVisaMicrophone(audio => {
    const { field, complete, doubtsDone } = sessionRef.current;
    if (field) void askRef.current(field, undefined, audio);
    else if (complete && !doubtsDone) void askDoubtRef.current(undefined, audio);
  });
  const microphoneRef = useRef(microphone); microphoneRef.current = microphone;


  async function beginConversation() {
    if (opened.current || !alive.current) return;
    opened.current = true;
    setBusy(true); setError("");
    try {
      // Like a call: it rings a moment («Llamando…») before the assistant says hello.
      const ringUntil = Date.now() + RING_MS;
      const data = await loadGreeting();
      if (Date.now() < ringUntil) await new Promise(resolve => window.setTimeout(resolve, ringUntil - Date.now()));
      if (!alive.current) return;
      const id = ++counter.current;
      const complete = data.complete && data.field === null;
      const spoken = complete && !sessionRef.current.doubtsDone ? closingSpeech(data, elapsed()) : data.message;
      const messages: Message[] = [{ id, role: "agent", text: spoken }];
      if (complete) { heldMessages.current = messages; heldField.current = null; }
      updateSession({ ...sessionRef.current, watched: true, answers: data.answers, messages, field: complete ? null : data.field, question: data.question, total: data.total, answered: data.answered, complete, guidance: data.guidance, eligible: data.eligible ?? null, escalate: Boolean(data.escalate), unavailableOnline: data.unavailableOnline, priority: data.priority, asylum: data.asylum, hearing: data.hearing });
      setSpeechId(id);
      void voiceRef.current.speak(spoken);
    } catch {
      if (!alive.current) return;
      opened.current = false;
      setError("No pudimos cargar las preguntas de tu servicio. Sigue aquí; puedes volver a intentarlo.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const beginRef = useRef(beginConversation); beginRef.current = beginConversation;

  useEffect(() => {
    alive.current = true;
    // Warm public scripts while the film plays. Two concurrent loads, no personal
    // data, and each next button can use the same already-decoded voice.
    let warming=true;
    const prewarm = window.setTimeout(() => {
      if(sessionRef.current.complete||replayCompletion)return;
      void loadGreeting().then(data=>{
        const scripts=[data.message,...(data.scripts??[]).filter(text=>text!==data.message)];
        const worker=async()=>{while(warming&&scripts.length){const text=scripts.shift();if(text)await voiceRef.current.prefetch(text);}};
        void worker();void worker();
      }).catch(()=>{});
    }, 0);
    // A gesture anywhere in the open experience unlocks audio without recording.
    const unlock = () => voiceRef.current.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      alive.current = false; warming=false; clearTimeout(prewarm); request.current?.abort(); request.current = null; timeline.current?.kill(); departureTimeline.current?.kill(); completionTimeline.current?.kill();
      window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock);
    };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !replayCompletion) return;
    const timer = window.setTimeout(() => {
      heldMessages.current = sessionRef.current.messages.slice(-1);
      heldField.current = sessionRef.current.field;
      setPreviewDone(true);
      updateSession({ ...sessionRef.current, complete: true, field: null });
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [replayCompletion, updateSession]);
  useEffect(() => { onPhaseChange(phase); }, [phase, onPhaseChange]);
  useLayoutEffect(() => { if (interview.current) interview.current.inert = phase !== "interview" || journey !== "chat"; }, [phase, journey]);
  useEffect(() => {
    if (phase !== "watch") return;
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => { if (alive.current) setAutoplayBlocked(true); });
    return () => el.pause();
  }, [phase]);
  useEffect(() => {
    if (phase === "interview" && !opened.current) beginRef.current();
  }, [phase]);
  useEffect(() => {
    if (showHistory) transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "auto" });
  }, [session.messages, busy, voice.progress, showHistory]);
  // A long answer follows the voice: the words being said stay in view.
  useEffect(() => {
    const box = transcript.current;
    if (!box || showHistory || voice.status !== "speaking") return;
    const room = box.scrollHeight - box.clientHeight;
    if (room > 0) box.scrollTop = room * Math.min(1, voice.progress);
  }, [voice.progress, voice.status, showHistory]);
  // Shown whole at once (writing, muted, or the voice late or gone): the end stays in view, because the question is
  // there; the beginning is a scroll up (28-10-2026).
  useEffect(() => {
    const box = transcript.current;
    if (!box || showHistory || busy) return;
    if (mode !== "text" && !voice.muted && !voiceLate && ["speaking", "loading"].includes(voice.status)) return;
    const frame = window.requestAnimationFrame(() => box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }));
    return () => window.cancelAnimationFrame(frame);
  }, [speechId, mode, voice.muted, voiceLate, voice.status, showHistory, busy]);
  useLayoutEffect(() => {
    if (session.complete && session.doubtsDone && phase === "interview" && journey === "chat" && !["speaking","loading"].includes(voice.status)) setJourney("gathering");
  }, [session.complete, session.doubtsDone, phase, journey, voice.status]);

  useLayoutEffect(() => {
    if (journey !== "gathering") return;
    hasGathered.current = true;
    const panel = interview.current, capsule = completionSeed.current, scene = root.current;
    if (!panel || !capsule || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setJourney("reveal"); return; }
    const bounds = scene.getBoundingClientRect();
    const destination = scene.querySelector("[data-journey-continue]")?.getBoundingClientRect();
    const composer = scene.querySelector(`.${s.voiceBar}`)?.getBoundingClientRect();
    const width = destination?.width ?? 326;
    const targetTop = destination ? destination.top - bounds.top : bounds.height * .63;
    const targetHeight = destination?.height ?? 65;
    gsap.set(capsule, { left:composer ? composer.left-bounds.left : bounds.width*.08, top:composer ? composer.top-bounds.top : bounds.height*.66, width:composer?.width ?? bounds.width*.84, height:composer?.height ?? 65, opacity:0, borderRadius:35 });
    const tl = gsap.timeline({ onComplete:() => { if(alive.current)setJourney("reveal"); } });
    completionTimeline.current = tl;
    tl.to(transcript.current, { opacity:0, y:65, scale:.82, filter:"blur(10px)", clipPath:"inset(45% 0% 45% 0%)", duration:.7, ease:"power3.inOut" }, 0)
      .to(panel.querySelector(`.${s.chatBrand}`), { opacity:0, y:35, scale:.9, duration:.45 }, .16)
      .to(panel.querySelector(`.${s.answerArea}`), { opacity:0, y:12, filter:"blur(7px)", duration:.4 }, .2)
      .to(capsule, { opacity:1, duration:.28 }, .25)
      .to(capsule, { left:bounds.width/2-39, top:targetTop-24, width:78, height:78, borderRadius:40, backgroundColor:"#25D366", duration:.55, ease:"power3.inOut" }, .35)
      .fromTo(capsule.querySelector("img"), {opacity:0,scale:.45}, {opacity:1,scale:1,duration:.3,ease:"back.out(1.4)"}, .65)
      .to(capsule, { left:destination ? destination.left-bounds.left : (bounds.width-width)/2, top:targetTop, width, height:targetHeight, duration:.5, ease:"power3.inOut" }, .92)
      .to(capsule.querySelector("img"), {opacity:0,scale:.6,duration:.2}, 1.08)
      .to(panel, {opacity:0,duration:.2}, 1.22);
    const settle = () => tl.progress(1);
    window.addEventListener("resize", settle, {once:true});
    return () => { tl.kill(); window.removeEventListener("resize",settle); gsap.set([panel,...Array.from(panel.querySelectorAll("[data-arrive], header"))],{clearProps:"transform,filter,opacity,clipPath"}); };
  }, [journey]);

  function finishVideo() {
    if (packPending.current || phase !== "watch") return;
    packPending.current = true;
    videoRef.current?.pause();
    updateSession({ ...sessionRef.current, watched: true });
    setPhase("packing");
  }

  useLayoutEffect(() => {
    if (phase !== "packing") return;
    const shell = videoShell.current, panel = interview.current, target = orbTarget.current, nucleus = seed.current, curtain = veil.current, scene = root.current, brand = bridge.current, light = bridgeLight.current;
    if (!shell || !panel || !target || !nucleus || !curtain || !scene || !brand || !light) { setPhase("interview"); return; }
    const complete = () => { if (alive.current) { setPhase("interview"); packPending.current = false; } };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { beginRef.current(); complete(); return; }
    const end = target.getBoundingClientRect(), bounds = scene.getBoundingClientRect();
    const x = end.left + end.width / 2 - (bounds.left + bounds.width / 2);
    const y = end.top + end.height / 2 - (bounds.top + bounds.height / 2);
    const stages = panel.querySelectorAll("[data-arrive]");
    const seam = scene.querySelector("[data-unfold-line]");
    gsap.set(panel, { visibility:"visible", opacity:1, clipPath:"inset(0% 0% 100% 0%)" });
    gsap.set(stages, { opacity:0, y:-24, filter:"blur(8px)" });
    gsap.set(target, { opacity:0 });
    gsap.set(nucleus, { opacity:0, scale:.92, filter:"blur(12px)", clipPath:"inset(0% 100% 0% 0%)" });
    gsap.set(brand, { opacity:0, y:12 });
    gsap.set(light, { opacity:0, y:"20%", scaleY:.25, transformOrigin:"50% 65%" });
    gsap.set(curtain, { opacity:1, clipPath:"inset(0% 0% 100% 0%)" });
    const tl = gsap.timeline({ onComplete:complete }); timeline.current = tl;
    const captions = scene.querySelector(`.${s.filmCaptions}`);
    if (captions) tl.to(captions, { opacity:0, y:10, duration:.35 }, 0);
    // The final frame closes into a light seam. The bloom reveals the brand,
    // then settles below the composer as the same logo moves into the chat.
    tl.to(shell, { clipPath:"inset(48% 8% 48% 8% round 80px)", scale:.98, filter:"blur(3px)", duration:.65, ease:"power3.inOut" }, 0)
      .to(shell, { opacity:0, scaleX:.65, duration:.32, ease:"power2.in" }, .4)
      .to(scene.querySelector(`.${s.filmAtmosphere}`), { opacity:0, duration:.6 }, .25)
      .to(light, { opacity:.95, y:"-12%", scaleY:1.05, duration:1.1, ease:"power3.out" }, .12)
      .to(nucleus, { opacity:1, scale:1, filter:"blur(0px)", clipPath:"inset(0% 0% 0% 0%)", duration:.8, ease:"power3.out" }, .5)
      .to(brand, { opacity:1, y:0, duration:.55 }, .8)
      .fromTo(brand.querySelector("i"), {scaleX:0}, {scaleX:1,duration:1.45,ease:"power1.inOut"}, .95)
      .to(brand, { opacity:0, y:-10, duration:.3 }, 2.3)
      .to(curtain, { clipPath:"inset(0% 0% 0% 0%)", duration:1.15, ease:"power3.inOut" }, 2.32)
      .to(panel, { clipPath:"inset(0% 0% 0% 0%)", duration:1.15, ease:"power3.inOut" }, 2.32)
      .to(light, { y:"19%", scaleY:.65, opacity:0, duration:1.1, ease:"power3.inOut" }, 2.25)
      .to(nucleus, { x, y, scale:end.width/240, duration:1, ease:"power3.inOut" }, 2.3)
      .fromTo(seam, {top:"0%",opacity:0}, {top:"100%",opacity:.35,duration:1.05,ease:"power3.inOut"},2.34)
      .to(stages, { opacity:1, y:0, filter:"blur(0px)", stagger:.1, duration:.7, ease:"power3.out" }, 2.65)
      .to(target, { opacity:1, duration:.2 }, 3.17)
      .to(nucleus, { opacity:0, duration:.2 }, 3.17)
      .to(seam, {opacity:0,duration:.25},3.42)
      .call(() => beginRef.current(), [], 3.07);
    const settle = () => { tl.progress(1); };
    window.addEventListener("resize", settle, { once:true });
    return () => { tl.kill(); window.removeEventListener("resize", settle); gsap.set([panel,target,...Array.from(stages)], { clearProps:"opacity,visibility,transform,filter,clipPath" }); };
  }, [phase]);

  /** Con nombre y teléfono, el lead entra en el tablero de ventas de contygo (PUT /leads/{externalRef}).
   *  Lleva el token del Turnstile invisible (acción «lead»); si no llega a tiempo sale sin él. Nunca detiene el recorrido. */
  function registerLead() {
    const { displayName, phone, email, answers } = sessionRef.current;
    if (!displayName?.trim() || !phone?.trim()) return;
    const externalRef = sessionRef.current.externalRef ?? newExternalRef();
    if (!sessionRef.current.externalRef) updateSession({ ...sessionRef.current, externalRef });
    const attribution = pageAttribution();
    void leadCaptcha.take().then(captchaToken => fetch("/api/contratar/lead", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ serviceId, externalRef, displayName, phone, ...(email?.trim() ? { email: email.trim() } : {}), answers, attribution, ...(captchaToken ? { captchaToken } : {}) }) })).catch(() => {});
  }

  function continueToFilm(button: HTMLButtonElement) {
    if (leaving.current || !sessionRef.current.complete) return;
    leaving.current = true;
    registerLead();
    voice.stop(); microphone.cancel(); setDeparting(true);
    const overlay = departure.current, scene = root.current;
    if (!overlay || !button || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onContinue(); return; }
    // The portal ends on the second film's own first frame (every one opens on this navy), so the film starts without a jump.
    const filmColor = "#081A39";
    const from = button.getBoundingClientRect(), bounds = scene.getBoundingClientRect();
    const portrait = bounds.width <= 900 && bounds.height > bounds.width;
    const filmWidth = portrait ? bounds.width : Math.min(bounds.width, (bounds.height-Math.min(200,Math.max(128,bounds.height*.18)))*16/9);
    const filmHeight=filmWidth*9/16, filmTop=(bounds.height-filmHeight)/2.45;
    const buttonX=from.left-bounds.left+from.width/2, buttonY=from.top-bounds.top+from.height/2;
    const filmCenterY=filmTop+filmHeight/2;
    gsap.set(overlay, {visibility:"visible",opacity:1,left:from.left-bounds.left,top:from.top-bounds.top,width:from.width,height:from.height,borderRadius:40,backgroundColor:"#25D366",boxShadow:"0 0 0px #25D36600"});
    gsap.set(portalVideo.current,{opacity:0,scale:1.16,clipPath:"circle(0% at 50% 50%)"});
    gsap.set(portalAtmosphere.current,{opacity:0});
    const tl = gsap.timeline({onComplete:()=>{
      if(!alive.current)return;
      // The next film is born where the portal ended, then glides to its own place (PaperPlaneClosing).
      const end=overlay.getBoundingClientRect();
      scene.closest("dialog")?.setAttribute("data-portal-from",JSON.stringify({x:end.left,y:end.top,w:end.width,h:end.height}));
      onContinue();
    }}); departureTimeline.current=tl;
    const invitation=scene.querySelector("[data-journey-reveal]");
    if(invitation)tl.to(invitation,{opacity:0,scale:1.025,filter:"blur(9px)",duration:.48,ease:"power2.in"},.06);
    tl.to(button,{scale:.96,duration:.12,ease:"power2.in"},0)
      .to(overlay,{left:buttonX-43,top:buttonY-43,width:86,height:86,borderRadius:43,duration:.42,ease:"power3.inOut"},.06)
      .fromTo(overlay.querySelector("[data-portal-symbol]"),{opacity:0,scale:.6},{opacity:1,scale:1,duration:.3,ease:"back.out(1.3)"},.27)
      .to(overlay,{left:bounds.width/2-43,top:filmCenterY-43,boxShadow:"0 18px 80px #25D36655",duration:.64,ease:"power3.inOut"},.43)
      .to(overlay,{left:(bounds.width-filmWidth)/2,top:filmTop,width:filmWidth,height:filmHeight,borderRadius:0,backgroundColor:filmColor,duration:.85,ease:"power4.inOut"},.98)
      .to(overlay.querySelector("[data-portal-symbol]"),{opacity:0,scale:.4,duration:.32},1.06)
      .to(portalVideo.current,{opacity:1,clipPath:"circle(75% at 50% 50%)",scale:1,duration:.76,ease:"power3.inOut"},1.1)
      .fromTo(overlay.querySelector("[data-portal-rim]"),{opacity:0},{opacity:1,duration:.2},1.05)
      .to(overlay.querySelector("[data-portal-rim]"),{opacity:0,duration:.28},1.62)
      .to(portalAtmosphere.current,{opacity:1,duration:.8},.8)
      .fromTo(overlay.querySelector("[data-portal-light]"),{opacity:0,scaleX:.2},{opacity:.8,scaleX:1,duration:.36},.86)
      .to(overlay.querySelector("[data-portal-light]"),{opacity:0,scaleY:2,duration:.4},1.15)
      .to(overlay,{boxShadow:"0 0 0px #25D36600",duration:.3},1.6);
  }

  function restartAnswers() {
    request.current?.abort(); request.current = null; processing.current = false; completionTimeline.current?.kill(); setJourney("chat"); voice.stop(); microphone.cancel();
    updateSession({ ...emptySession(), watched:true, displayName: sessionRef.current.displayName, phone: sessionRef.current.phone, email: sessionRef.current.email }); setBusy(false); setError(""); setDraft(""); setSpeechId(null); setShowHistory(false);
    opened.current = false; beginRef.current();
  }
  const field = session.complete ? heldField.current : session.field;
  const question = session.question && session.question.id === field ? session.question : null;
  const answered = session.answered ?? Object.keys(session.answers).length;
  const totalQuestions = session.total ?? 0;
  // A hands-free recording does not lock the buttons: tapping «Sí» while it listens answers and closes it.
  const locked = busy || departing || (replayCompletion && !previewDone) || (microphone.status === "recording" && !microphone.listening) || microphone.status === "processing";
  const escalated = Boolean(question?.kind === "unknown" || (session.escalate && !session.complete));
  // «Como una llamada» (21-10-2026): with voice chosen, the microphone opens by itself once the bot has finished speaking,
  // and the answer goes when the person stops talking. After a silence with no answer it waits for a tap.
  const awaiting = mode === "voice" && phase === "interview" && journey === "chat" && !busy && !departing && !listenPaused && !escalated
    && Boolean(session.field || (session.complete && !session.doubtsDone)) && !["speaking", "loading"].includes(voice.status) && microphone.status === "idle";
  useEffect(() => {
    if (phase === "interview" && session.messages.length && callStart === null) setCallStart(Date.now());
  }, [phase, session.messages.length, callStart]);
  useEffect(() => {
    if (callStart === null || journey !== "chat") return;
    const tick = () => setClock(Date.now() - callStart);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [callStart, journey]);
  useEffect(() => {
    if (!awaiting) return;
    const timer = window.setTimeout(() => void microphoneRef.current.start({ auto: true, context: voiceRef.current.audioContext(), onNoSpeech: () => setListenPaused(true), silenceMs: silenceFor() }), 400);
    return () => window.clearTimeout(timer);
  }, [awaiting]);
  const helpLink = waLink(whatsappHelpMessage(serviceName, publicRef(session.externalRef ?? "")));
  const speaking = voice.status === "speaking";
  const messages = busy || session.complete ? heldMessages.current : showHistory ? session.messages : session.messages.slice(-1);
  function textFor(message: Message) {
    // Writing, the reply is read at once; spoken, the words follow the voice, unless the voice is late or fails (28-10-2026).
    if (message.id !== speechId || message.role !== "agent" || voice.muted || mode === "text" || voiceLate || !["speaking","loading"].includes(voice.status)) return message.text;
    if (voice.status === "loading") return "…";
    const words = message.text.split(/\s+/);
    return words.slice(0, Math.max(1, Math.ceil(words.length * Math.min(1, voice.progress + .035)))).join(" ");
  }

  function revealText(message: Message) {
    return textFor(message).split(/(\s+)/).map((part, index) => /\s+/.test(part)
      ? part
      : <span key={`${message.id}-${index}`} className={s.spokenWord}>{part}</span>);
  }

  /** In «¿Te queda alguna duda?»: the questions are done and the person has not said «No tengo dudas, seguir». */
  const inDoubts = phase === "interview" && journey === "chat" && session.complete && !session.doubtsDone;
  /* The voice chat (21-10-2026): one big button tells what is happening and does the obvious thing when touched. */
  const orbState: "speaking" | "listening" | "thinking" | "idle" = busy || microphone.status === "processing" ? "thinking"
    : microphone.status === "recording" ? "listening"
    : ["speaking", "loading"].includes(voice.status) && !voice.muted ? "speaking" : "idle";
  const orbLabel = orbState === "thinking" ? "Pensando…"
    : orbState === "speaking" ? "Hablando"
    : orbState === "listening" ? microphone.listening ? "Te escucho" : "Te escucho. Toca «Enviar» cuando termines"
    : listenPaused ? "No te escuché. Toca para hablar"
    : mode === "text" ? "Toca para hablar, o escribe abajo" : "Toca para hablar";
  function orbTap() {
    voice.unlock();
    if (orbState === "speaking") { voice.stop(); setMode("voice"); return; }
    if (orbState === "listening") { microphone.stop(); return; }
    if (orbState === "thinking") return;
    setMode("voice"); setListenPaused(false);
    void microphone.start({ auto: true, context: voice.audioContext(), onNoSpeech: () => setListenPaused(true), silenceMs: silenceFor() });
  }
  function toggleTyping() {
    voice.unlock();
    if (mode === "text") { setMode("voice"); setListenPaused(false); return; }
    microphone.cancel(); setMode("text");
    window.requestAnimationFrame(() => textInput.current?.focus({ preventScroll: true }));
  }
  /** The assistant on the call: the ContyGo mark, and around it a ring of bars that moves with whoever is talking. */
  const level = orbState === "listening" ? microphone.level : orbState === "speaking" ? voice.level : 0;
  const ringing = phase === "interview" && !session.messages.length;
  const caller = <div className={s.caller} data-state={ringing ? "ringing" : orbState} style={{ "--level": Math.min(1, level * 1.6).toFixed(3) } as CSSProperties}>
    <div className={s.callerRing} aria-hidden="true">{RING_BARS.map(bar => <i key={bar.index} style={{ "--i": bar.index, "--reach": bar.reach } as CSSProperties}/>)}</div>
    <div ref={orbTarget} className={s.callerFace}><img src="/contygo/brand/symbol-dark.png" alt=""/></div>
  </div>;
  const mainAction = orbState === "listening" ? "Enviar" : orbState === "speaking" ? "Interrumpir" : orbState === "thinking" ? "Un momento" : "Hablar";
  const voiceBar = <div className={s.voiceBar}>
    <button type="button" className={s.barButton} aria-pressed={mode === "text"} onClick={toggleTyping}><i><Icon name={mode === "text" ? "close" : "text"}/></i>{mode === "text" ? "Cerrar" : "Escribir"}</button>
    <button type="button" className={s.barButton} data-main data-state={orbState} disabled={orbState === "thinking"} onClick={orbTap}><i>{orbState === "thinking" ? <span className={s.orbDots} aria-hidden="true"><i/><i/><i/></span> : orbState === "listening" ? <span className={s.stopMark} aria-hidden="true"/> : <Icon name="mic"/>}</i>{mainAction}</button>
    <button type="button" className={s.barButton} aria-pressed={voice.muted} onClick={voice.toggleMute}><i><Icon name={voice.muted ? "mute" : "volume"}/></i>{voice.muted ? "Activar voz" : "Silenciar"}</button>
  </div>;
  /* Answers to tap (28-10-2026): the options of the question in course, in voice and in writing, so nobody has to say
     or type them exactly («no te entendí»). Up to six options are buttons; a longer list (countries, states) is the
     phone's own picker; a date opens the calendar. Free answers in one's own words have none. */
  const inChat = phase === "interview" && journey === "chat" && Boolean(field || inDoubts) && session.messages.some(message => message.role === "agent") && !escalated;
  const asked = !session.complete && field && session.question?.id === field && inChat ? session.question : null;
  // A tap answers even while the microphone listens or is still closing: it cancels the recording (ask does).
  const tapLocked = busy || departing || (replayCompletion && !previewDone);
  function tap(value: string | boolean) { if (!asked || tapLocked) return; voice.unlock(); void ask(asked.id, value); }
  const today = new Date().toISOString().slice(0, 10);
  const pick = (options: { code: string; label: string }[], prompt: string) => <label className={s.answerPick}>
    <span>{prompt}</span><Icon name="arrow"/>
    <select value="" disabled={tapLocked} aria-label={prompt} onChange={event => { if (event.target.value) tap(event.target.value); }}>
      <option value="" disabled>{prompt}</option>
      {options.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
    </select>
  </label>;
  const answers = !asked ? null
    : asked.kind === "yesno" ? <><button type="button" disabled={tapLocked} onClick={() => tap(true)}>Sí</button><button type="button" disabled={tapLocked} onClick={() => tap(false)}>No</button></>
    : asked.kind === "choice" && asked.options?.length ? asked.options.length <= 6
      ? asked.options.map(option => <button key={option.code} type="button" disabled={tapLocked} onClick={() => tap(option.code)}>{option.label}</button>)
      : pick(asked.options, "Elegir de la lista")
    : asked.kind === "state" && asked.options?.length ? <>{pick(asked.options, "Elegir el estado")}{asked.allowUnknown && <button type="button" disabled={tapLocked} onClick={() => tap("UNKNOWN")}>Aún no lo sé</button>}</>
    : asked.kind === "date" ? <><label className={s.answerPick}><span>Elegir la fecha</span><Icon name="arrow"/>
        <input type="date" disabled={tapLocked} aria-label="Elegir la fecha" {...(asked.dateMode === "future_event" ? { min: today } : { max: today })} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) tap(event.target.value); }}/>
      </label>{asked.allowUnknown && <button type="button" disabled={tapLocked} onClick={() => tap("UNKNOWN")}>{asked.unknownLabel ?? "No la sé"}</button>}</>
    : null;
  const typing = (send: (text: string) => void, placeholder: string) => <form className={s.voiceType} onSubmit={event => { event.preventDefault(); if (draft.trim() && !locked) send(draft.trim()); }}>
    <input ref={textInput} aria-label={placeholder} maxLength={1000} placeholder={busy ? "Un momento…" : placeholder} value={draft} disabled={locked} onChange={event => setDraft(event.target.value)}/>
    <button type="submit" disabled={locked || !draft.trim()} aria-label="Enviar"><Icon name="send"/></button>
  </form>;
  /** What the person said last: under the assistant's words while it thinks, above its reply once it answers. */
  const lastAgent = session.messages.map(message => message.role).lastIndexOf("agent");
  const youSaid = showHistory ? null : busy ? (session.messages.at(-1)?.role === "user" ? session.messages.at(-1)!.text : null)
    : lastAgent > 0 && session.messages[lastAgent - 1].role === "user" ? session.messages[lastAgent - 1].text : null;

  return <div ref={root} className={s.experience} data-phase={phase} data-journey={journey} data-voice-state={voice.status} data-voice-progress={voice.progress.toFixed(3)} data-voice-muted={voice.muted} data-visual-theme={visualTheme} data-complete={session.complete} data-film-captions={Boolean(film.captions)}>
    {/* Kept for the packing timeline; the journey backdrop (JourneyBackdrop) draws the atmosphere. */}
    {phase !== "interview" && <div className={s.filmAtmosphere} aria-hidden="true"/>}
    <div ref={veil} className={s.revealVeil} aria-hidden="true">{phase!=="watch"&&<LiquidGlow className={s.chatLiquid} level={voice.muted ? 0 : voice.level} intensity={.85}/>}</div>
    {/* No poster (29-10-2026): every first film opens on the brand's navy, which the shell already shows, so the route
        card folds into it and the film starts without a photo flashing in between. */}
    {phase !== "interview" && <div className={s.watch}>
      <div ref={videoShell} className={s.videoShell}>
        {film.src && <video ref={videoRef} src={film.src} autoPlay playsInline preload="auto" controls={false} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture disableRemotePlayback tabIndex={-1} aria-label={`Video introductorio de ${serviceName}`} onEnded={finishVideo} onError={()=>setVideoFailed(true)} onPlay={()=>setAutoplayBlocked(false)} onPause={event=>{if(phase==="watch"&&!packPending.current&&!event.currentTarget.ended&&!event.currentTarget.closest("dialog")?.hasAttribute("data-closing"))setAutoplayBlocked(true);}} onContextMenu={event=>event.preventDefault()}>
          {film.captions&&<track data-external-captions default ref={element=>{if(element)element.track.mode="hidden";}} kind="captions" src={film.captions} srcLang="es" label="Español"/>}
        </video>}
        {filmWaiting&&!videoFailed&&<BrandLoader label="Cargando el vídeo"/>}
      </div>
      {film.captions&&<div className={s.filmCaptions} data-film-captions><ExternalVideoCaptions videoRef={videoRef} src={film.captions}/></div>}
      {film.src&&phase==="watch"&&!videoFailed&&<FilmControls video={videoRef} onSkip={()=>{voice.unlock();finishVideo();}} notice={LOTTERY_PAUSED&&serviceId==="loteria-dv-2027"?LOTTERY_FILM_NOTICE:undefined}/>}
      {autoplayBlocked&&!videoFailed&&phase==="watch"&&<button className={s.startVideo} type="button" onClick={()=>{voice.unlock();void videoRef.current?.play().catch(()=>setAutoplayBlocked(true));}}><Icon name="play"/>{(videoRef.current?.currentTime??0)>0?"Continuar vídeo":"Comenzar"}</button>}
      {videoFailed&&phase==="watch"&&<div className={s.videoError}><p>No se pudo cargar el vídeo.</p><button type="button" onClick={()=>{setVideoFailed(false);videoRef.current?.load();void videoRef.current?.play().catch(()=>setAutoplayBlocked(true));}}>Reintentar</button><button type="button" onClick={()=>{voice.unlock();finishVideo();}}>Continuar a las preguntas</button></div>}
      {!film.src&&phase==="watch"&&<div className={shared.notice}><img src="/contygo/brand/logo-dark.png" alt="ContyGo"/><h3>{serviceName}</h3><p>La presentación en vídeo estará disponible próximamente. Puedes comenzar con unas preguntas breves sobre tu servicio.</p><button type="button" onClick={finishVideo}>Comenzar <span aria-hidden="true">→</span></button></div>}
      <div ref={bridgeLight} className={s.bridgeLight} aria-hidden="true"><LiquidGlow className={s.bridgeLiquid}/></div>
      <div ref={seed} className={s.morphSeed}><Nucleus/></div>
      <div ref={bridge} className={s.brandBridge} aria-hidden="true"><p>Siempre contigo. <strong>Paso a paso.</strong></p><span><i/></span></div>

    </div>}

    <section ref={interview} className={s.interview} data-thinking={busy} aria-busy={busy} aria-hidden={phase!=="interview"||journey!=="chat"} aria-label="Orientación inicial con el asistente de ContyGo">
      <header className={s.chatBrand}><p className={s.callTitle}>Asistente de ContyGo</p><p className={s.callClock} aria-live="off">{session.messages.length ? clockOf(clock) : "Llamando…"}</p>{asked&&totalQuestions>0&&<p className={s.callStep}>Pregunta {Math.min(answered + 1, totalQuestions)} de {totalQuestions}<i aria-hidden="true"><b style={{ width: `${Math.round(Math.min(answered, totalQuestions) / totalQuestions * 100)}%` }}/></i></p>}</header>
      <div className={s.conversation} data-busy={busy}>
        <span className={s.srOnly} role="status">{answered} de {totalQuestions} respuestas completadas</span>
        {caller}
        {inChat&&<p className={s.voiceStatus} role="status" aria-live="polite">{orbLabel}</p>}
        {inChat&&mode==="voice"&&retries>=2&&session.field&&<p className={s.retryHint}>¿No te entiende? Toca «Escribir» y escríbelo.</p>}
        <div ref={transcript} className={s.transcript} data-history={showHistory} role="log" aria-label="Conversación con ContyGo" aria-live="polite" aria-relevant="additions" data-arrive>
          {!busy&&youSaid&&<p className={s.youSaid}><span>Tú</span>{youSaid}</p>}
          {messages.map(message=><div key={message.id} className={message.role==="agent"?s.agentMessage:s.userMessage}><p><span className={s.srOnly}>{message.text}</span><span className={s.messageMeasure} aria-hidden="true">{message.text}</span><span className={s.messageWords} aria-hidden="true">{revealText(message)}{message.id===speechId&&speaking&&voice.progress<.98&&<span className={s.cursor}/>}</span></p></div>)}
          {busy&&youSaid&&<p className={s.youSaid}><span>Tú</span>{youSaid}</p>}
        </div>
        {journey!=="reveal"&&<div className={s.answerArea} data-arrive>
          {answers&&<div className={s.answers} role="group" aria-label="Toca tu respuesta">{answers}</div>}
          {inChat&&mode==="text"&&typing(field ? text=>void ask(field,text) : text=>void typedDoubt(text), field ? "Escribe tu respuesta o tu duda" : "Escribe tu duda")}
          {inDoubts&&<button type="button" className={s.doubtsDone} disabled={busy} onClick={finishDoubts}>No tengo dudas, seguir</button>}
          {inChat&&session.quick&&onWatchFilm&&<button type="button" className={s.watchFilm} disabled={busy} onClick={()=>{voice.stop();microphone.cancel();onWatchFilm();}}>Prefiero ver el vídeo del servicio</button>}
          {escalated&&<div className={s.escalate} role="status"><span>Para este servicio te ayudamos por WhatsApp.</span><a href={helpLink} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a></div>}
          {doubtHelp&&<a className={s.doubtHelp} href={helpLink} target="_blank" rel="noopener noreferrer">Preguntar a un asesor por WhatsApp</a>}
          {inChat&&voiceBar}
        </div>}
        {error&&<div className={s.notice} role="alert"><p>{error}</p>{!inDoubts&&<button type="button" onClick={()=>{setError("");void ask();}}>Recuperar pregunta</button>}<a href={helpLink} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a></div>}
        {microphone.error&&<p className={s.notice} role="status">{microphone.error} Puedes responder por escrito.</p>}
        {(voice.status==="blocked"||voice.status==="unavailable")&&<div className={s.audioNotice} role="status"><Icon name="volume"/><span>{voice.status==="blocked"?"Activa el audio para escucharme.":"Puedes seguir leyendo mientras recuperamos la voz."}</span><button type="button" onClick={()=>{voice.unlock();voice.retry();}}>{voice.status==="blocked"?"Activar voz":"Reintentar voz"}</button></div>}
        {session.messages.length>1&&!session.complete&&<button type="button" className={s.historyButton} disabled={busy} onClick={()=>setShowHistory(!showHistory)} aria-expanded={showHistory}>{showHistory?"Volver a la pregunta":"Ver conversación"}</button>}
      </div>
    </section>
    {journey==="gathering"&&<div ref={completionSeed} className={s.completionSeed} aria-hidden="true"><img src="/contygo/brand/symbol-light.png" alt=""/></div>}
    {phase==="interview"&&journey!=="chat"&&<VisaJourneyReveal serviceName={serviceName} summary={session.summary} eligible={session.eligible} unavailableOnline={Boolean(session.unavailableOnline || session.escalate)} helpHref={helpLink} displayName={session.displayName} onDisplayNameChange={displayName=>updateSession({...sessionRef.current,displayName})} phone={session.phone} onPhoneChange={phone=>updateSession({...sessionRef.current,phone})} email={session.email} onEmailChange={email=>updateSession({...sessionRef.current,email})} guidance={session.guidance} onContinue={continueToFilm} onEdit={restartAnswers} departing={departing} pending={journey==="gathering"} fromChat={hasGathered.current} guide={guide}/>}
    {phase==="interview"&&journey!=="chat"&&<div ref={leadCaptcha.container} className={s.leadCaptcha}/>}
    <div className={s.unfoldLine} data-unfold-line aria-hidden="true"/>
    <div ref={portalAtmosphere} className={s.portalAtmosphere} aria-hidden="true">{journey!=="chat"&&<>
      <div className={s.portalGlowTop}><LiquidGlow className={s.portalGlowSurface} intensity={.78}/></div>
      <div className={s.portalGlowBottom}><LiquidGlow className={s.portalGlowSurface} intensity={.9}/></div>
    </>}</div>
    <div ref={departure} className={s.departure} aria-hidden="true">
      {journey!=="chat"&&<video ref={portalVideo} data-portal-video src={nextFilm.src??undefined} poster={nextFilm.poster} preload="auto" muted playsInline tabIndex={-1}/>}
      <span className={s.portalLight} data-portal-light/>
      <img className={s.portalSymbol} data-portal-symbol src="/contygo/brand/symbol-light.png" alt=""/>
      <span className={s.portalRim} data-portal-rim/>
    </div>
  </div>;
}
