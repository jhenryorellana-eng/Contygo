"use client";

/* Felicitaciones, en vivo (21-11-2026). El dueño: «que no salga en la página principal, sino que esté en el dashboard
   de Henry y que él pueda enseñarlo cuando él quiera, ya que quiere mostrarlo en un live».
   Una presentación a pantalla completa, con la sesión del dueño, de las felicitaciones que él aprobó en su panel:
   - «Una por una»: cada felicitación ocupa la pantalla (su foto entera, el sello «Aprobado», lo que cuenta, su nombre,
     su trámite y desde dónde) y pasa sola a la siguiente; abre una portada con la cuenta en cifras de paletas.
   - «Muro»: todas juntas, para recorrerlas con el dedo, con el tablero por servicio.
   - El marcador (24-11-2026): si el contador de casos tiene cifras (lib/case-counter.ts, las lleva el encargado), la
     portada abre con sus tres totales —creados, en proceso, ganados— y la segunda pantalla los da servicio por servicio.
     Un código QR lleva a quien mira el live a la página.
   Vale para un live vertical (teléfono) y para compartir pantalla (apaisado). Los mandos se esconden solos.
   Sin datos inventados (lib/contygo-results.ts): las felicitaciones son las aprobadas; las cuentas, las que el dueño
   confirme o, si no, las aprobaciones que los propios clientes compartieron (y lo dice). Con «Ver ejemplos» (o en
   desarrollo sin nada aprobado) se ve con datos de EJEMPLO, bajo un aviso que lo dice y nunca mezclados con los reales. Lo que se muestra en un live es publicidad: la pantalla
   lleva siempre que un resultado anterior no garantiza otro y que la decisión es de la autoridad. */
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { BOARD_FROM, CONTYGO_RESULTS, RESULTS_SAMPLE, REVIEWS_SAMPLE, SCORE_SAMPLE, resultsPublic, type PublicReview, type ResultRow, type Score } from "@/lib/contygo-results";
import c from "./CongratsShow.module.css";

const DEV = process.env.NODE_ENV === "development";
const HOLD = 9000, IDLE = 2800;
const FINE = "Cada caso es distinto: un resultado anterior no garantiza el tuyo. La decisión es de la autoridad.";
type Row = { name: string; service_id: string | null; rating: number; comment: string; kind?: string; place?: string | null; image_url?: string | null };
/** The three figures of the scoreboard, as the audience of a live reads them. */
const TRIO = [{ key: "created", label: "Casos creados" }, { key: "pending", label: "En proceso" }, { key: "won", label: "Ganados" }] as const;
type Counted = { services: { id: string; name: string }[]; counter: { updatedAt: string | null; updatedBy: string | null; rows: Record<string, { created: number; pending: number; won: number }> }; totals: Score["totals"] };
const Star = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.9l-5.38 2.9 1.03-6L3.3 9.6l6-.9Z" fill="currentColor" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-8" /></svg>;

/** A number on the board: one flap per digit, each a reel that turns to its digit. */
export function Flaps({ value, pad }: { value: number; pad: number }) {
  const digits = String(value).padStart(pad, " ").split("");
  return <span className={c.flaps} role="img" aria-label={String(value)}>{digits.map((digit, k) => <span key={k} className={c.flap} data-blank={digit === " " || undefined} style={{ "--d": digit === " " ? 0 : Number(digit), "--k": k } as CSSProperties}>
    <span aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <i key={n}>{n}</i>)}</span>
  </span>)}</span>;
}

function Story({ review, big, example }: { review: PublicReview; big?: boolean; example?: boolean }) {
  // A long story is set smaller, so it still fits the screen.
  const size = review.comment.length > 380 ? .62 : review.comment.length > 240 ? .74 : review.comment.length > 130 ? .88 : 1;
  return <article className={c.story} data-big={big || undefined} data-photo={review.image ? "" : undefined} style={big ? { "--s": size } as CSSProperties : undefined}>
    {/* The photo is the client's own, from the owner's storage: a plain <img>. It shows whole; what the frame has left over is the same photo, blurred. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {review.image && <span className={c.photo} style={{ "--img": `url(${JSON.stringify(review.image)})` } as CSSProperties}><img src={review.image} alt={`Foto que compartió ${review.name}`} /></span>}
    <div className={c.said}>
      {example && <span className={c.example}>Ejemplo</span>}
      {review.kind === "approval" && <span className={c.stamp}><Check />Aprobado</span>}
      <span className={c.stars} role="img" aria-label={`${review.rating} de 5 estrellas`}>{[1, 2, 3, 4, 5].map(n => <i key={n} data-on={n <= review.rating || undefined}><Star /></i>)}</span>
      <blockquote>{review.comment}</blockquote>
      <span className={c.who}><b>{review.name}</b>{(review.service || review.place) && <span>{[review.service, review.place].filter(Boolean).join(", ")}</span>}</span>
    </div>
  </article>;
}

/** The three totals as a scoreboard, for the show and for the landing's section. */
export function ScoreTrio({ totals, style }: { totals: Score["totals"]; style?: CSSProperties }) {
  return <div className={c.trio} style={style}>{TRIO.map(item => <div key={item.key} data-kind={item.key}><Flaps value={totals[item.key]} pad={String(totals[item.key]).length} /><span>{item.label}</span></div>)}</div>;
}

/** What the page gives the public (GET /api/felicitaciones): the scoreboard and the stories approved to be shown there. */
export type PublicShow = { score: { totals: Score["totals"]; rows: Score["rows"]; updatedAt: string | null } | null; stories: (Row & { id: string })[] };
const toStory = (row: Row): PublicReview => ({ name: row.name, serviceId: row.service_id, service: CONTYGO_SERVICES.find(item => item.id === row.service_id)?.name ?? null, rating: row.rating, comment: row.comment, kind: row.kind === "approval" ? "approval" : "review", place: row.place ?? null, image: row.image_url ?? null });

/** `variant="public"` (24-11-2026) is the same show opened from the landing, for a visitor: it reads only what the page
    may show, never examples, has no panel controls, closes like a window and ends in «Hacer mi contrato». */
export default function CongratsShow({ variant = "panel", skin, photo, onClose, onStart }: { variant?: "panel" | "public"; /** How the landing dresses it: Henry stands by its cover, as in the section that opens it (TrustBoard), in the same photograph. */ skin?: "henry"; photo?: string; onClose?: () => void; onStart?: () => void } = {}) {
  const open = variant === "public";
  const [state, setState] = useState<"loading" | "ready" | "signin" | "off" | "error">("loading");
  const [approved, setApproved] = useState<PublicReview[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [mode, setMode] = useState<"one" | "wall">("one"), [at, setAt] = useState(0), [held, setHeld] = useState(false), [quiet, setQuiet] = useState(false), [full, setFull] = useState(false);
  const idle = useRef<number>();
  // «Ver ejemplos»: the owner asks to see how it would look. With ?ejemplos=1 the page opens that way.
  const [example, setExample] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("ejemplos") === "1") setExample(true); }, []);

  const load = useCallback(async () => {
    try {
      if (open) {
        const reply = await fetch("/api/felicitaciones");
        if (!reply.ok) return setState("error");
        const body = await reply.json() as PublicShow;
        setApproved(body.stories.map(toStory));
        setScore(body.score ? { ...body.score, updatedBy: null } : null);
        return setState("ready");
      }
      const response = await fetch("/api/admin/reviews?status=approved", { cache: "no-store" });
      if (response.status === 401) return setState("signin");
      if (response.status === 503) return setState("off");
      if (!response.ok) return setState("error");
      const rows = (await response.json()) as Row[];
      setApproved(rows.map(toStory));
      setState("ready");
      // The case counter (lib/case-counter.ts), kept up to date by the person in charge: the scoreboard of the show.
      const counted = await fetch("/api/admin/cases", { cache: "no-store" }).then(reply => reply.ok ? reply.json() as Promise<Counted> : null).catch(() => null);
      if (counted) setScore({ totals: counted.totals, updatedAt: counted.counter.updatedAt, updatedBy: counted.counter.updatedBy,
        rows: counted.services.map(service => ({ serviceId: service.id, label: service.name, ...counted.counter.rows[service.id] })).filter(row => row.created > 0 || row.pending > 0 || row.won > 0).sort((x, y) => y.created - x.created) });
    } catch { setState("error"); }
  }, [open]);
  useEffect(() => { void load(); }, [load]);

  // Examples, marked as such and never mixed with real stories: when the owner asks for them, or in development with
  // nothing approved yet. Only inside the panel: someone not signed in sees the sign-in notice, not the examples.
  const sample = !open && state !== "loading" && state !== "signin" && (example || (DEV && approved.length === 0));
  const stories = sample ? REVIEWS_SAMPLE : approved;
  // The scoreboard: the counter's figures once it has any; in example mode, the example's.
  const board: Score | null = sample ? SCORE_SAMPLE : score && score.totals.created + score.totals.pending + score.totals.won > 0 ? score : null;
  const asOf = board?.updatedAt ? new Date(board.updatedAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : null;
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

  // One by one: the cover first, the scoreboard by service if there is one, then each story; it moves on by itself.
  const lead = board ? 2 : 1, slides = stories.length + lead;
  const go = useCallback((step: number) => setAt(now => (now + step + slides) % slides), [slides]);
  useEffect(() => {
    if (mode !== "one" || held || slides <= 1) return;
    const timer = window.setTimeout(() => go(1), HOLD);
    return () => window.clearTimeout(timer);
  }, [mode, held, at, go, slides]);
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
      if (event.key === "Escape" && onClose) { onClose(); return; }
      if (event.key === "ArrowRight") go(1); else if (event.key === "ArrowLeft") go(-1); else if (event.key === " ") { event.preventDefault(); setHeld(value => !value); } else return;
      wake();
    };
    const screen = () => setFull(Boolean(document.fullscreenElement));
    addEventListener("keydown", key); addEventListener("pointermove", wake); addEventListener("pointerdown", wake); document.addEventListener("fullscreenchange", screen);
    return () => { removeEventListener("keydown", key); removeEventListener("pointermove", wake); removeEventListener("pointerdown", wake); document.removeEventListener("fullscreenchange", screen); window.clearTimeout(idle.current); };
  }, [go, wake, onClose]);
  // (An iPhone cannot put a page in full screen: there, the button is left out.)
  const [canFull, setCanFull] = useState(false);
  useEffect(() => setCanFull(typeof document.documentElement.requestFullscreen === "function"), []);
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); };

  const logo = <Image className={c.logo} src="/contygo/brand/logo-dark.png" alt="ContyGo" width={3000} height={849} sizes="170px" priority />;
  const shut = open && onClose ? <button type="button" onClick={onClose}>Cerrar</button> : null;
  if (state !== "ready" && !sample) return <main className={c.show} data-skin={skin} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label={open ? "Casos de ContyGo" : undefined}><div className={c.notice}>
    {logo}
    {state === "loading" && <p>Cargando…</p>}
    {open && state === "error" && <><p>No pudimos cargar los casos. Inténtalo de nuevo.</p><button type="button" onClick={() => { setState("loading"); void load(); }}>Reintentar</button>{shut}</>}
    {state === "signin" && <><p>Entra a tu panel para mostrar las felicitaciones.</p><a href="/admin">Entrar al panel</a></>}
    {state === "off" && <><p>Todavía no está conectado el almacén de las felicitaciones.</p><a href="/admin">Volver al panel</a></>}
    {!open && state === "error" && <><p>No pudimos leer las felicitaciones. Inténtalo de nuevo.</p><button type="button" onClick={() => { setState("loading"); void load(); }}>Reintentar</button></>}
  </div></main>;
  if (stories.length === 0 && !board && open) return <main className={c.show} data-skin={skin} role="dialog" aria-modal="true" aria-label="Casos de ContyGo"><div className={c.notice}>{logo}<p>Todavía no hay casos para mostrar aquí.</p>{shut}</div></main>;
  if (stories.length === 0 && !board) return <main className={c.show} data-skin={skin}><div className={c.notice}>{logo}<p>Aún no has aprobado ninguna felicitación. Apruébalas en tu panel y aparecerán aquí.</p><a href="/admin">Ir al panel</a><button type="button" onClick={() => { setAt(0); setExample(true); }}>Ver cómo quedaría, con ejemplos</button></div></main>;

  const story = at >= lead ? stories[at - lead] : null;
  const pad3 = board ? String(Math.max(...board.rows.flatMap(row => [row.created, row.pending, row.won]), 0)).length : 1;
  const trio = board && <ScoreTrio totals={board.totals} />;
  const table = (limit: number) => board && <div className={c.score}>
    <div className={c.scoreHead} aria-hidden="true"><span />{TRIO.map(item => <b key={item.key} data-kind={item.key}>{item.label}</b>)}</div>
    <ul>{board.rows.slice(0, limit).map((row, n) => <li key={row.serviceId} style={{ "--n": n } as CSSProperties}>
      <span className={c.art} aria-hidden="true"><Image src={`/contygo/v8/servicio-${row.serviceId}.webp`} alt="" width={96} height={96} sizes="48px" /></span>
      <strong>{row.label}</strong>
      {TRIO.map(item => <span key={item.key} className={c.cell} data-kind={item.key} aria-label={`${item.label}: ${row[item.key]}`}><Flaps value={row[item.key]} pad={pad3} /></span>)}
    </li>)}</ul>
  </div>;
  // For whoever is watching the live: the way in, to scan.
  const qr = <div className={c.qr}><Image src="/contygo/qr-landing.png" alt="Código QR de landing.contygo.app" width={480} height={480} sizes="124px" unoptimized /><span>Empieza tu trámite<b>landing.contygo.app</b></span></div>;
  const start = open && onStart ? <button type="button" className={c.start} onClick={onStart}>Hacer mi contrato</button> : null;
  return <main className={c.show} data-skin={skin} style={skin === "henry" && photo ? { "--henry": `url(/contygo/casos/henry-${photo}.webp)` } as CSSProperties : undefined} data-mode={mode} data-quiet={quiet || undefined} data-variant={variant} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label={open ? "Casos de ContyGo" : undefined}>
    <header className={c.top}>
      {logo}
      <span className={c.label}><i />{open ? "Casos de ContyGo" : "Felicitaciones"}</span>
      <div className={c.controls}>
        <button type="button" aria-pressed={mode === "one"} onClick={() => setMode("one")}>Una por una</button>
        <button type="button" aria-pressed={mode === "wall"} onClick={() => setMode("wall")}>Muro</button>
        {canFull && <button type="button" onClick={fullscreen}><span className={c.long}>{full ? "Salir de pantalla completa" : "Pantalla completa"}</span><span className={c.short}>{full ? "Salir" : "Completa"}</span></button>}
        {!open && <button type="button" aria-pressed={example} onClick={() => { setAt(0); setExample(value => !value); }}>{example ? "Quitar ejemplos" : "Ver ejemplos"}</button>}
        {open ? <button type="button" className={c.shut} onClick={onClose} autoFocus>Cerrar</button> : <a href="/admin">Panel</a>}
      </div>
    </header>
    {sample && <p className={c.sample}><b>Modo ejemplo.</b> Estas felicitaciones, sus fotos y las cifras son de muestra: no son clientes reales. No lo muestres en un live.</p>}

    {mode === "one"
      ? <section className={c.stage} aria-live="off" aria-label="Felicitaciones, una por una">
        <div className={c.slide} key={at} data-cover={story ? undefined : ""}>
          {story ? <Story review={story} big example={sample} /> : at === 1 && board ? <div className={c.board}>
            <h1>El marcador, <em>servicio por servicio.</em></h1>
            {table(7)}
            {asOf && <p className={c.asof}>Cifras del registro de ContyGo al {asOf}.</p>}
            {start}
          </div> : <div className={c.cover}>
            <h1>Aprobados, <em>uno por uno.</em></h1>
            <p>Clientes de ContyGo que ya recibieron su aprobación, contado por ellos.</p>
            {board ? trio : total > 0 && <div className={c.total}><Flaps value={total} pad={String(total).length} /><span>{counts}</span></div>}
            {asOf && <p className={c.asof}>Cifras del registro de ContyGo al {asOf}.</p>}
            {open ? start : qr}
          </div>}
        </div>
        <button type="button" className={c.prev} onClick={() => go(-1)} aria-label="Anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
        <button type="button" className={c.next} onClick={() => go(1)} aria-label="Siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
        <div className={c.track}>
          <button type="button" className={c.hold} onClick={() => setHeld(value => !value)} aria-pressed={held}>{held ? "Seguir" : "Pausar"}</button>
          <span className={c.dots} aria-hidden="true">{Array.from({ length: slides }, (_, n) => <i key={n} data-on={n === at || undefined} data-run={n === at && !held ? "" : undefined} style={{ "--hold": `${HOLD}ms` } as CSSProperties} />)}</span>
          <span className={c.count}>{at === 0 ? "Inicio" : at < lead ? "Marcador" : `${at - lead + 1} de ${stories.length}`}</span>
        </div>
      </section>
      : <section className={c.wall} aria-label="Todas las felicitaciones">
        <div className={c.cover}>
          <h1>Aprobados, <em>uno por uno.</em></h1>
          <p>Clientes de ContyGo que ya recibieron su aprobación, contado por ellos.</p>
        </div>
        {board && <div className={c.panel}>{trio}{table(14)}{asOf && <p className={c.asof}>Cifras del registro de ContyGo al {asOf}.</p>}</div>}
        {!board && rows.length > 0 && <div className={c.panel}>
          <div className={c.total}><Flaps value={total} pad={String(total).length} /><span>{counts}</span></div>
          <ul className={c.rows}>{rows.map(row => <li key={row.label}>
            <span className={c.art} aria-hidden="true">{row.serviceId && <Image src={`/contygo/v8/servicio-${row.serviceId}.webp`} alt="" width={96} height={96} sizes="48px" />}</span>
            <strong>{row.label}</strong>
            <Flaps value={row.approved} pad={pad} />
          </li>)}</ul>
        </div>}
        {open ? start : qr}
        <ul className={c.cards}>{stories.map((review, n) => <li key={n}><Story review={review} example={sample} /></li>)}</ul>
      </section>}

    <footer className={c.foot}>{real && CONTYGO_RESULTS.updatedOn ? `Contado el ${CONTYGO_RESULTS.updatedOn.split("-").reverse().join("/")}. ` : ""}{FINE}</footer>
  </main>;
}
