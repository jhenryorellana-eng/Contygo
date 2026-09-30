"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { ContygoService } from "@/lib/contygo-catalog";
import { getContygoServiceUrl } from "@/lib/contygo";
import { formatVideoDuration } from "@/lib/contygo-presentation";
import { CONTYGO_DELIVERABLES } from "@/lib/contygo-deliverables";
import { getRebuildPlatformFilm, getRebuildServiceFilm, type RebuildFilm } from "@/lib/contygo-rebuild-media";
import VisaJuvenilExperience, { type VisaIntakeSession } from "../juvenil/VisaJuvenilExperience";
import ContractCheckout from "../contract/ContractCheckout";
import ContractClosingConcept from "../juvenil/PaperPlaneClosing";
import { useVisaVoice } from "../juvenil/useVisaVoice";
import { closingName, closingScript, useClosingSpeechWarmup } from "../juvenil/closingSpeech";
import type { VisaVisualTheme } from "../juvenil/BrandLiquidSurface";
import { LiquidGlow } from "../juvenil/ThinkingOverlay";
import JourneyBackdrop from "../juvenil/JourneyBackdrop";
import s from "./ServiceCinemaDialog.module.css";

type Stage = "service" | "platform" | "decision";
type Origin = { x: number; y: number; width: number; height: number };
export type ServiceCinemaDialogProps = {
  service: ContygoService | null;
  origin: Origin | null;
  onClose: () => void;
  initialStage?: Stage;
  initialPlanName?: string;
  previewFilm?: RebuildFilm;
  /** Development preview only: start with a completed, entirely fictitious intake. */
  previewCompletedIntake?: boolean;
  visualTheme?: VisaVisualTheme;
};

const stages: { id: Stage; label: string }[] = [
  { id: "service", label: "Tu servicio" },
  { id: "platform", label: "Cómo funciona" },
  { id: "decision", label: "Para empezar" },
];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const DEBUG_COMPLETED_INTAKE: VisaIntakeSession = {
  watched: true,
  answers: {},
  messages: [{ id:1, role:"agent", text:"Gracias por compartir tus respuestas. Ya podemos dar el siguiente paso y conocer cómo te acompaña ContyGo." }],
  complete: false,
  field: "evidence",
};

function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={back ? { transform: "rotate(180deg)" } : undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Mark() {
  return <svg viewBox="0 0 44 44" fill="none" aria-hidden="true"><path d="M20 26c-3 8-6 11-12 11" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="m10 18 11 12L37 8" stroke="#1dce64" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Check() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Film({ film, title, caption, onEnded, autoPlay = false, immersive = false, visualTheme = "lagoon" }: { film: RebuildFilm; title: string; caption: string; onEnded: () => void; autoPlay?: boolean; immersive?: boolean; visualTheme?: VisaVisualTheme }) {
  const video = useRef<HTMLVideoElement>(null);
  const filmScene = useRef<HTMLDivElement>(null);
  const filmTransition = useRef<gsap.core.Timeline | null>(null);
  const ending = useRef(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const captionId = useId();

  useLayoutEffect(() => {
    if (!immersive || !filmScene.current) return;
    const scene = filmScene.current;
    ending.current = false;
    const context = gsap.context(() => {
      // The preceding button has already opened this exact frame. Keep its
      // geometry and start at frame zero, without a second entrance animation.
    }, scene);
    return () => { filmTransition.current?.kill(); context.revert(); };
  }, [immersive, attempt]);

  useEffect(() => {
    const element = video.current;
    if (autoPlay && element) void element.play().catch(() => setPlayError(true));
    return () => { element?.pause(); };
  }, [attempt, autoPlay]);

  async function play() {
    const element = video.current;
    if (!element) return;
    setPlayError(false);
    try { await element.play(); }
    catch { if (video.current === element) setPlayError(true); }
  }

  function retry() {
    setFailed(false);
    setStarted(false);
    setPlayError(false);
    setAttempt(value => value + 1);
  }

  function finishFilm() {
    const scene = filmScene.current;
    if (!immersive || !scene) { onEnded(); return; }
    if (ending.current || scene.closest("dialog")?.hasAttribute("data-closing")) return;
    ending.current = true;
    setPlayError(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onEnded(); return; }
    filmTransition.current = gsap.timeline({ onComplete: () => {
      if (filmScene.current && !filmScene.current.closest("dialog")?.hasAttribute("data-closing")) onEnded();
    } })
      .to(scene.querySelector("[data-film-frame]"), { opacity:0, scale:.91, y:-18, duration:.65, ease:"power3.inOut" }, 0)
      .fromTo(scene.querySelector("[data-film-sheet]"), { opacity:0, scale:.72, y:50, rotationZ:-12 }, { opacity:1, scale:1, y:0, rotationZ:-6, duration:.75, ease:"power3.out" }, .15)
      .to(scene.querySelector("[data-film-atmosphere]"), { opacity:.25, duration:.8, ease:"power2.inOut" }, 0);
  }

  if (immersive) return <div ref={filmScene} className={s.immersiveFilm}>
    <div className={s.filmAtmosphere} data-film-atmosphere aria-hidden="true">
      <div className={s.filmLightTop}><LiquidGlow className={s.filmLightSurface} intensity={.78} /></div>
      <div className={s.filmLightBottom}><LiquidGlow className={s.filmLightSurface} intensity={.9} /></div>
    </div>
    <div className={s.filmStage} data-film-frame>
      <video ref={video} key={attempt} src={film.src ?? undefined} poster={film.poster} autoPlay playsInline preload="auto" controls={false} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture disableRemotePlayback tabIndex={-1} aria-label={title} onPlay={()=>{setStarted(true);setPlayError(false);}} onEnded={finishFilm} onError={()=>setFailed(true)} onPause={event=>{if(!ending.current&&!event.currentTarget.ended&&!event.currentTarget.closest("dialog")?.hasAttribute("data-closing"))setPlayError(true);}} onContextMenu={event=>event.preventDefault()}/>
    </div>
    <div className={s.filmHandoff} data-film-sheet aria-hidden="true"><Image src="/contygo/brand/logo-light.png" alt="" width={3000} height={849}/><span/><span/><span/><Image className={s.handoffSymbol} src="/contygo/brand/symbol-light.png" alt="" width={1024} height={1024}/></div>
    {playError&&!failed&&<button className={s.filmResume} type="button" onClick={play}>{started?"Continuar vídeo":"Comenzar vídeo"}</button>}
    {failed&&<div className={s.filmFailure} role="status"><p>No se pudo cargar el vídeo.</p><button type="button" onClick={retry}>Reintentar vídeo</button></div>}
  </div>;

  return <figure className={s.film}>
    <div className={s.filmFrame} data-video={Boolean(film.src && !failed)}>
      {film.src && !failed ? <>
        <video
          key={attempt}
          ref={video}
          className={s.video}
          src={film.src}
          poster={film.poster}
          controls
          autoPlay={autoPlay}
          playsInline
          preload="none"
          aria-label={title}
          aria-describedby={captionId}
          onPlay={() => { setStarted(true); setPlayError(false); }}
          onEnded={onEnded}
          onError={() => setFailed(true)}
        >
          {film.captions && <track kind="captions" src={film.captions} srcLang="es" label="Español" default />}
        </video>
        {!started && <div className={s.playCover}>
          <button className={s.playButton} type="button" onClick={play} aria-label={`Reproducir: ${title}`}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z" fill="currentColor" /></svg>
            <span>Ver vídeo</span>
          </button>
        </div>}
      </> : <>
        {!posterFailed && <Image className={s.poster} src={film.poster} alt="" fill sizes="(max-width: 700px) 95vw, 520px" onError={() => setPosterFailed(true)} />}
        <div className={s.posterShade} />
        <div className={s.posterContent}>
          <span className={s.posterBrand}><Mark /> ContyGo</span>
          <strong>{caption}</strong>
          <span className={s.previewLabel}>{failed ? "Vídeo no disponible" : "Vista previa · vídeo en preparación"}</span>
        </div>
      </>}
    </div>
    <figcaption id={captionId} className={s.filmCaption}>
      <span>{film.src && !failed ? `${formatVideoDuration(film.duration)} · ${title}` : "Puedes continuar y conocer todos los detalles."}</span>
      {film.src && !failed && <span>Controlas la reproducción</span>}
    </figcaption>
    {failed && <div className={s.mediaNotice} role="status"><p>No pudimos cargar el vídeo. Puedes reintentar o seguir con la información de esta página.</p><button type="button" onClick={retry}>Reintentar vídeo <Arrow /></button></div>}
    {playError && <p className={s.playError} role="status">La reproducción no pudo empezar. Pulsa el control de reproducción del vídeo o continúa al siguiente paso.</p>}
  </figure>;
}

function OpenDialog({ service, origin, onClose, initialStage = "service", initialPlanName, previewFilm, previewCompletedIntake = false, visualTheme = "lagoon" }: Omit<ServiceCinemaDialogProps, "service"> & { service: ContygoService }) {
  const isVisa = service.id === "visa-juvenil";
  const completedPreview = process.env.NODE_ENV !== "production" && isVisa && previewCompletedIntake;
  const dialog = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const originRef = useRef(origin);
  const animation = useRef<Animation | null>(null);
  const closing = useRef(false);
  const mounted = useRef(false);
  const [stage, setStage] = useState<Stage>("service");
  const [visaSession, setVisaSession] = useState<VisaIntakeSession | null>(() => completedPreview
    ? { ...DEBUG_COMPLETED_INTAKE, answers: { ...DEBUG_COMPLETED_INTAKE.answers }, messages: [...DEBUG_COMPLETED_INTAKE.messages] }
    : null);
  const [visaPhase, setVisaPhase] = useState<"watch" | "packing" | "interview">(completedPreview ? "interview" : "watch");
  // This owner survives the chat -> film switch, retaining decoded personalized speech.
  const closingVoice=useVisaVoice();
  useClosingSpeechWarmup(closingVoice,(visaSession?.complete||visaSession?.displayName!==undefined)
    ?closingScript(closingName(visaSession?.displayName??""),service.id):null);
  const immersive = true;
  const previousStage = useRef(stage);
  const [planIndex, setPlanIndex] = useState(Math.max(0, service.plans.findIndex(plan => plan.name === initialPlanName)));
  const headingId = useId();
  const planName = useId();
  const stageIndex = stages.findIndex(item => item.id === stage);
  const isEvaluation = service.id === "evaluacion-asilo";
  const platformFilm = getRebuildPlatformFilm(service.id);
  const deliverables = CONTYGO_DELIVERABLES[service.id];
  const plans = service.plans.length ? service.plans : [{ name: "Servicio", price: service.price }];
  const selectedPlan = plans[planIndex] ?? plans[0];
  const contractUrl = getContygoServiceUrl(service.id) ?? `https://contygo.app/servicios/${service.slug}`;
  const whatsappUrl = "https://wa.me/17633422258?text=" + encodeURIComponent(`Hola, quiero orientación sobre ${service.name}, plan ${selectedPlan.name}, en ContyGo.`);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    mounted.current = true;
    closing.current = false;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const original = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, paddingRight: body.style.paddingRight };
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const paddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    Object.assign(body.style, { overflow: "hidden", position: "fixed", top: `-${scrollY}px`, left: `-${scrollX}px`, width: "100%" });
    if (scrollbarWidth > 0) body.style.paddingRight = `${paddingRight + scrollbarWidth}px`;
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && typeof element.animate === "function") {
      const rect = element.getBoundingClientRect();
      const from = originRef.current;
      const transform = from && from.width > 0 && from.height > 0
        ? `translate(${from.x + from.width / 2 - rect.x - rect.width / 2}px, ${from.y + from.height / 2 - rect.y - rect.height / 2}px) scale(${from.width / rect.width}, ${from.height / rect.height})`
        : "translateY(20px) scale(.97)";
      const focalX = from ? Math.max(0, Math.min(100, (from.x + from.width / 2) / window.innerWidth * 100)) : 50;
      const focalY = from ? Math.max(0, Math.min(100, (from.y + from.height / 2) / window.innerHeight * 100)) : 55;
      animation.current = element.animate(immersive ? [
        { clipPath:`circle(0% at ${focalX}% ${focalY}%)`, opacity:.7 },
        { clipPath:`circle(150% at ${focalX}% ${focalY}%)`, opacity:1 },
      ] : [{ transform, opacity: .15, borderRadius: "28px" }, { transform: "translate(0, 0) scale(1)", opacity: 1 }], { duration: immersive ? 850 : 550, easing: "cubic-bezier(.76,0,.24,1)" });
    }

    return () => {
      mounted.current = false;
      animation.current?.cancel();
      element.querySelector("video")?.pause();
      if (element.open) element.close();
      Object.assign(body.style, original);
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (previousStage.current !== stage) heading.current?.focus({ preventScroll: true });
    previousStage.current = stage;
  }, [stage]);

  function changeStage(next: Stage) {
    if (closing.current || next === stage) return;
    if (next !== "service" && !visaSession?.complete) return;
    dialog.current?.querySelector("video")?.pause();
    setStage(next);
  }

  function requestClose() {
    const element = dialog.current;
    if (!element || closing.current) return;
    closing.current = true;
    closingVoice.stop();
    element.setAttribute("data-closing", "true");
    element.querySelector("video")?.pause();
    const finish = () => {
      if (!mounted.current) return;
      if (element.open) element.close();
      closeCallback.current();
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof element.animate !== "function") { finish(); return; }
    const currentStyle = window.getComputedStyle(element);
    const transform = currentStyle.transform;
    const opacity = currentStyle.opacity;
    animation.current?.cancel();
    // A brief fade avoids shrinking toward an origin that may have moved after a resize.
    animation.current = element.animate([{ transform, opacity }, { transform: "translateY(10px) scale(.98)", opacity: 0 }], { duration: 220, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
    void animation.current.finished.then(finish).catch(() => {});
  }

  return <dialog
    ref={dialog}
    className={s.dialog}
    data-visa={isVisa}
    data-visual-theme={visualTheme}
    data-immersive={immersive}
    data-visa-phase={stage === "service" ? visaPhase : stage}
    aria-labelledby={headingId}
    onPointerDown={()=>closingVoice.unlock()}
    onKeyDown={()=>closingVoice.unlock()}
    onCancel={event => { event.preventDefault(); requestClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
    }}
  >
    {immersive && <JourneyBackdrop />}
    <header className={s.header} data-immersive={immersive}>
      <span className={s.brand}><Mark />ContyGo</span>
      <span className={s.headerCaption}>{isVisa ? "Un paso a la vez, contigo." : "Un paso más cerca."}</span>
      <button ref={closeButton} className={s.close} type="button" aria-label="Cerrar y volver a los servicios" onClick={requestClose}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
    </header>

    {!immersive && (isVisa ? <nav className={`${s.stepNav} ${s.visaStepNav}`} aria-label="Tu recorrido de Visa Juvenil"><ol>
      <li><span className={s.visaStep} data-current={stage === "service" && visaPhase !== "interview"} data-complete={visaSession?.watched}><span>{visaSession?.watched ? "✓" : "01"}</span>La guía</span></li>
      <li><span className={s.visaStep} data-current={stage === "service" && visaPhase === "interview"} data-complete={visaSession?.complete}><span>{visaSession?.complete ? "✓" : "02"}</span>Conversemos</span></li>
      <li><span className={s.visaStep} data-current={stage === "platform"} data-complete={stage === "decision"}><span>03</span>ContyGo</span></li>
      <li><span className={s.visaStep} data-current={stage === "decision"}><span>04</span>Tu plan</span></li>
    </ol></nav> : <nav className={s.stepNav} aria-label="Pasos de la presentación"><ol>{stages.map((item, index) => <li key={item.id}><button type="button" aria-current={stage === item.id ? "step" : undefined} onClick={() => changeStage(item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</button></li>)}</ol></nav>)}

    <div ref={scroller} className={s.scroller}>
      <div key={stage} className={s.stage} data-visa-service={isVisa && stage === "service"}>
        <div className={immersive ? s.visaAccessibleHeading : s.intro}>
          <span className={s.eyebrow}>{stage === "service" ? "Conoce tu servicio" : stage === "platform" ? "Tu proceso, en un solo lugar" : "Elige cómo dar el siguiente paso"}</span>
          <h2 id={headingId} ref={heading} tabIndex={-1}>{stage === "service" ? service.name : stage === "platform" ? "Así avanzas con ContyGo." : isVisa ? "Tu contrato, con todo claro." : "Empieza con todo claro."}</h2>
          {stage !== "service" && <p className={s.serviceContext}>{service.name}</p>}
        </div>

        {stage === "service" && <VisaJuvenilExperience serviceId={service.id} serviceName={isVisa ? "Visa Juvenil" : service.name} visualTheme={visualTheme} film={process.env.NODE_ENV !== "production" && previewFilm ? previewFilm : getRebuildServiceFilm(service.id)} nextFilm={platformFilm} initialSession={visaSession} onSessionChange={setVisaSession} onPhaseChange={setVisaPhase} onContinue={() => changeStage("platform")} replayCompletion={completedPreview} />}

        {stage === "platform" && <div className={s.closingConcept}><ContractClosingConcept key={service.id} autoPlay service={service} film={platformFilm} displayName={visaSession?.displayName} preparedVoice={closingVoice} onContract={() => changeStage("decision")} /></div>}

        {/* El bot termina en la ficha: datos, código y firma en ContyGo (lib/contygo-api). */}
        {stage === "decision" && <ContractCheckout service={service} displayName={visaSession?.displayName} phone={visaSession?.phone} answers={visaSession?.answers} eligible={visaSession?.eligible ?? null} externalRef={visaSession?.externalRef} voice={closingVoice} />}

        {stage === "decision" && !immersive && <>
          <div className={s.decisionGrid}>
            <section className={s.planPanel} aria-label="Planes y precios">
              <span className={s.eyebrow}>{isEvaluation ? "Tu evaluación" : "Tu servicio"}</span><h3>{service.name}</h3>
              <div className={s.price}><strong>{money.format(selectedPlan.price)}</strong><span>USD</span></div>
              <p className={s.priceNote}>{isEvaluation ? "Un intento de evaluación por pago." : "Honorarios del servicio. Revisa las tasas y el alcance en tu contrato."}</p>
              <fieldset className={s.plans}><legend>{plans.length > 1 ? "Elige el plan que quieres revisar" : "Plan disponible"}</legend>{plans.map((plan, index) => <label key={plan.name} className={s.plan} data-selected={planIndex === index}><input type="radio" name={planName} checked={planIndex === index} onChange={() => setPlanIndex(index)} /><span>{plan.name}</span><strong>{money.format(plan.price)}</strong></label>)}</fieldset>
              <p className={s.planNote}>{isEvaluation ? "Entra o crea tu cuenta en ContyGo para revisar el precio, las condiciones y el pago de tu evaluación." : "Entra o crea tu cuenta en ContyGo para revisar tu contrato, confirmar el plan y consultar las opciones de pago."}</p>
            </section>
            <div className={s.scope}>
              <section><span className={s.scopeLabel}>Incluido en el alcance</span><h3>{isEvaluation ? "El informe que recibes" : "Lo que preparamos para ti"}</h3><ul className={s.checkList}>{(deliverables?.outputs ?? service.includes).map(item => <li key={item}><Check /><span>{item}</span></li>)}</ul></section>
              <section className={s.exclusions}><h3>Ten en cuenta</h3><ul>{service.exclusions.map(item => <li key={item}>{item}</li>)}</ul></section>
              {deliverables && <details className={s.documents}><summary>{isEvaluation ? "Sobre los documentos de la evaluación" : "Qué documentos podrías necesitar"}<span aria-hidden="true">+</span></summary>{deliverables.documents.length > 0 && <ul>{deliverables.documents.map(item => <li key={item}>{item}</li>)}</ul>}<p>{deliverables.documentNote}</p></details>}
            </div>
          </div>
          <aside className={s.conditions}><span className={s.conditionsIcon}><Check /></span><div><h3>{isEvaluation ? "Revisa las condiciones antes de pagar." : "Garantía y condiciones, por escrito."}</h3><p>{isEvaluation ? "Consulta el alcance y las condiciones de pago, cancelación y reembolso de la evaluación. Cada pago incluye un intento y un informe PDF generado con IA. Si necesitas ayuda, contacta a Soporte en ContyGo." : "Revisa el alcance, cancelación y condiciones de reembolso en tu contrato. Si necesitas ayuda con nuestro proceso, puedes solicitar una revisión desde Soporte en ContyGo."}</p></div></aside>
        </>}
      </div>
    </div>

    {!immersive && <footer className={s.footer} data-decision={stage === "decision"}>
      <div className={s.footerMeta}>{stageIndex > 0 ? <button className={s.back} type="button" onClick={() => changeStage(stages[stageIndex - 1].id)}><Arrow back />Volver</button> : <span className={s.atYourPace}>A tu ritmo.</span>}<span className={s.stepCount}>{String(stageIndex + (isVisa ? 2 : 1)).padStart(2, "0")} / {isVisa ? "04" : "03"}</span></div>
      {stage === "decision" ? <div className={s.decisionActions}><a className={s.whatsapp} href={whatsappUrl} target="_blank" rel="noopener noreferrer">Hablar con un agente <Arrow /></a><a className={s.primary} href={contractUrl} target="_blank" rel="noopener noreferrer">{isEvaluation ? "Continuar con mi evaluación" : "Ir a mi contrato"}<Arrow /></a></div> : <button type="button" className={s.primary} onClick={() => changeStage(stage === "service" ? "platform" : "decision")}>{stage === "service" ? "Ver cómo funciona ContyGo" : "Ver opciones para empezar"}<Arrow /></button>}
    </footer>}
  </dialog>;
}

export default function ServiceCinemaDialog(props: ServiceCinemaDialogProps) {
  return props.service ? <OpenDialog key={props.service.id} {...props} service={props.service} /> : null;
}
