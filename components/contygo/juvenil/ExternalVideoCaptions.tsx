"use client";

import { useEffect, useState, type RefObject } from "react";
import s from "./ExternalVideoCaptions.module.css";

/** Reads the browser's active WebVTT cues, driven by the video's own clock. */
/** toggle={false}: on-screen text of a film without narration (no «Subtítulos activados» button). */
export default function ExternalVideoCaptions({ videoRef, src, toggle = true }: { videoRef: RefObject<HTMLVideoElement>; src?: string; toggle?: boolean }) {
  const [enabled, setEnabled] = useState(true);
  const [cue, setCue] = useState({ key: "", text: "" });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const element = video?.querySelector<HTMLTrackElement>("track[data-external-captions]");
    if (!video || !element || !src) return;
    const track = element.track;
    setCue({ key: "", text: "" });
    setFailed(false);
    // Hidden loads and evaluates cues without painting them on the image.
    track.mode = "hidden";
    const sync = () => {
      const active = Array.from(track.activeCues ?? []) as VTTCue[];
      const next = { key: active.map(item => `${item.startTime}-${item.endTime}`).join("/"), text: active.map(item => item.text.replace(/<[^>]*>/g, "")).join("\n").trim() };
      setCue(current => current.key === next.key && current.text === next.text ? current : next);
    };
    const loaded = () => { track.mode = "hidden"; sync(); };
    const error = () => { setFailed(true); setCue({ key: "", text: "" }); };
    track.addEventListener("cuechange", sync);
    element.addEventListener("load", loaded);
    element.addEventListener("error", error);
    video.addEventListener("seeked", sync);
    video.addEventListener("ended", sync);
    sync();
    return () => {
      track.removeEventListener("cuechange", sync);
      element.removeEventListener("load", loaded);
      element.removeEventListener("error", error);
      video.removeEventListener("seeked", sync);
      video.removeEventListener("ended", sync);
    };
  }, [src, videoRef]);

  if (!src) return null;
  return <section className={s.captions} aria-label={toggle ? "Subtítulos del vídeo" : "Texto del vídeo"} data-caption-state={failed ? "error" : enabled ? "on" : "off"}>
    <div className={s.cueArea} aria-live="off">
      {enabled && cue.text && <p key={cue.key} className={s.cue} data-cue={cue.key}>{cue.text}</p>}
      {failed && <p className={s.error}>No se pudieron cargar los subtítulos.</p>}
    </div>
    {toggle && <button type="button" className={s.toggle} onClick={() => setEnabled(value => !value)} aria-pressed={enabled} aria-label={enabled ? "Ocultar subtítulos" : "Mostrar subtítulos"}>
      <svg viewBox="0 0 24 20" fill="none" aria-hidden="true"><rect x="1" y="1" width="22" height="18" rx="5" stroke="currentColor"/><path d="M10 7.5C6 5 4.5 7.5 4.5 10s1.5 5 5.5 2.5m9-5c-4-2.5-5.5 0-5.5 2.5s1.5 5 5.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      <span>{enabled ? "Subtítulos activados" : "Mostrar subtítulos"}</span>
    </button>}
  </section>;
}
