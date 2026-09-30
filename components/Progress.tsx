/* ============================================================
   UsaLatinoPrime — Barra de progreso
   - Escritorio: rieles con dots + etiqueta de la fase activa.
   - Móvil: barra lineal compacta + "Paso X de Y · Fase".
   ============================================================ */
import { Fragment } from "react";
import { Ico } from "./icons";

interface ProgressProps {
  steps: { label: string }[];
  current: number;
}

export default function Progress({ steps, current }: ProgressProps) {
  const total = steps.length;
  const pct = total > 1 ? (current / (total - 1)) * 100 : 0;
  const phaseLabel = steps[Math.min(current, total - 1)]?.label ?? "";

  return (
    <div className="progress" role="group" aria-label="Progreso de la evaluación">
      {/* ---- Escritorio / tablet ---- */}
      <div className="progress__rail" aria-hidden="false">
        {steps.map((s, i) => (
          <Fragment key={i}>
            <div className={"progress__step" + (i === current ? " progress__step--active" : "")}>
              <div
                className={
                  "progress__dot" +
                  (i < current ? " progress__dot--done" : i === current ? " progress__dot--active" : "")
                }
              >
                {i < current ? Ico.check : i + 1}
              </div>
              <span className="progress__label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={"progress__line" + (i < current ? " progress__line--filled" : "")}>
                <span />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {/* ---- Móvil ---- */}
      <div className="progress__mobile">
        <div className="progress__mobile-top">
          <span className="progress__mobile-phase">{phaseLabel}</span>
          <span className="progress__mobile-count">
            Paso {Math.min(current + 1, total)} de {total}
          </span>
        </div>
        <div className="progress__bar">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
