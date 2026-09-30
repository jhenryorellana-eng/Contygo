"use client";

/* ============================================================
   /equipo — Panel de las asesoras
   Entra con usuario y contraseña; ve solo sus contactos y su cuenta.
   (El dueño también puede entrar aquí para ver el CRM completo.)
   ============================================================ */
import { useCallback, useEffect, useState } from "react";
import AccountPanel from "./AccountPanel";
import type { SessionInfo } from "./AdminPanel";
import CrmPanel from "./CrmPanel";
import LoginForm from "./LoginForm";

type View = "crm" | "account";

export default function TeamApp() {
  const [session, setSession] = useState<SessionInfo | null | undefined>(undefined);
  const [view, setView] = useState<View>("crm");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/admin/login", { cache: "no-store" });
        if (!alive) return;
        setSession(res.ok ? ((await res.json()) as SessionInfo) : null);
      } catch {
        if (alive) setSession(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setSession(null);
  }, []);

  if (session === undefined) return <div className="admin__loading">Cargando…</div>;

  if (!session) {
    return <LoginForm kicker="Panel del equipo" title="Entrar" hint="Usa el usuario y la contraseña que te dio Henry." userPlaceholder="tu usuario" onLogin={setSession} />;
  }

  return (
    <div className="admin admin--team slide-anim">
      <header className="admin__bar">
        <div className="admin__brand">
          <span className="admin__brand-dot" aria-hidden="true" />
          <div>
            <span className="admin__kicker">Hola, {session.name}</span>
            <h1 className="admin__title">{view === "crm" ? "Mis contactos" : "Mi cuenta"}</h1>
          </div>
        </div>
        <nav className="admin__views" aria-label="Sección">
          <button type="button" className={"admin__view" + (view === "crm" ? " admin__view--on" : "")} onClick={() => setView("crm")}>
            Contactos
          </button>
          <button type="button" className={"admin__view" + (view === "account" ? " admin__view--on" : "")} onClick={() => setView("account")}>
            Mi cuenta
          </button>
        </nav>
        <div className="admin__bar-actions">
          {session.role === "owner" && (
            <a className="btn btn--ghost admin__btn-sm" href="/admin">
              Panel del dueño
            </a>
          )}
          <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => void logout()}>
            Salir
          </button>
        </div>
      </header>

      {view === "crm" && <CrmPanel session={session} />}
      {view === "account" && <AccountPanel session={session} />}
    </div>
  );
}
