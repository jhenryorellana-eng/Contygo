"use client";

/* ============================================================
   /admin — Contactos (CRM)
   Tres vistas sobre los mismos contactos:
   · Hoy: sin contactar (ordenados por espera) y seguimientos vencidos
     o de hoy. Es la pantalla de trabajo de la asesora.
   · Tablero: columnas por etapa, tarjetas que se arrastran.
   · Lista: tabla con búsqueda y filtro por etapa.
   La ficha (ContactDrawer) se abre desde cualquiera de las tres.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { BOARD_STAGES, STAGE_LABEL, STAGES, type Contact, type Stage } from "@/lib/crm";
import { getServiceById, SERVICES } from "@/lib/services";
import { formatPhone } from "@/lib/wa-route";
import { Ico } from "../icons";
import type { SessionInfo } from "./AdminPanel";
import ContactDrawer, { type AdvisorLite } from "./ContactDrawer";
import { ADVISOR_COLORS, DAY, startOfDay, timeAgo, waitShort, whenLabel } from "./fmt";

type View = "hoy" | "tablero" | "lista";

const CLOSED: ReadonlySet<Stage> = new Set<Stage>(["cerrado", "perdido"]);

export default function CrmPanel({ session }: { session: SessionInfo }) {
  const isOwner = session.role === "owner";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("hoy");
  const [advFilter, setAdvFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, a] = await Promise.all([fetch("/api/crm/contacts", { cache: "no-store" }), fetch("/api/crm/advisors", { cache: "no-store" })]);
      if (c.status === 503) return setError("Falta conectar la base de datos (variables de Supabase).");
      if (!c.ok) return setError("No se pudieron leer los contactos. Intenta de nuevo en unos segundos.");
      setContacts((await c.json()) as Contact[]);
      if (a.ok) setAdvisors((await a.json()) as AdvisorLite[]);
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const colorOf = useCallback(
    (id: string | null) => (id ? ADVISOR_COLORS[Math.max(0, advisors.findIndex((a) => a.id === id)) % ADVISOR_COLORS.length]! : "#8493ab"),
    [advisors],
  );
  const nameOf = useCallback((id: string | null) => (id ? advisors.find((a) => a.id === id)?.name ?? id : "Sin asignar"), [advisors]);

  /** Contactos visibles según filtro de asesora (el dueño) y búsqueda. */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return contacts.filter((c) => {
      if (isOwner && advFilter !== "all" && (c.advisor_id ?? "none") !== advFilter) return false;
      if (!q) return true;
      const svc = c.service_id ? getServiceById(c.service_id)?.name.toLowerCase() ?? "" : "";
      return c.name.toLowerCase().includes(q) || (digits.length >= 3 && (c.phone ?? "").includes(digits)) || svc.includes(q);
    });
  }, [contacts, isOwner, advFilter, query]);

  // ---- cifras ----
  const d0 = startOfDay(now);
  const stats = useMemo(() => {
    const open = visible.filter((c) => !CLOSED.has(c.stage));
    const nuevos = open.filter((c) => c.stage === "nuevo");
    const oldest = nuevos.reduce<number | null>((m, c) => {
      const t = new Date(c.created_at).getTime();
      return m === null || t < m ? t : m;
    }, null);
    const vencidos = open.filter((c) => c.next_action_at && new Date(c.next_action_at).getTime() < d0);
    const hoy = open.filter((c) => c.next_action_at && new Date(c.next_action_at).getTime() >= d0 && new Date(c.next_action_at).getTime() < d0 + DAY);
    const pagados = visible.filter((c) => c.stage === "pagado" || c.stage === "en_tramite" || c.stage === "cerrado");
    const decididos = pagados.length + visible.filter((c) => c.stage === "perdido").length;
    return { open, nuevos, oldest, vencidos, hoy, pagados, rate: decididos ? Math.round((pagados.length / decididos) * 100) : null };
  }, [visible, d0]);

  const byStage = useMemo(() => {
    const m = new Map<Stage, Contact[]>();
    for (const s of STAGES) m.set(s, []);
    for (const c of visible) m.get(c.stage)!.push(c);
    for (const s of STAGES) {
      m.get(s)!.sort((a, b) => {
        if (s === "nuevo") return a.created_at < b.created_at ? -1 : 1; // el que más espera, primero
        return a.updated_at < b.updated_at ? 1 : -1;
      });
    }
    return m;
  }, [visible]);

  const listRows = useMemo(() => {
    const base = stageFilter === "open" ? visible.filter((c) => !CLOSED.has(c.stage)) : stageFilter === "all" ? visible : visible.filter((c) => c.stage === stageFilter);
    return [...base].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  }, [visible, stageFilter]);

  // ---- cambios ----
  function upsertLocal(c: Contact) {
    setContacts((list) => (list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [c, ...list]));
  }

  async function moveStage(id: string, stage: Stage) {
    const prev = contacts.find((c) => c.id === id);
    if (!prev || prev.stage === stage) return;
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, stage, updated_at: new Date().toISOString() } : c)));
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        const data = (await res.json()) as { contact: Contact };
        if (data.contact) upsertLocal(data.contact);
        if (stage === "perdido") setOpenId(id); // para anotar el motivo
      } else {
        setContacts((list) => list.map((c) => (c.id === id ? prev : c)));
        setError("No se pudo cambiar la etapa. Intenta de nuevo.");
      }
    } catch {
      setContacts((list) => list.map((c) => (c.id === id ? prev : c)));
      setError("Sin conexión. Intenta de nuevo.");
    }
  }

  function onDragStart(e: DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDrop(e: DragEvent, stage: Stage) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) void moveStage(id, stage);
  }

  const open = openId ? contacts.find((c) => c.id === openId) ?? null : null;

  if (loading && contacts.length === 0) return <div className="admin__loading">Cargando…</div>;

  const waMsg = (c: Contact) =>
    `https://wa.me/${c.phone}?text=${encodeURIComponent(`Hola ${c.name.split(" ")[0]}, soy ${session.name} de USA Latino Prime. Vi tu solicitud${c.service_id ? ` sobre ${getServiceById(c.service_id)?.name ?? "tu trámite"}` : ""} y te escribo para ayudarte.`)}`;

  function Card({ c, compact }: { c: Contact; compact?: boolean }) {
    const svc = c.service_id ? getServiceById(c.service_id) : undefined;
    const na = c.next_action_at ? new Date(c.next_action_at).getTime() : null;
    const naState = na === null ? null : na < d0 ? "late" : na < d0 + DAY ? "today" : "later";
    return (
      <article
        className={"cc" + (compact ? " cc--compact" : "")}
        style={{ "--c": colorOf(c.advisor_id) } as React.CSSProperties}
        draggable={view === "tablero"}
        onDragStart={(e) => onDragStart(e, c.id)}
        onClick={() => setOpenId(c.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpenId(c.id);
          }
        }}
      >
        <div className="cc__top">
          <strong className="cc__name">{c.name}</strong>
          {c.stage === "nuevo" && <span className="cc__wait">{waitShort(c.created_at, now)}</span>}
        </div>
        <div className="cc__meta">
          {svc ? <span className="cc__svc">{svc.name}</span> : <span className="cc__svc cc__svc--none">Sin servicio</span>}
          {isOwner && (
            <span className="cc__adv">
              <span className="ld__dot" aria-hidden="true" />
              {nameOf(c.advisor_id)}
            </span>
          )}
        </div>
        {(c.next_action || naState) && (
          <div className={"cc__next" + (naState ? ` is-${naState}` : "")}>
            {Ico.clock}
            <span>
              {c.next_action_at ? whenLabel(c.next_action_at, now) : ""}
              {c.next_action ? ` · ${c.next_action}` : ""}
            </span>
          </div>
        )}
        {!compact && <div className="cc__foot">{timeAgo(c.last_activity_at, now)}</div>}
      </article>
    );
  }

  function TodayRow({ c, kind }: { c: Contact; kind: "nuevo" | "late" | "today" }) {
    const svc = c.service_id ? getServiceById(c.service_id) : undefined;
    return (
      <div className="tr" style={{ "--c": colorOf(c.advisor_id) } as React.CSSProperties}>
        <button type="button" className="tr__main" onClick={() => setOpenId(c.id)}>
          <span className="tr__name">{c.name}</span>
          <span className="tr__sub">
            {svc?.name ?? "Sin servicio"}
            {isOwner ? ` · ${nameOf(c.advisor_id)}` : ""}
            {kind === "nuevo" ? ` · llegó ${timeAgo(c.created_at, now)}` : c.next_action_at ? ` · ${whenLabel(c.next_action_at, now)}${c.next_action ? ` · ${c.next_action}` : ""}` : ""}
          </span>
        </button>
        {kind === "nuevo" && <span className={"tr__wait" + (now - new Date(c.created_at).getTime() > 30 * 60000 ? " is-late" : "")}>{waitShort(c.created_at, now)}</span>}
        {c.phone && (
          <a className="tr__wa" href={waMsg(c)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${c.name}`} onClick={(e) => e.stopPropagation()}>
            {Ico.whatsapp}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="crm">
      {error && <p className="admin__error">{error}</p>}

      {/* ---- cifras ---- */}
      <section className="crm__kpis" aria-label="Resumen">
        <button type="button" className={"kpi" + (stats.nuevos.length > 0 ? " kpi--alert" : "")} onClick={() => setView("hoy")}>
          <span className="kpi__n">{stats.nuevos.length}</span>
          <span className="kpi__l">Sin contactar</span>
          <span className="kpi__s">{stats.oldest ? `el más antiguo espera ${waitShort(new Date(stats.oldest).toISOString(), now)}` : "todo atendido"}</span>
        </button>
        <button type="button" className={"kpi" + (stats.vencidos.length > 0 ? " kpi--warn" : "")} onClick={() => setView("hoy")}>
          <span className="kpi__n">{stats.vencidos.length + stats.hoy.length}</span>
          <span className="kpi__l">Seguimientos para hoy</span>
          <span className="kpi__s">{stats.vencidos.length > 0 ? `${stats.vencidos.length} vencido${stats.vencidos.length === 1 ? "" : "s"}` : "ninguno vencido"}</span>
        </button>
        <button type="button" className="kpi" onClick={() => setView("tablero")}>
          <span className="kpi__n">{stats.open.length}</span>
          <span className="kpi__l">Casos abiertos</span>
          <span className="kpi__s">{stats.pagados.length} ya pagaron</span>
        </button>
        <div className="kpi">
          <span className="kpi__n">{stats.rate === null ? "—" : `${stats.rate}%`}</span>
          <span className="kpi__l">Tasa de cierre</span>
          <span className="kpi__s">pagados entre decididos</span>
        </div>
      </section>

      {/* ---- barra ---- */}
      <div className="crm__bar">
        <div className="ld__periods" role="tablist" aria-label="Vista">
          {(["hoy", "tablero", "lista"] as View[]).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={"ld__period" + (view === v ? " is-on" : "")} onClick={() => setView(v)}>
              {v === "hoy" ? "Hoy" : v === "tablero" ? "Tablero" : "Lista"}
            </button>
          ))}
        </div>
        <div className="crm__bar-right">
          {isOwner && advisors.length > 0 && (
            <select className="ld__select" value={advFilter} onChange={(e) => setAdvFilter(e.target.value)} aria-label="Asesora">
              <option value="all">Todas las asesoras</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value="none">Sin asignar</option>
            </select>
          )}
          <input type="search" className="ld__search" placeholder="Buscar nombre, teléfono o servicio…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
          <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "…" : "Actualizar"}
          </button>
          <button type="button" className="btn btn--primary admin__btn-sm" onClick={() => setCreating(true)}>
            + Contacto
          </button>
        </div>
      </div>

      {/* ---- HOY ---- */}
      {view === "hoy" && (
        <div className="today">
          <section className="today__sec">
            <h2 className="ld__h">
              Sin contactar <span className="ld__count">{stats.nuevos.length}</span>
            </h2>
            <p className="ld__muted">Responder en los primeros minutos multiplica las probabilidades de que el caso avance. El que más espera va primero.</p>
            {stats.nuevos.length === 0 ? (
              <div className="today__empty">{Ico.check} Nadie espera respuesta.</div>
            ) : (
              <div className="today__list">
                {[...stats.nuevos].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).map((c) => <TodayRow key={c.id} c={c} kind="nuevo" />)}
              </div>
            )}
          </section>
          <section className="today__sec">
            <h2 className="ld__h">
              Seguimientos <span className="ld__count">{stats.vencidos.length + stats.hoy.length}</span>
            </h2>
            <p className="ld__muted">Lo que programaste para hoy y lo que se pasó de fecha.</p>
            {stats.vencidos.length + stats.hoy.length === 0 ? (
              <div className="today__empty">{Ico.check} Sin seguimientos pendientes para hoy.</div>
            ) : (
              <div className="today__list">
                {[...stats.vencidos].sort((a, b) => (a.next_action_at! < b.next_action_at! ? -1 : 1)).map((c) => <TodayRow key={c.id} c={c} kind="late" />)}
                {[...stats.hoy].sort((a, b) => (a.next_action_at! < b.next_action_at! ? -1 : 1)).map((c) => <TodayRow key={c.id} c={c} kind="today" />)}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ---- TABLERO ---- */}
      {view === "tablero" && (
        <div className="board">
          {BOARD_STAGES.map((s) => {
            const items = byStage.get(s)!;
            return (
              <section
                key={s}
                className={"col col--" + s + (dragOver === s ? " is-over" : "")}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOver !== s) setDragOver(s);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => onDrop(e, s)}
                aria-label={STAGE_LABEL[s]}
              >
                <header className="col__head">
                  <span>{STAGE_LABEL[s]}</span>
                  <span className="col__n">{items.length}</span>
                </header>
                <div className="col__body">
                  {items.map((c) => (
                    <Card key={c.id} c={c} />
                  ))}
                  {items.length === 0 && <div className="col__empty">Arrastra aquí</div>}
                </div>
              </section>
            );
          })}
          <section className="col col--closed">
            <header className="col__head">
              <button type="button" className="col__toggle" onClick={() => setShowClosed(!showClosed)} aria-expanded={showClosed}>
                Cerrados y perdidos <span className="col__n">{byStage.get("cerrado")!.length + byStage.get("perdido")!.length}</span>
              </button>
            </header>
            <div className="col__body col__body--split">
              {(["cerrado", "perdido"] as Stage[]).map((s) => (
                <div
                  key={s}
                  className={"drop drop--" + s + (dragOver === s ? " is-over" : "")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== s) setDragOver(s);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => onDrop(e, s)}
                >
                  <span className="drop__label">
                    {STAGE_LABEL[s]} <b>{byStage.get(s)!.length}</b>
                  </span>
                  {showClosed && byStage.get(s)!.slice(0, 30).map((c) => <Card key={c.id} c={c} compact />)}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ---- LISTA ---- */}
      {view === "lista" && (
        <div className="clist">
          <div className="ld__chips" role="group" aria-label="Etapa">
            {[
              { k: "open", l: "Abiertos" },
              ...STAGES.map((s) => ({ k: s, l: STAGE_LABEL[s] })),
              { k: "all", l: "Todos" },
            ].map((o) => (
              <button key={o.k} type="button" className={"ld__chip" + (stageFilter === o.k ? " is-on" : "")} onClick={() => setStageFilter(o.k)}>
                {o.l}
                {o.k !== "open" && o.k !== "all" && <span className="ld__chip-n">{byStage.get(o.k as Stage)!.length}</span>}
              </button>
            ))}
          </div>
          {listRows.length === 0 ? (
            <div className="admin__empty">No hay contactos con ese filtro.</div>
          ) : (
            <div className="ld__ledger">
              {listRows.map((c) => {
                const svc = c.service_id ? getServiceById(c.service_id) : undefined;
                return (
                  <button type="button" key={c.id} className="clist__row" style={{ "--c": colorOf(c.advisor_id) } as React.CSSProperties} onClick={() => setOpenId(c.id)}>
                    <span className="clist__name">
                      <strong>{c.name}</strong>
                      <em>{c.phone ? formatPhone(c.phone) : "sin teléfono"}</em>
                    </span>
                    <span className={"stage stage--" + c.stage}>{STAGE_LABEL[c.stage]}</span>
                    <span className="clist__svc">{svc?.name ?? "—"}</span>
                    {isOwner && (
                      <span className="clist__adv">
                        <span className="ld__dot" aria-hidden="true" />
                        {nameOf(c.advisor_id)}
                      </span>
                    )}
                    <span className="clist__when">{timeAgo(c.last_activity_at, now)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(open || creating) && (
        <ContactDrawer
          contact={open}
          advisors={advisors}
          session={session}
          services={SERVICES.map((s) => ({ id: s.id, name: s.name }))}
          onClose={() => {
            setOpenId(null);
            setCreating(false);
          }}
          onChange={(c) => {
            upsertLocal(c);
            if (creating) {
              setCreating(false);
              setOpenId(c.id);
            }
          }}
        />
      )}
    </div>
  );
}
