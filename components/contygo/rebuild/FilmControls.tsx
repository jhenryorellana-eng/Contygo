"use client";

/* Los mandos de un vídeo del recorrido (28-10-2026), pensados para el celular: cuánto va y cuánto queda, pantalla
   completa (en vertical un vídeo 16:9 ocupa un tercio; girado o a pantalla completa se ve entero) y «Ya lo entendí,
   seguir», para quien ya lo sabe o tiene prisa, que hace lo mismo que el final del vídeo. */
import { useEffect, useState, type RefObject } from "react";
import s from "./FilmControls.module.css";

type Props = { video: RefObject<HTMLVideoElement | null>; onSkip: () => void; skipLabel?: string; notice?: string };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function FilmControls({ video, onSkip, skipLabel = "Ya lo entendí, seguir", notice }: Props) {
  const [time, setTime] = useState({ current: 0, duration: 0 });
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const sync = () => setTime({ current: element.currentTime, duration: Number.isFinite(element.duration) ? element.duration : 0 });
    sync();
    for (const name of ["timeupdate", "durationchange", "loadedmetadata", "seeked"]) element.addEventListener(name, sync);
    return () => { for (const name of ["timeupdate", "durationchange", "loadedmetadata", "seeked"]) element.removeEventListener(name, sync); };
  }, [video]);
  function fullscreen() {
    const element = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!element) return;
    // iPhone only lets the video itself go full screen; elsewhere the standard request.
    if (typeof element.requestFullscreen === "function") void element.requestFullscreen().catch(() => element.webkitEnterFullscreen?.());
    else element.webkitEnterFullscreen?.();
  }
  const progress = time.duration ? Math.min(1, time.current / time.duration) : 0;
  const left = Math.max(0, time.duration - time.current);
  return <div className={s.controls}>
    {notice && <p className={s.notice} role="status">{notice}</p>}
    <div className={s.track} aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
    <div className={s.row}>
      <span className={s.time} aria-label={time.duration ? `Quedan ${clock(left)}` : undefined}>{time.duration ? `Quedan ${clock(left)}` : ""}</span>
      <button type="button" className={s.full} onClick={fullscreen} aria-label="Ver en pantalla completa">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 20, height: 20 }}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button type="button" className={s.skip} onClick={onSkip}>{skipLabel}
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 18, height: 18 }}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  </div>;
}
