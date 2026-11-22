"use client";

/* Felicitaciones, en vivo (21-11-2026). El dueño: «que no salga en la página principal, sino que esté en el dashboard
   de Henry y que él pueda enseñarlo cuando él quiera, ya que quiere mostrarlo en un live».
   Una presentación a pantalla completa, con la sesión del dueño, de las felicitaciones que él aprobó en su panel:
   - «Una por una»: cada felicitación ocupa la pantalla (su foto entera, el sello «Aprobado», lo que cuenta, su nombre,
     su trámite y desde dónde) y pasa sola a la siguiente; abre una portada con la cuenta en cifras de paletas.
   - «Muro»: todas juntas, para recorrerlas con el dedo, con el tablero por servicio.
   Vale para un live vertical (teléfono) y para compartir pantalla (apaisado). Los mandos se esconden solos.
   Sin datos inventados (lib/contygo-results.ts): las felicitaciones son las aprobadas; las cuentas, las que el dueño
   confirme o, si no, las aprobaciones que los propios clientes compartieron (y lo dice). En desarrollo, y solo ahí,
   se ve con datos de EJEMPLO bajo una marca que lo dice. Lo que se muestra en un live es publicidad: la pantalla
   lleva siempre que un resultado anterior no garantiza otro y que la decisión es de la autoridad. */
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { BOARD_FROM, CONTYGO_RESULTS, RESULTS_SAMPLE, REVIEWS_SAMPLE, resultsPublic, type PublicReview, type ResultRow } from "@/lib/contygo-results";
import c from "./CongratsShow.module.css";

const DEV = process.env.NODE_ENV === "development";
const HOLD = 9000, IDLE = 2800;
const FINE = "Cada caso es distinto: un resultado anterior no garantiza el tuyo. La decisión es de la autoridad.";
type Row = { name: string; service_id: string | null; rating: number; comment: string; kind?: string; place?: string | null; image_url?: string | null };
const Star = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.9l-5.38 2.9 1.03-6L3.3 9.6l6-.9Z" fill="currentColor" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-8" /></svg>;

/** A number on the board: one flap per digit, each a reel that turns to its digit. */
function Flaps({ value, pad }: { value: number; pad: number }) {
  const digits = String(value).padStart(pad, " ").split("");
  return <span className={c.flaps} role="img" aria-label={String(value)}>{digits.map((digit, k) => <span key={k} className={c.flap} data-blank={digit === " " || undefined} style={{ "--d": digit === " " ? 0 : Number(digit), "--k": k } as CSSProperties}>
    <span aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <i key={n}>{n}</i>)}</span>
  </span>)}</span>;
}

function Story({ review, big }: { review: PublicReview; big?: boolean }) {
  // A long story is set smaller, so it still fits the screen.
  const size = review.comment.length > 380 ? .62 : review.comment.length > 240 ? .74 : review.comment.length > 130 ? .88 : 1;
  return <article className={c.story} data-big={big || undefined} data-photo={review.image ? "" : undefined} style={big ? { "--s": size } as CSSProperties : undefined}>
    {/* The photo is the client's own, from the owner's storage: a plain <img>. It shows whole; what the frame has left over is the same photo, blurred. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {review.image && <span className={c.photo} style={{ "--img": `url(${JSON.stringify(review.image)})` } as CSSProperties}><img src={review.image} alt={`Foto que compartió ${review.name}`} /></span>}
    <div className={c.said}>
      {review.kind === "approval" && <span className={c.stamp}><Check />Aprobado</span>}
      <span className={c.stars} role="img" aria-label={`${review.rating} de 5 estrellas`}>{[1, 2, 3, 4, 5].map(n => <i key={n} data-on={n <= review.rating || undefined}><Star /></i>)}</span>
      <blockquote>{review.comment}</blockquote>
      <span className={c.who}><b>{review.name}</b>{(review.service || review.place) && <span>{[review.service, review.place].filter(Boolean).join(", ")}</span>}</span>
    </div>
  </article>;
}

export default function CongratsShow() {
  const [state, setState] = useState<"loading" | "ready" | "signin" | "off" | "error">("loading");
  const [approved, setApproved] = useState<PublicReview[]>([]);
  const [mode, setMode] = useState<"one" | "wall">("one"), [at, setAt] = useState(0), [held, setHeld] = useState(false), [quiet, setQuiet] = useState(false), [full, setFull] = useState(false);
  const idle = useRef<number>();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/reviews?status=approved", { cache: "no-store" });
      if (response.status === 401) return setState("signin");
      if (response.status === 503) return setState("off");
      if (!response.ok) return setState("error");
      const rows = (await response.json()) as Row[];
      setApproved(rows.map(row => ({ name: row.name, serviceId: row.service_id, service: CONTYGO_SERVICES.find(item => item.id === row.service_id)?.name ?? null, rating: row.rating, comment: row.comment, kind: row.kind === "approval" ? "approval" : "review", place: row.place ?? null, image: row.image_url ?? null })));
      setState("ready");
    } catch { setState("error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // In development, and only there, with nothing approved yet: an example, marked as one.
  const sample = DEV && state !== "loading" && state !== "signin" && approved.length === 0;
  const stories = sample ? REVIEWS_SAMPLE : approved;
  const real = resultsPublic();
  const rows = useMemo(() => {
    if (real) return CONTYGO_RESULTS.rows.filter(row => row.approved > 0);
    if (sample) return RESULTS_SAMPLE;
    // The approvals clients have shared, by service: what the board counts when the owner has confirmed no figures.
    const shared = Object.values(stories.filter(review => review.kind === "approval" && review.service).reduce<Record<string, ResultRow>>((byService, review) => {
      const key = review.service as string;
      (byService[key] ??= { serviceId: review.serviceId ?? "", label: key, approved: 0 }).approved++;
      return byService;
    }, {})).sort((x, y) => y.approved - x.approved);
    return shared.reduce((sum, row) => sum + row.approved, 0) >= BOARD_FROM ? shared : [];
  }, [real, sample, stories]);
  const total = rows.reduce((sum, row) => sum + row.approved, 0), pad = String(Math.max(...rows.map(row => row.approved), 0)).length;
  const counts = real || sample ? "aprobaciones registradas" : "aprobaciones que nuestros clientes han compartido";

  // One by one: the cover first, then each story; it moves on by itself.
  const slides = stories.length + 1;
  const go = useCallback((step: number) => setAt(now => (now + step + slides) % slides), [slides]);
  useEffect(() => {
    if (mode !== "one" || held || stories.length === 0) return;
    const timer = window.setTimeout(() => go(1), HOLD);
    return () => window.clearTimeout(timer);
  }, [mode, held, at, go, stories.length]);
  useEffect(() => { if (at >= slides) setAt(0); }, [at, slides]);

  // The controls step aside while nobody touches anything.
  const wake = useCallback(() => {
    setQuiet(false);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setQuiet(true), IDLE);
  }, []);
  useEffect(() => {
    wake();
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1); else if (event.key === "ArrowLeft") go(-1); else if (event.key === " ") { event.preventDefault(); setHeld(value => !value); } else return;
      wake();
    };
    const screen = () => setFull(Boolean(document.fullscreenElement));
    addEventListener("keydown", key); addEventListener("pointermove", wake); addEventListener("pointerdown", wake); document.addEventListener("fullscreenchange", screen);
    return () => { removeEventListener("keydown", key); removeEventListener("pointermove", wake); removeEventListener("pointerdown", wake); document.removeEventListener("fullscreenchange", screen); window.clearTimeout(idle.current); };
  }, [go, wake]);
  // (An iPhone cannot put a page in full screen: there, the button is left out.)
  const [canFull, setCanFull] = useState(false);
  useEffect(() => setCanFull(typeof document.documentElement.requestFullscreen === "function"), []);
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); };

  const logo = <Image className={c.logo} src="/contygo/brand/logo-dark.png" alt="ContyGo" width={3000} height={849} sizes="170px" priority />;
  if (state !== "ready" && !sample) return <main className={c.show}><div className={c.notice}>
    {logo}
    {state === "loading" && <p>Cargando las felicitaciones…</p>}
    {state === "signin" && <><p>Entra a tu panel para mostrar las felicitaciones.</p><a href="/admin">Entrar al panel</a></>}
    {state === "off" && <><p>Todavía no está conectado el almacén de las felicitaciones.</p><a href="/admin">Volver al panel</a></>}
    {state === "error" && <><p>No pudimos leer las felicitaciones. Inténtalo de nuevo.</p><button type="button" onClick={() => { setState("loading"); void load(); }}>Reintentar</button></>}
  </div></main>;
  if (stories.length === 0) return <main className={c.show}><div className={c.notice}>{logo}<p>Aún no has aprobado ninguna felicitación. Apruébalas en tu panel y aparecerán aquí.</p><a href="/admin">Ir al panel</a></div></main>;

  const story = at > 0 ? stories[at - 1] : null;
  return <main className={c.show} data-mode={mode} data-quiet={quiet || undefined}>
    <header className={c.top}>
      {logo}
      <span className={c.label}><i />Felicitaciones</span>
      <div className={c.controls}>
        <button type="button" aria-pressed={mode === "one"} onClick={() => setMode("one")}>Una por una</button>
        <button type="button" aria-pressed={mode === "wall"} onClick={() => setMode("wall")}>Muro</button>
        {canFull && <button type="button" onClick={fullscreen}><span className={c.long}>{full ? "Salir de pantalla completa" : "Pantalla completa"}</span><span className={c.short}>{full ? "Salir" : "Completa"}</span></button>}
        <a href="/admin">Panel</a>
      </div>
    </header>
    {sample && <p className={c.sample}>Ejemplo: cifras y felicitaciones de muestra, para ver el diseño.</p>}

    {mode === "one"
      ? <section className={c.stage} aria-live="off" aria-label="Felicitaciones, una por una">
        <div className={c.slide} key={at} data-cover={story ? undefined : ""}>
          {story ? <Story review={story} big /> : <div className={c.cover}>
            <h1>Aprobados, <em>uno por uno.</em></h1>
            <p>Clientes de ContyGo que ya recibieron su aprobación, contado por ellos.</p>
            {total > 0 && <div className={c.total}><Flaps value={total} pad={String(total).length} /><span>{counts}</span></div>}
          </div>}
        </div>
        <button type="button" className={c.prev} onClick={() => go(-1)} aria-label="Anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
        <button type="button" className={c.next} onClick={() => go(1)} aria-label="Siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
        <div className={c.track}>
          <button type="button" className={c.hold} onClick={() => setHeld(value => !value)} aria-pressed={held}>{held ? "Seguir" : "Pausar"}</button>
          <span className={c.dots} aria-hidden="true">{Array.from({ length: slides }, (_, n) => <i key={n} data-on={n === at || undefined} data-run={n === at && !held ? "" : undefined} style={{ "--hold": `${HOLD}ms` } as CSSProperties} />)}</span>
          <span className={c.count}>{at === 0 ? "Inicio" : `${at} de ${stories.length}`}</span>
        </div>
      </section>
      : <section className={c.wall} aria-label="Todas las felicitaciones">
        <div className={c.cover}>
          <h1>Aprobados, <em>uno por uno.</em></h1>
          <p>Clientes de ContyGo que ya recibieron su aprobación, contado por ellos.</p>
        </div>
        {rows.length > 0 && <div className={c.panel}>
          <div className={c.total}><Flaps value={total} pad={String(total).length} /><span>{counts}</span></div>
          <ul className={c.rows}>{rows.map(row => <li key={row.label}>
            <span className={c.art} aria-hidden="true">{row.serviceId && <Image src={`/contygo/v8/servicio-${row.serviceId}.webp`} alt="" width={96} height={96} sizes="48px" />}</span>
            <strong>{row.label}</strong>
            <Flaps value={row.approved} pad={pad} />
          </li>)}</ul>
        </div>}
        <ul className={c.cards}>{stories.map((review, n) => <li key={n}><Story review={review} /></li>)}</ul>
      </section>}

    <footer className={c.foot}>{real && CONTYGO_RESULTS.updatedOn ? `Contado el ${CONTYGO_RESULTS.updatedOn.split("-").reverse().join("/")}. ` : ""}{FINE}</footer>
  </main>;
}
