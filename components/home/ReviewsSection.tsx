/* ============================================================
   LP — OPINIONES: marquee de fotos reales ("Caso aprobado") +
   reseñas aprobadas desde Supabase + CTA a /califica.
   Si Supabase no está configurado, la sección no se muestra.
   ============================================================ */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Review } from "@/lib/reviews";
import { getServiceById } from "@/lib/services";
import { Ico } from "../icons";

// Fotos reales de clientes (las mismas de /public/testimonios).
const PHOTOS = [
  "/testimonios/1.jpeg",
  "/testimonios/3.jpeg",
  "/testimonios/5.jpeg",
  "/testimonios/4.jpeg",
  "/testimonios/12.jpeg",
];

const TILTS = ["-1.6deg", "1.1deg", "-0.7deg", "1.8deg", "-1.2deg"];

function Stars({ rating }: { rating: number }) {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <span className="lp-review__stars" aria-label={`${r} de 5 estrellas`}>
      {"★".repeat(r)}
      <span>{"★".repeat(5 - r)}</span>
    </span>
  );
}

function reviewDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Denver" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function ReviewsSection({
  reviews,
  enabled,
}: {
  reviews: Review[];
  enabled: boolean;
}) {
  if (!enabled) return null;

  const loop = [...PHOTOS, ...PHOTOS];

  return (
    <section id="opiniones" className="lp-paper lp-section">
      <div className="lp-wrap">
        <div className="lp-reviews-head" data-reveal>
          <div className="lp-section__head" style={{ marginBottom: 0 }}>
            <span className="lp-eyebrow lp-eyebrow--ink">Opiniones</span>
            <h2>
              Lo que dicen <em>nuestros clientes</em>
            </h2>
            <p>Reseñas reales de personas que llevaron su trámite con nosotros.</p>
          </div>
          <div className="lp-reviews-score">
            <span className="lp-reviews-score__stars" aria-hidden="true">
              ★★★★★
            </span>
            <span className="lp-reviews-score__label">
              <strong>+500 familias</strong> ya confiaron en UsaLatinoPrime
            </span>
          </div>
        </div>

        {/* Fotos reales con sello "Caso aprobado" */}
        <div className="lp-marquee" data-reveal aria-label="Fotos de clientes con casos aprobados">
          <div className="lp-marquee__track">
            {loop.map((src, i) => (
              <figure
                className="lp-polaroid"
                key={src + i}
                style={{ "--pr": TILTS[i % TILTS.length] } as React.CSSProperties}
              >
                <img src={src} alt="Cliente de UsaLatinoPrime" loading="lazy" />
                <figcaption>
                  {Ico.check} Caso aprobado
                </figcaption>
              </figure>
            ))}
          </div>
          <span className="lp-marquee__fade lp-marquee__fade--l" aria-hidden="true" />
          <span className="lp-marquee__fade lp-marquee__fade--r" aria-hidden="true" />
        </div>

        {reviews.length === 0 ? (
          <div className="lp-reviews-empty" data-reveal>
            <p>Aún no hay reseñas publicadas. ¿Llevaste tu trámite con nosotros?</p>
            <Link className="lp-btn lp-btn--navy" href="/califica">
              Califica nuestro servicio {Ico.arrow}
            </Link>
          </div>
        ) : (
          <>
            <div className="lp-reviews">
              {reviews.map((r, i) => {
                const svc = r.service_id ? getServiceById(r.service_id) : undefined;
                return (
                  <article
                    className="lp-review"
                    key={r.id}
                    data-reveal
                    style={{ "--d": `${(i % 3) * 0.1}s` } as React.CSSProperties}
                  >
                    <Stars rating={r.rating} />
                    <p className="lp-review__text">“{r.comment}”</p>
                    <footer className="lp-review__meta">
                      <strong>{r.name}</strong>
                      <span>
                        {svc ? `${svc.name} · ` : ""}
                        {reviewDate(r.created_at)}
                      </span>
                    </footer>
                  </article>
                );
              })}
            </div>
            <div className="lp-reviews-cta" data-reveal>
              <Link className="lp-btn lp-btn--navy" href="/califica">
                Califica nuestro servicio {Ico.arrow}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
