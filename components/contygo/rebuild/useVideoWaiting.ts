"use client";

/* ¿El vídeo está esperando datos? (28-10-2026). Mientras carga o se queda sin búfer, la ventana muestra la espera de la
   marca (BrandLoader) en vez de un recuadro gris. Un vídeo detenido que ya tiene su primer cuadro (el navegador no lo
   dejó arrancar solo) no está esperando: ahí manda el botón «Comenzar vídeo». */
import { useEffect, useState, type RefObject } from "react";

const EVENTS = ["loadstart", "loadeddata", "canplay", "canplaythrough", "playing", "waiting", "pause", "play", "seeking", "seeked", "error", "emptied", "ended"] as const;

export function useVideoWaiting(ref: RefObject<HTMLVideoElement | null>, active = true) {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video || !active) { setWaiting(false); return; }
    const sync = () => {
      const noSource = !video.currentSrc || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
      setWaiting(!video.error && !noSource && !video.ended && (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || (!video.paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)));
    };
    sync();
    for (const name of EVENTS) video.addEventListener(name, sync);
    return () => { for (const name of EVENTS) video.removeEventListener(name, sync); };
  }, [ref, active]);
  return waiting;
}
