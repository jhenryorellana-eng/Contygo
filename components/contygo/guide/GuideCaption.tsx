"use client";

/* Lo que dice la guía, escrito: una burbuja con el símbolo de ContyGo que se va llenando palabra a
   palabra al ritmo de la voz, con «Repetir» y «Silenciar». Así también la entiende quien no puede
   o no quiere escuchar. */
import Image from "next/image";
import type { Guide } from "./useGuide";
import s from "./GuideCaption.module.css";

export default function GuideCaption({ guide, compact = false }: { guide: Guide; compact?: boolean }) {
  if (!guide.lineId) return null;
  const all = guide.text.split(/\s+/);
  const lit = guide.progress < 0 ? 0 : Math.ceil(all.length * Math.min(1, guide.progress + .04));
  return <div className={s.caption} data-compact={compact || undefined} data-speaking={guide.speaking || undefined} role="status" aria-live="polite">
    <span className={s.avatar} aria-hidden="true"><Image src="/contygo/brand/symbol-dark.png" alt="" width={1024} height={1024} sizes="24px" /><i /></span>
    <p className={s.text}><span className={s.sr}>{guide.text}</span><span aria-hidden="true">{all.map((word, index) => <span key={index} data-lit={index < lit || undefined}>{word} </span>)}</span></p>
    <span className={s.tools}>
      <button type="button" onClick={guide.replay} aria-label="Repetir lo que dijo la guía"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Repetir</span></button>
      <button type="button" onClick={guide.toggleMute} aria-pressed={guide.muted} aria-label={guide.muted ? "Activar la voz de la guía" : "Silenciar la voz de la guía"}>{guide.muted
        ? <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm13 1 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5-1a5 5 0 0 1 0 8M19 5.5a8.5 8.5 0 0 1 0 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
    </span>
  </div>;
}
