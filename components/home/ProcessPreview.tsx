"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./HowItWorks.module.css";

const STEPS = [
  { short: "El video", title: "Conoce el proceso", description: "Elige tu servicio y mira un video que te explica lo esencial." },
  { short: "Preguntas", title: "Responde unas preguntas", description: "Cuéntanos tu situación con una evaluación breve y sencilla." },
  { short: "Tu resultado", title: "Descubre tu siguiente paso", description: "Si calificas, contrata en Contygo o contacta a nuestro equipo." },
];

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}

export default function ProcessPreview({ exampleName, videoSrc, question }: {
  exampleName: string;
  videoSrc: string;
  question: string;
}) {
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<"si" | "no" | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [vertical, setVertical] = useState(true);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const video = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useRef(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const sync = () => setVertical(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const player = video.current;
    const pauseWhenHidden = () => { if (document.hidden) player?.pause(); };
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting;
      if (!entry.isIntersecting) player?.pause();
    });
    if (stage.current) observer.observe(stage.current);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      player?.pause();
    };
  }, []);

  function selectStep(index: number) {
    if (index !== 0) video.current?.pause();
    setActive(index);
  }

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = STEPS.length - 1;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % STEPS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + STEPS.length - 1) % STEPS.length;
    else return;
    event.preventDefault();
    selectStep(next);
    tabs.current[next]?.focus();
  }

  function playVideo() {
    const player = video.current;
    if (!player) return;
    setVideoError(false);
    setVideoStarted(true);
    if (player.error) player.load();
    void player.play().then(() => {
      // Switching steps or leaving the section can interrupt a pending media load.
      if (player.closest<HTMLElement>("[role=tabpanel]")?.hidden || document.hidden || !inView.current) player.pause();
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setVideoStarted(false);
      setVideoError(true);
    });
    player.focus();
  }

  return (
    <div className={styles.experience} style={{ "--step": active } as CSSProperties}>
      <div className={styles.steps} role="tablist" aria-label="Explora los tres pasos" aria-orientation={vertical ? "vertical" : "horizontal"}>
        {STEPS.map((step, index) => (
          <button
            key={step.short}
            ref={(node) => { tabs.current[index] = node; }}
            className={styles.step}
            type="button"
            role="tab"
            id={`process-tab-${index}`}
            aria-controls={`process-panel-${index}`}
            aria-selected={active === index}
            aria-label={`Paso ${index + 1}: ${step.short}. ${step.title}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => selectStep(index)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            <span className={styles.number} aria-hidden="true">0{index + 1}</span>
            <span className={styles.stepCopy}>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepShort}>{step.short}</span>
              <span className={styles.stepDescription}>{step.description}</span>
            </span>
            <span className={styles.stepArrow}><Arrow /></span>
          </button>
        ))}
      </div>

      <div className={styles.previewFrame} ref={stage}>
        <div className={styles.windowBar}>
          <span className={styles.windowBrand}><span aria-hidden="true">✦</span> PRUEBA EL RECORRIDO</span>
          <span className={styles.demoLabel}>Ejemplo · {exampleName}</span>
        </div>
        <div className={styles.screen}>
          {STEPS.map((step, index) => (
            <div key={step.short} className={styles.panel} role="tabpanel" id={`process-panel-${index}`} aria-labelledby={`process-tab-${index}`} tabIndex={0} hidden={active !== index}>
              <div className={styles.panelIntro}>
                <span className={styles.panelEyebrow}>PASO 0{index + 1}</span>
                <h3>{["Primero, todo claro.", "Una pregunta a la vez.", "Ya sabes cómo seguir."][index]}</h3>
                <p>{step.description}</p>
              </div>

              {index === 0 && (
                <div className={styles.videoStage} data-started={videoStarted}>
                  <video ref={video} src={videoSrc} preload="none" controls={videoStarted} playsInline tabIndex={videoStarted ? 0 : -1} aria-label={`Video explicativo de ${exampleName}`} onError={() => { setVideoError(true); setVideoStarted(false); }} />
                  {!videoStarted && (
                    <button className={styles.videoCover} type="button" onClick={playVideo} aria-label={`Reproducir video de ${exampleName}`}>
                      <span className={styles.coverOrbit} aria-hidden="true" />
                      <span className={styles.coverBrand}>USA LATINO <b>PRIME</b></span>
                      <span className={styles.coverTitle}>Tu trámite,<br /><em>explicado.</em></span>
                      <span className={styles.playRow}>
                        <span className={styles.playIcon}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" /></svg></span>
                        <span>{videoError ? "Volver a intentar" : "Reproducir video"}</span>
                      </span>
                      <span className={styles.coverService}>{exampleName}</span>
                    </button>
                  )}
                </div>
              )}

              {index === 1 && (
                <div className={styles.questionCard}>
                  <span className={styles.questionLabel}>UNA PREGUNTA DE EJEMPLO</span>
                  <p id="process-question">{question}</p>
                  <div className={styles.answers} role="group" aria-labelledby="process-question">
                    {(["si", "no"] as const).map((value) => (
                      <button key={value} type="button" aria-pressed={answer === value} onClick={() => setAnswer(value)}>
                        <span className={styles.answerMark} aria-hidden="true">{answer === value ? "✓" : ""}</span>
                        {value === "si" ? "Sí, cuento con uno" : "No, todavía no"}
                      </button>
                    ))}
                  </div>
                  <span className={styles.answerNote} role="status">{answer ? "Así de sencillo. Continúa para ver el siguiente paso." : "Prueba una respuesta. Este ejemplo no se guarda."}</span>
                </div>
              )}

              {index === 2 && (
                <div className={styles.resultCard}>
                  <div className={styles.resultHeading}>
                    <span className={styles.routeIcon} aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="8" cy="24" r="3" /><circle cx="24" cy="8" r="3" /><path d="M8 21v-8a5 5 0 0 1 5-5h8m-8 16h6a5 5 0 0 0 5-5v-3" /></svg></span>
                    <p>Un camino más claro<br /><em>para tu situación.</em></p>
                  </div>
                  <div className={styles.resultItem}><span aria-hidden="true">01</span><div><strong>Conoce tus opciones</strong><p>Al terminar la evaluación, verás la orientación para tu servicio.</p></div></div>
                  <div className={styles.resultItem}><span aria-hidden="true">02</span><div><strong>Da el siguiente paso</strong><p>Podrás crear tu contrato en Contygo o pedir ayuda al equipo.</p></div></div>
                </div>
              )}
            </div>
          ))}
          <div className={styles.previewNav}>
            <span className={styles.counter} aria-hidden="true"><b>0{active + 1}</b><span>/ 03</span></span>
            <button type="button" onClick={() => { selectStep((active + 1) % 3); if (active === 2) setAnswer(null); }}>
              {["Ver las preguntas", "Ver el siguiente paso", "Volver al inicio"][active]}<Arrow />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
