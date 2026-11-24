"use client";

/* ============================================================
   /admin — Panel del dueño (solo cuentas con rol owner)
   Resumen del negocio, Contactos (todos), Leads y asesoras, Reseñas,
   Equipo y Mi cuenta. Las asesoras tienen su propio panel en /equipo.
   ============================================================ */
import { useCallback, useEffect, useState } from "react";
import AccountPanel from "./AccountPanel";
import CrmPanel from "./CrmPanel";
import LeadsPanel from "./LeadsPanel";
import LoginForm from "./LoginForm";
import OwnerOverview from "./OwnerOverview";
import CaseCounterCard from "./CaseCounterCard";
import ReviewsPanel from "./ReviewsPanel";
import TeamPanel from "./TeamPanel";

export interface SessionInfo {
  uid: string;
  name: string;
  role: "owner" | "advisor";
  advisorId: string | null;
}

type View = "overview" | "crm" | "leads" | "reviews" | "team" | "account";

const VIEWS: { key: View; label: string }[] = [
  { key: "overview", label: "Resumen" },
  { key: "crm", label: "Contactos" },
  { key: "leads", label: "Leads y asesoras" },
  { key: "reviews", label: "Casos y reseñas" },
  { key: "team", label: "Equipo" },
  { key: "account", label: "Mi cuenta" },
];

const TITLES: Record<View, string> = {
  overview: "Resumen del negocio",
  crm: "Contactos",
  leads: "Leads y asesoras",
  reviews: "Casos y reseñas de clientes",
  team: "Equipo y accesos",
  account: "Mi cuenta",
};

export default function AdminPanel() {
  const [session, setSession] = useState<SessionInfo | null | undefined>(undefined);
  const [view, setView] = useState<View>("overview");
  const [pendingReviews, setPendingReviews] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/admin/login", { cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          const info = (await res.json()) as SessionInfo & { crm?: boolean };
          setSession(info);
          // Sin la base del CRM conectada, lo que funciona son las felicitaciones: el panel abre ahí.
          if (info.crm === false) setView("reviews");
          else
            try {
              const saved = window.localStorage.getItem("ulp_owner_view") as View | null;
              if (saved && VIEWS.some((v) => v.key === saved)) setView(saved);
            } catch {
              /* sin almacenamiento */
            }
        } else setSession(null);
      } catch {
        if (alive) setSession(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function go(v: View) {
    setView(v);
    try {
      window.localStorage.setItem("ulp_owner_view", v);
    } catch {
      /* sin almacenamiento */
    }
  }

  const logout = useCallback(async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setSession(null);
  }, []);

  const onPending = useCallback((n: number) => setPendingReviews(n), []);

  if (session === undefined) return <div className="admin__loading">Cargando…</div>;

  if (!session) {
    return (
      <LoginForm
        kicker="Panel del dueño"
        title="Entrar"
        hint="Acceso exclusivo del dueño: usuario «henry» y tu contraseña. Las asesoras entran en /equipo."
        userPlaceholder="henry"
        onLogin={(s) => {
          setSession(s);
          // Como al cargar con la sesión ya abierta: sin la base del CRM, el panel abre donde sí hay algo que hacer
          // (el contador de casos y las felicitaciones). El 24-11-2026 el dueño entró, cayó en un «Resumen» vacío y no
          // encontró el contador.
          setView((s as SessionInfo & { crm?: boolean }).crm === false ? "reviews" : "overview");
        }}
      />
    );
  }

  if (session.role !== "owner") {
    return (
      <div className="rate__card admin__login slide-anim">
        <span className="slide-tag">Panel del dueño</span>
        <h1 className="rate__title">Este panel es del dueño</h1>
        <p className="rate__sub">Hola, {session.name}. Tu panel de trabajo está en la sección del equipo.</p>
        <a className="btn btn--primary rate__send" href="/equipo">
          Ir a mi panel
        </a>
        <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="admin admin--owner slide-anim">
      <header className="admin__bar">
        <div className="admin__brand">
          <span className="admin__brand-dot" aria-hidden="true" />
          <div>
            <span className="admin__kicker">Panel del dueño · {session.name}</span>
            <h1 className="admin__title">{TITLES[view]}</h1>
          </div>
        </div>
        <nav className="admin__views" aria-label="Sección">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" className={"admin__view" + (view === v.key ? " admin__view--on" : "")} aria-current={view === v.key ? "page" : undefined} onClick={() => go(v.key)}>
              {v.label}
              {v.key === "reviews" && pendingReviews > 0 && <span className="admin__view-n">{pendingReviews}</span>}
            </button>
          ))}
        </nav>
        <div className="admin__bar-actions">
          <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => void logout()}>
            Salir
          </button>
        </div>
      </header>

      {/* El contador de casos y la presentación en vivo, también en el Resumen: lo primero que se ve al entrar. */}
      {view === "overview" && (
        <>
          <CaseCounterCard />
          <div className="admin__toolbar">
            <a className="btn btn--primary" href="/admin/felicitaciones" target="_blank" rel="noopener noreferrer">
              Presentar en vivo
            </a>
            <a className="btn btn--ghost" href="/admin/felicitaciones?ejemplos=1" target="_blank" rel="noopener noreferrer">
              Ver ejemplos
            </a>
            <div className="admin__toolbar-right">
              <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => go("reviews")}>
                Aprobar historias de clientes
              </button>
            </div>
          </div>
          <OwnerOverview onGo={(v) => go(v)} />
        </>
      )}
      {view === "crm" && <CrmPanel session={session} />}
      {view === "leads" && <LeadsPanel />}
      {view === "reviews" && <ReviewsPanel onPending={onPending} />}
      {view === "team" && <TeamPanel />}
      {view === "account" && <AccountPanel session={session} />}
    </div>
  );
}
