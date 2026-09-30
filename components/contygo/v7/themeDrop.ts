/* ============================================================
   ContyGo · cambio de tono con una gota (versión 2, 28-09-2026)

   Una gota de «pintura» del tono nuevo se forma bajo el botón:
   crece colgando de un cuello que se estira y adelgaza hasta
   romperse. El resto del cuello vuelve al botón (que rebota) y
   queda una gotita satélite. La gota cae con gravedad real
   (aceleración constante, no una curva de animación), vibra al
   soltarse y su sombra en el piso se va concentrando. Al tocar
   el borde inferior se aplasta en una lámina, salta una corona
   de gotitas que vuelven a caer y, desde el impacto, el tono
   nuevo se extiende con borde líquido (View Transitions; sin
   ellas, la misma mancha pinta la pantalla).

   Todo se dibuja en un canvas propio: una sola capa, 60 fps.
   «Reducir movimiento»: cambio directo.
   ============================================================ */

type Theme = "light" | "dark";
type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type DocumentWithTransitions = Document & { startViewTransition?: (update: () => void) => ViewTransition };
type Ink = { edge: string; mid: string; core: string; caustic: string; line: string; flood: string };
type Bead = { x: number; y: number; vx: number; vy: number; r: number; landed: number };

const INK: Record<Theme, Ink> = {
  // Tinta marina: núcleo azul donde la luz la atraviesa, cáustica verde de la marca abajo.
  dark: { edge: "#020b1c", mid: "#0a2a5a", core: "#2a6bb6", caustic: "rgba(37,211,102,.55)", line: "rgba(255,255,255,.28)", flood: "#061b3d" },
  // Pintura blanca: sombreada en verde grisáceo para que tenga volumen sobre el marino.
  light: { edge: "#a9c0b6", mid: "#e8f1ed", core: "#ffffff", caustic: "rgba(37,211,102,.35)", line: "rgba(6,27,61,.25)", flood: "#ffffff" },
};

const G = 3400;          // px/s²: 700 px de caída en ~0,64 s, como una gota real filmada a cámara lenta suave
const FORM = .56;        // s: la gota se forma y cuelga
const REVEAL = 1.05;     // s: el tono nuevo se extiende
const TAU = Math.PI * 2;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number, k = 3) => 1 - Math.pow(1 - clamp(t), k);

let busy = false;

/** Deja caer la gota desde `button` y aplica `next` cuando la gota toca el borde inferior. */
export async function dropTheme(button: HTMLElement, next: Theme, apply: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof document.body.animate !== "function") { apply(); return; }
  if (busy) return;
  busy = true;

  const ink = INK[next];
  const current: Theme = next === "dark" ? "light" : "dark";
  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  const box = button.getBoundingClientRect();
  const R = clamp(W * .032, 11, 14);
  const x = box.left + box.width / 2;
  const top = box.bottom - 3;             // el líquido sale del borde inferior del botón
  // The floor is the first surface under the drop: the phone dock when it is showing, else the bottom edge.
  const dock = document.querySelector<HTMLElement>('[class*="dock"][data-show="true"] a')?.getBoundingClientRect();
  const floor = dock && dock.height > 0 && x > dock.left + 30 && x < dock.right - 30 ? dock.top + 1 : H - 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  Object.assign(canvas.style, { position: "fixed", left: "0", top: "0", width: `${W}px`, height: `${H}px`, pointerEvents: "none", zIndex: "2147483000" });
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); busy = false; apply(); return; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // ---- Física precalculada: cuello al romperse, caída y momento del impacto ----
  const pend = pendant(R);
  const pinchY = top + pend(1).cy;                                     // centro de la gota al soltarse
  const v0 = 45;                                                       // ya venía cediendo
  const fallDistance = floor - R - pinchY;
  const fallTime = (-v0 + Math.sqrt(v0 * v0 + 2 * G * fallDistance)) / G;
  const impactAt = FORM + fallTime;
  const vImpact = v0 + G * fallTime;

  // Corona: gotitas repartidas en abanico, más rápidas cuanto más fuerte fue el golpe.
  const crown: Bead[] = [];
  const satellite = { y: top + pend(1).waistY, r: R * .22, vy: 10, landed: 0, done: false };
  const angles = [-170, -156, -142, -128, -115, -102, -90, -78, -65, -52, -38, -24, -10];
  const reach = clamp(vImpact / 2200, .7, 1.4);
  angles.forEach((deg, i) => {
    const a = deg * Math.PI / 180, speed = (210 + ((i * 97) % 11) * 42) * reach;
    crown.push({ x: x + Math.cos(a) * R * 1.3, y: floor - R * .35, vx: Math.cos(a) * speed * 1.15, vy: Math.sin(a) * speed, r: R * (.12 + ((i * 53) % 7) * .03), landed: 0 });
  });

  // El botón acompaña: se tensa mientras gotea y rebota cuando la gota se suelta.
  button.animate([{ transform: "scale(1)" }, { transform: "scale(1.02, .95)", offset: .85 }, { transform: "scale(1)" }], { duration: FORM * 1000, easing: "ease-in" });
  setTimeout(() => button.animate([{ transform: "translateY(0)" }, { transform: "translateY(-3px)", offset: .3 }, { transform: "translateY(1px)", offset: .65 }, { transform: "translateY(0)" }], { duration: 420, easing: "ease-out" }), FORM * 1000);

  // ---- El nuevo tono: con View Transitions se revela el tono nuevo dentro de la mancha ----
  const doc = document as DocumentWithTransitions;
  const root = document.documentElement;
  const maxR = Math.hypot(Math.max(x, W - x), Math.max(floor, H - floor)) * 1.14;
  const radiusAt = (p: number) => maxR * (1 - Math.pow(1 - clamp(p), 2.3));
  let reveal: Animation | null = null;
  let revealStart = 0;         // segundos desde el clic (modo sin View Transitions)
  let applied = false;
  let transition: ViewTransition | null = null;
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  function startReveal() {
    if (typeof doc.startViewTransition !== "function") { revealStart = impactAt; return; }
    root.dataset.themeDrop = "on";
    // The canvas is its own transition group: it stays live and above both snapshots.
    canvas.style.setProperty("view-transition-name", "cg-drop");
    try {
      transition = doc.startViewTransition(() => { apply(); applied = true; });
      transition.ready.then(() => {
        const frames = Array.from({ length: 41 }, (_, k) => ({ clipPath: polygon(blob(x, floor, radiusAt(k / 40), k / 40)) }));
        const delay = Math.max(0, (impactAt - now()) * 1000);
        reveal = root.animate(frames, { duration: REVEAL * 1000, delay, easing: "linear", fill: "both", pseudoElement: "::view-transition-new(root)" });
      }).catch(() => { /* skipped: the theme was still applied */ });
    } catch { if (!applied) { apply(); applied = true; } }
  }

  // ---- Bucle de dibujo ----
  let started = false;
  await new Promise<void>(resolve => {
    const frame = () => {
      const t = now();
      ctx.clearRect(0, 0, W, H);
      // The view transition starts a moment before the impact: its capture pause falls in the fall, not on the splash.
      if (!started && t >= impactAt - .12) { started = true; startReveal(); }

      // Reveal progress (from the animation itself when it exists, so the rim follows the clip exactly).
      let p = -1;
      if (reveal) { const ct = Number(reveal.currentTime ?? 0) - Number(reveal.effect?.getTiming().delay ?? 0); p = clamp(ct / (REVEAL * 1000), -1, 1); }
      else if (revealStart && t >= revealStart) p = clamp((t - revealStart) / REVEAL);
      if (p >= 0) paintFront(ctx, x, floor, radiusAt(p), p, ink, !reveal);
      if (!reveal && revealStart && p >= 1 && !applied) { apply(); applied = true; }

      if (t < FORM) paintForming(ctx, x, top, pend(t / FORM), ink);
      else if (t < impactAt) {
        const tf = t - FORM;
        const cy = pinchY + v0 * tf + G * tf * tf / 2, v = v0 + G * tf;
        paintShadow(ctx, x, floor, R, clamp(1 - (floor - cy - R) / 650), current);
        paintFalling(ctx, x, cy, R, tf, v, ink);
        paintRemnant(ctx, x, top, pend(1), tf, ink);
      } else paintImpact(ctx, x, floor, R, t - impactAt, ink, current);

      // Satellite droplet: born at the pinch, falls behind the drop and lands with a tiny splash.
      if (t >= FORM && !satellite.done) {
        const ts = t - FORM, sy = satellite.y + satellite.vy * ts + G * ts * ts / 2;
        if (sy + satellite.r < floor) paintDrop(ctx, x, sy, satellite.r * .9, satellite.r * 1.1, ink);
        else { if (!satellite.landed) satellite.landed = t; const k = (t - satellite.landed) / .18; if (k >= 1) satellite.done = true; else paintSpot(ctx, x, floor, satellite.r * (1 + 2 * k), 1 - k, ink); }
      }
      if (t >= impactAt) paintCrown(ctx, crown, t - impactAt, floor, ink);

      const ti = t - impactAt;
      const crownDone = ti > 0 && satellite.done && crown.every(b => b.landed && ti - b.landed > .2);
      // Without an animation yet (fallback, or a transition that never became ready) time decides.
      const revealDone = reveal ? (reveal as Animation).playState === "finished" : revealStart ? p >= 1 : ti > REVEAL + .3;
      if ((ti > .3 && crownDone && revealDone) || ti > REVEAL + 2.5) { resolve(); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  try {
    if (transition) await (transition as ViewTransition).finished.catch(() => undefined);
    if (!applied) { apply(); applied = true; }
    if (!transition) await canvas.animate({ opacity: [1, 0] }, { duration: 280, easing: "ease-out", fill: "forwards" }).finished;
  } finally {
    delete root.dataset.themeDrop;
    canvas.remove();
    busy = false;
  }
}

/* ---- Dibujo ---- */

function bodyFill(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ink: Ink) {
  // The light comes from the upper left: highlight there, the lit core and the caustic lower right.
  const g = ctx.createRadialGradient(cx + r * .3, cy + r * .36, r * .05, cx, cy, r * 1.08);
  g.addColorStop(0, ink.core); g.addColorStop(.55, ink.mid); g.addColorStop(1, ink.edge);
  return g;
}

function paintDrop(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, ink: Ink, shine = 1) {
  const r = Math.max(rx, ry);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fillStyle = bodyFill(ctx, cx, cy, r, ink); ctx.fill();
  const c = ctx.createRadialGradient(cx + rx * .12, cy + ry * .6, 0, cx + rx * .12, cy + ry * .6, rx * .8);
  c.addColorStop(0, ink.caustic); c.addColorStop(1, "rgba(37,211,102,0)");
  ctx.fillStyle = c; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = ink.line; ctx.stroke();
  if (r < 3) return;
  ctx.fillStyle = `rgba(255,255,255,${.92 * shine})`;
  ctx.beginPath(); ctx.ellipse(cx - rx * .36, cy - ry * .4, rx * .24, ry * .15, -.65, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${.7 * shine})`;
  ctx.beginPath(); ctx.arc(cx + rx * .38, cy + ry * .18, Math.max(.7, rx * .06), 0, TAU); ctx.fill();
}

type Pendant = { r: number; base: number; waist: number; neck: number; waistY: number; cy: number };

/** Shape of the hanging drop over time (u: 0 → 1, 1 = pinch-off). The bulb grows while still wide at
 *  the button; the neck only forms in the last third and then thins fast, as a real pendant drop does. */
function pendant(R: number) {
  return (u: number): Pendant => {
    const k = clamp(u), s = clamp((k - .6) / .4);
    const r = R * (.32 + .68 * easeOut(k * 1.35));
    const neck = R * (.2 + .3 * k) + R * 1.5 * s * s;
    const waist = Math.max(.3, r * .6 * Math.pow(1 - s, 1.5));
    return { r, base: R * (.62 - .12 * s), waist, neck, waistY: neck * .55, cy: neck + r * .9 };
  };
}

/** The pendant drop: a meniscus under the button, a neck that narrows and the bulb. */
function paintForming(ctx: CanvasRenderingContext2D, x: number, top: number, d: Pendant, ink: Ink) {
  const { r, base, waist, neck } = d, cy = top + d.cy, wy = top + d.waistY;
  const th = Math.asin(clamp((waist + .5) / r, .05, .97));
  const lx = r * Math.sin(th), ly = cy - r * Math.cos(th);
  ctx.beginPath();
  ctx.moveTo(x + base, top);
  ctx.quadraticCurveTo(x, top - 5, x - base, top);                      // hugs the round bottom of the button
  ctx.bezierCurveTo(x - base * .62, top + neck * .1, x - waist, wy - neck * .3, x - waist, wy);
  ctx.bezierCurveTo(x - waist, wy + neck * .22, x - lx * .85, ly - neck * .1, x - lx, ly);
  ctx.arc(x, cy, r, -Math.PI / 2 - th, -Math.PI / 2 + th, true);
  ctx.bezierCurveTo(x + lx * .85, ly - neck * .1, x + waist, wy + neck * .22, x + waist, wy);
  ctx.bezierCurveTo(x + waist, wy - neck * .3, x + base * .62, top + neck * .1, x + base, top);
  ctx.closePath();
  // The thin liquid of the neck lets light through: lighter than the bulb, darker at its edges.
  const g = ctx.createLinearGradient(x - base, 0, x + base, 0);
  g.addColorStop(0, ink.edge); g.addColorStop(.42, ink.core); g.addColorStop(.6, ink.mid); g.addColorStop(1, ink.edge);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = ink.line; ctx.stroke();
  // The bulb on top, with its own volume, and a thread of light down the neck.
  paintDrop(ctx, x, cy, r, r, ink);
  if (neck > 3) {
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(x - base * .45, top + 1.5); ctx.quadraticCurveTo(x - waist * .6, wy, x - lx * .6, ly + 1); ctx.stroke();
  }
}

/** After the pinch the drop rings (prolate ↔ oblate, damped) and stretches a little with speed. */
function paintFalling(ctx: CanvasRenderingContext2D, x: number, cy: number, R: number, tf: number, v: number, ink: Ink) {
  const ring = .24 * Math.exp(-tf / .19) * Math.cos(TAU * 6.2 * tf);
  const stretch = 1 + Math.min(.13, v / 11000);
  const ry = R * (1 + ring) * stretch, rx = R / ((1 + ring) * stretch);
  // Estela: la cámara no alcanza a congelar la gota cuando va rápida.
  if (v > 700) {
    const len = Math.min(46, v * .016), a = clamp((v - 700) / 1800) * .32;
    const g = ctx.createLinearGradient(x, cy - ry - len, x, cy);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, hexAlpha(ink.mid, a));
    ctx.beginPath(); ctx.moveTo(x - rx * .7, cy - ry * .1); ctx.quadraticCurveTo(x, cy - ry - len * 1.1, x + rx * .7, cy - ry * .1); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
  }
  // Right after the pinch the torn neck is still a small tip on top, pulled back in ~60 ms.
  const tip = Math.exp(-tf / .03) * R * .9;
  if (tip > .4) {
    ctx.beginPath(); ctx.moveTo(x - rx * .45, cy - ry * .8); ctx.quadraticCurveTo(x, cy - ry - tip * 1.6, x + rx * .45, cy - ry * .8); ctx.closePath();
    ctx.fillStyle = bodyFill(ctx, x, cy, R, ink); ctx.fill();
  }
  paintDrop(ctx, x, cy, rx, ry, ink);
}

/** What stays on the button after the pinch: the meniscus and the torn upper neck, springing back in. */
function paintRemnant(ctx: CanvasRenderingContext2D, x: number, top: number, d: Pendant, tf: number, ink: Ink) {
  const h = d.waistY * 1.1 * Math.exp(-tf / .08) * (.55 + .45 * Math.cos(TAU * 6 * tf));
  if (h < .6 || tf > .45) return;
  const w = d.base * (1 - clamp(tf / .45) * .5);
  ctx.beginPath();
  ctx.moveTo(x + w, top);
  ctx.quadraticCurveTo(x, top - 5, x - w, top);
  ctx.bezierCurveTo(x - w * .6, top + h * .5, x - 1.2, top + h * .8, x, top + h);
  ctx.bezierCurveTo(x + 1.2, top + h * .8, x + w * .6, top + h * .5, x + w, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, ink.edge); g.addColorStop(.42, ink.core); g.addColorStop(1, ink.edge);
  ctx.fillStyle = g; ctx.fill();
}

/** Contact shadow: wide and faint far away, small and dark as the drop reaches the floor. */
function paintShadow(ctx: CanvasRenderingContext2D, x: number, floor: number, R: number, near: number, current: Theme) {
  const rx = R * (2.6 - 1.4 * near), ry = R * (.5 - .2 * near), a = .06 + .34 * near * near;
  const g = ctx.createRadialGradient(x, floor, 0, x, floor, rx);
  const tone = current === "light" ? "6,27,61" : "0,0,0";
  g.addColorStop(0, `rgba(${tone},${a})`); g.addColorStop(1, `rgba(${tone},0)`);
  ctx.save(); ctx.translate(x, floor); ctx.scale(1, ry / rx); ctx.translate(-x, -floor);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, floor, rx, 0, TAU); ctx.fill(); ctx.restore();
}

/** Impact: the drop flattens into a spreading sheet whose rim rises and throws the crown. */
function paintImpact(ctx: CanvasRenderingContext2D, x: number, floor: number, R: number, ti: number, ink: Ink, current: Theme) {
  if (ti > .7) return;
  const spread = R * (1 + 3.4 * (1 - Math.exp(-ti / .075)));
  const thick = R * (.95 * Math.exp(-ti / .028) + .2);
  const alpha = clamp(1 - (ti - .28) / .42);
  ctx.save(); ctx.globalAlpha = alpha;
  paintShadow(ctx, x, floor, spread / 2.2, 1, current);
  ctx.beginPath(); ctx.ellipse(x, floor - thick * .9, spread, thick, 0, 0, TAU);
  ctx.fillStyle = bodyFill(ctx, x, floor - thick, spread, ink); ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = ink.line; ctx.stroke();
  // Luz a lo largo del borde superior de la lámina.
  ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(x - spread * .1, floor - thick * 1.3, spread * .55, thick * .35, 0, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
  // The crown wall: a thin rim that rises and fades in a quarter of a second.
  const k = clamp(ti / .26);
  if (k < 1) {
    ctx.globalAlpha = alpha * (1 - k);
    ctx.strokeStyle = "rgba(37,211,102,.9)"; ctx.lineWidth = 2 * (1 - k) + .5;
    ctx.beginPath(); ctx.ellipse(x, floor - thick, spread * (1.05 + .25 * k), R * (.25 + .9 * k), 0, Math.PI, TAU); ctx.stroke();
  }
  ctx.restore();
}

function paintCrown(ctx: CanvasRenderingContext2D, crown: Bead[], ti: number, floor: number, ink: Ink) {
  for (const b of crown) {
    if (b.landed) {
      const k = (ti - b.landed) / .2;
      if (k < 1) paintSpot(ctx, b.x + b.vx * b.landed, floor, b.r * (1 + 1.6 * k), 1 - k, ink);
      continue;
    }
    const px = b.x + b.vx * ti, py = b.y + b.vy * ti + G * ti * ti / 2;
    if (py + b.r >= floor && ti > .05) { b.landed = ti; continue; }
    const v = Math.hypot(b.vx, b.vy + G * ti), s = 1 + Math.min(.4, v / 2500);
    paintDrop(ctx, px, py, b.r / Math.sqrt(s), b.r * Math.sqrt(s), ink, .8);
  }
}

function paintSpot(ctx: CanvasRenderingContext2D, x: number, floor: number, r: number, alpha: number, ink: Ink) {
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  ctx.beginPath(); ctx.ellipse(x, floor - r * .15, r, r * .3, 0, 0, TAU);
  ctx.fillStyle = ink.mid; ctx.fill(); ctx.restore();
}

/** The front of the new tone. With View Transitions only its liquid rim is drawn (the clip reveals the page). */
function paintFront(ctx: CanvasRenderingContext2D, x: number, floor: number, r: number, p: number, ink: Ink, fill: boolean) {
  if (r < 1) return;
  const points = blob(x, floor, r, p);
  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = ink.flood; ctx.fill(); }
  const fade = Math.pow(1 - clamp(p), 1.2);
  ctx.lineJoin = "round";
  ctx.strokeStyle = `rgba(37,211,102,${.16 * fade})`; ctx.lineWidth = 12 * fade + 2; ctx.stroke();
  ctx.strokeStyle = `rgba(37,211,102,${.85 * fade})`; ctx.lineWidth = 2.6 * fade + .6; ctx.stroke();
}

/** A circle whose edge ripples like a liquid front; the ripples calm down as it grows. */
function blob(cx: number, cy: number, r: number, p: number, n = 72): [number, number][] {
  const amp = .075 * Math.pow(1 - clamp(p), 1.3);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + amp * (Math.sin(3 * a + 1.7 + p * 5) * .55 + Math.sin(5 * a - .9 - p * 8) * .3 + Math.sin(9 * a + 2.3 + p * 11) * .15);
    out.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  return out;
}

function polygon(points: [number, number][]) {
  return `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
}

function hexAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(3)})`;
}
