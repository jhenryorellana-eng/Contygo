"use client";

/* ============================================================
   /admin — Asesoras y leads (panel de control)
   Un selector de periodo (hoy / 7 / 30 / 90 días) gobierna todo:
   · Balanza: cara a cara entre asesoras con la línea del reparto justo.
   · Actividad: barras por hora/día/semana con tooltip y leyenda que aísla.
   · Asesoras: interruptor activa/pausada, edición en línea, alta.
   · Registro: leads agrupados por día con filtros de asesora, origen y
     búsqueda; los clics repetidos van ocultos por defecto.
   Un "lead" es la primera vez que una persona escribe (source=auto).
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Advisor, Lead } from "@/lib/advisors";
import { getServiceById, getServiceBySlug } from "@/lib/services";
import { LEAD_KINDS, LEAD_KIND_LABEL, formatPhone, type LeadKind } from "@/lib/wa-route";
import { Ico } from "../icons";

type Period = 1 | 7 | 30 | 90;
const PERIODS: { key: Period; label: string }[] = [
  { key: 1, label: "Hoy" },
  { key: 7, label: "7 días" },
  { key: 30, label: "30 días" },
  { key: 90, label: "90 días" },
];

/** Colores de identidad por asesora, en orden fijo (validados para daltonismo). */
const COLORS = ["#1b4fa0", "#1f8a70", "#c8901f", "#7a4fbf"];

const timeFmt = new Intl.DateTimeFormat("es-US", { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("es-US", { weekday: "short", day: "numeric", month: "short" });
const shortDayFmt = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short" });

const DAY = 864e5;

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function periodStart(period: Period, now: number): number {
  return period === 1 ? startOfDay(now) : startOfDay(now) - (period - 1) * DAY;
}

function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "ahora mismo";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

function dayLabel(t: number, now: number): string {
  const d0 = startOfDay(now);
  if (t >= d0) return "Hoy";
  if (t >= d0 - DAY) return "Ayer";
  return dayFmt.format(new Date(t));
}

function serviceName(l: Lead): string | null {
  const svc =
    (l.service_id ? getServiceById(l.service_id) : undefined) ??
    (l.path ? getServiceBySlug(l.path.replace(/^\/+|\/+$/g, "")) : undefined);
  return svc?.name ?? null;
}

/** Siguiente asesora por turno ponderado: mismo criterio que la RPC. */
function nextInTurn(advisors: Advisor[]): Advisor | null {
  const act = advisors.filter((a) => a.active && a.weight > 0);
  if (act.length === 0) return null;
  return [...act].sort((a, b) => {
    const ra = (a.assigned_count + 1) / a.weight;
    const rb = (b.assigned_count + 1) / b.weight;
    if (ra !== rb) return ra - rb;
    const la = a.last_assigned_at ?? "";
    const lb = b.last_assigned_at ?? "";
    if (la !== lb) return la < lb ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  })[0]!;
}

interface Bin {
  label: string;
  start: number;
  end: number;
  counts: Record<string, number>;
}

function buildBins(period: Period, now: number, leads: Lead[], ids: string[]): Bin[] {
  const bins: Bin[] = [];
  const empty = () => Object.fromEntries(ids.map((id) => [id, 0]));
  if (period === 1) {
    const d0 = startOfDay(now);
    for (let h = 0; h < 24; h++) {
      bins.push({ label: `${h}:00`, start: d0 + h * 36e5, end: d0 + (h + 1) * 36e5, counts: empty() });
    }
  } else if (period === 90) {
    const end = startOfDay(now) + DAY;
    for (let w = 12; w >= 0; w--) {
      const s = end - (w + 1) * 7 * DAY;
      bins.push({ label: `Sem. del ${shortDayFmt.format(new Date(s))}`, start: s, end: s + 7 * DAY, counts: empty() });
    }
  } else {
    const d0 = startOfDay(now);
    for (let i = period - 1; i >= 0; i--) {
      const s = d0 - i * DAY;
      bins.push({ label: dayLabel(s, now), start: s, end: s + DAY, counts: empty() });
    }
  }
  for (const l of leads) {
    const t = new Date(l.created_at).getTime();
    const b = bins.find((x) => t >= x.start && t < x.end);
    if (b && b.counts[l.advisor_id] !== undefined) b.counts[l.advisor_id] += 1;
  }
  return bins;
}

export default function LeadsPanel() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [period, setPeriod] = useState<Period>(30);

  // gráfica
  const [focus, setFocus] = useState<string | null>(null); // asesora aislada en la gráfica
  const [hover, setHover] = useState<number | null>(null);

  // asesoras
  const [editing, setEditing] = useState<string | null>(null); // id o "new"
  const [form, setForm] = useState({ name: "", whatsapp: "" });
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // registro
  const [advFilter, setAdvFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showRepeats, setShowRepeats] = useState(false);
  const [limit, setLimit] = useState(40);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, l] = await Promise.all([
        fetch("/api/admin/advisors", { cache: "no-store" }),
        fetch("/api/admin/leads?days=90", { cache: "no-store" }),
      ]);
      if (a.status === 503 || l.status === 503) {
        setError("Falta conectar la base de datos (variables de Supabase).");
        return;
      }
      if (!a.ok || !l.ok) {
        setError("No se pudo leer la base de datos. Intenta de nuevo en unos segundos.");
        return;
      }
      setAdvisors((await a.json()) as Advisor[]);
      setLeads((await l.json()) as Lead[]);
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
    (id: string) => COLORS[Math.max(0, advisors.findIndex((a) => a.id === id)) % COLORS.length]!,
    [advisors],
  );
  const nameOf = useCallback((id: string) => advisors.find((a) => a.id === id)?.name ?? id, [advisors]);

  // ---- datos del periodo ----
  const pStart = periodStart(period, now);
  const inPeriod = useMemo(() => leads.filter((l) => new Date(l.created_at).getTime() >= pStart), [leads, pStart]);
  const newLeads = useMemo(() => inPeriod.filter((l) => l.source === "auto"), [inPeriod]);

  const perAdvisor = useMemo(() => {
    const m = new Map<string, { leads: number; repeats: number; kinds: Record<string, number>; last: string | null }>();
    for (const a of advisors) m.set(a.id, { leads: 0, repeats: 0, kinds: {}, last: null });
    for (const l of inPeriod) {
      const s = m.get(l.advisor_id);
      if (!s) continue;
      if (l.source === "auto") {
        s.leads += 1;
        s.kinds[l.kind] = (s.kinds[l.kind] ?? 0) + 1;
        if (!s.last || l.created_at > s.last) s.last = l.created_at;
      } else {
        s.repeats += 1;
      }
    }
    return m;
  }, [advisors, inPeriod]);

  const total = newLeads.length;
  const next = useMemo(() => nextInTurn(advisors), [advisors]);
  const activeIds = useMemo(() => advisors.filter((a) => a.active).map((a) => a.id), [advisors]);
  const actives = useMemo(() => advisors.filter((a) => a.active), [advisors]);
  const weightSum = actives.reduce((s, a) => s + a.weight, 0);
  /** Posiciones (0..1) de las marcas del reparto justo según los turnos. */
  const fairMarks = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const a of actives.slice(0, -1)) {
      acc += a.weight;
      out.push(weightSum ? acc / weightSum : 0);
    }
    return out;
  }, [actives, weightSum]);

  const bins = useMemo(
    () => buildBins(period, now, newLeads, advisors.map((a) => a.id)),
    [period, now, newLeads, advisors],
  );
  const shownIds = focus ? [focus] : advisors.map((a) => a.id);
  const maxBin = Math.max(1, ...bins.map((b) => Math.max(...shownIds.map((id) => b.counts[id] ?? 0))));

  // ---- registro ----
  const ledger = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inPeriod
      .filter((l) => showRepeats || l.source === "auto")
      .filter((l) => advFilter === "all" || l.advisor_id === advFilter)
      .filter((l) => kindFilter === "all" || l.kind === kindFilter)
      .filter((l) => {
        if (!q) return true;
        const svc = serviceName(l) ?? "";
        return svc.toLowerCase().includes(q) || (l.path ?? "").toLowerCase().includes(q) || nameOf(l.advisor_id).toLowerCase().includes(q);
      });
  }, [inPeriod, showRepeats, advFilter, kindFilter, query, nameOf]);

  const groups = useMemo(() => {
    const out: { key: number; label: string; items: Lead[] }[] = [];
    for (const l of ledger.slice(0, limit)) {
      const d = startOfDay(new Date(l.created_at).getTime());
      let g = out[out.length - 1];
      if (!g || g.key !== d) {
        g = { key: d, label: dayLabel(d, now), items: [] };
        out.push(g);
      }
      g.items.push(l);
    }
    return out;
  }, [ledger, limit, now]);

  // ---- acciones ----
  function startEdit(a: Advisor | null) {
    setEditing(a ? a.id : "new");
    setForm(a ? { name: a.name, whatsapp: formatPhone(a.whatsapp) } : { name: "", whatsapp: "" });
    setError(null);
  }

  async function save(id: string, active: boolean) {
    const name = form.name.trim();
    const whatsapp = form.whatsapp.replace(/\D/g, "");
    const realId = id === "new" ? slugify(name) : id;
    const weight = advisors.find((a) => a.id === id)?.weight ?? 1;
    if (name.length < 2) return setError("Escribe el nombre de la asesora.");
    if (!/^[0-9]{8,15}$/.test(whatsapp)) return setError("Revisa el número: debe tener el formato +1 (xxx) xxx-xxxx.");
    if (!/^[a-z0-9-]{2,30}$/.test(realId)) return setError("Ese nombre no sirve para crear la asesora; usa letras o números.");
    if (id === "new" && advisors.some((a) => a.id === realId)) return setError("Ya existe una asesora con ese nombre.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/advisors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: realId, name, whatsapp, weight, active }),
      });
      if (!res.ok) return setError("No se pudo guardar. Intenta de nuevo.");
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  /** Cambia estado o turnos de una asesora (mismo endpoint). */
  async function patch(a: Advisor, changes: Partial<Pick<Advisor, "active" | "weight">>, failMsg: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/advisors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, name: a.name, whatsapp: a.whatsapp, weight: a.weight, active: a.active, ...changes }),
      });
      if (!res.ok) setError(failMsg);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function toggle(a: Advisor) {
    if (a.active && activeIds.length <= 1) {
      setError("No puedes pausar a la única asesora activa: los leads dejarían de repartirse.");
      return;
    }
    void patch(a, { active: !a.active }, "No se pudo cambiar el estado. Intenta de nuevo.");
  }

  function setWeight(a: Advisor, weight: number) {
    const w = Math.min(10, Math.max(1, weight));
    if (w === a.weight) return;
    void patch(a, { weight: w }, "No se pudieron guardar los turnos. Intenta de nuevo.");
  }

  async function reset() {
    setSaving(true);
    try {
      await fetch("/api/admin/advisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      setConfirmReset(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading && advisors.length === 0) {
    return <div className="admin__loading">Cargando…</div>;
  }

  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();

  return (
    <div className="ld">
      {error && <p className="admin__error">{error}</p>}

      {/* ---- Periodo ---- */}
      <div className="ld__top">
        <div className="ld__periods" role="tablist" aria-label="Periodo">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              className={"ld__period" + (period === p.key ? " is-on" : "")}
              onClick={() => {
                setPeriod(p.key);
                setLimit(40);
                setHover(null);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ld__top-right">
          {next && (
            <span className="ld__next">
              <span className="ld__dot" style={{ background: colorOf(next.id) }} aria-hidden="true" />
              Siguiente lead: <strong>{next.name}</strong>
            </span>
          )}
          <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {/* ---- Balanza ---- */}
      <section className="ld__balance" aria-label="Comparativa entre asesoras">
        <div className="ld__faces">
          {advisors.map((a) => {
            const s = perAdvisor.get(a.id)!;
            const pct = total ? Math.round((s.leads / total) * 100) : 0;
            return (
              <div key={a.id} className={"ld__face" + (a.active ? "" : " is-off")} style={{ "--c": colorOf(a.id) } as React.CSSProperties}>
                <span className="ld__face-name">
                  <span className="ld__dot" aria-hidden="true" />
                  {a.name}
                  {!a.active && <em>pausada</em>}
                </span>
                <span className="ld__face-n">{s.leads}</span>
                <span className="ld__face-sub">
                  {s.leads === 1 ? "lead" : "leads"} {periodLabel} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
        <div className="ld__beam" role="img" aria-label={`Reparto de ${total} leads ${periodLabel}`}>
          {total === 0 ? (
            <span className="ld__beam-empty">Sin leads {periodLabel}. En cuanto alguien escriba, aparece aquí.</span>
          ) : (
            <>
              {advisors.map((a) => {
                const n = perAdvisor.get(a.id)!.leads;
                return n > 0 ? (
                  <span
                    key={a.id}
                    className="ld__beam-seg"
                    style={{ flexGrow: n, background: colorOf(a.id) }}
                    title={`${a.name}: ${n}`}
                  />
                ) : null;
              })}
              {fairMarks.map((pos, i) => (
                <span key={i} className="ld__beam-fair" style={{ left: `${pos * 100}%` }} title="Reparto configurado" />
              ))}
            </>
          )}
        </div>
        <p className="ld__beam-note">
          {total > 0 && `${total} ${total === 1 ? "lead nuevo" : "leads nuevos"} ${periodLabel}. `}
          Reparto configurado, de cada {weightSum} leads:{" "}
          {actives.map((a, i) => (
            <span key={a.id}>
              {i > 0 && (i === actives.length - 1 ? " y " : ", ")}
              <strong>{a.name} {a.weight}</strong>
            </span>
          ))}
          . La marca blanca señala ese reparto; se ajusta con los turnos de cada asesora.
        </p>
      </section>

      {/* ---- Actividad ---- */}
      <section className="ld__chart" aria-label="Actividad por periodo">
        <div className="ld__chart-head">
          <h2 className="ld__h">
            Actividad {period === 1 ? "por hora" : period === 90 ? "por semana" : "por día"}
          </h2>
          <div className="ld__legend" role="group" aria-label="Asesoras en la gráfica">
            {advisors.map((a) => (
              <button
                key={a.id}
                type="button"
                className={"ld__legend-it" + (focus && focus !== a.id ? " is-dim" : "")}
                aria-pressed={focus === a.id}
                onClick={() => setFocus(focus === a.id ? null : a.id)}
                title={focus === a.id ? "Ver todas" : `Ver solo a ${a.name}`}
              >
                <span className="ld__dot" style={{ background: colorOf(a.id) }} aria-hidden="true" />
                {a.name}
              </button>
            ))}
          </div>
        </div>
        <div className="ld__plot" onMouseLeave={() => setHover(null)}>
          {bins.map((b, i) => {
            const sum = shownIds.reduce((s, id) => s + (b.counts[id] ?? 0), 0);
            return (
              <button
                type="button"
                key={b.start}
                className={"ld__col" + (hover === i ? " is-hot" : "")}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${b.label}: ${sum} ${sum === 1 ? "lead" : "leads"}`}
              >
                <span className="ld__bars">
                  {shownIds.map((id) => {
                    const n = b.counts[id] ?? 0;
                    return (
                      <span
                        key={id}
                        className="ld__bar"
                        style={{ height: `${(n / maxBin) * 100}%`, background: colorOf(id), opacity: n ? 1 : 0.18 }}
                      />
                    );
                  })}
                </span>
                {hover === i && (
                  <span className="ld__tip" role="tooltip">
                    <b>{b.label}</b>
                    {shownIds.map((id) => (
                      <span key={id}>
                        <span className="ld__dot" style={{ background: colorOf(id) }} aria-hidden="true" />
                        {nameOf(id)} <strong>{b.counts[id] ?? 0}</strong>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="ld__axis" aria-hidden="true">
          <span>{bins[0]?.label}</span>
          <span>{bins[Math.floor(bins.length / 2)]?.label}</span>
          <span>{bins[bins.length - 1]?.label}</span>
        </div>
      </section>

      {/* ---- Asesoras ---- */}
      <section aria-label="Asesoras">
        <div className="ld__row-head">
          <h2 className="ld__h">Asesoras</h2>
          <div className="ld__row-actions">
            {!confirmReset ? (
              <button type="button" className="ld__link" onClick={() => setConfirmReset(true)}>
                Reiniciar turnos
              </button>
            ) : (
              <span className="ld__confirm">
                ¿Poner los turnos a cero?
                <button type="button" className="btn btn--primary admin__btn-sm" onClick={() => void reset()} disabled={saving}>
                  Sí, reiniciar
                </button>
                <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => setConfirmReset(false)}>
                  No
                </button>
              </span>
            )}
            {editing !== "new" && (
              <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => startEdit(null)}>
                + Añadir asesora
              </button>
            )}
          </div>
        </div>

        <div className="ld__grid">
          {advisors.map((a) => {
            const s = perAdvisor.get(a.id)!;
            const isEdit = editing === a.id;
            const kinds = LEAD_KINDS.filter((k) => s.kinds[k]);
            return (
              <article key={a.id} className={"adv" + (a.active ? "" : " is-off")} style={{ "--c": colorOf(a.id) } as React.CSSProperties}>
                <header className="adv__head">
                  <span className="adv__avatar" aria-hidden="true">
                    {a.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="adv__who">
                    {isEdit ? (
                      <>
                        <input className="rate__input adv__input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" aria-label="Nombre" />
                        <input className="rate__input adv__input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+1 (xxx) xxx-xxxx" inputMode="tel" aria-label="WhatsApp" />
                      </>
                    ) : (
                      <>
                        <strong>{a.name}</strong>
                        <span className="adv__phone">
                          {Ico.whatsapp} {formatPhone(a.whatsapp)}
                        </span>
                      </>
                    )}
                  </div>
                  <label className="sw">
                    <input type="checkbox" role="switch" checked={a.active} disabled={saving || isEdit} onChange={() => void toggle(a)} aria-label={a.active ? `Pausar a ${a.name}` : `Activar a ${a.name}`} />
                    <span className="sw__track" aria-hidden="true">
                      <span className="sw__knob" />
                    </span>
                    <span className="sw__label">{a.active ? "Activa" : "Pausada"}</span>
                  </label>
                </header>

                <div className="adv__turns">
                  <span className="adv__turns-label">
                    Turnos
                    <em>
                      {a.active && weightSum
                        ? `${a.weight} de cada ${weightSum} leads · ${Math.round((a.weight / weightSum) * 100)}%`
                        : "no reparte mientras esté pausada"}
                    </em>
                  </span>
                  <span className="stepper" role="group" aria-label={`Turnos de ${a.name}`}>
                    <button type="button" className="stepper__btn" disabled={saving || a.weight <= 1} onClick={() => setWeight(a, a.weight - 1)} aria-label="Menos turnos">
                      −
                    </button>
                    <b className="stepper__n">{a.weight}</b>
                    <button type="button" className="stepper__btn" disabled={saving || a.weight >= 10} onClick={() => setWeight(a, a.weight + 1)} aria-label="Más turnos">
                      +
                    </button>
                  </span>
                </div>

                <div className="adv__nums">
                  <div>
                    <b>{s.leads}</b>
                    <span>leads {periodLabel}</span>
                  </div>
                  <div>
                    <b>{total ? Math.round((s.leads / total) * 100) : 0}%</b>
                    <span>del total</span>
                  </div>
                  <div>
                    <b>{s.repeats}</b>
                    <span>repetidos</span>
                  </div>
                </div>

                <div className="adv__foot">
                  <span className="adv__kinds">
                    {kinds.length === 0 ? (
                      <em>Sin leads {periodLabel}</em>
                    ) : (
                      kinds.map((k) => (
                        <span key={k} className="adv__kind">
                          {LEAD_KIND_LABEL[k]} <b>{s.kinds[k]}</b>
                        </span>
                      ))
                    )}
                  </span>
                  <span className="adv__last">{s.last ? `Último: ${timeAgo(s.last, now)}` : ""}</span>
                </div>

                <footer className="adv__actions">
                  {isEdit ? (
                    <>
                      <button type="button" className="btn btn--primary admin__btn-sm" disabled={saving} onClick={() => void save(a.id, a.active)}>
                        {Ico.check} Guardar cambios
                      </button>
                      <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => setEditing(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button type="button" className="ld__link" disabled={saving} onClick={() => startEdit(a)}>
                      Editar nombre o número
                    </button>
                  )}
                </footer>
              </article>
            );
          })}

          {editing === "new" && (
            <article className="adv adv--new" style={{ "--c": COLORS[advisors.length % COLORS.length] } as React.CSSProperties}>
              <header className="adv__head">
                <span className="adv__avatar" aria-hidden="true">
                  +
                </span>
                <div className="adv__who">
                  <input className="rate__input adv__input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" aria-label="Nombre" autoFocus />
                  <input className="rate__input adv__input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+1 (xxx) xxx-xxxx" inputMode="tel" aria-label="WhatsApp" />
                </div>
              </header>
              <p className="ld__muted">Entra al reparto de inmediato, activa y con 1 turno; luego ajustas sus turnos aquí mismo.</p>
              <footer className="adv__actions">
                <button type="button" className="btn btn--primary admin__btn-sm" disabled={saving} onClick={() => void save("new", true)}>
                  {Ico.check} Crear asesora
                </button>
                <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </footer>
            </article>
          )}
        </div>
      </section>

      {/* ---- Registro ---- */}
      <section aria-label="Registro de leads">
        <div className="ld__row-head">
          <h2 className="ld__h">
            Registro <span className="ld__count">{ledger.length}</span>
          </h2>
        </div>
        <div className="ld__filters">
          <div className="ld__chips" role="group" aria-label="Asesora">
            <button type="button" className={"ld__chip" + (advFilter === "all" ? " is-on" : "")} onClick={() => setAdvFilter("all")}>
              Todas
            </button>
            {advisors.map((a) => (
              <button
                key={a.id}
                type="button"
                className={"ld__chip" + (advFilter === a.id ? " is-on" : "")}
                style={{ "--c": colorOf(a.id) } as React.CSSProperties}
                onClick={() => setAdvFilter(a.id)}
              >
                <span className="ld__dot" aria-hidden="true" />
                {a.name}
              </button>
            ))}
          </div>
          <select className="ld__select" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Origen">
            <option value="all">Todos los orígenes</option>
            {LEAD_KINDS.map((k) => (
              <option key={k} value={k}>
                {LEAD_KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="ld__search"
            placeholder="Buscar servicio o página…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar"
          />
          <label className="sw sw--small">
            <input type="checkbox" role="switch" checked={showRepeats} onChange={(e) => setShowRepeats(e.target.checked)} />
            <span className="sw__track" aria-hidden="true">
              <span className="sw__knob" />
            </span>
            <span className="sw__label">Ver repetidos</span>
          </label>
        </div>

        {groups.length === 0 ? (
          <div className="admin__empty">
            {inPeriod.length === 0
              ? `Sin leads ${periodLabel}. Prueba con un periodo más largo.`
              : "Ningún lead coincide con los filtros. Quita alguno para ver más."}
          </div>
        ) : (
          <div className="ld__ledger">
            {groups.map((g) => (
              <div key={g.key} className="ld__day">
                <div className="ld__day-head">
                  <span>{g.label}</span>
                  <span className="ld__day-n">{g.items.length}</span>
                </div>
                {g.items.map((l) => {
                  const repeat = l.source !== "auto";
                  const svc = serviceName(l);
                  return (
                    <div key={l.id} className={"ld__row" + (repeat ? " is-repeat" : "")} style={{ "--c": colorOf(l.advisor_id) } as React.CSSProperties}>
                      <span className="ld__row-time">{timeFmt.format(new Date(l.created_at))}</span>
                      <span className="ld__row-adv">
                        <span className="ld__dot" aria-hidden="true" />
                        {nameOf(l.advisor_id)}
                      </span>
                      <span className="ld__row-kind">
                        {LEAD_KIND_LABEL[l.kind as LeadKind] ?? l.kind}
                        {repeat && <em> · repetido</em>}
                      </span>
                      <span className="ld__row-svc">{svc ?? <em>Sin servicio</em>}</span>
                      <span className="ld__row-path">
                        {l.path ? (
                          <a href={l.path} target="_blank" rel="noopener noreferrer">
                            {l.path}
                          </a>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {ledger.length > limit && (
              <button type="button" className="btn btn--ghost admin__btn-sm ld__more" onClick={() => setLimit(limit + 40)}>
                Ver {Math.min(40, ledger.length - limit)} más
              </button>
            )}
          </div>
        )}
        <p className="admin__hint">
          Un lead es la primera vez que una persona toca WhatsApp; si vuelve a tocar, cuenta como repetido y no altera la
          comparación. Horas en la zona horaria de tu dispositivo.
        </p>
      </section>
    </div>
  );
}
