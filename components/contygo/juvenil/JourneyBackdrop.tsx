"use client";

import { useEffect, useRef } from "react";
import s from "./JourneyBackdrop.module.css";

/**
 * «Hilos»: one living backdrop for the whole service journey. A field of fine threads — the green
 * thread of the landing, multiplied, with the calm of the security lines on a document — flows like
 * a slow liquid behind every stage. It is mounted once in the dialog, so stages never swap effects:
 * the same threads morph from one gesture to the next.
 *   film       the threads part around the player; above the first film only, the «y» floats
 *   packing    they curve into rings round the brand; the «y» travels there and dissolves into it
 *   chat, name a calm tide low on the screen
 *   flying     they lean like wind under the paper plane
 *   invitation the threads flow around the contract button like water around a stone
 *   decision   the contract page keeps its own artwork; the threads fade out
 * Brand, kept sparing (owner's request, 27 Sep): no extra «y» copies at rest. The thread «y» lives
 * only over the first film; at each celebration (name step, final invitation) the rockets leave
 * from the real ContyGo symbol already on screen, never from a second logo.
 * Hairline strokes at low opacity; every fifth thread is a green accent with a slow light travelling
 * along it. Night: mint and green on navy. Day: navy ink and forest green on paper. No voice input.
 * The stage is read from the dialog's own attributes, so the stage components keep their logic.
 */
type Target = {
  gather: number; calm: number; tilt: number; low: number; ring: number; ringOn: number; alpha: number; obstacle: number;
  focusX: number; focusY: number; symX: number; symY: number; symSize: number; symOn: number; sway: number;
};
type Scene = { film: DOMRect | null; button: DOMRect | null; elapsed: number };

const VERTEX = "attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}";
const FRAGMENT = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uObstacle;uniform float uObstacleOn;
uniform vec2 uFocus;uniform float uGather;uniform float uTilt;uniform float uCalm;uniform float uLow;uniform float uRing;uniform float uRingOn;
uniform float uAlpha;uniform float uLight;uniform vec3 uSym;uniform float uSymOn;uniform float uSymRot;uniform vec4 uCaption;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){return .6*noise(p)+.3*noise(p*2.03+7.1)+.1*noise(p*4.1+3.3);}
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float segment(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
// The ContyGo symbol, measured on symbol-*.png (1024 box, strokes 99 wide): check and curved tail.
void symbol(vec2 p,out float check,out float tail){
  check=min(segment(p,vec2(313.,421.),vec2(473.,583.)),segment(p,vec2(473.,583.),vec2(755.,241.)))-49.5;
  float d=1e5;vec2 prev=vec2(460.,605.);
  for(int i=1;i<=7;i++){float k=float(i)/7.;vec2 cur=mix(mix(vec2(460.,605.),vec2(390.,785.),k),mix(vec2(390.,785.),vec2(288.,780.),k),k);d=min(d,segment(p,prev,cur));prev=cur;}
  tail=d-48.;}
void main(){
  vec2 size=uRes/uDpr;
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr;
  float t=uTime;
  // Ground: night or paper, with a soft light where the stage looks.
  float fr=length(px-uFocus)/max(size.x,size.y);
  vec3 night=mix(vec3(.051,.153,.318),vec3(.024,.106,.239),smoothstep(0.,.8,fr));
  vec3 day=mix(vec3(.945,.976,.957),vec3(1.),smoothstep(0.,.75,fr));
  vec3 ground=mix(night,day,uLight);
  // Stream: threads with a slow liquid bend, leaning with the wind of the stage.
  float c=cos(uTilt),sn=sin(uTilt);
  vec2 q=vec2(c*px.x+sn*px.y,-sn*px.x+c*px.y);
  float v=q.y+(fbm(px*.0024+vec2(t*.018,-t*.011))-.5)*mix(96.,34.,uCalm);
  // Around a film or the contract button the threads part and hug its edges, like water around a stone.
  if(uObstacleOn>.001){
    vec2 oc=uObstacle.xy+uObstacle.zw*.5;
    float oy=-sn*oc.x+c*oc.y;
    float k=exp(-max(box(px-oc,uObstacle.zw*.5,uObstacle.w*.45),0.)/85.)*uObstacleOn;
    v-=sign(v-oy)*k*max(uObstacle.w*.5,34.);
  }
  // Rings: the same threads curve around a focus (the brand as the film closes).
  float r=length(px-uFocus);
  v=mix(v,r+(fbm(px*.004+t*.02)-.5)*30.,uGather);
  // The «y» watermark, swaying slowly around its vertex.
  vec2 sp=(px-uSym.xy)/max(uSym.z,1.)*1024.;
  float cr=cos(uSymRot),sr=sin(uSymRot);
  sp=vec2(cr*sp.x-sr*sp.y,sr*sp.x+cr*sp.y)+512.;
  float check,tail;
  symbol(sp,check,tail);
  float unit=uSym.z/1024.;check*=unit;tail*=unit;
  float inside=(1.-smoothstep(-1.5,1.5,min(check,tail)))*uSymOn;
  float relief=(1.-smoothstep(-8.,14.,min(check,tail)))*uSymOn;
  // Inside the «y» the threads keep flowing, so the logo is never still.
  v+=relief*(8.5+t*9.);
  float f=v/mix(17.,8.5,relief);
  float w=fwidth(f);
  float d=abs(fract(f+.5)-.5);
  float idx=floor(f+.5);
  float accent=step(3.5,mod(idx,5.));
  float line=1.-smoothstep(w*mix(.6,1.,accent),w*mix(1.7,2.4,accent),d);
  // Presence: calm tide low on screen, rings only near their focus, quiet under the header and
  // behind the subtitles; the «y» always shows whole.
  float y01=px.y/size.y;
  float presence=mix(1.,smoothstep(.46,.82,y01),uLow);
  presence*=mix(1.,1.-smoothstep(uRing*.35,uRing,r),uRingOn);
  presence*=smoothstep(10.,120.,px.y);
  presence*=1.-.78*(1.-smoothstep(0.,26.,box(px-(uCaption.xy+uCaption.zw*.5),uCaption.zw*.5,12.)))*step(1.,uCaption.z);
  presence=max(presence,inside*.95);
  // A slow light travels along the accent threads, and a diagonal light crosses the «y».
  float travel=.5+.5*sin(q.x*.011-t*.55+idx*1.7);
  float strength=mix(mix(.1,.3,accent),mix(.085,.24,accent),uLight)*mix(1.,.45+.95*travel,accent);
  float sweep=1.-smoothstep(0.,.1,abs(fract((sp.x+sp.y)/1024.*.55-t*.16)-.5));
  vec3 ink=mix(mix(vec3(.62,.922,.753),vec3(.145,.827,.4),accent),mix(vec3(.024,.106,.239),vec3(.031,.498,.275),accent),uLight);
  vec3 checkInk=mix(vec3(.145,.827,.4),vec3(.031,.498,.275),uLight);
  vec3 tailInk=mix(vec3(.965,.973,.969),vec3(.024,.106,.239),uLight);
  ink=mix(ink,mix(tailInk,checkInk,step(check,tail)),inside);
  strength=mix(strength,mix(.5,.46,uLight)*(1.+sweep*.45),inside);
  vec3 color=mix(ground,ink,line*presence*min(strength,.95));
  gl_FragColor=vec4(color*uAlpha,uAlpha);
}`;

function compile(gl: WebGLRenderingContext) {
  if (!gl.getExtension("OES_standard_derivatives")) return null;
  const vertex = gl.createShader(gl.VERTEX_SHADER), fragment = gl.createShader(gl.FRAGMENT_SHADER), program = gl.createProgram(), buffer = gl.createBuffer();
  if (!vertex || !fragment || !program || !buffer) return null;
  gl.shaderSource(vertex, VERTEX); gl.shaderSource(fragment, FRAGMENT);
  gl.compileShader(vertex); gl.compileShader(fragment);
  gl.attachShader(program, vertex); gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked && process.env.NODE_ENV !== "production") console.warn("ContyGo journey backdrop: stages keep their own backgrounds.", gl.getProgramInfoLog(program), gl.getShaderInfoLog(fragment));
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!linked) { gl.deleteProgram(program); gl.deleteBuffer(buffer); return null; }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const at = (name: string) => gl.getUniformLocation(program, name);
  return {
    res: at("uRes"), dpr: at("uDpr"), time: at("uTime"), obstacle: at("uObstacle"), obstacleOn: at("uObstacleOn"), focus: at("uFocus"),
    gather: at("uGather"), tilt: at("uTilt"), calm: at("uCalm"), low: at("uLow"), ring: at("uRing"), ringOn: at("uRingOn"),
    sym: at("uSym"), symOn: at("uSymOn"), symRot: at("uSymRot"), caption: at("uCaption"), alpha: at("uAlpha"), light: at("uLight"),
  };
}

function opacityChain(el: Element | null, stop: Element) {
  let opacity = 1;
  for (let node = el; node && node !== stop; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") return 0;
    opacity *= Number(style.opacity);
  }
  return opacity;
}
const shown = (el: Element) => { const box = el.getBoundingClientRect(); return (el as HTMLElement).offsetParent !== null && box.height > 0 && box.bottom > 0 && box.top < innerHeight; };

/** The film currently on screen, if any. */
function visibleFilm(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll("video")).find(video => shown(video) && video.getBoundingClientRect().height > 40 && Number(getComputedStyle(video).opacity) > .05)?.getBoundingClientRect() ?? null;
}

// The symbol's visible ink covers 62% of its 1024 box in height.
const INK_HEIGHT = .62;
// The symbol's 1024 box inside the wordmark logo-*.png (measured on its green check): centre and width.
const WORDMARK_Y = { cx: .5956, cy: .5799, size: .2819 };
// The five rockets leave from the symbol's tips (1024 box), fanned upward from left to right; a logo
// close to the top of the screen opens them sideways instead (FAN_SIDE angles).
const FAN = [
  { at: [288, 780], angle: -160, reach: .9 }, { at: [313, 421], angle: -125, reach: 1 }, { at: [473, 583], angle: -90, reach: 1.12 },
  { at: [614, 412], angle: -55, reach: 1 }, { at: [755, 241], angle: -20, reach: .9 },
];
const FAN_SIDE = [165, -172, 108, -8, 15];

/** The real ContyGo symbol on screen next to a celebration, as its 1024-box centre and size. */
function logoAnchor(party: Element, origin: DOMRect) {
  const mark = party.closest("[data-journey-reveal]")?.querySelector('img[src*="symbol-"]')?.getBoundingClientRect();
  if (mark && mark.width > 20) return { x: mark.left + mark.width / 2 - origin.left, y: mark.top + mark.height / 2 - origin.top, size: mark.width };
  const brand = party.closest("main[data-phase]")?.querySelector('[aria-label="ContyGo"]')?.getBoundingClientRect();
  if (brand && brand.width > 20) return { x: brand.left + brand.width * WORDMARK_Y.cx - origin.left, y: brand.top + brand.height * WORDMARK_Y.cy - origin.top, size: brand.width * WORDMARK_Y.size };
  return null;
}

/** Stage gestures, read from the attributes the dialog and the closing already expose. */
function stageTarget(dialog: HTMLElement, width: number, height: number, scene: Scene): Target {
  const phase = dialog.dataset.visaPhase;
  const closing = dialog.querySelector("main[data-phase]")?.getAttribute("data-phase");
  const { film } = scene;
  const sym = (x: number, y: number, size: number, on = 1) => ({ symX: x, symY: y, symSize: size, symOn: on, sway: 0 });
  const hidden = sym(width / 2, height * .45, Math.min(width * .6, 260), 0);
  const calm: Target = { gather: 0, calm: 1, tilt: 0, low: 1, ring: 0, ringOn: 0, alpha: 1, obstacle: 0, focusX: width / 2, focusY: height * .86, ...hidden };
  // Films: the threads part around the player. Only the first film carries the «y» above it.
  const stream = (box: DOMRect | null, withMark: boolean): Target => {
    const above = box ? box.top - 56 : 0;
    const size = Math.min(width * .7, above / (INK_HEIGHT + .06), 300);
    return { gather: 0, calm: 0, tilt: 0, low: 0, ring: 0, ringOn: 0, alpha: 1, obstacle: box ? 1 : 0,
      focusX: box ? box.left + box.width / 2 : width / 2, focusY: box ? box.top + box.height / 2 : height / 2,
      ...(withMark ? sym(width / 2, box ? 44 + above / 2 : height * .2, Math.max(size, 60), size >= 80 ? 1 : 0) : hidden) };
  };
  if (phase === "decision") return { ...calm, alpha: 0 };
  // The film ends and the «y» travels with the animation to the brand, dissolving into the real logo.
  if (phase === "packing") return { gather: 1, calm: .3, tilt: 0, low: 0, ring: Math.max(width, height) * .62, ringOn: 1, alpha: 1, obstacle: 0, focusX: width / 2, focusY: height * .45, ...sym(width / 2, height * .45, Math.min(width * .55, 240), scene.elapsed < .6 ? .6 : 0) };
  // The portal to the second film starts while the chat is still the stage: follow the film at once.
  if (phase === "interview") return film ? stream(film, false) : calm;
  // The second film is framed like the first one: threads around it and the «y» above (owner, 29 Sep).
  // From the paper plane on, the closing has its own stage light and the threads step out.
  if (phase === "platform") return closing === "watch" && film ? stream(film, true) : { ...calm, alpha: 0 };
  return stream(film, true);
}

/** The real symbol lights up, gathers itself and five rockets leave from its tips. */
function ignite(layer: HTMLElement, at: { x: number; y: number; size: number }, light: boolean) {
  const width = layer.clientWidth, height = layer.clientHeight;
  const group = document.createElement("div");
  group.className = s.ignition;
  group.dataset.look = light ? "light" : "dark";
  layer.appendChild(group);
  const size = Math.max(at.size, 40);
  const logo = document.createElement("div");
  logo.className = s.logo;
  Object.assign(logo.style, { left: `${at.x - size / 2}px`, top: `${at.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
  logo.innerHTML = `<svg viewBox="0 0 1024 1024" aria-hidden="true"><path class="${s.tail}" pathLength="1" d="M460 605Q390 785 288 780"/><path class="${s.check}" pathLength="1" d="M313 421L473 583L755 241"/></svg>`;
  group.appendChild(logo);
  const paths = Array.from(logo.querySelectorAll("path"));
  // 1 · The threads become the solid logo, stroke by stroke.
  paths.forEach((path, i) => path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 420, delay: 40 + i * 120, easing: "cubic-bezier(.55,0,.25,1)", fill: "both" }));
  // 2 · It gathers itself: a small rise, then a crouch around its vertex.
  logo.animate([
    { transform: "scale(.94)", opacity: 0, offset: 0 }, { transform: "scale(1)", opacity: 1, offset: .08 },
    { transform: "scale(1)", offset: .5 }, { transform: "scale(1.08)", offset: .66 }, { transform: "scale(.86)", offset: .86 },
    { transform: "scale(.7)", opacity: 0, offset: 1 },
  ], { duration: 1080, easing: "ease-in-out", fill: "forwards" });
  // 3 · Its strokes pull into the launch points and five rockets leave from its tips.
  paths.forEach(path => path.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }], { duration: 300, delay: 900, easing: "ease-in", fill: "forwards" }));
  const scale = size / 1024 * .86, origin = { x: at.x + (473 - 512) * (size / 1024), y: at.y + (583 - 512) * (size / 1024) };
  const radius = Math.min(width * .34, 190);
  const sideways = at.y - 44 < radius * .8;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  FAN.forEach(({ at: [lx, ly], angle, reach }, i) => {
    const start = { x: origin.x + (lx - 473) * scale, y: origin.y + (ly - 583) * scale };
    const turn = (sideways ? FAN_SIDE[i] : angle) * Math.PI / 180;
    const end = { x: clamp(start.x + Math.cos(turn) * radius * reach * (sideways ? 1.15 : 1), 28, width - 28), y: clamp(start.y + Math.sin(turn) * radius * reach * (sideways ? .75 : 1), 44, height * .72) };
    const control = { x: start.x * .6 + end.x * .4, y: Math.min(start.y, end.y) - Math.abs(end.x - start.x) * .15 };
    const delay = 880 + i * 70, flight = 760;
    const rocket = document.createElement("div");
    rocket.className = s.rocket;
    rocket.innerHTML = `<i class="${s.trail}"></i><i class="${s.head}"></i>`;
    group.appendChild(rocket);
    const frames: Keyframe[] = [];
    for (let k = 0; k <= 14; k++) {
      const u = k / 14, a = 1 - u;
      const x = a * a * start.x + 2 * a * u * control.x + u * u * end.x, y = a * a * start.y + 2 * a * u * control.y + u * u * end.y;
      const tx = 2 * a * (control.x - start.x) + 2 * u * (end.x - control.x), ty = 2 * a * (control.y - start.y) + 2 * u * (end.y - control.y);
      frames.push({ transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${Math.atan2(ty, tx).toFixed(3)}rad)`, opacity: k === 0 ? 0 : k > 12 ? .2 : 1, offset: u });
    }
    rocket.animate(frames, { duration: flight, delay, easing: "cubic-bezier(.25,.6,.35,1)", fill: "both" });
    // The burst: a soft bloom, one ring and a crown of sparks.
    const burst = document.createElement("div");
    burst.className = s.burst;
    Object.assign(burst.style, { left: `${end.x}px`, top: `${end.y}px` });
    burst.innerHTML = `<i class="${s.bloom}"></i><i class="${s.ring}"></i>` + `<i class="${s.spark}"></i>`.repeat(16);
    group.appendChild(burst);
    const pop = delay + flight - 40;
    burst.querySelector(`.${s.bloom}`)!.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)", offset: .25 }, { opacity: 0, transform: "scale(1.35)" }], { duration: 1000, delay: pop, easing: "ease-out", fill: "both" });
    burst.querySelector(`.${s.ring}`)!.animate([{ opacity: .9, transform: "scale(.2)" }, { opacity: 0, transform: "scale(1.9)" }], { duration: 650, delay: pop, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" });
    burst.querySelectorAll<HTMLElement>(`.${s.spark}`).forEach((spark, k) => {
      const turn = `rotate(${(k / 16 * 360 + i * 11).toFixed(1)}deg)`, reach = k % 2 ? 58 : 92;
      spark.animate([
        { opacity: 0, transform: `${turn} translateX(0px) scaleX(.4)` }, { opacity: 1, transform: `${turn} translateX(${reach * .35}px) scaleX(1)`, offset: .15 },
        { opacity: 0, transform: `${turn} translateX(${reach}px) scaleX(.3)` },
      ], { duration: 1050, delay: pop, easing: "cubic-bezier(.15,.7,.3,1)", fill: "both" });
    });
  });
  window.setTimeout(() => group.remove(), 3200);
}

export default function JourneyBackdrop() {
  const host = useRef<HTMLDivElement>(null);
  const sparks = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current, layer = sparks.current, dialog = root?.closest("dialog");
    if (!root || !layer || !dialog) return;
    const canvas = document.createElement("canvas");
    canvas.className = s.canvas;
    canvas.setAttribute("aria-hidden", "true");
    root.insertBefore(canvas, layer);
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    const u = gl ? compile(gl) : null;
    if (!gl || !u) { gl?.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove(); return; }
    // Stage components drop their own atmospheres only while this backdrop really draws.
    dialog.dataset.journeyBackdrop = "on";

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const now: Target = { gather: 0, calm: 0, tilt: 0, low: 0, ring: 600, ringOn: 0, alpha: 0, obstacle: 0, focusX: innerWidth / 2, focusY: innerHeight / 2, symX: innerWidth / 2, symY: innerHeight * .2, symSize: Math.min(innerWidth * .6, 260), symOn: 0, sway: 0 };
    const quick: (keyof Target)[] = ["focusX", "focusY", "symX", "symY", "symSize"];
    let frame = 0, timer = 0, last = 0, clock = Math.random() * 50, alive = true, light = false;
    let film: DOMRect | null = null, lastFilm: DOMRect | null = null, button: DOMRect | null = null, caption: DOMRect | null = null;
    let target = now, polled = 0, celebration: Element | null = null, ignitedAt = -1e9, sceneKey = "", sceneStart = 0;
    const draw = (time: number) => {
      frame = 0;
      if (!alive) return;
      const width = root.clientWidth, height = root.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (time - polled > 140 || !polled) {
        polled = time;
        light = root.closest("[data-contygo-theme]")?.getAttribute("data-contygo-theme") === "light";
        film = visibleFilm(dialog);
        if (film) lastFilm = film;
        const captionsBox = Array.from(dialog.querySelectorAll("[data-film-captions]")).find(shown);
        caption = captionsBox ? captionsBox.getBoundingClientRect() : null;
        const cta = dialog.querySelector("a[data-final]");
        button = cta && opacityChain(cta, dialog) > .3 ? cta.getBoundingClientRect() : null;
        const key = `${dialog.dataset.visaPhase}/${dialog.querySelector("main[data-phase]")?.getAttribute("data-phase") ?? ""}`;
        if (key !== sceneKey) { sceneKey = key; sceneStart = time; }
        target = stageTarget(dialog, width, height, { film, button, elapsed: (time - sceneStart) / 1000 });
        // A celebration begins (name step, final invitation): the real symbol on screen launches the
        // first rockets, once its own entrance has settled.
        const party = Array.from(dialog.querySelectorAll("[data-celebration]")).find(el => shown(el) && opacityChain(el, dialog) > .5) ?? null;
        if (party && party !== celebration && !motion.matches && now.alpha > .5) {
          const source = party, tone = light;
          window.setTimeout(() => {
            if (!alive || !source.isConnected) return;
            const anchor = logoAnchor(source, root.getBoundingClientRect());
            if (anchor) ignite(layer, anchor, tone);
          }, 650);
          ignitedAt = time;
        }
        if (party) celebration = party;
        // While the solid logo takes over (and until the rockets are gone) the watermark steps back.
        if (time - ignitedAt < 2600) target = { ...target, symOn: 0, symX: now.symX, symY: now.symY, symSize: now.symSize };
        // Without rings the radius holds still while their presence fades out; a hidden «y» keeps its
        // place, so it reappears where the next scene wants it instead of sliding across the screen.
        if (!target.ringOn) target = { ...target, ring: now.ring };
        if (!target.symOn && now.symOn < .02) target = { ...target, symX: now.symX, symY: now.symY, symSize: now.symSize };
        else if (target.symOn && now.symOn < .02) { now.symX = target.symX; now.symY = target.symY; now.symSize = target.symSize; }
      }
      const dt = last ? Math.min(time - last, 100) / 1000 : 0;
      last = time;
      // Every gesture eases into the next (about 0.6 s), so stages morph instead of cutting.
      const ease = motion.matches ? 1 : 1 - Math.exp(-dt / .6);
      (Object.keys(now) as (keyof Target)[]).forEach(key => {
        const rate = quick.includes(key) ? Math.min(1, ease * 1.4) : key === "symOn" && target.symOn < now.symOn ? Math.min(1, ease * 4) : ease;
        now[key] += (target[key] - now[key]) * rate;
      });
      if (!motion.matches) clock += dt;
      const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      const obstacle = film ?? (button && now.obstacle > .01 && !film ? button : lastFilm), origin = root.getBoundingClientRect();
      // The «y» floats (a slow breath) and, when it rests in a corner, sways around its vertex.
      const float = motion.matches ? 0 : Math.sin(clock * .9) * 5;
      const sway = motion.matches ? 0 : Math.sin(clock * .55) * .06 * now.sway;
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.dpr, dpr);
      gl.uniform1f(u.time, clock);
      gl.uniform4f(u.obstacle, obstacle ? obstacle.left - origin.left : 0, obstacle ? obstacle.top - origin.top : 0, obstacle ? obstacle.width : 0, obstacle ? obstacle.height : 0);
      gl.uniform1f(u.obstacleOn, now.obstacle);
      gl.uniform2f(u.focus, now.focusX - origin.left, now.focusY - origin.top);
      gl.uniform1f(u.gather, now.gather);
      gl.uniform1f(u.tilt, now.tilt);
      gl.uniform1f(u.calm, now.calm);
      gl.uniform1f(u.low, now.low);
      gl.uniform1f(u.ring, now.ring);
      gl.uniform1f(u.ringOn, now.ringOn);
      gl.uniform3f(u.sym, now.symX - origin.left, now.symY - origin.top + float, now.symSize);
      gl.uniform1f(u.symOn, now.symOn);
      gl.uniform1f(u.symRot, sway);
      gl.uniform4f(u.caption, caption ? caption.left - origin.left : 0, caption ? caption.top - origin.top : 0, caption ? caption.width : 0, caption ? caption.height : 0);
      gl.uniform1f(u.alpha, now.alpha);
      gl.uniform1f(u.light, light ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // ~30 fps while moving; a slow poll keeps stage changes smooth when motion is reduced.
      if (!document.hidden) timer = window.setTimeout(() => { timer = 0; frame = requestAnimationFrame(draw); }, motion.matches ? 140 : 24);
    };
    const wake = () => { if (!frame && !timer) frame = requestAnimationFrame(draw); };
    wake();
    document.addEventListener("visibilitychange", wake);
    return () => {
      alive = false;
      clearTimeout(timer); cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", wake);
      delete dialog.dataset.journeyBackdrop;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      layer.replaceChildren();
    };
  }, []);

  return <div ref={host} className={s.backdrop} aria-hidden="true"><div ref={sparks} className={s.sparks} /></div>;
}
