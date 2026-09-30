"use client";

/* ============================================================
   /califica — Formulario de reseña del cliente
   Estrellas + comentario + nombre + servicio. Queda pendiente de
   aprobación en /admin antes de publicarse en la home.
   ============================================================ */
import { useState } from "react";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { Ico } from "../icons";

const COMMENT_MIN = 10;
const COMMENT_MAX = 600;

type Phase = "form" | "sending" | "done";

export default function RateForm() {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  const valid =
    rating >= 1 &&
    name.trim().length >= 2 &&
    comment.trim().length >= COMMENT_MIN &&
    comment.trim().length <= COMMENT_MAX;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || phase === "sending") return;
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          name: name.trim(),
          serviceId: serviceId || null,
          comment: comment.trim(),
          website,
        }),
      });
      if (res.ok) {
        setPhase("done");
        return;
      }
      if (res.status === 503) {
        setError("El sistema de reseñas estará disponible muy pronto. Inténtalo más tarde.");
      } else {
        setError("No pudimos enviar tu reseña. Revisa los datos e inténtalo de nuevo.");
      }
      setPhase("form");
    } catch {
      setError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
      setPhase("form");
    }
  }

  if (phase === "done") {
    return (
      <div className="rate__card rate__done slide-anim">
        <div className="result__badge">{Ico.check}</div>
        <h2>¡Gracias por tu reseña!</h2>
        <p className="rate__done-msg">
          La revisaremos y muy pronto aparecerá publicada en nuestra página. Tu experiencia ayuda
          a otras familias a dar el paso.
        </p>
        <Link className="btn btn--primary" href="/">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form className="rate__card slide-anim" onSubmit={submit}>
      <span className="slide-tag">Tu opinión</span>
      <h1 className="rate__title">¿Cómo fue tu experiencia con nosotros?</h1>
      <p className="rate__sub">
        Tu reseña se publica en nuestra página después de una revisión rápida.
      </p>

      {/* Estrellas */}
      <div className="rate__field">
        <span className="rate__label">Tu calificación</span>
        <div className="stars-input" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
              className={"stars-input__star" + (n <= rating ? " stars-input__star--on" : "")}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Nombre */}
      <div className="rate__field">
        <label className="rate__label" htmlFor="rate-name">
          Tu nombre
        </label>
        <input
          id="rate-name"
          className="rate__input"
          type="text"
          value={name}
          maxLength={80}
          placeholder="Ej. María G."
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Servicio */}
      <div className="rate__field">
        <label className="rate__label" htmlFor="rate-service">
          ¿Qué servicio usaste? <small>(opcional)</small>
        </label>
        <select
          id="rate-service"
          className="rate__input"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">Prefiero no decirlo</option>
          {SERVICES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Comentario */}
      <div className="rate__field">
        <label className="rate__label" htmlFor="rate-comment">
          Cuéntanos tu experiencia
        </label>
        <textarea
          id="rate-comment"
          className="rate__input rate__textarea"
          value={comment}
          maxLength={COMMENT_MAX}
          rows={5}
          placeholder="¿Cómo te ayudamos? ¿Qué le dirías a alguien que está por empezar su trámite?"
          onChange={(e) => setComment(e.target.value)}
          required
        />
        <span className="rate__count">
          {comment.trim().length < COMMENT_MIN
            ? `Escribe al menos ${COMMENT_MIN} caracteres`
            : `${comment.length}/${COMMENT_MAX}`}
        </span>
      </div>

      {/* Honeypot invisible (anti-bots) */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="rate__hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && <p className="rate__error">{error}</p>}

      <button type="submit" className="btn btn--primary rate__send" disabled={!valid || phase === "sending"}>
        {phase === "sending" ? "Enviando…" : "Enviar mi reseña"} {Ico.arrow}
      </button>
    </form>
  );
}
