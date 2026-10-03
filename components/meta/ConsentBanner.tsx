"use client";

/* ============================================================
   Banner de consentimiento (ACTIVO por defecto desde el 02-10-2026, decisión del dueño).
   El Pixel y la Conversions API solo cargan después de «Aceptar»: este banner guarda la
   elección y avisa a MetaPixel con CONSENT_EVENT. Solo NEXT_PUBLIC_META_REQUIRE_CONSENT === "0"
   lo apaga (el Pixel carga sin pedir).
   Estilo inline con el color del tema (#2563c4) para no depender de globals.css.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { CONSENT_EVENT, CONSENT_STORAGE_KEY, REQUIRE_CONSENT } from "@/lib/meta/events";

const STORAGE_KEY = CONSENT_STORAGE_KEY; // 'granted' | 'denied'
const COOKIE_MAX_AGE = 15552000; // 180 días

function persist(value: "granted" | "denied") {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* sin almacenamiento: la cookie sigue valiendo para el servidor */
  }
  // Cookie legible por el servidor para gatear el CAPI en /api/meta.
  document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function grant() {
  persist("granted");
  // MetaPixel carga el Pixel (init + primer PageView) al recibir este evento.
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function deny() {
  persist("denied");
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const handledOnLoad = useRef(false);

  useEffect(() => {
    if (!REQUIRE_CONSENT || handledOnLoad.current) return;
    handledOnLoad.current = true;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* sin almacenamiento: se pregunta en cada visita */
    }
    if (stored === "granted") {
      // Visita recurrente ya consentida: MetaPixel ya lo cargó; se renueva la cookie que lee /api/meta.
      persist("granted");
    } else if (!stored) {
      setVisible(true);
    }
  }, []);

  if (!REQUIRE_CONSENT || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 9999,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid #e2e8f0",
        boxShadow: "0 -6px 24px rgba(0,0,0,0.08)",
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "56rem",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "#334155", margin: 0, flex: "1 1 280px" }}>
          Usamos cookies para medir el rendimiento de nuestra publicidad y
          mejorar tu experiencia. Puedes aceptar o rechazar el seguimiento; si no aceptas,
          no se carga nada de Meta.{" "}
          <a href="/privacidad" style={{ color: "#2563c4", textDecoration: "underline" }}>
            Ver privacidad
          </a>
        </p>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              deny();
              setVisible(false);
            }}
            style={{
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "transparent",
              padding: "8px 16px",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => {
              grant();
              setVisible(false);
            }}
            style={{
              borderRadius: "8px",
              border: "none",
              background: "#2563c4",
              padding: "8px 16px",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
