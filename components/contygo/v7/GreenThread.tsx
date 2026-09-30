"use client";

import { useEffect, useRef, type RefObject } from "react";
import s from "./ContygoLanding.module.css";

/**
 * «El hilo verde»: the paper ribbon of the hero leaves its image and becomes a thread
 * that follows the reader down the page, crosses the journey steps and ends as the
 * long stroke of the ContyGo check. Anchors are read from `[data-thread]` elements.
 *
 * Rendimiento (28-09-2026, medido en un celular emulado con la CPU a ¼): la geometría del
 * hilo se calcula aquí, con las mismas curvas que se dibujan, y nunca se le pide al
 * navegador punto a punto (getPointAtLength costaba 600 ms por cuadro). Nada de lo que
 * se anima al paso del hilo cambia el tamaño de la página. La cabeza es una capa propia
 * que solo se traslada, y la estela que aparta títulos e iconos es una animación de una
 * vez en la GPU. (Probado: partir el trazo en un tramo por curva pinta más, no menos.)
 */
type Knot = { x: number; y: number; tx: number; ty: number };
type Box = { x: number; y: number; w: number; h: number };
type Curve = [number, number, number, number, number, number, number, number];

const DOWN = { tx: 0, ty: 1 };
const RIGHT = { tx: 1, ty: 0 };
// symbol-*.png: long stroke from its tip (73.7%, 23.4%) toward the vertex (46.4%, 56.2%).
const CHECK_TIP = { x: .737, y: .234 };
const CHECK = unit(-.64, .77);
// Where the hero ribbon leaves the bottom edge of its image, as a fraction of the width. Each hero
// image declares its own measured point in `data-exit`; this is the fallback of the V6 sculpture.
const RIBBON_EXIT = .23;
const HEAD_LINE = .62;
// Trail length behind the head, in pixels of thread.
const TRAIL = 150;
const SVG_NS = "http://www.w3.org/2000/svg";

function unit(tx: number, ty: number) { const l = Math.hypot(tx, ty) || 1; return { tx: tx / l, ty: ty / l }; }

/** Layout position inside `root`, unaffected by the unfold transforms of revealed elements. */
function offset(el: HTMLElement, root: HTMLElement): Box {
  let x = 0, y = 0, node: HTMLElement | null = el;
  while (node && node !== root) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Area painted by an image aligned to the bottom, with `object-fit: contain` or `cover` (top cropped). */
function painted(img: HTMLImageElement, root: HTMLElement): Box {
  const b = offset(img, root);
  const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 4 / 3;
  const cover = getComputedStyle(img).objectFit === "cover";
  const w = cover ? Math.max(b.w, b.h * ratio) : Math.min(b.w, b.h * ratio), h = w / ratio;
  return { x: b.x + (b.w - w) / 2, y: b.y + b.h - h, w, h };
}

function route(main: HTMLElement) {
  const q = (name: string) => main.querySelector<HTMLElement>(`[data-thread="${name}"]`);
  const start = q("start"), img = start?.querySelector("img");
  const services = q("services"), platform = q("platform"), faq = q("faq"), finale = q("finale"), facts = q("facts"), phone = q("phone");
  const steps = Array.from(main.querySelectorAll<HTMLElement>('[data-thread="step"]')).map(el => offset(el, main));
  if (!img || !services || !platform || !faq || !finale || !steps.length) return null;
  const width = main.clientWidth, mobile = width <= 760, inner = Math.min(width, 1440);
  const gutter = mobile ? 11 : (width - inner) / 2 + inner * .025;
  const left = gutter, right = width - gutter;
  const knot = (x: number, y: number, d: { tx: number; ty: number }): Knot => ({ x, y, ...d });
  const art = painted(img, main), mark = offset(finale, main);
  // The first sweep runs along the top edge of the facts strip (never across its numbers), then
  // the thread goes down the margin. Phones show the art above the headline: the ribbon falls
  // from the image and slides into the margin before the eyebrow.
  const exit = { x: art.x + art.w * (Number(start?.dataset.exit) || RIBBON_EXIT), y: art.y + art.h - 1 };
  const falling = start?.dataset.exitDir === "down";
  const knots = falling ? [
    knot(exit.x, exit.y, unit(-.12, 1)),
    ...(mobile ? [knot(left, exit.y + 40, DOWN)] : facts ? [knot(exit.x - 60, offset(facts, main).y + 22, unit(-1, 0))] : []),
  ] : [
    knot(exit.x, exit.y - 1, unit(-1, mobile ? .05 : facts ? .08 : .22)),
    ...(mobile ? [knot(left, art.y + art.h + 10, DOWN)] : []),
  ];
  knots.push(
    facts ? knot(left, offset(facts, main).y + 22, DOWN) : knot(left, offset(services, main).y + (mobile ? 44 : 100), DOWN),
    knot(left, steps[0].y - (mobile ? 90 : 150), DOWN),
  );
  const faqBox = offset(faq, main);
  if (mobile) {
    // Phones: the thread zigzags through the journey. Each step hangs from it on alternate sides
    // (its medallion sits on the thread) and the thread crosses to the next one in the gap between them.
    steps.forEach((step, i) => {
      const x = i % 2 ? step.x + step.w - 3 : step.x + 3;
      knots.push(knot(x, step.y, DOWN), knot(x, step.y + step.h + 4, DOWN));
    });
    // Then it runs beside the platform copy, passes behind the phone (it goes into the app) and
    // comes out on the right; it crosses back to the left in the gap before the questions.
    const lastRight = (steps.length - 1) % 2 === 1;
    const p = phone ? offset(phone, main) : null;
    if (p) {
      const side = lastRight ? right : left;
      knots.push(
        knot(side, p.y - 40, DOWN),
        knot(p.x + p.w * (lastRight ? .35 : .65), p.y + p.h * .46, unit(lastRight ? -1 : 1, 1.2)),
        knot(lastRight ? left : right, p.y + p.h + 70, DOWN),
      );
    } else knots.push(knot(right, offset(platform, main).y + 60, DOWN));
    const lane = p ? (lastRight ? left : right) : right;
    const other = lane === left ? right : left;
    knots.push(
      knot(lane, faqBox.y - 34, DOWN),
      knot(other, faqBox.y + 52, DOWN),
      knot(other, faqBox.y + faqBox.h - 150, DOWN),
    );
  } else {
    knots.push(...steps.map(step => knot(step.x + 3, step.y, RIGHT)));
    const last = steps[steps.length - 1];
    knots.push(
      knot(last.x + last.w, last.y, RIGHT),
      knot(right, offset(platform, main).y + 60, DOWN),
      knot(right, faqBox.y + faqBox.h - 260, DOWN),
    );
  }
  knots.push(knot(mark.x + mark.w * CHECK_TIP.x, mark.y + mark.h * CHECK_TIP.y, CHECK));
  // On desktop the steps share one line: that stretch is drawn while the section scrolls by.
  return { knots, row: mobile ? null : { y: steps[0].y, x: steps[0].x + 3 } };
}

/** Cubic Bézier segments through the knots: each handle only reaches as far as the gap measured along its own direction. */
function curves(knots: Knot[]): Curve[] {
  const out: Curve[] = [];
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1], b = knots[i], dx = b.x - a.x, dy = b.y - a.y;
    const ra = Math.min(Math.abs(dx * a.tx + dy * a.ty) * .55, 420), rb = Math.min(Math.abs(dx * b.tx + dy * b.ty) * .55, 420);
    out.push([a.x, a.y, a.x + a.tx * ra, a.y + a.ty * ra, b.x - b.tx * rb, b.y - b.ty * rb, b.x, b.y]);
  }
  return out;
}

function toPath(segments: Curve[]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(segments[0][0])} ${f(segments[0][1])}`;
  for (const c of segments) d += ` C${f(c[2])} ${f(c[3])} ${f(c[4])} ${f(c[5])} ${f(c[6])} ${f(c[7])}`;
  return d;
}

/** Samples the same curves every ~4 px: arc length, position and the running maximum of y. */
function sample(segments: Curve[]) {
  const xs: number[] = [segments[0][0]], ys: number[] = [segments[0][1]], lens: number[] = [0];
  let length = 0, px = xs[0], py = ys[0];
  for (const [x0, y0, x1, y1, x2, y2, x3, y3] of segments) {
    const hull = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
    const n = Math.max(4, Math.ceil(hull / 4));
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      const x = a * x0 + b * x1 + c * x2 + d * x3, y = a * y0 + b * y1 + c * y2 + d * y3;
      length += Math.hypot(x - px, y - py); px = x; py = y;
      xs.push(x); ys.push(y); lens.push(length);
    }
  }
  const reach = new Float64Array(ys.length);
  let highest = -Infinity;
  ys.forEach((y, i) => { highest = Math.max(highest, y); reach[i] = highest; });
  return { xs: Float64Array.from(xs), ys: Float64Array.from(ys), lens: Float64Array.from(lens), reach, total: length };
}

/* ---- Lo que el hilo activa al pasar (data-react) ----
   Solo transform y opacidad (el compositor las anima sin repintar la página). El brillo de
   tarjetas y láminas vive en CSS ([data-lit]); aquí, los empujones y los contadores.
   Con «reducir movimiento» no se ejecuta ninguna. */
const EASE = "cubic-bezier(.2,.8,.2,1)";

/** 12 · $50 · +500 · 100%: cuenta desde 0 conservando prefijo y sufijo. */
function countUp(el: HTMLElement) {
  const target = el.dataset.value ?? el.textContent ?? "";
  const match = target.match(/^(\D*)([\d,]+)(\D*)$/);
  if (!match) return;
  const [, prefix, digits, suffix] = match, end = Number(digits.replace(/,/g, ""));
  const start = performance.now(), duration = 1100;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration), value = Math.round(end * (1 - (1 - t) ** 3));
    el.textContent = `${prefix}${value.toLocaleString("en-US")}${suffix}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** The wake: what the head passes is pushed away from the thread and springs back (one compositor animation). */
function nudge(el: HTMLElement, side: number) {
  const target = el.querySelector<HTMLElement>("h2") ?? el;
  target.animate([{ translate: "0 0" }, { translate: `${side * 12}px -4px`, offset: .32 }, { translate: "0 0" }], { duration: 950, easing: "cubic-bezier(.3,.7,.3,1)" });
}

function react(el: HTMLElement, kind: string, order: number) {
  const delay = order * 90;
  const pop = (target: Element | null | undefined, peak: string, duration: number) =>
    target?.animate([{ transform: "scale(1)" }, { transform: peak, offset: .4 }, { transform: "scale(1)" }], { duration, delay, easing: EASE });
  switch (kind) {
    case "count": { const n = el.querySelector<HTMLElement>("[data-value]"); if (n) setTimeout(() => countUp(n), delay); break; }
    // The card lifts as the thread passes (translate: independent of the unfold transform).
    case "card": el.animate([{ translate: "0 0" }, { translate: "0 -10px", offset: .35 }, { translate: "0 0" }], { duration: 1100, delay, easing: EASE }); break;
    case "row": pop(el.querySelector("img, svg"), "scale(1.22) rotate(-6deg)", 800); break;
    case "pop": pop(el.querySelector("svg"), "scale(1.35)", 700); break;
    // The rail's bead runs ahead and comes back: «there is more this way».
    case "rail": {
      const bead = el.querySelector<HTMLElement>("[data-bead]");
      const room = el.clientWidth * .38;
      bead?.animate([{ translate: "0 0" }, { translate: `${room}px 0`, offset: .45 }, { translate: `${room * .92}px 0`, offset: .55 }, { translate: "0 0" }], { duration: 1500, delay: 700, easing: "cubic-bezier(.65,0,.35,1)" });
      break;
    }
    // "scene", "phone", "title", "sheet", "contract" and "step" are pure CSS: a resting state before the thread, a transition after.
  }
}

export default function GreenThread({ scope }: { scope: RefObject<HTMLElement> }) {
  const svg = useRef<SVGSVGElement>(null);
  const track = useRef<SVGPathElement>(null);
  const line = useRef<SVGGElement>(null);
  const trail = useRef<SVGGElement>(null);
  const head = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const main = scope.current, svgEl = svg.current, trackEl = track.current, lineEl = line.current, trailEl = trail.current, headEl = head.current;
    if (!main || !svgEl || !trackEl || !lineEl || !trailEl || !headEl) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let total = 0, drawn = 0, goal = 0, top = 0, frame = 0, pending = 0, arrived = false, painted = -1, scrolled = false;
    let lens = new Float64Array(0), xs = new Float64Array(0), ys = new Float64Array(0), reach = new Float64Array(0);
    let row: { y: number; from: number; span: number } | null = null;
    let marks: { el: HTMLElement; at: number; reached: boolean }[] = [];
    // The drawn line and the comet (kept as a list: one path each).
    let pieces: { line: SVGPathElement; trail: SVGPathElement; from: number; len: number; lineOff: number; trailKey: string }[] = [];
    // Elements that react when the thread passes (`lit` once reached). Titles, figures and list icons
    // are also pushed aside by the head (side: away from the thread).
    let reactors: { el: HTMLElement; kind: string; at: number; order: number; lit: boolean; side: number; wake: boolean }[] = [];
    const WAKES = new Set(["title", "pop", "count"]);

    const nearest = (x: number, y: number) => {
      let best = 0, bestDistance = Infinity, px = 0;
      for (let i = 0; i < lens.length; i += 2) { const d = (xs[i] - x) ** 2 + (ys[i] - y) ** 2; if (d < bestDistance) { bestDistance = d; best = lens[i]; px = xs[i]; } }
      return { len: best, distance: bestDistance, x: px };
    };
    const lengthNear = (x: number, y: number) => nearest(x, y).len;
    // `reach` is the running maximum of y, so this search is monotonic in scroll.
    const lengthAt = (y: number) => {
      let lo = 0, hi = reach.length - 1;
      if (hi < 0 || y <= reach[0]) return 0;
      if (y >= reach[hi]) return total;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (reach[mid] < y) lo = mid + 1; else hi = mid; }
      return lens[lo];
    };
    const lengthFor = (y: number) => {
      if (!row || y < row.y || y >= row.y + row.span) return lengthAt(y);
      return row.from + (lengthAt(row.y + row.span) - row.from) * (y - row.y) / row.span;
    };
    /** Point at a length of thread, from the samples (binary search and a straight step between them). */
    const pointAt = (l: number) => {
      const n = lens.length - 1;
      if (n < 1 || l <= 0) return { x: xs[0] ?? 0, y: ys[0] ?? 0 };
      if (l >= total) return { x: xs[n], y: ys[n] };
      let lo = 0, hi = n;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (lens[mid] < l) lo = mid + 1; else hi = mid; }
      const a = Math.max(0, lo - 1), span = lens[lo] - lens[a] || 1, t = (l - lens[a]) / span;
      return { x: xs[a] + (xs[lo] - xs[a]) * t, y: ys[a] + (ys[lo] - ys[a]) * t };
    };

    function paint() {
      if (drawn === painted) return;
      painted = drawn;
      for (const p of pieces) {
        // Drawn line: hidden before the head, partial under it, whole behind it (a zero dash would leave a round-cap dot).
        const shown = Math.min(p.len, Math.max(0, drawn - p.from)), off = shown <= .01 ? -1 : +(p.len - shown).toFixed(2);
        if (off !== p.lineOff) {
          if (off < 0) p.line.style.visibility = "hidden";
          else { if (p.lineOff < 0) p.line.style.visibility = ""; p.line.style.strokeDashoffset = String(off); }
          p.lineOff = off;
        }
        // Comet trail: only the last stretch behind the head glows.
        const a = Math.max(drawn - TRAIL, p.from) - p.from, b = Math.min(drawn, p.from + p.len) - p.from, visible = b - a;
        const key = visible > .2 ? `${visible.toFixed(1)}/${a.toFixed(1)}` : "off";
        if (key !== p.trailKey) {
          if (key === "off") p.trail.style.visibility = "hidden";
          else { p.trail.style.visibility = ""; p.trail.style.strokeDasharray = `${visible.toFixed(2)} ${(p.len + TRAIL).toFixed(0)}`; p.trail.style.strokeDashoffset = (-a).toFixed(2); }
          p.trailKey = key;
        }
      }
      const point = pointAt(drawn);
      headEl!.style.transform = `translate3d(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px,0)`;
      for (const mark of marks) {
        const reached = drawn >= mark.at - 2;
        if (reached !== mark.reached) { mark.reached = reached; mark.el.setAttribute("data-reached", String(reached)); }
      }
      for (const r of reactors) {
        const lit = drawn >= r.at - 4;
        if (lit !== r.lit) {
          r.lit = lit;
          r.el.dataset.lit = String(lit);
          if (lit && !still.matches) { react(r.el, r.kind, r.order); if (r.wake) nudge(r.el, r.side); }
        }
      }
      if (!arrived && total > 0 && drawn >= total - 3) {
        arrived = true;
        const finale = main!.querySelector('[data-thread="finale"]');
        finale?.setAttribute("data-arrived", "true");
        finale?.closest("section")?.setAttribute("data-arrived", "true");
      }
      const done = String(arrived && drawn >= total - 3);
      if (headEl!.dataset.arrived !== done) headEl!.dataset.arrived = done;
    }
    function aim() {
      goal = still.matches ? total : Math.max(0, Math.min(total, lengthFor(scrollY + innerHeight * HEAD_LINE - top)));
    }
    // First visit: the hero image lands first (entrance of about 0.7 s), then its ribbon lets go of the thread.
    const waitUntil = document.documentElement.dataset.cgIntro === "play" && !still.matches ? performance.now() + 700 : 0;
    function tick() {
      frame = 0;
      if (performance.now() < waitUntil) { frame = requestAnimationFrame(tick); return; }
      if (scrolled) { scrolled = false; aim(); }
      const diff = goal - drawn;
      // Anchor jumps and restored scroll positions land close to the goal instead of replaying the page.
      drawn = Math.abs(diff) < .5 ? goal : Math.abs(diff) > 1200 ? goal - Math.sign(diff) * 240 : drawn + diff * .16;
      paint();
      if (drawn !== goal) frame = requestAnimationFrame(tick);
    }
    let lastSize = "";
    function layout() {
      pending = 0;
      const built = route(main!);
      if (!built) return;
      const segments = curves(built.knots);
      const geometry = sample(segments);
      // offsetHeight, not scrollHeight: the SVG itself must not keep the page from shrinking.
      const height = main!.offsetHeight, width = main!.clientWidth;
      const size = `${width}x${height}`;
      if (size !== lastSize) {
        lastSize = size;
        svgEl!.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svgEl!.style.height = `${height}px`;
      }
      total = geometry.total;
      lens = geometry.lens; xs = geometry.xs; ys = geometry.ys; reach = geometry.reach;
      // The dotted route ahead, the green line and the comet share one geometry.
      const d = toPath(segments);
      trackEl!.setAttribute("d", d);
      // pathLength ties the dashes to the length measured here, whatever the browser's own estimate.
      const make = () => { const el = document.createElementNS(SVG_NS, "path"); el.setAttribute("d", d); el.setAttribute("pathLength", total.toFixed(2)); el.style.visibility = "hidden"; return el; };
      const drawnPath = make(), cometPath = make();
      drawnPath.style.strokeDasharray = `${total.toFixed(2)} ${total.toFixed(2)}`;
      lineEl!.replaceChildren(drawnPath);
      trailEl!.replaceChildren(cometPath);
      pieces = [{ line: drawnPath, trail: cometPath, from: 0, len: total, lineOff: -1, trailKey: "off" }];
      row = built.row ? { y: built.row.y, from: lengthNear(built.row.x, built.row.y), span: innerHeight * .45 } : null;
      const mobile = width <= 760;
      marks = Array.from(main!.querySelectorAll<HTMLElement>('[data-thread="step"]')).map((el, i) => {
        const b = offset(el, main!), x = mobile && i % 2 ? b.x + b.w - 3 : b.x + 3;
        return { el, at: lengthNear(x, b.y), reached: el.dataset.reached === "true" };
      });
      // Each reactor keys on the stretch of thread closest to it (left, right or top edge), and is
      // pushed away from the thread when the head passes (side). Siblings of one kind stagger.
      const counters = new Map<Element | null, number>();
      reactors = Array.from(main!.querySelectorAll<HTMLElement>("[data-react]")).map(el => {
        const b = offset(el, main!);
        // data-react-y moves the side anchors up (e.g. .2: react when the top fifth meets the thread).
        const ay = b.y + b.h * (Number(el.dataset.reactY) || .5);
        const hit = [nearest(b.x, ay), nearest(b.x + b.w, ay), nearest(b.x + b.w / 2, b.y)].sort((p, q) => p.distance - q.distance)[0];
        const kind = el.dataset.react ?? "card";
        const order = counters.get(el.parentElement) ?? 0; counters.set(el.parentElement, order + 1);
        const previous = reactors.find(r => r.el === el);
        return { el, kind, at: hit.len, order: Math.min(order, 4), lit: previous?.lit ?? false, side: b.x + b.w / 2 >= hit.x ? 1 : -1, wake: WAKES.has(kind) };
      });
      // Counters start at zero until the thread reaches them (never without JavaScript).
      for (const r of reactors) if (r.kind === "count" && !r.lit && !still.matches) {
        const n = r.el.querySelector<HTMLElement>("[data-value]");
        if (n) n.textContent = (n.dataset.value ?? "").replace(/[\d,]+/, "0");
      }
      top = main!.getBoundingClientRect().top + scrollY;
      main!.dataset.threadReady = "true";
      aim();
      drawn = still.matches ? total : Math.min(drawn, total);
      painted = -1;
      paint();
      if (!frame) frame = requestAnimationFrame(tick);
    }
    // Size changes arrive in bursts (images, fonts): one layout per burst is enough.
    let settle = 0;
    const schedule = () => {
      clearTimeout(settle);
      settle = window.setTimeout(() => { if (!pending) pending = requestAnimationFrame(layout); }, lens.length ? 120 : 0);
    };
    const onScroll = () => { scrolled = true; if (!frame) frame = requestAnimationFrame(tick); };

    let width = main.clientWidth, height = main.offsetHeight;
    const observer = new ResizeObserver(() => {
      // Only a real change of size re-routes the thread.
      if (main.clientWidth === width && main.offsetHeight === height) return;
      width = main.clientWidth; height = main.offsetHeight;
      schedule();
    });
    observer.observe(main);
    // The hero image decides where the thread starts: re-route once it has its real proportions.
    const onLoad = (event: Event) => { if ((event.target as Element | null)?.closest?.('[data-thread="start"]')) schedule(); };
    main.addEventListener("load", onLoad, true);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", schedule);
    still.addEventListener("change", schedule);
    schedule();
    return () => {
      observer.disconnect();
      main.removeEventListener("load", onLoad, true);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", schedule);
      still.removeEventListener("change", schedule);
      clearTimeout(settle);
      cancelAnimationFrame(frame); cancelAnimationFrame(pending);
    };
  }, [scope]);

  return <>
    <svg ref={svg} className={s.thread} aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <path ref={track} className={s.threadTrack} />
      <g ref={line} className={s.threadLine} />
      <g ref={trail} className={s.threadTrail} />
    </svg>
    {/* The head: its own layer, moved with a transform (no repaint) and pulsing on the compositor. */}
    <span ref={head} className={s.threadHead} aria-hidden="true"><i /><i /><i /></span>
  </>;
}
