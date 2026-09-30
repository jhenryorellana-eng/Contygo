"use client";

/* eslint-disable @next/next/no-img-element */
import { type MutableRefObject, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HERO_SCENES, HERO_SCENE_DURATION, heroPoster } from "@/lib/hero-scenes";
import styles from "./HeroScenes.module.css";

/** La capa saliente conserva su último fotograma mientras entra la siguiente. */
function SceneMedia({ index, active, playing, mobile, reduced, activeVideo, onVideoError }: {
  index: number;
  active: boolean;
  playing: boolean;
  mobile: boolean;
  reduced: boolean;
  activeVideo: MutableRefObject<HTMLVideoElement | null>;
  onVideoError: () => void;
}) {
  const player = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const item = HERO_SCENES[index];
  const source = mobile ? item.video?.mobile : item.video?.desktop;
  const showVideo = !!source && !reduced && !failed;

  useEffect(() => setFailed(false), [source]);

  const fail = useCallback(() => {
    setFailed(true);
    if (active) onVideoError();
  }, [active, onVideoError]);

  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    player.current = element;
    if (active) activeVideo.current = element;
  }, [active, activeVideo]);

  useEffect(() => {
    const element = player.current;
    if (!element) return;
    let cancelled = false;
    if (active && playing) {
      element.muted = true;
      void element.play().catch((error: DOMException) => {
        // Pausar, cambiar de formato o desmontar cancela un play pendiente.
        if (!cancelled && error.name !== "AbortError") fail();
      });
    } else element.pause();
    return () => { cancelled = true; element.pause(); };
  }, [active, playing, source, showVideo, fail]);

  return (
    <div className={active ? styles.reveal : styles.previous} data-hero-layer={active ? "current" : "previous"}>
      <div className={`${styles.frame} ${showVideo ? styles.videoFrame : ""}`}>
        <picture>
          <source media="(max-width: 640px)" srcSet={heroPoster(item.id, true)} />
          <img src={heroPoster(item.id)} alt="" width={1264} height={720}
            fetchPriority={index === 0 && active ? "high" : "auto"} decoding="async" />
        </picture>
        {showVideo && <video key={source} ref={attachVideo} className={styles.video}
          src={source} poster={heroPoster(item.id, mobile)} muted playsInline preload="auto"
          disablePictureInPicture tabIndex={-1} onError={fail} />}
      </div>
    </div>
  );
}

export default function HeroScenes({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const elapsed = useRef(0);
  const [scene, setScene] = useState({ index: 0, previous: -1, revision: 0 });
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const playing = !paused && !reduced && visible && pageVisible;
  const current = HERO_SCENES[scene.index];
  const useVideoClock = !!current.video && !videoFailed && !reduced;
  const handleVideoError = useCallback(() => setVideoFailed(true), []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const size = window.matchMedia("(max-width: 640px)");
    const syncMotion = () => setReduced(motion.matches);
    const syncSize = () => setMobile(size.matches);
    const syncPage = () => setPageVisible(document.visibilityState === "visible");
    syncMotion(); syncSize(); syncPage();
    motion.addEventListener("change", syncMotion);
    size.addEventListener("change", syncSize);
    document.addEventListener("visibilitychange", syncPage);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 });
    if (root.current) observer.observe(root.current);
    return () => {
      motion.removeEventListener("change", syncMotion);
      size.removeEventListener("change", syncSize);
      document.removeEventListener("visibilitychange", syncPage);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Al cambiar entre horizontal y vertical, el nuevo clip empieza desde cero.
    elapsed.current = 0;
    root.current?.style.setProperty("--scene-progress", "0");
    setVideoFailed(false);
  }, [mobile]);

  const select = useCallback((index: number) => {
    elapsed.current = 0;
    root.current?.style.setProperty("--scene-progress", "0");
    setVideoFailed(false);
    setScene(previous => ({ index, previous: previous.index, revision: previous.revision + 1 }));
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element || reduced || mobile || !playing) return;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--pointer-x", "0px");
      element.style.setProperty("--pointer-y", "0px");
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        element.style.setProperty("--pointer-x", `${x * -18}px`);
        element.style.setProperty("--pointer-y", `${y * -12}px`);
      });
    };
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", reset);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
      reset();
    };
  }, [reduced, mobile, playing]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const player = video.current;
      if (useVideoClock) elapsed.current = (player?.currentTime ?? 0) * 1000;
      else elapsed.current += now - last;
      last = now;
      const duration = useVideoClock && player && Number.isFinite(player.duration) && player.duration > 0
        ? player.duration * 1000 : HERO_SCENE_DURATION;
      root.current?.style.setProperty("--scene-progress", String(Math.min(1, elapsed.current / duration)));
      if (useVideoClock ? player?.ended : elapsed.current >= HERO_SCENE_DURATION) {
        select((scene.index + 1) % HERO_SCENES.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, scene.index, scene.revision, select, useVideoClock, mobile]);

  useEffect(() => {
    if (!visible || reduced) return;
    // Sólo anticipar el próximo poster del formato actual, sin descargar videos.
    const next = new window.Image();
    next.src = heroPoster(HERO_SCENES[(scene.index + 1) % HERO_SCENES.length].id, mobile);
  }, [scene.index, mobile, visible, reduced]);

  return (
    <div ref={root} className={`${styles.stage} ${playing ? styles.playing : ""}`}>
      <div className={styles.media} aria-hidden="true">
        <div className={styles.parallax}>
        {[...(scene.previous >= 0 ? [{ index: scene.previous, revision: scene.revision - 1, active: false }] : []),
          { index: scene.index, revision: scene.revision, active: true }].map(layer => (
          <SceneMedia key={layer.revision} index={layer.index} active={layer.active}
            playing={playing} mobile={mobile} reduced={reduced} activeVideo={video} onVideoError={handleVideoError} />
        ))}
        </div>
        <div className={styles.shade} />
        <svg key={`trail-${scene.revision}`} className={styles.trail} viewBox="0 0 600 900" preserveAspectRatio="none">
          <path className={styles.blue} pathLength="1" d="M -80 960 C 280 850 380 530 640 -60" />
          <path className={styles.red} pathLength="1" d="M -94 960 C 266 850 366 530 626 -60" />
          <path className={styles.gold} pathLength="1" d="M -87 960 C 273 850 373 530 633 -60" />
        </svg>
      </div>

      <div className={styles.content}>{children}</div>

      <div className={`${styles.wrap} ${styles.explorer}`}>
        <div className={styles.explorerHeading}>
          <span className={styles.explorerLabel}>Explora nuestros servicios</span>
          <div className={styles.mobileScene} aria-live={playing ? "off" : "polite"}>
            <span className={styles.sceneNumber}>0{scene.index + 1}</span>
            <span key={scene.revision} className={styles.sceneName}>{current.label}</span>
          </div>
          <div className={styles.playback}>
            <span className={styles.counter} aria-hidden="true">0{scene.index + 1}<span> / 05</span></span>
            <button type="button" className={styles.stepButton} aria-label="Escena anterior"
              onClick={() => select((scene.index + HERO_SCENES.length - 1) % HERO_SCENES.length)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
            </button>
            <button type="button" className={styles.playButton} aria-label={paused || reduced ? "Reproducir escenas" : "Pausar escenas"}
              aria-pressed={paused || reduced} disabled={reduced}
              onClick={() => setPaused(value => !value)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{paused || reduced
                ? <path d="m9 6 9 6-9 6Z" /> : <path d="M8 6h3v12H8zm5 0h3v12h-3z" />}</svg>
            </button>
            <button type="button" className={styles.stepButton} aria-label="Escena siguiente"
              onClick={() => select((scene.index + 1) % HERO_SCENES.length)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
            </button>
          </div>
        </div>
        <div className={styles.chapters} role="group" aria-label="Explorar los grupos de servicios">
          {HERO_SCENES.map((item, index) => (
            <button key={item.id} type="button" className={`${styles.chapter} ${scene.index === index ? styles.active : ""}`}
              aria-label={`0${index + 1} ${item.label}`} aria-pressed={scene.index === index} aria-controls="hero-service-links"
              onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setPaused(true); }}
              onClick={() => { if (scene.index !== index) select(index); }}>
              <span className={styles.chapterNumber}>0{index + 1}</span>
              <span className={styles.chapterLabel}>{item.label}</span>
              <span className={styles.progress} aria-hidden="true"><span /></span>
            </button>
          ))}
        </div>
        <div id="hero-service-links" className={styles.details} aria-live={playing ? "off" : "polite"}>
          <div className={styles.serviceLinks} onFocus={() => setPaused(true)}>
            {current.services.map(service => <Link key={service.href} href={service.href}>{service.name}<span aria-hidden="true">↗</span></Link>)}
          </div>
        </div>
      </div>
    </div>
  );
}
