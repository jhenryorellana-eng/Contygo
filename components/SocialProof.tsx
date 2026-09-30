"use client";

/* ============================================================
   PRUEBA SOCIAL — carrusel automático de fotos reales de clientes
   + "+N familias". Se muestra junto al CTA de WhatsApp en los
   resultados positivos (cuando el cliente califica).

   Para cambiar las fotos: súbelas a /public/testimonios/ y ajusta
   la lista PHOTOS. Si una foto falta, esa tarjeta no se muestra.
   ============================================================ */
import { useState } from "react";
import { Ico } from "./icons";

// Fotos reales de clientes (en /public/testimonios/).
const PHOTOS: string[] = [
  "/testimonios/1.jpeg",
  "/testimonios/3.jpeg",
  "/testimonios/5.jpeg",
  "/testimonios/4.jpeg",
  "/testimonios/12.jpeg",
];

/** Texto de confianza. Ajusta a tu realidad. */
const COUNT_LABEL = "+500 familias";
const SUBTITLE = "ya confiaron en UsaLatinoPrime";
const BADGE = "Caso aprobado";

function Slide({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="social__slide">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Cliente de UsaLatinoPrime" loading="lazy" onError={() => setFailed(true)} />
      <figcaption className="social__tag">
        <span className="social__tag-ico">{Ico.check}</span>
        {BADGE}
      </figcaption>
    </figure>
  );
}

export default function SocialProof() {
  // Se duplica la lista para lograr el desplazamiento infinito sin saltos.
  const loop = [...PHOTOS, ...PHOTOS];
  return (
    <div className="social" aria-label="Clientes satisfechos">
      <div className="social__viewport">
        <div className="social__track">
          {loop.map((src, i) => (
            <Slide key={src + i} src={src} />
          ))}
        </div>
        <span className="social__fade social__fade--l" aria-hidden="true" />
        <span className="social__fade social__fade--r" aria-hidden="true" />
      </div>
      <div className="social__caption">
        <span className="social__stars" aria-hidden="true">★★★★★</span>
        <p className="social__subtitle">
          <strong>{COUNT_LABEL}</strong> {SUBTITLE}
        </p>
      </div>
    </div>
  );
}
