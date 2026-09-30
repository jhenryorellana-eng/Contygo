"use client";

/* ============================================================
   Banner de consentimiento (Variante B / GDPR — INACTIVO por defecto).
   Solo se monta si NEXT_PUBLIC_META_REQUIRE_CONSENT === "1".
   En la Variante A (disparo directo, EE.UU.) este componente no renderiza nada.
   Estilo inline con el color del tema (#2563c4) para no depender de globals.css.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { REQUIRE_CONSENT } from "@/lib/meta/events";

const STORAGE_KEY = "meta_consent"; // 'granted' | 'denied'
const COOKIE_MAX_AGE = 15552000; // 180 días

function persist(value: "granted" | "denied") {
  window.localStorage.setItem(STORAGE_KEY, value);
  // Cookie legible por el servidor para gatear el CAPI en /api/meta.
  document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function grant() {
  persist("granted");
  if (typeof window.fbq === "function") {
    window.fbq("consent", "grant");
    window.fbq("track", "PageView"); // primer PageView ya consentido
  }
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
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "granted") {
      // Visita recurrente ya consentida: concede y registra el PageView.
      if (typeof window.fbq === "function") {
        window.fbq("consent", "grant");
        window.fbq("track", "PageView");
      }
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
          mejorar tu experiencia. Puedes aceptar o rechazar el seguimiento.
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
