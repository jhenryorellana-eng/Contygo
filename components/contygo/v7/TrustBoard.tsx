"use client";

/* Los casos de ContyGo, en la landing (24-11-2026). El dueño: «la idea es que el contador aparezca ahí para que los
   clientes cuando ingresen puedan ver nuestros casos ganados… y un botón donde les abra el mismo "presentar en vivo"
   que le sale a Henry… pensado para llenarlos de confianza».
   Las cifras son las del contador que lleva el encargado (lib/case-counter.ts); las historias, las que el dueño aprobó y
   cuyo autor dio permiso para la página (GET /api/felicitaciones). Sin cifras ni historias, la sección no existe: nunca
   un cero ni un dato de muestra. Lleva siempre que un resultado no garantiza otro.

   Cómo se ve: la primera versión (un marcador de paletas en una caja) no gustó: «muy sencillo, básico, sin nada de
   originalidad». De cuatro maneras con imagen propia (el muro de la fama, Henry al frente, el letrero de neón y la
   plastilina) el dueño eligió «Henry al frente»: su foto, y a su lado los casos ganados en grande. La presentación que
   abre el botón (CongratsShow, variante pública) lleva a Henry en su portada. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import CongratsShow, { type PublicShow } from "./CongratsShow";
import { openAssistant } from "./assistantBus";
import b from "./TrustBoard.module.css";

const FINE = "Cada caso es distinto: un resultado anterior no garantiza el tuyo. La decisión es de la autoridad.";
/** Henry's photographs for this section (generated from his studio portraits, 24-11-2026). One is published; the others
    can be tried on the local page, to choose. */
const PHOTOS = [{ key: "cruzados", label: "Brazos cruzados" }, { key: "presenta", label: "Presentando" }, { key: "celebra", label: "Celebrando" }] as const;
type Photo = typeof PHOTOS[number]["key"];
const PUBLISHED: Photo = "cruzados";
const DEV = process.env.NODE_ENV === "development";
const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/** A figure that counts up to its value once it is on screen. */
function Count({ to, on }: { to: number; on: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setValue(to); return; }
    let frame = 0; const start = performance.now(), span = 1400;
    const step = (now: number) => { const t = Math.min(1, (now - start) / span); setValue(Math.round(to * (1 - Math.pow(1 - t, 3)))); if (t < 1) frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, on]);
  return <>{(on ? value : 0).toLocaleString("en-US")}</>;
}

export default function TrustBoard() {
  const [data, setData] = useState<PublicShow | null>(null);
  const [seen, setSeen] = useState(false), [open, setOpen] = useState(false), [photo, setPhoto] = useState<Photo>(PUBLISHED);
  const section = useRef<HTMLElement>(null), button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    // The owner's preview: «/?ejemplo=1» asks for the examples, which the route gives only to his session.
    const preview = new URLSearchParams(window.location.search).get("ejemplo") === "1";
    fetch(preview ? "/api/felicitaciones?ejemplo=1" : "/api/felicitaciones", preview ? { cache: "no-store" } : undefined).then(reply => reply.ok ? reply.json() as Promise<PublicShow> : null).then(body => { if (alive && body && (body.score || body.stories.length)) setData(body); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  // The figures move when the board comes into view, not before anyone can see them.
  useEffect(() => {
    const element = section.current; if (!element || seen) return;
    const watch = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setSeen(true); watch.disconnect(); } }, { threshold: .25 });
    watch.observe(element);
    return () => watch.disconnect();
  }, [data, seen]);
  // The show covers the page: the page behind stays still, and the focus comes back to the button.
  useEffect(() => {
    if (!open) return;
    const before = document.documentElement.style.overflow, opener = button.current;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = before; opener?.focus({ preventScroll: true }); };
  }, [open]);

  if (!data) return null;
  const { score, stories } = data, totals = score?.totals ?? null;
  const asOf = score?.updatedAt ? new Date(score.updatedAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : null;
  const go = <button ref={button} type="button" className={b.open} onClick={() => setOpen(true)}>{stories.length ? "Ver los casos, uno por uno" : "Ver el marcador por servicio"}<Arrow /></button>;
  const fine = <p className={b.fine}>{asOf ? `Cifras del registro de ContyGo al ${asOf}. ` : ""}{FINE}</p>;
  const minor = totals && <ul className={b.minor}><li><b><Count to={totals.created} on={seen} /></b>casos creados</li><li><b><Count to={totals.pending} on={seen} /></b>en proceso</li></ul>;

  return (
    <section className={b.board} id="casos" ref={section} aria-labelledby="casos-titulo">
      <div className={b.portrait}>
        <Image key={photo} src={`/contygo/casos/henry-${photo}.webp`} alt="Henry Orellana" width={1024} height={1280} sizes="(max-width:860px) 92vw, 520px" />
        <p className={b.name}><b>Henry Orellana</b>Consultor de inmigración registrado en Utah</p>
      </div>
      <div className={b.copy}>
        {data.example && <p className={b.demo}><b>Modo ejemplo.</b> Cifras e historias de muestra: solo las ves tú, con tu sesión del panel. El público no ve esta sección hasta que el contador tenga cifras reales.</p>}
        <h2 id="casos-titulo">Los casos de ContyGo, <em>con Henry al frente.</em></h2>
        {totals ? <p className={b.giant}><b><Count to={totals.won} on={seen} /></b><span>casos ganados</span></p> : <p>Clientes de ContyGo que ya recibieron su respuesta, contado por ellos.</p>}
        {minor}
        {go}{fine}
        {DEV && <p className={b.pick}>Foto de Henry (solo en local): {PHOTOS.map(item => <button key={item.key} type="button" aria-pressed={photo === item.key} onClick={() => setPhoto(item.key)}>{item.label}</button>)}</p>}
      </div>
      {open && createPortal(<CongratsShow variant="public" skin="henry" photo={photo} preview={data.example === true} onClose={() => setOpen(false)} onStart={() => { setOpen(false); openAssistant(); }} />, document.body)}
    </section>
  );
}
