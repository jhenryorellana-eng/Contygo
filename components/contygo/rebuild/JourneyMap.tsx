"use client";

/* El mapa del recorrido (28-10-2026): una línea fina en el borde de arriba, un tramo por etapa (Conoce el servicio · Tu
   caso · Tu proceso · Tu contrato). Al llegar a una etapa nueva aparece unos segundos «Paso 2 de 4 · Tu caso · Quedan
   unos 5 min», y vuelve al tocar la línea. No ocupa sitio: el celular conserva toda la pantalla para la etapa. */
import { useEffect, useState } from "react";
import s from "./JourneyMap.module.css";

type Props = { steps: string[]; current: number; minutesLeft: number };

export default function JourneyMap({ steps, current, minutesLeft }: Props) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    setShown(true);
    const timer = window.setTimeout(() => setShown(false), 4200);
    return () => window.clearTimeout(timer);
  }, [current]);
  const label = `Paso ${current + 1} de ${steps.length} · ${steps[current]}`;
  const left = minutesLeft <= 1 ? "Queda menos de un minuto" : `Quedan unos ${minutesLeft} min`;
  return <nav className={s.map} aria-label="Tu recorrido">
    <button type="button" className={s.line} onClick={() => setShown(true)} aria-label={`${label}. ${left}`}>
      {steps.map((step, index) => <i key={step} data-state={index < current ? "done" : index === current ? "current" : "next"} />)}
    </button>
    <p className={s.pill} data-shown={shown} role="status" aria-live="polite"><b>{label}</b><span>{left}</span></p>
  </nav>;
}
