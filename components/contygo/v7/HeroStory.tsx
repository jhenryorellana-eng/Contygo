"use client";

/* El hero, vivo (21-11-2026). El dueño: «quiero que se sienta viva… me gusta la imagen de la chica pero me gustaría
   que también muestre el celular… más imágenes que pasen la una y la otra y se sienta como si fuera un video corto de
   3 o 5 segundos, como gif, de cómo ella mira y luego muestra la pantalla, y en esta debe estar el logo y la
   plataforma de ContyGo bien diseñado», en el celular y en escritorio.
   - HeroStory: tres fotos de la misma escena que se funden una en otra y vuelven a empezar: ella mira su celular,
     levanta la mirada y lo muestra a la cámara. Las dos nuevas se hicieron con Codex a partir de la foto del hero, en
     los dos temas, con la cinta en su sitio (el hilo de la página sale de ella: la primera <img> sigue siendo la foto
     de siempre, que GreenThread lee).
   - La pantalla del teléfono no es parte de la foto: es la app dibujada en código (HeroScreen), nítida a cualquier
     tamaño, colocada sobre la pantalla con la perspectiva de la foto (`screen`: sus cuatro esquinas, en milésimas del
     cuadro; las halla scratchpad/heroframes.cjs, que además pinta esa pantalla del color de la bienvenida). Aparece
     el logo y luego el trámite de ejemplo, que avanza; a media escena la pantalla sale del teléfono hacia quien mira
     (LIFT), para que se lea también en un celular. Es una ilustración con datos de ejemplo, como la del teléfono de
     la sección «Tu expediente».
   - HeroCaption: las cifras, que eran una franja bajo el hero («horrible, ordinario»; como boleto en tinta tampoco:
     «no me gusta»), son ahora un rótulo sobre la foto, como el de una película: una cifra a la vez, que va cambiando.
   - El titular, «más cinematográfico» (clases .title, .copy y .alive, que pone ContygoLanding): entra línea por línea
     desde detrás de su borde, enfocándose; «ContyGo.» lleva el brillo de satén de la cinta, que lo recorre despacio; y
     detrás de todo, dos luces que se mueven muy lento.
   - HeroLane: la franja bajo el hero por cuyo borde pasa el hilo verde (data-thread="facts", GreenThread). Sin ella el
     hilo cruza la página por el medio: el dueño lo vio así un rato y pidió «la ruta de la línea verde como estaba».
     Lleva el rótulo de cifras en pantalla ancha, al pie de la foto, lejos de la línea.
   - HeroFlag: la bandera de Estados Unidos, flameando, junto al titular («añádele una bandera americana flameando»).
     Se dibuja en un lienzo: la bandera exacta (13 franjas, 50 estrellas) y, columna a columna, la onda de la tela con
     su luz y su sombra, como el satén de la cinta. Se detiene fuera de pantalla y con «reducir movimiento».
   Con «reducir movimiento» no hay secuencia: queda la última foto, con la pantalla ya abierta.
   Henry en lugar de la modelo (22-11-2026). El dueño: «quiero cambiar la figura de la chica por Henry en el hero, con
   las mismas poses, pero viste a Henry de tal forma que combine su ropa tanto con el modo noche y modo día». Las seis
   fotos (tres poses, dos temas) se hicieron con Codex a partir de las anteriores y de tres retratos suyos de estudio
   (motor-contygo/referencias/henry): blazer verde bosque sobre camisa blanca, que se despega del fondo blanco y del
   azul marino. La cinta quedó en su sitio (sale por el mismo punto) y la pantalla se volvió a medir
   (scratchpad/henryframes.cjs). Las fotos de la modelo siguen en public/contygo (v7/hero-*.webp, v8/hero-*-2/3.webp). */
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import h from "./HeroStory.module.css";

type Theme = "light" | "dark";
type Point = readonly [number, number];
type Frame = { src: string; /** How long it stays, in ms. */ hold: number; /** The phone's screen: top-left, top-right, bottom-right, bottom-left. */ screen?: readonly [Point, Point, Point, Point] };

/** `exit`: where the ribbon leaves the image through its bottom edge, as a fraction of its width (GreenThread). */
export const HERO_STORY: Record<Theme, { exit: number; frames: readonly Frame[] }> = {
  light: { exit: .1746, frames: [
    { src: "/contygo/v8/hero-henry-claro-1.webp", hold: 2300 },
    { src: "/contygo/v8/hero-henry-claro-2.webp", hold: 1100 },
    { src: "/contygo/v8/hero-henry-claro-3.webp", hold: 5600, screen: [[263, 413.3], [450.8, 413.3], [450.8, 815.8], [264, 815.8]] },
  ] },
  dark: { exit: .1754, frames: [
    { src: "/contygo/v8/hero-henry-oscuro-1.webp", hold: 2300 },
    { src: "/contygo/v8/hero-henry-oscuro-2.webp", hold: 1100 },
    { src: "/contygo/v8/hero-henry-oscuro-3.webp", hold: 5600, screen: [[240.8, 360], [464.7, 360], [467.5, 847.5], [240.8, 847.5]] },
  ] },
};

/* The app's screen is drawn at this size and then laid over the photo's phone. LIFT: how wide it grows, in
   thousandths of the photo, when it comes out of the phone, and when (ms after she shows it). */
const SCREEN_W = 300, SCREEN_H = 640, LIFT = 292, LIFT_AT = 2500;
/** The screen out of the phone: upright, larger, around the same centre (and clear of the caption at the photo's foot). */
function lifted(quad: readonly [Point, Point, Point, Point]): [Point, Point, Point, Point] {
  const cx = quad.reduce((sum, p) => sum + p[0], 0) / 4, w = LIFT, tall = LIFT * SCREEN_H / SCREEN_W;
  const cy = Math.min(quad.reduce((sum, p) => sum + p[1], 0) / 4 - 26, 905 - tall / 2), x = cx - w / 2 - 8, y = cy - tall / 2;
  return [[x, y], [x + w, y], [x + w, y + tall], [x, y + tall]];
}

/** The CSS matrix that carries a w×h box onto four points (a homography), for `transform: matrix3d()`. */
function onto(quad: readonly [Point, Point, Point, Point], w: number, h: number) {
  const from: Point[] = [[0, 0], [w, 0], [w, h], [0, h]];
  // Eight equations, eight unknowns (a…h), solved by elimination.
  const rows = from.flatMap(([x, y], i) => { const [u, v] = quad[i]; return [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]]; });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const lead = rows[col][col] || 1e-9;
    for (let c = col; c < 9; c++) rows[col][c] /= lead;
    for (let r = 0; r < 8; r++) if (r !== col) { const k = rows[r][col]; for (let c = col; c < 9; c++) rows[r][c] -= k * rows[col][c]; }
  }
  const [a, b, c, d, e, f, g, i] = rows.map(row => row[8]);
  return `matrix3d(${[a, d, 0, g, b, e, 0, i, 0, 0, 1, 0, c, f, 0, 1].map(n => +n.toFixed(6)).join(",")})`;
}

const CHECK = "m6 12 4 4 8-8";
const STEPS = ["Contrato firmado", "Tus documentos", "Revisión del equipo", "Tu paquete listo"];

/** The app on the phone she shows: first the logo, then an example case moving forward. */
function HeroScreen() {
  return <div className={h.app}>
    <div className={h.status}><b>9:41</b><i /><span /></div>
    <div className={h.bar}><Image src="/contygo/brand/logo-light.png" alt="" width={3000} height={849} sizes="160px" /><span>A</span></div>
    <p className={h.hello}>Hola, Ana</p>
    <p className={h.sub}>Así va tu trámite</p>
    <div className={h.case}>
      <div className={h.caseTop}><span>Permiso de trabajo</span><em><i />En preparación</em></div>
      <div className={h.progress}>
        <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle cx="22" cy="22" r="18" pathLength="100" /></svg>
        <div><strong>Paso 3 de 4</strong><span>Revisión del equipo</span></div>
      </div>
      <ol>{STEPS.map((step, n) => <li key={step} data-state={n < 2 ? "done" : n === 2 ? "now" : "next"} style={{ "--n": n } as CSSProperties}><i>{n < 2 && <svg viewBox="0 0 24 24"><path d={CHECK} /></svg>}</i>{step}</li>)}</ol>
    </div>
    <div className={h.toast}><span><Image src="/contygo/brand/symbol-dark.png" alt="" width={1024} height={1024} sizes="40px" /></span><div><strong>Soporte ContyGo</strong><em>Recibimos tu documento.</em></div></div>
    <span className={h.continue}>Ver mi trámite</span>
    {/* The welcome: the brand's symbol and logo, which then make way for the app. */}
    <div className={h.splash}><Image src="/contygo/brand/symbol-dark.png" alt="" width={1024} height={1024} sizes="120px" /><Image src="/contygo/brand/logo-dark.png" alt="" width={3000} height={849} sizes="200px" /></div>
  </div>;
}

export default function HeroStory({ theme, lift = true }: { theme: Theme; /** Whether the app's screen comes out of the phone, larger, while she shows it. */ lift?: boolean }) {
  const { frames } = HERO_STORY[theme];
  const last = frames.length - 1;
  const [at, setAt] = useState(0), [round, setRound] = useState(0), [ready, setReady] = useState(false), [still, setStill] = useState(false), [out, setOut] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const loaded = useRef(new Set<string>());

  // The story starts over when the appearance changes: its photos are others.
  useEffect(() => { setAt(0); setReady(false); loaded.current = new Set(); }, [theme]);
  // The later photos load after the first one is on screen; the story begins once all of them are in.
  useEffect(() => {
    let alive = true;
    const calm = matchMedia("(prefers-reduced-motion: reduce)"), settle = () => setStill(calm.matches);
    settle(); calm.addEventListener("change", settle);
    frames.slice(1).forEach(frame => { const img = new window.Image(); img.onload = () => { loaded.current.add(frame.src); if (alive && loaded.current.size >= last) setReady(true); }; img.src = frame.src; });
    return () => { alive = false; calm.removeEventListener("change", settle); };
  }, [frames, last]);
  // One photo after another, each for its time; it waits while the hero is off screen or the tab is hidden.
  useEffect(() => {
    if (!ready || still) return;
    const el = stage.current;
    let seen = true, timer = 0;
    const next = () => { if (seen && !document.hidden) setAt(now => { const to = (now + 1) % frames.length; if (to === last) setRound(n => n + 1); return to; }); };
    timer = window.setTimeout(next, frames[at].hold);
    // Back on screen after being away, it goes on shortly (the first report, on watching, is not a return).
    let first = true;
    const watch = el ? new IntersectionObserver(entries => { const was = seen; seen = entries[0].isIntersecting; if (first) { first = false; return; } if (seen && !was) { clearTimeout(timer); timer = window.setTimeout(next, 900); } }, { threshold: .2 }) : null;
    if (el && watch) watch.observe(el);
    const wake = () => { if (!document.hidden) { clearTimeout(timer); timer = window.setTimeout(next, 900); } };
    document.addEventListener("visibilitychange", wake);
    return () => { clearTimeout(timer); watch?.disconnect(); document.removeEventListener("visibilitychange", wake); };
  }, [at, ready, still, frames, last]);

  // While she shows the phone, its screen comes out of it after a moment, and goes back in before she looks down again.
  useEffect(() => {
    if (at !== last || still || !lift) { setOut(false); return; }
    const up = window.setTimeout(() => setOut(true), LIFT_AT), down = window.setTimeout(() => setOut(false), frames[last].hold - 450);
    return () => { clearTimeout(up); clearTimeout(down); };
  }, [at, last, still, frames, lift]);

  // The app's screen is placed in thousandths of the photo; --k turns them into the pixels of the photo on screen.
  useEffect(() => {
    const el = stage.current, box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => el.style.setProperty("--k", (Math.min(box.clientWidth, box.clientHeight) / 1000).toFixed(5));
    fit();
    const watch = new ResizeObserver(fit); watch.observe(box);
    return () => watch.disconnect();
  }, []);

  const shown = still && ready ? last : at, screen = frames[last].screen;
  return <>
    {frames.map((frame, i) => <Image key={frame.src} className={h.frame} data-on={shown === i ? "" : undefined} data-step={i} src={frame.src} fill unoptimized priority={i === 0} loading={i === 0 ? undefined : "lazy"} sizes="(max-width:760px) 100vw, 52vw"
      alt={i === 0 ? "Henry Orellana mira un trámite en el celular, levanta la mirada y muestra a la cámara la pantalla con la app de ContyGo; de la pantalla sale una cinta verde que sube hasta el símbolo de ContyGo." : ""} aria-hidden={i === 0 ? undefined : true} />)}
    <div ref={stage} className={h.stage} data-on={shown === last && ready ? "" : undefined} aria-hidden="true">
      {screen && <div key={`${theme}-${round}`} className={h.screen} data-out={out ? "" : undefined} style={{ width: SCREEN_W, height: SCREEN_H, transform: onto(out ? lifted(screen) : screen, SCREEN_W, SCREEN_H) }}><HeroScreen /></div>}
    </div>
  </>;
}

/** The figures, as a caption on the photo, the way a film names what is on screen: one at a time, changing. The
 *  figures and their words are the page's own; a reader of the page (not its eyes) gets them all at once. */
export function HeroCaption({ paidCount, fromPrice, clients, where }: { paidCount: number; fromPrice: string | null; clients: string | null; /** On the photo (a phone) or on the lane under the hero, at the photo's foot (a wide screen). */ where: "art" | "lane" }) {
  const facts: [string, string][] = [
    [String(paidCount), "servicios con precio publicado"],
    ...(fromPrice ? [[fromPrice, "honorarios desde"] as [string, string]] : []),
    ...(clients ? [[clients.split(" ")[0], clients.split(" ").slice(1).join(" ")] as [string, string]] : []),
    ["100%", "en español, desde tu celular"],
  ];
  const [at, setAt] = useState(0);
  const count = facts.length;
  useEffect(() => {
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => { if (!document.hidden) setAt(now => (now + 1) % count); }, calm.matches ? 4600 : 2900);
    return () => clearInterval(timer);
  }, [count]);
  return <div className={h.caption} data-where={where}>
    <ul className={h.sr} aria-label="ContyGo en cifras">{facts.map(([figure, words]) => <li key={words}>{figure} {words}</li>)}</ul>
    <p aria-hidden="true">{facts.map(([figure, words], i) => <span key={words} data-on={i === at ? "" : undefined} data-was={i === (at + count - 1) % count ? "" : undefined}><b>{figure}</b>{words}</span>)}</p>
  </div>;
}

/** The lane under the hero: the green thread runs along it on its way to the page's margin (GreenThread reads
 *  data-thread="facts"), as it did along the band of figures. On a wide screen the figures' caption sits at its far end. */
export function HeroLane({ figures, ...props }: { figures: boolean; paidCount: number; fromPrice: string | null; clients: string | null }) {
  return <div className={h.lane} data-thread="facts">{figures && <HeroCaption where="lane" {...props} />}</div>;
}

/* The flag of the United States, exact: 13 stripes, and 50 stars in nine rows on the canton. */
const FLAG_W = 760, FLAG_H = 400, RED = "#b22234", BLUE = "#3c3b6e";
function flagCloth() {
  const cloth = document.createElement("canvas"); cloth.width = FLAG_W; cloth.height = FLAG_H;
  const c = cloth.getContext("2d");
  if (!c) return cloth;
  const stripe = FLAG_H / 13, cw = FLAG_W * .4, chh = stripe * 7;
  for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? "#fff" : RED; c.fillRect(0, i * stripe, FLAG_W, stripe + .5); }
  c.fillStyle = BLUE; c.fillRect(0, 0, cw, chh);
  c.fillStyle = "#fff";
  const r = stripe * .31;
  for (let row = 0; row < 9; row++) { const n = row % 2 ? 5 : 6; for (let k = 0; k < n; k++) {
    const x = cw * ((row % 2 ? 2 : 1) + k * 2) / 12, y = chh * (row + 1) / 10;
    c.beginPath(); for (let p = 0; p < 10; p++) { const a = -Math.PI / 2 + p * Math.PI / 5, d = p % 2 ? r * .4 : r; c.lineTo(x + d * Math.cos(a), y + d * Math.sin(a)); } c.closePath(); c.fill();
  } }
  // A faint weave, so the cloth is not flat colour.
  const weave = c.createLinearGradient(0, 0, 0, FLAG_H); weave.addColorStop(0, "#ffffff1f"); weave.addColorStop(.5, "#ffffff00"); weave.addColorStop(1, "#00102e26");
  c.fillStyle = weave; c.fillRect(0, 0, FLAG_W, FLAG_H);
  return cloth;
}

export function HeroFlag() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current, c = el?.getContext("2d");
    if (!el || !c) return;
    const cloth = flagCloth(), calm = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, seen = true, w = 0, hgt = 0, last = 0;
    const size = () => { const ratio = Math.min(devicePixelRatio || 1, 2); w = Math.round(el.clientWidth * ratio); hgt = Math.round(el.clientHeight * ratio); el.width = w; el.height = hgt; c.imageSmoothingQuality = "high"; };
    // Column by column: the cloth rises and falls in a wave that grows toward its free end. Its top and its foot run
    // a little out of step, so the folds lean, as in real cloth; the slopes that face the light shine like satin and
    // the ones that face away go dark.
    const wave = (u: number, t: number, shift: number) => Math.sin(u * 6.6 - t * 2.4 + shift) * .58 + Math.sin(u * 11.8 - t * 3.5 + 1.3 + shift * 1.6) * .24 + Math.sin(u * 3.1 - t * 1.3 + 2.1) * .18;
    const draw = (now: number) => {
      const t = now / 1000, pad = hgt * .19, fh = hgt - pad * 2, step = Math.max(2, Math.round(w / 200)), half = FLAG_H / 2;
      c.clearRect(0, 0, w, hgt);
      c.globalCompositeOperation = "source-over";
      for (let x = 0; x < w; x += step) {
        const u = x / w, grow = .1 + .9 * Math.pow(u, .8), reach = pad * .82 * grow;
        const top = pad + wave(u, t, .42) * reach, mid = pad + fh / 2 + wave(u, t, 0) * reach, foot = pad + fh + wave(u, t, -.42) * reach;
        const sx = u * FLAG_W, sw = step / w * FLAG_W + 1;
        c.drawImage(cloth, sx, 0, sw, half, x, top, step + .6, mid - top + .5);
        c.drawImage(cloth, sx, half, sw, half, x, mid, step + .6, foot - mid);
      }
      c.globalCompositeOperation = "source-atop";
      for (let x = 0; x < w; x += step) {
        const u = x / w, grow = .1 + .9 * Math.pow(u, .8);
        const slope = Math.cos(u * 6.6 - t * 2.4) * .66 + Math.cos(u * 11.8 - t * 3.5 + 1.3) * .34;
        const shine = slope > 0 ? slope * .24 + Math.pow(slope, 5) * .5 : 0;
        c.fillStyle = slope > 0 ? `rgba(255,255,255,${(shine * grow).toFixed(3)})` : `rgba(4,18,43,${(-slope * .42 * grow).toFixed(3)})`;
        c.fillRect(x, 0, step, hgt);
      }
    };
    const loop = (now: number) => { frame = 0; if (now - last > 30) { last = now; draw(now); } if (seen && !document.hidden && !calm.matches) frame = requestAnimationFrame(loop); };
    const start = () => { if (!frame) frame = requestAnimationFrame(loop); };
    size(); draw(1400); start();
    const resize = new ResizeObserver(() => { size(); draw(performance.now()); }); resize.observe(el);
    const watch = new IntersectionObserver(entries => { seen = entries[0].isIntersecting; if (seen) start(); }); watch.observe(el);
    document.addEventListener("visibilitychange", start);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); watch.disconnect(); document.removeEventListener("visibilitychange", start); };
  }, []);
  return <span className={h.flag} aria-hidden="true"><canvas ref={canvas} /></span>;
}
