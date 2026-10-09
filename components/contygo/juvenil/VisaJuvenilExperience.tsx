"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { RebuildFilm } from "@/lib/contygo-rebuild-media";
import { useVisaVoice, useVisaMicrophone } from "./useVisaVoice";
import type { VisaVisualTheme } from "./BrandLiquidSurface";
import { LiquidGlow } from "./ThinkingOverlay";
import VisaJourneyReveal from "./VisaJourneyReveal";
import VisaStatePicker from "./VisaStatePicker";
import { waLink } from "@/lib/config";
import { whatsappHelpMessage } from "@/lib/contygo-api/messages";
import { publicRef } from "@/lib/contygo-api/checkout";
import { useGuide } from "../guide/useGuide";
import LiquidGlassPlate from "./LiquidGlassPlate";
import ExternalVideoCaptions from "./ExternalVideoCaptions";
import type { IntakeQuestion, JourneyGuidance, ServiceAnswers } from "@/lib/agent/service-intake";
import { newExternalRef, pageAttribution } from "@/lib/contygo-api/browser";
import { useLeadCaptcha } from "./useLeadCaptcha";
import shared from "../rebuild/ServiceIntroFilm.module.css";
import s from "./VisaJuvenilExperience.module.css";

type Phase = "watch" | "packing" | "interview";
type Message = { id: number; role: "agent" | "user"; text: string };
// Las preguntas son las del catálogo de contygo: llegan del servidor (/api/agent/service-intake) con su tipo.
// Visa Juvenil antepone su entrevista original (claves «visa.»), que el servidor mezcla con las del catálogo.
// La conversación vive en este navegador (guía §2 bis): externalRef la identifica ante contygo (lead y alta).
export type VisaIntakeSession = { watched: boolean; externalRef?: string; displayName?: string; phone?: string; answers: ServiceAnswers; messages: Message[]; complete: boolean; field: string | null; question?: IntakeQuestion | null; total?: number; guidance?: JourneyGuidance; eligible?: boolean | null; source?: "gemini" | "guided"; escalate?: boolean; unavailableOnline?: boolean };
type IntakeTurn = { ok: true; answers: ServiceAnswers; field: string | null; question: IntakeQuestion | null; total: number; complete: boolean; message: string; source?: "gemini" | "guided"; guidance?: JourneyGuidance; eligible?: boolean | null; scripts?: string[]; escalate?: boolean; unavailableOnline?: boolean };

/** Hint under a future_event date. The shape of minNotice is not documented yet, so it is read defensively: no hint is better than a wrong one. */
function noticeHint(minNotice: IntakeQuestion["minNotice"]): string | null {
  if (!minNotice) return null;
  const message = minNotice.message;
  if (message && typeof message === "object" && typeof (message as { es?: unknown }).es === "string") return (message as { es: string }).es;
  const days = typeof minNotice.days === "number" ? minNotice.days : typeof minNotice.minDays === "number" ? minNotice.minDays : null;
  if (days && days > 0) return `Debe faltar al menos ${days} ${days === 1 ? "día" : "días"} para esa fecha.`;
  return "Esta fecha necesita cierta anticipación; la revisamos con lo que nos cuentas.";
}
type Props = { film: RebuildFilm; nextFilm: RebuildFilm; initialSession: VisaIntakeSession | null; onSessionChange: (session: VisaIntakeSession) => void; onPhaseChange: (phase: Phase) => void; onContinue: () => void; visualTheme?: VisaVisualTheme; replayCompletion?: boolean; serviceId?: string; serviceName?: string };
const emptySession = (): VisaIntakeSession => ({ watched: false, externalRef: newExternalRef(), answers: {}, messages: [], complete: false, field: null });

function Icon({ name, className }: { name: "play" | "pause" | "arrow" | "mic" | "send" | "volume" | "mute" | "close" | "check" | "lock" | "full" | "text" | "film" | "pin"; className?: string }) {
  const paths = { play: "m9 5 10 7-10 7Z", pause: "M8 5v14M16 5v14", arrow: "M4 12h16m-6-6 6 6-6 6", mic: "M9 6a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8", send: "m3 3 18 9-18 9 3-9Zm3 9h15", volume: "m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14", mute: "m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6", close: "m6 6 12 12M18 6 6 18", check: "m5 12 4 4L19 6", lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Zm7 5v2", full: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5", text: "M4 5h16v12H9l-5 4Zm4 4h8m-8 4h5", film: "M3 5h18v14H3Zm0 4h18M7 5v4m5-4v4m5-4v4", pin: "M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14ZM12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6" };
  return <svg className={className} viewBox="0 0 24 24" fill={name === "play" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={name === "pause" ? 3 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function Nucleus() {
  return <div className={s.nucleus} aria-hidden="true"><img src="/contygo/brand/logo-dark.png" alt="" draggable={false}/></div>;
}

export default function VisaJuvenilExperience({ film, nextFilm, initialSession, onSessionChange, onPhaseChange, onContinue, visualTheme = "lagoon", replayCompletion = false, serviceId = "visa-juvenil", serviceName = "Visa Juvenil" }: Props) {
  const [session, setSession] = useState<VisaIntakeSession>(() => initialSession ?? emptySession());
  const sessionRef = useRef(session);
  const [phase, setPhase] = useState<Phase>(initialSession?.watched ? "interview" : "watch");
  const [busy, setBusy] = useState(false);
  const [journey, setJourney] = useState<"chat" | "gathering" | "reveal">(initialSession?.complete ? "reveal" : "chat");
  // Turnstile invisible del lead: se resuelve mientras la persona está en el paso de contacto (revelación).
  const leadCaptcha = useLeadCaptcha(phase === "interview" && journey !== "chat");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"text" | "voice" | null>(replayCompletion ? "text" : null);
  const [previewDone, setPreviewDone] = useState(false);
  const [draft, setDraft] = useState("");
  const [statePicker, setStatePicker] = useState(false);
  const [speechId, setSpeechId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [departing, setDeparting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const updateSession = useCallback((next: VisaIntakeSession) => { sessionRef.current = next; setSession(next); onSessionChange(next); }, [onSessionChange]);
  const greeting = useRef<Promise<IntakeTurn> | null>(null);

  async function requestTurn(body: Record<string, unknown>, signal?: AbortSignal): Promise<IntakeTurn> {
    const response = await fetch("/api/agent/service-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, ...body }), signal });
    if (!response.ok) throw new Error("request_failed");
    const data = await response.json() as IntakeTurn;
    if (!data.ok || !data.message) throw new Error("invalid_response");
    return data;
  }
  /** El saludo (con la primera pregunta del catálogo) se pide mientras se ve el vídeo. */
  function loadGreeting() {
    if (!greeting.current) greeting.current = requestTurn({ answers: {} }).catch(error => { greeting.current = null; throw error; });
    return greeting.current;
  }

  async function ask(field?: string, answer?: string | boolean | string[], audio?: { data: string; mimeType: string }) {
    if (request.current || processing.current) return;
    if (field && field !== sessionRef.current.field) return;
    if(field&&Date.now()-lastAnswerAt.current<250)return;
    if(field)lastAnswerAt.current=Date.now();
    processing.current = true;
    heldMessages.current = showHistory ? sessionRef.current.messages : sessionRef.current.messages.slice(-1);
    heldField.current = sessionRef.current.field;
    voiceRef.current.stop();
    voiceRef.current.unlock();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(""); setShowHistory(false);
    let snapshot = sessionRef.current;
    if (field && (answer !== undefined || audio)) {
      let label = audio ? "Respuesta por voz" : String(answer);
      if (typeof answer === "boolean") label = answer ? "Sí" : "No";
      const asked = sessionRef.current.question;
      if (typeof answer === "string" && asked?.id === field && asked.kind === "state") label = asked.options?.find(option => option.code === answer)?.label ?? (answer === "UNKNOWN" ? "Aún no tengo un estado definido" : answer);
      if (typeof answer === "string" && /^\d{4}-\d{2}-\d{2}$/.test(answer)) { const [year, month, day] = answer.split("-"); label = `${day}/${month}/${year}`; }
      snapshot = { ...snapshot, messages: [...snapshot.messages, { id: ++counter.current, role: "user", text: label }] };
      updateSession(snapshot);
    }
    try {
      const data = await requestTurn({ answers: snapshot.answers, ...(field ? { field } : {}), ...(answer !== undefined ? { answer } : {}), ...(audio ? { audio } : {}) }, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      const id = ++counter.current;
      // The answers, not model prose, decide whether the next video is available.
      const complete = data.complete && data.field === null;
      const spokenMessage = data.message;
      const next: VisaIntakeSession = { ...snapshot, watched: true, answers: data.answers, messages: [...snapshot.messages, { id, role: "agent", text: spokenMessage }], complete, field: complete ? null : data.field, question: data.question, total: data.total, guidance: data.guidance ?? snapshot.guidance, eligible: data.eligible ?? snapshot.eligible, source: data.source, escalate: Boolean(data.escalate), unavailableOnline: data.unavailableOnline ?? snapshot.unavailableOnline };
      if(complete){heldMessages.current=next.messages.slice(-1);heldField.current=null;}
      // Reveal as soon as the response arrives. No extra overlay or exit wait.
      updateSession(next); setSpeechId(id); setDraft("");
      void voiceRef.current.speak(spokenMessage);
    } catch {
      if (alive.current && !controller.signal.aborted) setError("No pudimos enviar esa respuesta. Sigue aquí; puedes volver a intentarlo.");
    } finally {
      if (request.current === controller) {
        request.current = null; processing.current = false;
        if (alive.current && !controller.signal.aborted) setBusy(false);
      }
    }
  }
  const askRef = useRef(ask); askRef.current = ask;
  const microphone = useVisaMicrophone(audio => { const field = sessionRef.current.field; if (field) void askRef.current(field, undefined, audio); });


  async function beginConversation() {
    if (opened.current || !alive.current) return;
    opened.current = true;
    setBusy(true); setError("");
    try {
      const data = await loadGreeting();
      if (!alive.current) return;
      const id = ++counter.current;
      const complete = data.complete && data.field === null;
      const messages: Message[] = [{ id, role: "agent", text: data.message }];
      if (complete) { heldMessages.current = messages; heldField.current = null; }
      updateSession({ ...sessionRef.current, watched: true, answers: data.answers, messages, field: complete ? null : data.field, question: data.question, total: data.total, complete, guidance: data.guidance, eligible: data.eligible ?? null, escalate: Boolean(data.escalate), unavailableOnline: data.unavailableOnline });
      setSpeechId(id);
      void voiceRef.current.speak(data.message);
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
  useLayoutEffect(() => {
    if (session.complete && phase === "interview" && journey === "chat" && !["speaking","loading"].includes(voice.status)) setJourney("gathering");
  }, [session.complete, phase, journey, voice.status]);

  useLayoutEffect(() => {
    if (journey !== "gathering") return;
    hasGathered.current = true;
    const panel = interview.current, capsule = completionSeed.current, scene = root.current;
    if (!panel || !capsule || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setJourney("reveal"); return; }
    const bounds = scene.getBoundingClientRect();
    const destination = scene.querySelector("[data-journey-continue]")?.getBoundingClientRect();
    const composer = scene.querySelector(`.${s.composer}`)?.getBoundingClientRect();
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
    const { displayName, phone, answers } = sessionRef.current;
    if (!displayName?.trim() || !phone?.trim()) return;
    const externalRef = sessionRef.current.externalRef ?? newExternalRef();
    if (!sessionRef.current.externalRef) updateSession({ ...sessionRef.current, externalRef });
    const attribution = pageAttribution();
    void leadCaptcha.take().then(captchaToken => fetch("/api/contratar/lead", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ serviceId, externalRef, displayName, phone, answers, attribution, ...(captchaToken ? { captchaToken } : {}) }) })).catch(() => {});
  }

  function continueToFilm(button: HTMLButtonElement) {
    if (leaving.current || !sessionRef.current.complete) return;
    leaving.current = true;
    registerLead();
    voice.stop(); microphone.cancel(); setDeparting(true);
    const overlay = departure.current, scene = root.current;
    if (!overlay || !button || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onContinue(); return; }
    const stageColor = getComputedStyle(scene).getPropertyValue("--cg-stage").trim() || "#061B3D";
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
      .to(overlay,{left:(bounds.width-filmWidth)/2,top:filmTop,width:filmWidth,height:filmHeight,borderRadius:0,backgroundColor:stageColor,duration:.85,ease:"power4.inOut"},.98)
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
    updateSession({ ...emptySession(), watched:true, displayName: sessionRef.current.displayName, phone: sessionRef.current.phone }); setBusy(false); setError(""); setDraft(""); setSpeechId(null); setShowHistory(false);
    opened.current = false; beginRef.current();
  }
  const field = session.complete ? heldField.current : session.field;
  const question = session.question && session.question.id === field ? session.question : null;
  const answered = Object.keys(session.answers).length;
  const totalQuestions = session.total ?? 0;
  const locked = busy || departing || (replayCompletion && !previewDone) || microphone.status === "recording" || microphone.status === "processing";
  const now = new Date();
  const futureDate = question?.kind === "date" && question.dateMode === "future_event";
  const escalated = Boolean(question?.kind === "unknown" || (session.escalate && !session.complete));
  const helpLink = waLink(whatsappHelpMessage(serviceName, publicRef(session.externalRef ?? "")));
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const speaking = voice.status === "speaking";
  const messages = busy || session.complete ? heldMessages.current : showHistory ? session.messages : session.messages.slice(-1);
  function textFor(message: Message) {
    if (message.id !== speechId || message.role !== "agent" || voice.muted || !["speaking","loading"].includes(voice.status)) return message.text;
    if (voice.status === "loading") return "…";
    const words = message.text.split(/\s+/);
    return words.slice(0, Math.max(1, Math.ceil(words.length * Math.min(1, voice.progress + .035)))).join(" ");
  }

  function revealText(message: Message) {
    return textFor(message).split(/(\s+)/).map((part, index) => /\s+/.test(part)
      ? part
      : <span key={`${message.id}-${index}`} className={s.spokenWord}>{part}</span>);
  }

  return <div ref={root} className={s.experience} data-phase={phase} data-journey={journey} data-voice-state={voice.status} data-voice-progress={voice.progress.toFixed(3)} data-voice-muted={voice.muted} data-visual-theme={visualTheme} data-complete={session.complete} data-film-captions={Boolean(film.captions)}>
    {/* Kept for the packing timeline; the journey backdrop (JourneyBackdrop) draws the atmosphere. */}
    {phase !== "interview" && <div className={s.filmAtmosphere} aria-hidden="true"/>}
    <div ref={veil} className={s.revealVeil} aria-hidden="true">{phase!=="watch"&&<LiquidGlow className={s.chatLiquid} level={voice.muted ? 0 : voice.level} intensity={.85}/>}</div>
    {phase !== "interview" && <div className={s.watch}>
      <div ref={videoShell} className={s.videoShell}>
        {film.src && <video ref={videoRef} src={film.src} poster={film.poster} autoPlay playsInline preload="auto" controls={false} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture disableRemotePlayback tabIndex={-1} aria-label={`Video introductorio de ${serviceName}`} onEnded={finishVideo} onError={()=>setVideoFailed(true)} onPlay={()=>setAutoplayBlocked(false)} onPause={event=>{if(phase==="watch"&&!packPending.current&&!event.currentTarget.ended&&!event.currentTarget.closest("dialog")?.hasAttribute("data-closing"))setAutoplayBlocked(true);}} onContextMenu={event=>event.preventDefault()}>
          {film.captions&&<track data-external-captions default ref={element=>{if(element)element.track.mode="hidden";}} kind="captions" src={film.captions} srcLang="es" label="Español"/>}
        </video>}
      </div>
      {film.captions&&<div className={s.filmCaptions} data-film-captions><ExternalVideoCaptions videoRef={videoRef} src={film.captions}/></div>}
      {autoplayBlocked&&!videoFailed&&phase==="watch"&&<button className={s.startVideo} type="button" onClick={()=>{voice.unlock();void videoRef.current?.play().catch(()=>setAutoplayBlocked(true));}}><Icon name="play"/>{(videoRef.current?.currentTime??0)>0?"Continuar vídeo":"Comenzar"}</button>}
      {videoFailed&&phase==="watch"&&<div className={s.videoError}><p>No se pudo cargar el vídeo.</p><button type="button" onClick={()=>{setVideoFailed(false);videoRef.current?.load();void videoRef.current?.play().catch(()=>setAutoplayBlocked(true));}}>Reintentar</button><button type="button" onClick={()=>{voice.unlock();finishVideo();}}>Continuar a las preguntas</button></div>}
      {!film.src&&phase==="watch"&&<div className={shared.notice}><img src="/contygo/brand/logo-dark.png" alt="ContyGo"/><h3>{serviceName}</h3><p>La presentación en vídeo estará disponible próximamente. Puedes comenzar con unas preguntas breves sobre tu servicio.</p><button type="button" onClick={finishVideo}>Comenzar <span aria-hidden="true">→</span></button></div>}
      <div ref={bridgeLight} className={s.bridgeLight} aria-hidden="true"><LiquidGlow className={s.bridgeLiquid}/></div>
      <div ref={seed} className={s.morphSeed}><Nucleus/></div>
      <div ref={bridge} className={s.brandBridge} aria-hidden="true"><p>Siempre contigo. <strong>Paso a paso.</strong></p><span><i/></span></div>

    </div>}

    <section ref={interview} className={s.interview} data-thinking={busy} aria-busy={busy} aria-hidden={phase!=="interview"||journey!=="chat"} aria-label="Orientación inicial con el asistente de ContyGo">
      <header className={s.chatBrand}><div ref={orbTarget} className={s.wordmark}><img src="/contygo/brand/logo-dark.png" alt="ContyGo"/></div></header>
      <div className={s.conversation} data-busy={busy}>
        <span className={s.srOnly} role="status">{answered} de {totalQuestions} respuestas completadas</span>
        <div ref={transcript} className={s.transcript} data-history={showHistory} role="log" aria-label="Conversación con ContyGo" aria-live="polite" aria-relevant="additions" data-arrive>
          {messages.map(message=><div key={message.id} className={message.role==="agent"?s.agentMessage:s.userMessage}><p><span className={s.srOnly}>{message.text}</span><span className={s.messageMeasure} aria-hidden="true">{message.text}</span><span className={s.messageWords} aria-hidden="true">{revealText(message)}{message.id===speechId&&speaking&&voice.progress<.98&&<span className={s.cursor}/>}</span></p></div>)}
        </div>
        {journey!=="reveal"&&<div className={s.answerArea} data-arrive>
          {mode===null&&<div className={s.modeChoice}><p>¿Cómo prefieres responder?</p><div><button type="button" onClick={()=>{setMode("voice");voice.unlock();}}><Icon name="mic"/>Con mi voz</button><button type="button" onClick={()=>{setMode("text");voice.unlock();textInput.current?.focus({preventScroll:true});}}><Icon name="text"/>Por escrito</button></div></div>}
          {field&&session.messages.some(m=>m.role==="agent")&&<div className={s.answerControls} key={field}>
            {question?.kind==="yesno"&&!escalated&&<div className={s.binaryChoices}><button type="button" disabled={locked} onClick={()=>void ask(field,true)}>Sí<Icon name="check"/></button><button type="button" disabled={locked} onClick={()=>void ask(field,false)}>No<Icon name="close"/></button></div>}
            {question?.kind==="date"&&<form className={s.dateAnswer} onSubmit={event=>{event.preventDefault();const value=(event.currentTarget.elements.namedItem("answerDate") as HTMLInputElement).value;if(value)void ask(field,value);}}><label htmlFor="intake-date">Elige la fecha</label><div><svg className={s.dateIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M8 3v4m8-4v4M3.5 10h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg><input id="intake-date" name="answerDate" type="date" required min={futureDate ? today : "1900-01-01"} max={futureDate ? "2100-12-31" : today} defaultValue="" disabled={locked}/><span className={s.datePlaceholder} aria-hidden="true">Elige día, mes y año</span><button type="submit" disabled={locked} aria-label="Confirmar fecha"><Icon name="arrow"/></button></div>{futureDate&&noticeHint(question?.minNotice)&&<p className={s.dateHint}>{noticeHint(question?.minNotice)}</p>}</form>}
            {question?.kind==="state"&&question.options?.length?<div className={s.binaryChoices}><button type="button" disabled={locked} onClick={()=>setStatePicker(true)}>Elegir mi estado<Icon name="pin"/></button></div>:null}
            {escalated&&<div className={s.escalate} role="status"><span>Para este servicio te ayudamos por WhatsApp.</span><a href={helpLink} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a></div>}
            {mode==="voice"&&!escalated&&<div className={s.voiceAnswer}><button type="button" data-recording={microphone.status==="recording"} disabled={busy||microphone.status==="processing"} onClick={()=>{voice.stop();if(microphone.status==="recording")microphone.stop();else void microphone.start();}}><Icon name="mic"/>{microphone.status==="recording"?`Terminar respuesta · ${microphone.seconds}s`:"Toca para hablar"}</button><button type="button" className={s.changeMode} onClick={()=>{microphone.cancel();setMode("text");}}>Prefiero escribir</button></div>}
            {!escalated&&<div className={s.composerDock} data-processing={busy}>
              <div className={s.replySignal} role="status" aria-live="polite">{busy&&<><span className={s.replyPearls} aria-hidden="true"><i/><i/><i/></span><span>Preparando tu siguiente paso…</span></>}</div>
              <form className={s.composer} onSubmit={event=>{event.preventDefault();if(draft.trim()&&!locked)void ask(field,draft.trim());}}><LiquidGlassPlate radius={30} strength={26} tone="dark"/><input ref={textInput} aria-label="Escribe tu respuesta al asistente" maxLength={1000} placeholder={busy?"Un momento, estoy contigo…":"Escribe tu respuesta…"} value={draft} disabled={locked} onChange={e=>setDraft(e.target.value)}/><button type="button" className={s.voiceSwitch} onClick={voice.toggleMute} aria-label={voice.muted?"Activar voz del asistente":"Silenciar voz del asistente"}><Icon name={voice.muted?"mute":"volume"}/></button><button type="button" className={s.inputMic} disabled={locked} aria-label="Responder por voz" onClick={()=>{setMode("voice");voice.stop();void microphone.start();}}><Icon name="mic"/></button><button type="submit" disabled={locked||!draft.trim()} aria-label="Enviar respuesta"><Icon name="send"/></button><span className={s.replyShine} aria-hidden="true"/></form>
            </div>}
          </div>}
        </div>}
        {error&&<div className={s.notice} role="alert"><p>{error}</p><button type="button" onClick={()=>{setError("");void ask();}}>Recuperar pregunta</button></div>}
        {microphone.error&&<p className={s.notice} role="status">{microphone.error} Puedes responder por escrito.</p>}
        {(voice.status==="blocked"||voice.status==="unavailable")&&<div className={s.audioNotice} role="status"><Icon name="volume"/><span>{voice.status==="blocked"?"Activa el audio para escucharme.":"Puedes seguir leyendo mientras recuperamos la voz."}</span><button type="button" onClick={()=>{voice.unlock();voice.retry();}}>{voice.status==="blocked"?"Activar voz":"Reintentar voz"}</button></div>}
        {session.messages.length>1&&!session.complete&&<button type="button" className={s.historyButton} disabled={busy} onClick={()=>setShowHistory(!showHistory)} aria-expanded={showHistory}>{showHistory?"Volver a la pregunta":"Ver conversación"}</button>}
      </div>
    </section>
    {statePicker&&question?.kind==="state"&&question.options?.length?<VisaStatePicker options={question.options} allowUnknown={Boolean(question.allowUnknown)} description={question.allowUnknown ? undefined : "Elige el estado que corresponde a tu caso."} onClose={()=>setStatePicker(false)} onChoose={code=>{setStatePicker(false);if(field)void ask(field,code);}}/>:null}
    {journey==="gathering"&&<div ref={completionSeed} className={s.completionSeed} aria-hidden="true"><img src="/contygo/brand/symbol-light.png" alt=""/></div>}
    {phase==="interview"&&journey!=="chat"&&<VisaJourneyReveal serviceName={serviceName} unavailableOnline={Boolean(session.unavailableOnline || session.escalate)} helpHref={helpLink} displayName={session.displayName} onDisplayNameChange={displayName=>updateSession({...sessionRef.current,displayName})} phone={session.phone} onPhoneChange={phone=>updateSession({...sessionRef.current,phone})} guidance={session.guidance} onContinue={continueToFilm} onEdit={restartAnswers} departing={departing} pending={journey==="gathering"} fromChat={hasGathered.current} guide={guide}/>}
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
