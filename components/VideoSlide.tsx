"use client";

/* ============================================================
   STEP — VIDEO (opcional; el embudo permite ir a las preguntas).
   - Autoplay al activarse el paso; el embudo ofrece navegación independiente.
   - Si el visitante llegó tocando una tarjeta de servicio (home o chat de
     Prime), reutiliza el <video> "desbloqueado" en ese gesto → suena
     desde el primer segundo (ver lib/media-unlock.ts).
   - Si el navegador bloquea el audio (p. ej. llegó directo desde un
     anuncio), arranca silenciado y muestra "Activar sonido".
   - Al terminar (ended) la app avanza automáticamente.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { VIDEO_POSTER, VIDEO_URL } from "@/lib/config";
import { takeUnlockedVideo } from "@/lib/media-unlock";
import type { Service } from "@/lib/types";
import { Ico } from "./icons";

interface VideoSlideProps {
  service: Service | null;
  /** true cuando este paso es el visible actualmente. */
  isActive: boolean;
  /** se llama cuando el video termina. */
  onEnded: () => void;
}

export default function VideoSlide({ service, isActive, onEnded }: VideoSlideProps) {
  const videoSrc = service?.video ?? VIDEO_URL;
  const holderRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLVideoElement | null>(null);
  const onEndedRef = useRef(onEnded);
  const isActiveRef = useRef(isActive);
  const [failed, setFailed] = useState(false);
  const [needsSound, setNeedsSound] = useState(false); // reproduciendo en silencio
  const [needsTap, setNeedsTap] = useState(false); // autoplay totalmente bloqueado
  const [progress, setProgress] = useState(0);

  const hasVideo = videoSrc.trim().length > 0 && !failed;

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Reinicia el estado de error cuando cambia el video (otro servicio).
  useEffect(() => {
    setFailed(false);
  }, [videoSrc]);

  // Monta el elemento <video>: reutiliza el desbloqueado en el gesto si existe.
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || !hasVideo) return;

    let vid = takeUnlockedVideo(videoSrc);
    if (!vid) {
      vid = document.createElement("video");
      vid.src = videoSrc;
    }
    const v = vid;
    v.dataset.claimed = "1";
    v.removeAttribute("style");
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.preload = "auto";
    v.disablePictureInPicture = true;
    v.setAttribute("controlslist", "nodownload noplaybackrate nofullscreen");
    if (VIDEO_POSTER) v.poster = VIDEO_POSTER;

    const onEnd = () => onEndedRef.current();
    // No se puede pausar: si pausan y el paso sigue activo, reanuda.
    const onPause = () => {
      if (isActiveRef.current && !v.ended) void v.play().catch(() => {});
    };
    const onTime = () => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    const onError = () => setFailed(true);
    const onCtx = (e: Event) => e.preventDefault();

    v.addEventListener("ended", onEnd);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("error", onError);
    v.addEventListener("contextmenu", onCtx);

    holder.replaceChildren(v);
    ref.current = v;

    return () => {
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("error", onError);
      v.removeEventListener("contextmenu", onCtx);
      v.pause();
      if (v.parentNode === holder) holder.removeChild(v);
      ref.current = null;
    };
  }, [videoSrc, hasVideo]);

  // Reproducción forzada cuando el paso está activo.
  useEffect(() => {
    const v = ref.current;
    if (!v || !hasVideo) return;

    if (!isActive) {
      v.pause();
      return;
    }

    setNeedsTap(false);
    setProgress(0);
    try {
      v.currentTime = 0;
    } catch {
      /* algunos navegadores aún no permiten seek: se ignora */
    }

    // 1) intenta con sonido (si el elemento fue desbloqueado en el gesto, suena)
    v.muted = false;
    const attempt = v.play();
    if (attempt && typeof attempt.then === "function") {
      attempt
        .then(() => setNeedsSound(false))
        .catch((err: unknown) => {
          // Un play() interrumpido por pause() (p. ej. doble montaje de React en
          // desarrollo) NO es un bloqueo de audio: no silenciamos el video.
          if ((err as { name?: string } | null)?.name === "AbortError") return;
          // 2) reintenta silenciado (el autoplay muteado casi siempre se permite)
          v.muted = true;
          setNeedsSound(true);
          v.play().catch(() => {
            // 3) ni silenciado: pide un toque
            setNeedsSound(false);
            setNeedsTap(true);
          });
        });
    }
  }, [isActive, videoSrc, hasVideo]);

  function enableSound() {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    setNeedsSound(false);
    void v.play().catch(() => {});
  }

  function startWithSound() {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    setNeedsTap(false);
    void v
      .play()
      .then(() => setNeedsSound(false))
      .catch(() => {});
  }

  return (
    <div className="video slide-anim">
      <div className="video__copy">
        <span className="slide-tag">Cómo funciona</span>
        <h2>Mira cómo llevas tu propio caso en minutos</h2>
        <p>
          {service
            ? `Conoce cómo funciona ${service.name}. Puedes ver el video o ir directamente a las preguntas.`
            : "Te mostramos lo simple que es llevar tu trámite desde el celular, paso a paso."}
        </p>
        <div className="video__points">
          <div className="video__point">{Ico.check} Llenas tu información guiado, sin lenguaje complicado.</div>
          <div className="video__point">{Ico.check} El sistema valida todo para que no se vaya con errores.</div>
          <div className="video__point">{Ico.check} Nuestro equipo te acompaña en los momentos que importan.</div>
        </div>
      </div>

      <div className="video__frame">
        {hasVideo ? (
          <>
            {/* El <video> se monta aquí de forma imperativa (ver efecto de montaje) */}
            <div ref={holderRef} style={{ width: "100%", height: "100%" }} />

            {/* Barra de progreso (no interactiva) */}
            <div className="video__progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>

            {/* Activar sonido cuando arranca silenciado */}
            {needsSound && (
              <button type="button" className="video__sound" onClick={enableSound}>
                {Ico.volume} Toca para activar el sonido
              </button>
            )}

            {/* Fallback: autoplay bloqueado, requiere un toque */}
            {needsTap && (
              <button type="button" className="video__tap" onClick={startWithSound}>
                <span className="video__play">{Ico.play}</span>
                Reproducir video
              </button>
            )}
          </>
        ) : (
          <div className="video__placeholder">
            <div className="video__play">{Ico.play}</div>
            <div className="video__ph-title">El video no está disponible</div>
            <small>
              Puedes iniciar la contratación o continuar con las preguntas.
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
