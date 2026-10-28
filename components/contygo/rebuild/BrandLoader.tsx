"use client";

/* La espera de ContyGo (28-10-2026): el check de la marca se dibuja con el hilo verde dentro de un aro que gira.
   Solo cuando de verdad hay que esperar: nace invisible y aparece a los 300 ms, así que una carga rápida nunca lo
   muestra. «overlay» cubre la pantalla (abrir un servicio con internet lento); sin él, se centra en su contenedor
   (un vídeo que todavía carga). Con «reducir movimiento» el check queda dibujado y solo late. */
import s from "./BrandLoader.module.css";

type Props = { overlay?: boolean; label?: string };

export default function BrandLoader({ overlay = false, label = "Cargando" }: Props) {
  return <div className={s.loader} data-overlay={overlay || undefined} role="status" aria-live="polite">
    <span className={s.badge}>
      {/* Sized inline: the page's styles fix every icon at 22 px. */}
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" style={{ width: "100%", height: "100%" }}>
        <circle className={s.track} cx="50" cy="50" r="45" />
        <circle className={s.arc} cx="50" cy="50" r="45" />
        <path className={s.tail} d="M47 58 C 44 70, 40 77, 30 77" />
        <path className={s.check} d="M31 41 L47 60 L74 23" />
      </svg>
    </span>
    <span className={s.label}>{label}</span>
  </div>;
}
