"use client";

/* ============================================================
   Resumen del negocio (solo el dueño)
   Lo que las asesoras no ven: el negocio completo y la comparación
   entre ellas. Datos de los últimos 30 días salvo que se indique.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Advisor, Lead } from "@/lib/advisors";
import type { Contact } from "@/lib/crm";
import { getServiceById } from "@/lib/services";
import { ADVISOR_COLORS, DAY, startOfDay, waitShort } from "./fmt";

type Go = "crm" | "leads" | "reviews" | "team";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface Row {
  id: string;
  name: string;
  color: string;
  active: boolean;
  leads: number;
  contacts: number;
  contacted: number;
  responseMin: number | null;
  paid: number;
  lost: number;
  rate: number | null;
  revenue: number;
  pendingNew: number;
}

export default function OwnerOverview({ onGo }: { onGo: (v: Go) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, l, a] = await Promise.all([
        fetch("/api/crm/contacts", { cache: "no-store" }),
        fetch("/api/admin/leads?days=30", { cache: "no-store" }),
        fetch("/api/admin/advisors", { cache: "no-store" }),
      ]);
      if (c.status === 503 || l.status === 503) return setError("Falta conectar la base de datos (variables de Supabase).");
      if (!c.ok || !l.ok || !a.ok) return setError("No se pudo leer la base de datos. Intenta de nuevo.");
      setContacts((await c.json()) as Contact[]);
      setLeads((await l.json()) as Lead[]);
      setAdvisors((await a.json()) as Advisor[]);
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

  const d0 = startOfDay(now);
  const t30 = d0 - 29 * DAY;

  const top = useMemo(() => {
    const leadsToday = leads.filter((l) => l.source === "auto" && new Date(l.created_at).getTime() >= d0).length;
    const leads30 = leads.filter((l) => l.source === "auto" && new Date(l.created_at).getTime() >= t30).length;
    const c30 = contacts.filter((c) => new Date(c.created_at).getTime() >= t30);
    const pendingNew = contacts.filter((c) => c.stage === "nuevo");
    const oldest = pendingNew.reduce<number | null>((m, c) => {
      const t = new Date(c.created_at).getTime();
      return m === null || t < m ? t : m;
    }, null);
    const paid = contacts.filter((c) => (c.stage === "pagado" || c.stage === "en_tramite" || c.stage === "cerrado") && new Date(c.updated_at).getTime() >= t30);
    const revenue = paid.reduce((s, c) => s + (c.amount ?? 0), 0);
    const late = contacts.filter((c) => c.next_action_at && new Date(c.next_action_at).getTime() < d0 && c.stage !== "cerrado" && c.stage !== "perdido").length;
    return { leadsToday, leads30, contacts30: c30.length, pendingNew: pendingNew.length, oldest, paid: paid.length, revenue, late };
  }, [contacts, leads, d0, t30]);

  const rows: Row[] = useMemo(
    () =>
      advisors.map((a, i) => {
        const mine = contacts.filter((c) => c.advisor_id === a.id);
        const mine30 = mine.filter((c) => new Date(c.created_at).getTime() >= t30);
        const contacted = mine30.filter((c) => c.stage !== "nuevo");
        const resp = mine.filter((c) => c.first_contact_at).map((c) => (new Date(c.first_contact_at!).getTime() - new Date(c.created_at).getTime()) / 60000);
        const paid = mine.filter((c) => c.stage === "pagado" || c.stage === "en_tramite" || c.stage === "cerrado");
        const lost = mine.filter((c) => c.stage === "perdido");
        const decided = paid.length + lost.length;
        return {
          id: a.id,
          name: a.name,
          color: ADVISOR_COLORS[i % ADVISOR_COLORS.length]!,
          active: a.active,
          leads: leads.filter((l) => l.advisor_id === a.id && l.source === "auto" && new Date(l.created_at).getTime() >= t30).length,
          contacts: mine30.length,
          contacted: contacted.length,
          responseMin: resp.length ? Math.round(resp.reduce((s, m) => s + m, 0) / resp.length) : null,
          paid: paid.length,
          lost: lost.length,
          rate: decided ? Math.round((paid.length / decided) * 100) : null,
          revenue: paid.reduce((s, c) => s + (c.amount ?? 0), 0),
          pendingNew: mine.filter((c) => c.stage === "nuevo").length,
        };
      }),
    [advisors, contacts, leads, t30],
  );

  const services = useMemo(() => {
    const m = new Map<string, { name: string; leads: number; contacts: number; paid: number }>();
    for (const l of leads) {
      if (l.source !== "auto") continue;
      const id = l.service_id ?? (l.path ? l.path.replace(/^\/+|\/+$/g, "") : "");
      const svc = getServiceById(id) ?? undefined;
      const key = svc?.id ?? "otros";
      const e = m.get(key) ?? { name: svc?.name ?? "Home / Prime", leads: 0, contacts: 0, paid: 0 };
      e.leads += 1;
      m.set(key, e);
    }
    for (const c of contacts) {
      const svc = c.service_id ? getServiceById(c.service_id) : undefined;
      const key = svc?.id ?? "otros";
      const e = m.get(key) ?? { name: svc?.name ?? "Sin servicio", leads: 0, contacts: 0, paid: 0 };
      e.contacts += 1;
      if (c.stage === "pagado" || c.stage === "en_tramite" || c.stage === "cerrado") e.paid += 1;
      m.set(key, e);
    }
    return Array.from(m.values()).sort((a, b) => b.leads + b.contacts - (a.leads + a.contacts)).slice(0, 8);
  }, [leads, contacts]);

  if (loading && contacts.length === 0 && leads.length === 0) return <div className="admin__loading">Cargando…</div>;

  const fmtResp = (m: number | null) => (m === null ? "—" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

  return (
    <div className="ld">
      {error && <p className="admin__error">{error}</p>}

      <section className="crm__kpis" aria-label="Hoy">
        <button type="button" className={"kpi" + (top.pendingNew > 0 ? " kpi--alert" : "")} onClick={() => onGo("crm")}>
          <span className="kpi__n">{top.pendingNew}</span>
          <span className="kpi__l">Sin contactar ahora</span>
          <span className="kpi__s">{top.oldest ? `el más antiguo espera ${waitShort(new Date(top.oldest).toISOString(), now)}` : "todo atendido"}</span>
        </button>
        <button type="button" className={"kpi" + (top.late > 0 ? " kpi--warn" : "")} onClick={() => onGo("crm")}>
          <span className="kpi__n">{top.late}</span>
          <span className="kpi__l">Seguimientos vencidos</span>
          <span className="kpi__s">en todo el equipo</span>
        </button>
        <button type="button" className="kpi" onClick={() => onGo("leads")}>
          <span className="kpi__n">{top.leadsToday}</span>
          <span className="kpi__l">Leads hoy</span>
          <span className="kpi__s">{top.leads30} en 30 días</span>
        </button>
        <div className="kpi">
          <span className="kpi__n">{money.format(top.revenue)}</span>
          <span className="kpi__l">Cobrado en 30 días</span>
          <span className="kpi__s">
            {top.paid} {top.paid === 1 ? "caso pagado" : "casos pagados"}
          </span>
        </div>
      </section>

      <section className="ld__balance">
        <div className="ld__row-head" style={{ marginBottom: 0 }}>
          <div>
            <h2 className="ld__h">Rendimiento por asesora</h2>
            <p className="ld__muted">Últimos 30 días. La tasa de cierre cuenta pagados entre los casos ya decididos (pagados + perdidos).</p>
          </div>
          <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
        <div className="ov__wrap">
          <table className="ov">
            <thead>
              <tr>
                <th>Asesora</th>
                <th>Leads</th>
                <th>Contactos</th>
                <th>Contactados</th>
                <th>1.ª respuesta</th>
                <th>Pagados</th>
                <th>Perdidos</th>
                <th>Cierre</th>
                <th>Cobrado</th>
                <th>Sin contactar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.active ? "" : "is-off"}>
                  <td>
                    <span className="ov__adv">
                      <span className="ld__dot" style={{ background: r.color }} aria-hidden="true" />
                      {r.name}
                      {!r.active && <em>pausada</em>}
                    </span>
                  </td>
                  <td>{r.leads}</td>
                  <td>{r.contacts}</td>
                  <td>
                    {r.contacted}
                    {r.contacts > 0 && <small> · {Math.round((r.contacted / r.contacts) * 100)}%</small>}
                  </td>
                  <td className={r.responseMin !== null && r.responseMin > 60 ? "is-bad" : ""}>{fmtResp(r.responseMin)}</td>
                  <td>{r.paid}</td>
                  <td>{r.lost}</td>
                  <td>{r.rate === null ? "—" : `${r.rate}%`}</td>
                  <td>{money.format(r.revenue)}</td>
                  <td className={r.pendingNew > 0 ? "is-bad" : ""}>{r.pendingNew}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="ov__empty">
                    Sin asesoras todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="ld__muted">
          <strong>Leads</strong>: personas que tocaron WhatsApp por primera vez. <strong>Contactos</strong>: fichas creadas (desde la web o a mano). <strong>1.ª respuesta</strong>: minutos entre que llega la ficha y el primer contacto registrado.
        </p>
      </section>

      <div className="ov__two">
        <section className="ld__balance">
          <h2 className="ld__h">Por servicio</h2>
          <div className="ov__wrap">
            <table className="ov ov--small">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Leads 30 d</th>
                  <th>Contactos</th>
                  <th>Pagados</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>{s.leads}</td>
                    <td>{s.contacts}</td>
                    <td>{s.paid}</td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={4} className="ov__empty">
                      Todavía sin datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="ld__balance">
          <h2 className="ld__h">Accesos rápidos</h2>
          <div className="ov__links">
            <button type="button" className="ov__link" onClick={() => onGo("crm")}>
              <b>Contactos</b>
              <span>Todos los casos del equipo, tablero y seguimientos.</span>
            </button>
            <button type="button" className="ov__link" onClick={() => onGo("leads")}>
              <b>Leads y asesoras</b>
              <span>Reparto por turnos, números de WhatsApp, pausas.</span>
            </button>
            <button type="button" className="ov__link" onClick={() => onGo("reviews")}>
              <b>Reseñas</b>
              <span>Aprobar lo que se publica en la home.</span>
            </button>
            <button type="button" className="ov__link" onClick={() => onGo("team")}>
              <b>Equipo</b>
              <span>Usuarios y contraseñas de las asesoras.</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
