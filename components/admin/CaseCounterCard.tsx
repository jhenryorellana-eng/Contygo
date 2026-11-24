"use client";

/* El contador de casos en el panel del dueño (24-11-2026): sus tres totales, quién y cuándo lo actualizó, la puerta
   para ponerlo al día y el link para el encargado (Andrium), que entra sin la contraseña del panel.
   Las cifras viven en lib/case-counter.ts; se editan en /contador. */
import { useCallback, useEffect, useState } from "react";

type Counter = { totals: { created: number; pending: number; won: number }; counter: { example?: boolean; updatedAt: string | null; updatedBy: string | null }; editUrl?: string; previewUrl?: string };
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString("es", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : null;

export default function CaseCounterCard() {
  const [data, setData] = useState<Counter | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "off" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/cases", { cache: "no-store" });
      if (response.status === 503) return setState("off");
      if (!response.ok) return setState("error");
      setData(await response.json() as Counter); setState("ready");
    } catch { setState("error"); }
  }, []);
  useEffect(() => {
    void load();
    // Back from the counter's tab: the figures may have changed.
    const back = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [load]);

  const last = when(data?.counter.updatedAt ?? null);
  return (
    <section aria-label="Contador de casos" style={{ display: "grid", gap: 12 }}>
      <div className="admin__toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: 19 }}>Contador de casos</h3>
          <p className="admin__hint" style={{ textAlign: "left", margin: "3px 0 0" }}>
            {state === "loading" ? "Cargando…" : state === "off" ? "Falta conectar el almacén del panel." : state === "error" ? "No se pudo leer el contador." : data?.counter.example ? "Cifras de EJEMPLO: en la página salen marcadas así hasta que se guarden las reales." : last ? `Actualizado el ${last}, por ${data?.counter.updatedBy}.` : "Todavía no se ha guardado ninguna cifra."}
          </p>
        </div>
        <div className="admin__toolbar-right">
          <a className="btn btn--primary" href="/contador" target="_blank" rel="noopener noreferrer">Actualizar contador</a>
          <a className="btn btn--ghost admin__btn-sm" href={data?.previewUrl ?? "/?ejemplo=1#casos"} target="_blank" rel="noopener noreferrer">Ver la landing con ejemplos</a>
          {data?.previewUrl && (
            <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => { void navigator.clipboard?.writeText(data.previewUrl!).then(() => { setShared(true); window.setTimeout(() => setShared(false), 2200); }); }}>
              {shared ? "Link copiado" : "Copiar link de la vista con ejemplos"}
            </button>
          )}
          {data?.editUrl && (
            <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => { void navigator.clipboard?.writeText(data.editUrl!).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2200); }); }}>
              {copied ? "Link copiado" : "Copiar link para Andrium"}
            </button>
          )}
        </div>
      </div>
      {state === "ready" && data && (
        <div className="admin__stats" aria-label="Totales del contador">
          <div className="stat"><span className="stat__n">{data.totals.created.toLocaleString("en-US")}</span><span className="stat__l">Casos creados</span></div>
          <div className="stat stat--pending"><span className="stat__n">{data.totals.pending.toLocaleString("en-US")}</span><span className="stat__l">Casos pendientes</span></div>
          <div className="stat stat--approved"><span className="stat__n">{data.totals.won.toLocaleString("en-US")}</span><span className="stat__l">Casos ganados</span></div>
        </div>
      )}
    </section>
  );
}
