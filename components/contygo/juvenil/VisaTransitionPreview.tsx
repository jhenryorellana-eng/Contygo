"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { getContygoServiceUrl } from "@/lib/contygo";
import { getRebuildPlatformFilm } from "@/lib/contygo-rebuild-media";
import ServiceCinemaDialog from "../rebuild/ServiceCinemaDialog";
import { LiquidGlow } from "./ThinkingOverlay";
import ThinkingOverlayDemo from "./ThinkingOverlayDemo";
import LiquidGlassPlate from "./LiquidGlassPlate";
import VisaContractInvitation from "./VisaContractInvitation";
import ContractClosingConcept from "./PaperPlaneClosing";
import VisaStatePicker from "./VisaStatePicker";
import themeStyles from "../v6/ExperienceTheme.module.css";
import s from "./VisaTransitionPreview.module.css";

type Appearance = "light" | "dark";
type DayStyle = "tinta" | "papel";
const APPEARANCE_KEY = "contygo-appearance";
const DAY_KEY = "contygo-dia";
// Review options for the journey: two light directions, then the navy «cine» look.
const LOOKS: { appearance: Appearance; day: DayStyle; label: string }[] = [
  { appearance: "light", day: "tinta", label: "claro · tinta intensa" },
  { appearance: "light", day: "papel", label: "claro · papel verde" },
  { appearance: "dark", day: "tinta", label: "oscuro · cine" },
];

const conversation = [
  { question: "Hola. Estoy aquí para acompañarte. ¿Por dónde empezamos?", reply: "Quiero conocer el servicio." },
  { question: "Claro. Vamos paso a paso. ¿Qué te gustaría saber primero?", reply: "Cómo funciona Visa Juvenil." },
  { question: "Primero, conozcamos el camino. Una pregunta a la vez.", reply: "Sí, me gustaría entenderlo." },
  { question: "Lo importante es que tengas claridad en cada etapa.", reply: "Quiero ver el recorrido." },
  { question: "En ContyGo puedes seguir tus próximos pasos en un solo lugar.", reply: "Muéstrame cómo funciona." },
  { question: "A tu ritmo. Cuando quieras, revisamos los detalles del servicio.", reply: "Vamos al siguiente paso." },
];

const visaService = CONTYGO_SERVICES.find(service => service.id === "visa-juvenil")!;
type Origin = { x: number; y: number; width: number; height: number };
type PreviewMode = "quick" | "full" | "completed";

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Microphone() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" /><path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v3m-3 0h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

/** Local preview of the chosen direction. Production keeps the full film. */
export default function VisaTransitionPreview() {
  const [progress, setProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);
  const [contractPreview, setContractPreview] = useState<"new" | "previous" | null>(null);
  const [responseDemo, setResponseDemo] = useState(false);
  const [statePickerDemo, setStatePickerDemo] = useState(false);
  const [origin, setOrigin] = useState<Origin | null>(null);
  // Same stored appearance as the landing, so the journey can be reviewed in both themes.
  const [appearance, setAppearance] = useState<Appearance>("dark");
  const [day, setDay] = useState<DayStyle>("tinta");
  const look = LOOKS.findIndex(item => item.appearance === appearance && (appearance === "dark" || item.day === day));
  const scene = useRef<HTMLDivElement>(null);
  const message = conversation[progress];
  const open = previewMode !== null;

  useEffect(() => {
    if (contractPreview) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [contractPreview]);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("demo") === "final") setPreviewMode("completed");
    try {
      const saved = localStorage.getItem(APPEARANCE_KEY); if (saved === "light" || saved === "dark") setAppearance(saved);
      const savedDay = localStorage.getItem(DAY_KEY); if (savedDay === "tinta" || savedDay === "papel") setDay(savedDay);
    } catch { /* Keeps the dark default. */ }
  }, []);

  function nextLook() {
    const next = LOOKS[(look + 1) % LOOKS.length];
    setAppearance(next.appearance); setDay(next.day);
    try { localStorage.setItem(APPEARANCE_KEY, next.appearance); localStorage.setItem(DAY_KEY, next.day); } catch { /* Private contexts may disable storage. */ }
  }

  function openPreview(event: MouseEvent<HTMLButtonElement>, mode: PreviewMode) {
    const bounds = scene.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    setOrigin({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    setPreviewMode(mode);
  }

  function changeReply() {
    setProgress(current => (current + 1) % conversation.length);
  }

  if (contractPreview) return <div className={s.contractPage}>
    <div className={s.contractToolbar}>
      <button className={s.backButton} type="button" onClick={() => setContractPreview(null)}><span aria-hidden="true">←</span> Volver a la vista de prueba</button>
      <span>{contractPreview === "new" ? "Vídeo intacto → avión → ContyGo → tu nombre → contrato" : "Cierre anterior · para comparar"}</span>
    </div>
    {contractPreview === "new" ? <ContractClosingConcept /> : <VisaContractInvitation contractUrl={getContygoServiceUrl("visa-juvenil")!} visualTheme="lagoon" />}
  </div>;

  return <main className={s.page}>
    <header className={s.header}>
      <Image className={s.brand} src="/contygo/brand/logo-light.png" alt="ContyGo" width={3000} height={849} priority />
      <span className={s.previewLabel}><i /> VISTA DE PRUEBA</span>
    </header>

    <section className={s.experiencePreview} aria-labelledby="preview-title">
      <div className={s.copy}>
        <p className={s.eyebrow}>CONTYGO · LA NUEVA EXPERIENCIA</p>
        <h1 id="preview-title">Luz que acompaña<br /><span>la voz.</span></h1>
        <p className={s.description}>Una conversación abierta, con una luz suave que se mueve contigo. La marca al frente, espacio para cada palabra.</p>

        <div className={s.designNotes}>
          <div><span>01</span><p>Luz difusa en movimiento.<br /><strong>Espacio para conversar.</strong></p></div>
          <div><span>02</span><p>El vídeo, a todo lo ancho.<br /><strong>Aire para acompañar la historia.</strong></p></div>
          <div><span>03</span><p>Un avión. Tu nombre. ContyGo.<br /><strong>La marca te invita a dar el paso.</strong></p></div>
        </div>

        <div className={s.actions}>
          <button className={s.completedButton} type="button" onClick={nextLook}><span>Aspecto del recorrido: {LOOKS[Math.max(0, look)].label} · cambiar</span><Arrow /></button>
          <button className={s.responseButton} type="button" onClick={() => setResponseDemo(true)}><span>Probar efecto de respuesta</span><Arrow /></button>
          <button className={s.primaryButton} type="button" onClick={event => openPreview(event, "quick")}><span>Probar vídeo y chat</span><Arrow /></button>
          <button className={s.fullFilmButton} type="button" onClick={event => openPreview(event, "full")}><span>Ver vídeo completo con subtítulos</span><Arrow /></button>
          {process.env.NODE_ENV !== "production" && <button className={s.completedButton} type="button" onClick={event => openPreview(event, "completed")}><span>Ver transición del chat al botón</span><Arrow /></button>}
          <button className={s.completedButton} type="button" onClick={() => setStatePickerDemo(true)}><span>Ver selector de estados</span><Arrow /></button>
          <button className={s.completedButton} type="button" onClick={() => setContractPreview("new")}><span>Probar vídeo 2 → nuevo contrato</span><Arrow /></button>
          <button className={s.contractButton} type="button" onClick={() => setContractPreview("previous")}>Comparar con el cierre anterior <span aria-hidden="true">↗</span></button>
        </div>
        <p className={s.previewNote}>Prueba rápida: <strong>6 s</strong> para llegar al chat.<br />Vídeo completo: <strong>125 s</strong>, como en la landing.<br />Recorrido: chat → celebración → vídeo 2 → nuevo cierre del contrato.<br />Puedes probar solo el cierre y compararlo con la versión anterior.</p>
      </div>

      <figure className={s.previewFigure}>
        <div ref={scene} className={s.scene} aria-label="Vista previa del chat abierto de ContyGo">
          <LiquidGlow className={s.liquidSurface} level={.2 + progress * .08} intensity={1.2} />
          <div className={s.sceneContents}>
            <Image className={s.sceneBrand} src="/contygo/brand/logo-dark.png" alt="ContyGo" width={3000} height={849} priority />
            <div className={s.conversation} aria-live="polite" aria-atomic="true">
              <div className={s.message} key={progress}>
                <p className={s.assistantMessage}>{message.question}</p>
                <p className={s.userMessage}>{message.reply}</p>
              </div>
            </div>
            <div className={s.composer}>
              <LiquidGlassPlate radius={30} strength={24} tone="dark" active={!open} />
              <span className={s.placeholder}>Escribe aquí…</span>
              <span className={s.microphone} aria-hidden="true"><Microphone /></span>
              <button className={s.sendButton} type="button" onClick={changeReply} aria-label="Mostrar la siguiente respuesta de muestra"><Arrow /></button>
            </div>
            <span className={s.sceneSignoff}>UN PASO A LA VEZ. CONTIGO.</span>
          </div>
        </div>
        <figcaption className={s.demoControls}>
          <button type="button" onClick={changeReply}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16 7a6.5 6.5 0 1 0 .3 5M16 3v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Cambiar respuesta</button>
          <span aria-label={"Respuesta de muestra " + (progress + 1) + " de 6"}>Conversación de muestra <i>{String(progress + 1).padStart(2, "0")} / 06</i></span>
        </figcaption>
      </figure>
    </section>

    <footer className={s.footer}><span>SIEMPRE CONTIGO. PASO A PASO.</span><p>ContyGo · Luz que acompaña la voz</p></footer>
    <div className={themeStyles.surface} data-contygo-theme={appearance} data-contygo-dia={day}>
      <ServiceCinemaDialog service={open ? visaService : null} origin={origin} onClose={() => setPreviewMode(null)} previewFilm={previewMode === "quick" ? getRebuildPlatformFilm("visa-juvenil") : undefined} previewCompletedIntake={previewMode === "completed"} visualTheme="lagoon" />
      {responseDemo && <ThinkingOverlayDemo onClose={() => setResponseDemo(false)} />}
      {statePickerDemo && <VisaStatePicker onChoose={() => setStatePickerDemo(false)} onClose={() => setStatePickerDemo(false)} />}
    </div>
  </main>;
}
