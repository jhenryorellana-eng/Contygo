"use client";

/* The Cerebro in 3D (the owner chose it for the assistant's search, 23-11-2026): a sphere of points, one per state, that
   turns slowly; its links carry pulses of light. While the assistant works it shows what the server is really doing:
   it scans the states one after another, and when the search lands on a state («Buscando en el Cerebro: Texas») the
   sphere turns to bring that state to the front, lights it and names it. Idle (the page's header), it only breathes.
   Drawn on a canvas by hand: a few dozen points need no 3D library. Stops when off screen; still with reduced motion. */
import { useEffect, useRef } from "react";

const CODES = ["CA", "TX", "FL", "NY", "NJ", "IL", "GA", "NC", "VA", "MD", "WA", "MA", "AZ", "CO", "UT", "NV", "PA", "OH", "MI", "TN", "IN", "MO", "WI", "MN", "SC", "AL", "LA", "KY", "OR", "OK", "CT", "IA", "MS", "AR", "KS", "NM", "NE", "ID", "WV", "HI", "NH", "ME", "MT", "RI", "DE", "SD", "ND", "AK", "DC", "VT", "WY"];
type P3 = [number, number, number];

/** A fixed pseudo-random sequence: the sphere is the same on every visit and on the server's first paint. */
function seeded(seed: number) { let value = seed; return () => { value = (value * 1664525 + 1013904223) % 4294967296; return value / 4294967296; }; }

function build() {
  const random = seeded(7), golden = Math.PI * (3 - Math.sqrt(5));
  // One node per state, spread evenly over the sphere (a Fibonacci lattice), and a cloud of small ones inside it.
  const states: P3[] = CODES.map((_, index) => { const y = 1 - (index / (CODES.length - 1)) * 2, ring = Math.sqrt(1 - y * y), turn = golden * index; return [Math.cos(turn) * ring, y, Math.sin(turn) * ring]; });
  const inner: P3[] = Array.from({ length: 46 }, () => { const u = random() * 2 - 1, angle = random() * Math.PI * 2, ring = Math.sqrt(1 - u * u), reach = .28 + random() * .5; return [Math.cos(angle) * ring * reach, u * reach, Math.sin(angle) * ring * reach]; });
  const distance = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const edges: [number, number][] = [], seen = new Set<string>();
  const points = [...states, ...inner];
  points.forEach((point, index) => {
    const near = points.map((other, at) => ({ at, far: at === index ? 9 : distance(point, other) })).sort((a, b) => a.far - b.far).slice(0, index < states.length ? 3 : 2);
    for (const { at } of near) { const key = index < at ? `${index}-${at}` : `${at}-${index}`; if (!seen.has(key)) { seen.add(key); edges.push([index, at]); } }
  });
  return { points, states: states.length, edges };
}
const MODEL = build();

export type BrainMode = { /** State codes the search has landed on. */ codes?: string[]; /** What is happening now. */ phase?: "idle" | "scan" | "write" | "official" };

export default function Brain3D({ mode, className, label }: { mode?: BrainMode; className?: string; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<BrainMode>(mode ?? { phase: "idle" });
  live.current = mode ?? { phase: "idle" };

  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d");
    if (!element || !context) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const heat = new Float32Array(MODEL.points.length);
    const pulses = Array.from({ length: 9 }, (_, index) => ({ edge: (index * 17) % MODEL.edges.length, at: index / 9, speed: .5 + (index % 4) * .18 }));
    let frame = 0, yaw = .6, last = 0, scanAt = 0, visible = true, width = 0, height = 0;

    const size = () => {
      const box = element.getBoundingClientRect(), ratio = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.round(box.width * ratio)); height = Math.max(1, Math.round(box.height * ratio));
      if (element.width !== width || element.height !== height) { element.width = width; element.height = height; }
    };

    const draw = (now: number) => {
      const time = now / 1000, step = last ? Math.min(.05, time - last) : .016; last = time;
      const { codes = [], phase = "idle" } = live.current;
      const targets = codes.map(code => CODES.indexOf(code)).filter(index => index >= 0);
      // Turning: on its own slowly; with a target, toward the angle that brings that state to the front, then a gentle sway.
      if (targets.length) {
        const [x, , z] = MODEL.points[targets[0]], goal = Math.atan2(x, z) + Math.sin(time * .7) * .22;
        let gap = goal - yaw; gap = Math.atan2(Math.sin(gap), Math.cos(gap)); yaw += gap * Math.min(1, step * 2.6);
      } else yaw += step * (phase === "idle" ? .16 : .5);
      const pitch = .32 + Math.sin(time * .35) * .1, cosY = Math.cos(yaw), sinY = Math.sin(yaw), cosX = Math.cos(pitch), sinX = Math.sin(pitch);

      // The scan: while searching without a state yet, the states flash one after another.
      if (phase === "scan" && !targets.length && time - scanAt > .07) { scanAt = time; heat[Math.floor((time * 53) % MODEL.states)] = 1; }
      if (phase === "idle" && time - scanAt > .9) { scanAt = time; heat[Math.floor((time * 7.3) % MODEL.states)] = .7; }
      for (let index = 0; index < heat.length; index++) heat[index] = targets.includes(index) ? 1 : Math.max(0, heat[index] - step * 1.6);

      const radius = Math.min(width, height) * .36, cx = width / 2, cy = height / 2, unit = Math.min(width, height) / 120;
      const flat = MODEL.points.map(([x, y, z]) => {
        const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY, y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX, scale = 2.7 / (2.7 - z2);
        return { x: cx + x1 * radius * scale, y: cy + y1 * radius * scale, z: z2, scale };
      });
      const depth = (z: number) => .28 + .72 * ((z + 1) / 2);

      context.clearRect(0, 0, width, height);
      // The core's glow.
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.25);
      const beat = phase === "write" ? .34 + Math.sin(time * 5) * .1 : .2 + Math.sin(time * 1.6) * .05;
      glow.addColorStop(0, `rgba(37,211,102,${beat})`); glow.addColorStop(.45, "rgba(47,111,228,.10)"); glow.addColorStop(1, "rgba(47,111,228,0)");
      context.fillStyle = glow; context.fillRect(0, 0, width, height);

      context.lineCap = "round";
      for (const [from, to] of MODEL.edges) {
        const a = flat[from], b = flat[to], hot = Math.max(heat[from], heat[to]), alpha = (.13 + hot * .55) * depth((a.z + b.z) / 2);
        context.strokeStyle = hot > .05 ? `rgba(141,255,181,${alpha})` : `rgba(110,162,255,${alpha})`;
        context.lineWidth = unit * (.55 + hot * .7); context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      }
      // Pulses of light travelling along the links: faster and brighter while the answer is being written.
      for (const pulse of pulses) {
        pulse.at += step * pulse.speed * (phase === "write" ? 2.2 : phase === "idle" ? .6 : 1.3);
        if (pulse.at >= 1) { pulse.at = 0; pulse.edge = (pulse.edge + 7 + Math.floor(time * 3)) % MODEL.edges.length; }
        const [from, to] = MODEL.edges[pulse.edge], a = flat[from], b = flat[to], x = a.x + (b.x - a.x) * pulse.at, y = a.y + (b.y - a.y) * pulse.at, fade = depth((a.z + b.z) / 2);
        context.fillStyle = `rgba(255,255,255,${.85 * fade})`; context.beginPath(); context.arc(x, y, unit * 1.05, 0, Math.PI * 2); context.fill();
        context.fillStyle = `rgba(141,255,181,${.28 * fade})`; context.beginPath(); context.arc(x, y, unit * 2.8, 0, Math.PI * 2); context.fill();
      }
      const order = flat.map((point, index) => ({ point, index })).sort((a, b) => a.point.z - b.point.z);
      for (const { point, index } of order) {
        const state = index < MODEL.states, hot = heat[index], fade = depth(point.z), size = unit * (state ? 1.5 : .8) * point.scale * (1 + hot * .9);
        if (hot > .05 || state) { context.fillStyle = hot > .05 ? `rgba(37,211,102,${.3 * hot * fade + .05})` : `rgba(110,162,255,${.1 * fade})`; context.beginPath(); context.arc(point.x, point.y, size * 2.7, 0, Math.PI * 2); context.fill(); }
        context.fillStyle = hot > .05 ? `rgba(${Math.round(141 + 114 * hot)},255,${Math.round(181 + 74 * hot)},${fade})` : state ? `rgba(160,196,255,${.9 * fade})` : `rgba(110,162,255,${.55 * fade})`;
        context.beginPath(); context.arc(point.x, point.y, size, 0, Math.PI * 2); context.fill();
      }
      // The state found: a ring that opens and its two letters.
      targets.slice(0, 2).forEach((index, at) => {
        const point = flat[index], ring = (time * .9 + at * .4) % 1;
        context.strokeStyle = `rgba(141,255,181,${(1 - ring) * .9})`; context.lineWidth = unit * 1.1; context.beginPath(); context.arc(point.x, point.y, unit * (4 + ring * 13), 0, Math.PI * 2); context.stroke();
        context.font = `800 ${Math.round(unit * 11)}px ui-sans-serif, system-ui, sans-serif`; context.textAlign = "center"; context.textBaseline = "middle";
        const text = CODES[index], tx = point.x, ty = point.y - unit * 13;
        context.fillStyle = "rgba(6,27,61,.72)"; const pad = unit * 4, wide = context.measureText(text).width + pad * 2;
        context.beginPath(); context.roundRect(tx - wide / 2, ty - unit * 7.5, wide, unit * 15, unit * 7.5); context.fill();
        context.fillStyle = "#8dffb5"; context.fillText(text, tx, ty + unit * .6);
      });
      if (phase === "official") { // A page outside the brain, orbiting it: the official site being read.
        const angle = time * 1.4, ox = cx + Math.cos(angle) * radius * 1.32, oy = cy + Math.sin(angle) * radius * .62;
        context.strokeStyle = "rgba(110,162,255,.3)"; context.lineWidth = unit * .7; context.beginPath(); context.ellipse(cx, cy, radius * 1.32, radius * .62, 0, 0, Math.PI * 2); context.stroke();
        context.fillStyle = "#fff"; context.beginPath(); context.arc(ox, oy, unit * 2.4, 0, Math.PI * 2); context.fill();
        context.fillStyle = "rgba(110,162,255,.35)"; context.beginPath(); context.arc(ox, oy, unit * 6, 0, Math.PI * 2); context.fill();
      }
      if (!still && visible) frame = requestAnimationFrame(draw);
    };

    size(); frame = requestAnimationFrame(draw);
    const resize = new ResizeObserver(() => { size(); if (still) requestAnimationFrame(draw); });
    resize.observe(element);
    const watch = new IntersectionObserver(([entry]) => { const was = visible; visible = entry.isIntersecting; if (visible && !was && !still) { last = 0; frame = requestAnimationFrame(draw); } });
    watch.observe(element);
    const tab = () => { if (!document.hidden && visible && !still) { cancelAnimationFrame(frame); last = 0; frame = requestAnimationFrame(draw); } };
    document.addEventListener("visibilitychange", tab);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); watch.disconnect(); document.removeEventListener("visibilitychange", tab); };
  }, []);

  return <canvas ref={canvas} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
