"use client";

/* ============================================================
   /admin — Reseñas (moderación). Solo el dueño.
   Carga todas y filtra en cliente: pestañas con cifras, resumen y buscador.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Review, ReviewStatus } from "@/lib/reviews";
import { getServiceById } from "@/lib/services";
import { Ico } from "../icons";
import { timeAgo } from "./fmt";

type Tab = ReviewStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Publicadas" },
  { key: "rejected", label: "Rechazadas" },
];

const dateFmt = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("es-US", { hour: "numeric", minute: "2-digit" });

const STATUS_LABEL: Record<ReviewStatus, string> = { pending: "Pendiente", approved: "Publicada", rejected: "Rechazada" };

function Stars({ rating }: { rating: number }) {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <span className="rv__stars" aria-label={`${r} de 5 estrellas`}>
      {"★".repeat(r)}
      <span>{"★".repeat(5 - r)}</span>
    </span>
  );
}

export default function ReviewsPanel({ onPending }: { onPending?: (n: number) => void }) {
  const [tab, setTab] = useState<Tab>("pending");
  const [all, setAll] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reviews?status=all", { cache: "no-store" });
      if (res.status === 503) return setError("Falta conectar la base de datos (variables de Supabase).");
      if (!res.ok) return setError("No se pudo leer la base de datos. Intenta de nuevo en unos segundos.");
      setAll((await res.json()) as Review[]);
      setNow(Date.now());
    } catch {
      setError("Sin conexión con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const r of all) if (r.status) c[r.status] += 1;
    return c;
  }, [all]);

  useEffect(() => {
    onPending?.(counts.pending);
  }, [counts.pending, onPending]);

  const avg = useMemo(() => {
    const pub = all.filter((r) => r.status === "approved");
    return pub.length ? pub.reduce((s, r) => s + r.rating, 0) / pub.length : null;
  }, [all]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((r) => r.status === tab)
      .filter((r) => {
        if (!q) return true;
        const svc = r.service_id ? getServiceById(r.service_id)?.name ?? "" : "";
        return r.name.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q) || svc.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [all, tab, query]);

  async function setStatus(id: string, status: ReviewStatus) {
    setBusy((b) => new Set(b).add(id));
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setAll((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
      else setError("No se pudo guardar el cambio. Intenta de nuevo.");
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(id);
        return n;
      });
    }
  }

  return (
    <>
      <section className="admin__stats" aria-label="Resumen">
        <div className={"stat stat--pending" + (counts.pending > 0 ? " stat--alert" : "")}>
          <span className="stat__n">{counts.pending}</span>
          <span className="stat__l">Por revisar</span>
        </div>
        <div className="stat stat--approved">
          <span className="stat__n">{counts.approved}</span>
          <span className="stat__l">Publicadas en la home</span>
        </div>
        <div className="stat stat--avg">
          <span className="stat__n">
            {avg === null ? "—" : avg.toFixed(1)}
            <span className="stat__star" aria-hidden="true">
              ★
            </span>
          </span>
          <span className="stat__l">Promedio publicado</span>
        </div>
        <div className="stat">
          <span className="stat__n">{all.length}</span>
          <span className="stat__l">Recibidas en total</span>
        </div>
      </section>

      <div className="admin__toolbar">
        <div className="admin__tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={"admin__tab" + (tab === t.key ? " admin__tab--on" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="admin__tab-n">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="admin__toolbar-right">
          <label className="admin__search">
            <span className="sr-only">Buscar</span>
            <input type="search" placeholder="Buscar por nombre, servicio o texto…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && <p className="admin__error">{error}</p>}

      {loading && all.length === 0 ? (
        <div className="admin__loading">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="admin__empty">
          {query
            ? "Ninguna reseña coincide con la búsqueda."
            : tab === "pending"
              ? "No hay reseñas por revisar. Todo al día. 🎉"
              : tab === "approved"
                ? "Aún no has publicado ninguna reseña."
                : "No hay reseñas rechazadas."}
        </div>
      ) : (
        <div className="admin__list">
          {items.map((r) => {
            const svc = r.service_id ? getServiceById(r.service_id) : undefined;
            const isBusy = busy.has(r.id);
            const ago = timeAgo(r.created_at, now);
            return (
              <article className={"rv rv--" + (r.status ?? "pending")} key={r.id}>
                <div className="rv__side">
                  <span className="rv__big">{r.rating}</span>
                  <Stars rating={r.rating} />
                </div>
                <div className="rv__body">
                  <div className="rv__who">
                    <strong>{r.name}</strong>
                    {svc && <span className="rv__chip">{svc.name}</span>}
                    <span className={"rv__state rv__state--" + (r.status ?? "pending")}>{STATUS_LABEL[r.status ?? "pending"]}</span>
                  </div>
                  <p className="rv__text">“{r.comment}”</p>
                  <div className="rv__time">
                    {Ico.calendar}
                    <span>{dateFmt.format(new Date(r.created_at))}</span>
                    <span className="rv__sep" aria-hidden="true">
                      ·
                    </span>
                    {Ico.clock}
                    <span>{timeFmt.format(new Date(r.created_at))}</span>
                    {ago && <em>{ago}</em>}
                  </div>
                </div>
                <div className="rv__actions">
                  {r.status !== "approved" && (
                    <button type="button" className="btn btn--primary rv__btn" disabled={isBusy} onClick={() => setStatus(r.id, "approved")}>
                      {Ico.check} Publicar
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button type="button" className="btn btn--ghost rv__btn rv__btn--no" disabled={isBusy} onClick={() => setStatus(r.id, "rejected")}>
                      {Ico.close} {r.status === "approved" ? "Quitar de la home" : "Rechazar"}
                    </button>
                  )}
                  {r.status === "rejected" && (
                    <button type="button" className="btn btn--ghost rv__btn" disabled={isBusy} onClick={() => setStatus(r.id, "pending")}>
                      Devolver a pendientes
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="admin__hint">
        Las horas se muestran en la zona horaria de tu dispositivo. Al publicar, la reseña aparece en la home al instante; se
        muestran las 12 más recientes.
      </p>
    </>
  );
}
