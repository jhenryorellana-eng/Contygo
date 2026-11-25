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
import type { ScoreRow } from "@/lib/contygo-results";
import { openAssistant } from "./assistantBus";
import { CONTYGO_CLAIMS, isPublic } from "@/lib/contygo-claims";
import b from "./TrustBoard.module.css";

/** While the counter has no figures: what the owner has confirmed (lib/contygo-claims.ts), in its own words. «Clientes
    atendidos» is not a count of cases won and never reads as one. */
const SERVED = isPublic(CONTYGO_CLAIMS.clientsServed) ? /^(\+?[\d.,]+)\s+(.+)$/.exec(CONTYGO_CLAIMS.clientsServed.text) : null;
const FINE = "Cada caso es distinto: un resultado anterior no garantiza el tuyo. La decisión es de la autoridad.";
/** Henry's photographs for this section (generated from his studio portraits, 24-11-2026). One is published; the others
    can be tried on the local page, to choose. */
const PHOTOS = [{ key: "cruzados", label: "Brazos cruzados" }, { key: "presenta", label: "Presentando" }, { key: "celebra", label: "Celebrando" }] as const;
type Photo = typeof PHOTOS[number]["key"];
const PUBLISHED: Photo = "cruzados";
const DEV = process.env.NODE_ENV === "development";
/** How the figures are presented. With the real figures in (24-11-2026) the owner asked for more: «que realmente llame la
    atención». What missed, in his words: three long ones (a reel of tickets, a podium, a neon bill): «no me gustó ninguno…
    corto pero llamativo»; then a ticket, a seal and a sash over the photograph: «la imagen de Henry no debe ser opacada,
    deben resaltar más los números completados, y los efectos o animaciones deben ser creativas, no cosas vacías sin
    sentido». So: ONE layout —Henry's photograph whole and clean, as he approved it; the cases finished much larger, their
    name marked in green— and four animations that each SAY something about the cases, to choose on the local page.
    He chose the first: «la suma me gusta… súbelo». It is the published one (`PUBLISHED_LOOK`); the others stay on the local
    page's switch. */
const LOOKS = [{ key: "actual", label: "Actual" }, { key: "suma", label: "1 · Suma" }, { key: "hilo", label: "2 · Hilo y check" }, { key: "puntos", label: "3 · Cada caso" }, { key: "rodillo", label: "4 · Rodillo" }] as const;
type Look = typeof LOOKS[number]["key"];
const PUBLISHED_LOOK: Look = "suma";
const figure = (id: string) => `/contygo/v8/servicio-${id}.webp`;
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 1 · The sum: the services arrive one by one and each adds its cases to the total; then the row keeps telling which. */
function Sum({ rows, at, done }: { rows: ScoreRow[]; at: number; done: boolean }) {
  const row = rows[at];
  return <div className={b.sum}>
    <ul>{rows.map((item, index) => <li key={item.serviceId} data-in={done || index <= at} data-now={index === at}><span><Image src={figure(item.serviceId)} alt="" width={120} height={120} sizes="60px" /></span></li>)}</ul>
    <p className={b.sumNote}>{row ? <span key={`${row.serviceId}-${done}`}><b>{done ? "" : "+"}{row.won.toLocaleString("en-US")}</b>{row.label}</span> : <span>&nbsp;</span>}</p>
  </div>;
}

/** 3 · Every case, one point: green the finished ones, blue and twinkling the ones in process, dim the rest. They light up
    as the figure counts. */
function Dots({ created, won, pending, on, run }: { created: number; won: number; pending: number; on: boolean; run: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), progress = useRef(0);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d");
    if (!element || !context) return;
    const total = Math.max(created, won + pending), bright = new Set<number>();
    let width = 0, cols = 1, size = 1, lines = 1, frame = 0;
    const draw = () => {
      if (!width) return;
      context.clearRect(0, 0, width, lines * size);
      const shown = Math.round(total * progress.current), radius = size * .33;
      for (let index = 0; index < total; index++) {
        const live = index < shown, kind = index < won ? 0 : index < won + pending ? 1 : 2;
        context.beginPath();
        context.arc((index % cols + .5) * size, (Math.floor(index / cols) + .5) * size, live && kind === 0 ? radius * 1.14 : radius, 0, Math.PI * 2);
        context.fillStyle = !live ? "#ffffff1c" : kind === 0 ? "#25d366" : kind === 1 ? (bright.has(index) ? "#d5e4ff" : "#4f8dff") : "#ffffff47";
        context.fill();
      }
    };
    const fit = () => {
      width = element.clientWidth; if (!width) return;
      cols = Math.max(20, Math.round(width / (width < 420 ? 7.7 : 10.5))); size = width / cols; lines = Math.ceil(total / cols);
      const ratio = Math.min(2.5, window.devicePixelRatio || 1);
      element.width = Math.round(width * ratio); element.height = Math.round(lines * size * ratio); element.style.height = `${lines * size}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0); draw();
    };
    fit();
    const watch = new ResizeObserver(fit); watch.observe(element);
    if (on && progress.current < 1) {
      if (calm()) { progress.current = 1; draw(); }
      else { const start = performance.now(), from = progress.current; const step = (now: number) => { const t = Math.min(1, (now - start) / 1900); progress.current = from + (1 - from) * (1 - Math.pow(1 - t, 3)); draw(); if (t < 1) frame = requestAnimationFrame(step); }; frame = requestAnimationFrame(step); }
    }
    // The cases in process are alive: a few of them glint, in turn.
    const glint = on && run && !calm() ? window.setInterval(() => { if (progress.current < 1) return; bright.clear(); for (let n = 0; n < Math.max(3, pending / 16); n++) bright.add(won + Math.floor(Math.random() * pending)); draw(); }, 260) : 0;
    return () => { watch.disconnect(); cancelAnimationFrame(frame); window.clearInterval(glint); };
  }, [created, won, pending, on, run]);
  return <canvas ref={canvas} className={b.dots} role="img" aria-label={`${won} casos terminados, ${pending} en proceso, de ${created} casos creados`} />;
}

/** 4 · The roller: one service at a time —its clay figure, its cases finished, its name— turning by itself. */
function Roller({ rows, run }: { rows: ScoreRow[]; run: boolean }) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!run || rows.length < 2) return;
    const timer = window.setInterval(() => setAt(value => (value + 1) % rows.length), 2400);
    return () => window.clearInterval(timer);
  }, [run, rows.length]);
  const row = rows[at % rows.length];
  if (!row) return null;
  return <p className={b.roller} aria-live="off">
    <span key={row.serviceId} className={b.turn}>
      <Image src={figure(row.serviceId)} alt="" width={200} height={200} sizes="96px" />
      <b>{row.won.toLocaleString("en-US")}</b>
      <span>{row.label}</span>
    </span>
  </p>;
}

const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/** A figure that counts up to its value once it is on screen. */
function Count({ to, on }: { to: number; on: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!on) return;
    if (calm()) { setValue(to); return; }
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
  const [pass, setPass] = useState<string | null>(null);
  const [look, setLook] = useState<Look>(PUBLISHED_LOOK), [near, setNear] = useState(false);
  // The sum's place (which service is being added) and whether the count has ended: the name of the figure lights up then.
  const [at, setAt] = useState(-1), [summed, setSummed] = useState(false), [done, setDone] = useState(false);
  const section = useRef<HTMLElement>(null), button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    // What the page may show; and, when there is nothing real yet, the owner's preview: the examples, which the route gives
    // only to his session (anyone else gets the same empty answer). So Henry, signed in to his panel, sees the section on
    // the landing straight away, marked as an example; «/?ejemplo=1» asks for it even when there are real figures.
    const read = (url: string, init?: RequestInit) => fetch(url, init).then(reply => reply.ok ? reply.json() as Promise<PublicShow> : null).catch(() => null);
    const filled = (body: PublicShow | null): body is PublicShow => !!body && (!!body.score || body.stories.length > 0);
    // «/?ejemplo=<clave>» is the preview link (copied from the panel): the examples for whoever opens it, with no session.
    const asked = new URLSearchParams(window.location.search).get("ejemplo");
    void (async () => {
      const real = asked ? null : await read("/api/felicitaciones");
      const pass = asked ?? "1";
      const body = filled(real) ? real : await read(`/api/felicitaciones?ejemplo=${encodeURIComponent(pass)}`, { cache: "no-store" });
      if (alive && filled(body)) { setData(body); setPass(body.example ? pass : null); }
    })();
    return () => { alive = false; };
  }, []);
  // The section arrives after the page: a link that points at it («…#casos») finds it once it is there.
  useEffect(() => { if (data && window.location.hash === "#casos") section.current?.scrollIntoView({ block: "start" }); }, [data]);
  // The figures move when the board comes into view, not before anyone can see them.
  useEffect(() => {
    const element = section.current; if (!element || seen) return;
    const watch = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setSeen(true); watch.disconnect(); } }, { threshold: .25 });
    watch.observe(element);
    return () => watch.disconnect();
  }, [data, seen]);
  // What moves by itself (the reel) only moves while the board is on screen.
  useEffect(() => {
    const element = section.current; if (!element) return;
    const watch = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "80px" });
    watch.observe(element);
    return () => watch.disconnect();
  }, [data]);
  // A new presentation starts from its beginning.
  const choose = (next: Look) => { setAt(-1); setSummed(false); setDone(false); setLook(next); };
  const services = data?.score?.rows.filter(row => row.won > 0).length ?? 0;
  // 1 · The sum: a service every third of a second adds its cases; once added up, the row goes on naming them, slowly.
  useEffect(() => {
    if (look !== "suma" || !seen || !services) return;
    if (!summed && calm()) { setAt(0); setSummed(true); return; }
    if (!near) return;
    const timer = window.setInterval(() => setAt(value => {
      if (summed) return (value + 1) % services;
      if (value + 1 >= services - 1) setSummed(true);
      return Math.min(services - 1, value + 1);
    }), summed ? 2400 : 330);
    return () => window.clearInterval(timer);
  }, [look, seen, near, services, summed]);
  // The others count up in a second and a half: then the figure's name lights up.
  useEffect(() => {
    if (look === "actual" || look === "suma" || !seen) return;
    const timer = window.setTimeout(() => setDone(true), calm() ? 0 : 1500);
    return () => window.clearTimeout(timer);
  }, [look, seen]);

  // The show covers the page: the page behind stays still, and the focus comes back to the button.
  useEffect(() => {
    if (!open) return;
    const before = document.documentElement.style.overflow, opener = button.current;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = before; opener?.focus({ preventScroll: true }); };
  }, [open]);

  // For every visitor, from the first paint: with no figures in the counter and no stories yet, the section stands on the
  // one figure the owner has confirmed, and invites to start. The counter's figures take its place when they exist.
  if (!data) return SERVED ? (
    <section className={b.board} id="casos" ref={section} aria-labelledby="casos-titulo">
      <div className={b.portrait}>
        <Image src={`/contygo/casos/henry-${photo}.webp`} alt="Henry Orellana" width={1024} height={1280} sizes="(max-width:860px) 92vw, 520px" />
        <p className={b.name}><b>Henry Orellana</b>Consultor de inmigración registrado en Utah</p>
      </div>
      <div className={b.copy}>
        <h2 id="casos-titulo">Los casos de ContyGo, <em>con Henry al frente.</em></h2>
        <p className={b.giant}><b>{SERVED[1]}</b><span>{SERVED[2]}</span></p>
        <p>Familias que ya hicieron su trámite con ContyGo, acompañadas paso a paso por Henry y su equipo.</p>
        <button type="button" className={b.open} onClick={() => openAssistant()}>Hacer mi contrato<Arrow /></button>
        <p className={b.fine}>Clientes atendidos en todos los servicios; no es una cuenta de casos aprobados. {FINE}</p>
      </div>
    </section>
  ) : null;
  const { score, stories } = data, totals = score?.totals ?? null;
  const asOf = score?.updatedAt ? new Date(score.updatedAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : null;
  const go = <button ref={button} type="button" className={b.open} onClick={() => setOpen(true)}>{stories.length ? "Ver los casos, uno por uno" : "Ver el marcador por servicio"}<Arrow /></button>;
  const fine = <p className={b.fine}>{score?.example ? "Estas cifras son de ejemplo, mientras se carga el registro de ContyGo. " : asOf ? `Cifras del registro de ContyGo al ${asOf}. ` : ""}{FINE}</p>;
  // The large figure is the cases finished, under the owner's word: «casos terminados» (24-11-2026: «no todos los procesos se
  // ganan… casos terminados es el mejor término, resáltalo»).
  const minor = totals && <ul className={b.minor}><li data-kind="pending"><b><Count to={totals.pending} on={seen} /></b>en proceso</li><li data-kind="created"><b><Count to={totals.created} on={seen} /></b>creados</li></ul>;

  // By service, those with most cases finished first.
  const rows = [...(score?.rows ?? [])].filter(row => row.won > 0).sort((one, other) => other.won - one.won);
  const plain = look === "actual" || !totals;
  const dev = DEV && <div className={b.dev}>
    <p className={b.pick}>Presentación (solo en local): {LOOKS.map(item => <button key={item.key} type="button" aria-pressed={look === item.key} onClick={() => choose(item.key)}>{item.label}</button>)}</p>
    <p className={b.pick}>Foto de Henry (solo en local): {PHOTOS.map(item => <button key={item.key} type="button" aria-pressed={photo === item.key} onClick={() => setPhoto(item.key)}>{item.label}</button>)}</p>
  </div>;
  const show = open && createPortal(<CongratsShow variant="public" skin="henry" photo={photo} preview={pass ?? undefined} onClose={() => setOpen(false)} onStart={() => { setOpen(false); openAssistant(); }} />, document.body);
  const title = <h2 id="casos-titulo">Los casos de ContyGo, <em>con Henry al frente.</em></h2>;
  const henry = <Image key={photo} src={`/contygo/casos/henry-${photo}.webp`} alt="Henry Orellana" width={1024} height={1280} sizes="(max-width:860px) 92vw, 560px" />;
  const name = <p className={b.name}><b>Henry Orellana</b>Consultor de inmigración registrado en Utah</p>;
  const example = score?.example && !data.example ? <p className={b.mock}>Cifras de ejemplo</p> : null;
  const won = totals ? <Count to={totals.won} on={seen} /> : null;

  if (!plain && totals) {
    const adding = look === "suma" && !summed;
    return (
      <section className={`${b.card} ${b.hx}`} id="casos" ref={section} aria-labelledby="casos-titulo" data-look={look} data-on={seen} data-done={look === "suma" ? summed : done}>
        <div className={b.hxPhoto}>{henry}{name}</div>
        <div className={b.hxCopy}>
          {data.example && <p className={b.demo}><b>Modo ejemplo.</b> Cifras e historias de muestra, para ver cómo queda.</p>}
          {title}
          <p className={b.hxNum}>
            <b>{adding ? rows.slice(0, at + 1).reduce((sum, row) => sum + row.won, 0).toLocaleString("en-US") : look === "suma" ? totals.won.toLocaleString("en-US") : won}
              {look === "hilo" && <svg viewBox="0 0 330 70" aria-hidden="true"><path pathLength={1} d="M6,44 C62,58 132,34 204,46 C232,51 250,50 262,38 L280,58 L324,8" /></svg>}</b>
            <span><i>casos terminados</i></span>
          </p>
          {example}
          {look === "suma" && <Sum rows={rows} at={at} done={summed} />}
          {look === "puntos" && <Dots created={totals.created} won={totals.won} pending={totals.pending} on={seen} run={near} />}
          {look === "rodillo" && <Roller rows={rows} run={near} />}
          {minor}{go}{fine}
        </div>
        {dev}{show}
      </section>
    );
  }

  return (
    <section className={b.board} id="casos" ref={section} aria-labelledby="casos-titulo">
      <div className={b.portrait}>{henry}{name}</div>
      <div className={b.copy}>
        {data.example && <p className={b.demo}><b>Modo ejemplo.</b> Cifras e historias de muestra, para ver cómo queda. El público no ve esta sección hasta que el contador tenga cifras reales.</p>}
        {title}
        {totals ? <p className={b.giant}><b>{won}</b><span>casos terminados</span></p> : <p>Clientes de ContyGo que ya recibieron su respuesta, contado por ellos.</p>}
        {example}
        {minor}
        {go}{fine}
        {dev}
      </div>
      {show}
    </section>
  );
}
