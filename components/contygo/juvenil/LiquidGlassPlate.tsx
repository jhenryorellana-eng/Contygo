"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import s from "./LiquidGlassPlate.module.css";

export type LiquidGlassPlateProps = {
  className?: string;
  /** Corner radius in CSS pixels; keep this equal to the containing surface. */
  radius?: number;
  /** SVG displacement scale in CSS pixels (maximum offset is half this value). */
  strength?: number;
  tone?: "dark" | "light";
  /** Pauses the decorative edge glint; there is no continuous canvas render loop. */
  active?: boolean;
};

type RefractionMap = { src: string; width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Red/green encode the inward normal of a rounded rectangle. The displacement
 * rises and settles inside its rim, leaving the centre almost undistorted.
 * This PNG is filter data, never a visible colour layer.
 */
function createRefractionMap(width: number, height: number, radius: number): string | null {
  const canvas = document.createElement("canvas");
  const resolution = Math.max(width, height) > 480 ? 128 : 96;
  canvas.width = Math.max(32, Math.round(resolution * width / Math.max(width, height)));
  canvas.height = Math.max(32, Math.round(resolution * height / Math.max(width, height)));
  const context = canvas.getContext("2d");
  if (!context) return null;

  const pixels = context.createImageData(canvas.width, canvas.height);
  const corner = Math.min(radius, width / 2, height / 2);
  const rim = Math.max(6, Math.min(36, Math.max(corner, 12), Math.min(width, height) * 0.35));
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const px = ((x + 0.5) / canvas.width) * width - halfWidth;
      const py = ((y + 0.5) / canvas.height) * height - halfHeight;
      const qx = Math.abs(px) - (halfWidth - corner);
      const qy = Math.abs(py) - (halfHeight - corner);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const distance = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - corner;
      const depth = -distance;
      const profile = depth > 0 && depth < rim ? Math.sin(Math.PI * depth / rim) ** 0.85 : 0;
      const normalLength = Math.hypot(ox, oy);
      let nx = 0;
      let ny = 0;
      if (normalLength > 0) {
        nx = Math.sign(px) * ox / normalLength;
        ny = Math.sign(py) * oy / normalLength;
      } else if (qx > qy) {
        nx = Math.sign(px);
      } else {
        ny = Math.sign(py);
      }

      const index = (y * canvas.width + x) * 4;
      pixels.data[index] = Math.round(127.5 - nx * profile * 126);
      pixels.data[index + 1] = Math.round(127.5 - ny * profile * 126);
      pixels.data[index + 2] = 128;
      pixels.data[index + 3] = 255;
    }
  }

  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Decorative sibling of the content, not a wrapper: place it first inside a
 * positioned container, then put readable content at position:relative/z-index:1.
 * Neither text nor controls ever receive an SVG filter.
 */
export default function LiquidGlassPlate({
  className = "",
  radius = 28,
  strength = 36,
  tone = "dark",
  active = true,
}: LiquidGlassPlateProps) {
  const reactId = useId();
  const filterId = `contygo-glass-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<RefractionMap | null>(null);
  const corner = Number.isFinite(radius) ? clamp(radius, 0, 999) : 28;
  const displacement = Number.isFinite(strength) ? clamp(strength, 0, 100) : 36;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Parsing a URL is not proof that a browser can render SVG backdrop filters.
    // Restrict the enhancement to desktop/Android Chromium. CSS blur remains a
    // separate layer even if a browser accepts the URL but renders no displacement.
    const isChromium = /(?:Chrome|Chromium)\//.test(navigator.userAgent)
      && !/(?:iPhone|iPad|iPod)/.test(navigator.userAgent);
    const supportsReference = typeof CSS !== "undefined"
      && CSS.supports("backdrop-filter", `url("#${filterId}")`);
    if (!isChromium || !supportsReference || displacement === 0) {
      setMap(null);
      return;
    }

    let frame = 0;
    let disposed = false;
    let previousSize = "";
    const update = () => {
      frame = 0;
      if (disposed) return;
      const width = Math.round(host.clientWidth);
      const height = Math.round(host.clientHeight);
      if (width < 2 || height < 2) return;
      const size = `${width}:${height}`;
      if (size === previousSize) return;
      previousSize = size;
      try {
        const src = createRefractionMap(width, height, corner);
        setMap(src ? { src, width, height } : null);
      } catch {
        // A blocked/failed canvas export must leave the CSS glass intact.
        setMap(null);
      }
    };
    const queueUpdate = () => {
      if (!frame && !disposed) frame = window.requestAnimationFrame(update);
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(queueUpdate) : null;
    observer?.observe(host);
    if (!observer) window.addEventListener("resize", queueUpdate, { passive: true });
    queueUpdate();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", queueUpdate);
    };
  }, [corner, displacement, filterId]);

  const style = {
    "--glass-radius": `${corner}px`,
    "--glass-refraction": map ? `url("#${filterId}")` : "none",
  } as CSSProperties;

  return (
    <div
      ref={hostRef}
      className={`${s.plate} ${className}`}
      style={style}
      data-tone={tone}
      data-active={active ? "true" : "false"}
      data-refraction={map ? "svg" : "css"}
      data-liquid-glass="true"
      aria-hidden="true"
    >
      {map && (
        <svg className={s.definitions} width="0" height="0" focusable="false" aria-hidden="true">
          <defs>
            <filter
              id={filterId}
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={map.width}
              height={map.height}
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={map.src}
                x="0"
                y="0"
                width={map.width}
                height={map.height}
                preserveAspectRatio="none"
                result="rim-map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="rim-map"
                scale={displacement}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}
      <div className={s.fallback} />
      <div className={s.refraction} />
      <div className={s.finish} />
      <div className={s.glint} />
    </div>
  );
}
