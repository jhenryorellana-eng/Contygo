"use client";

/* El contador de casos, para quien lo lleva al día (24-11-2026). Arriba, los tres totales como en un marcador; debajo,
   cada servicio con sus tres números —creados, pendientes, ganados— que se cambian con los botones o escribiendo.
   «Guardar» deja escrito quién lo hizo y cuándo; lo que se guarda es lo que la presentación en vivo enseña.
   Entra el dueño con su sesión, o el encargado con su link (la llave va en ?k= y se manda en una cabecera). */
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import s from "./CaseCounterEditor.module.css";

type Row = { created: number; pending: number; won: number };
type Field = keyof Row;
type Data = { services: { id: string; name: string }[]; counter: { example?: boolean; updatedAt: string | null; updatedBy: string | null; rows: Record<string, Row> }; who: "owner" | "keeper" };
const FIELDS: { key: Field; label: string; hint: string }[] = [
  { key: "created", label: "Creados", hint: "Todos los casos abiertos de este servicio" },
  { key: "pending", label: "Pendientes", hint: "En proceso, todavía sin respuesta" },
  { key: "won", label: "Ganados", hint: "Aprobados por la autoridad" },
];
const MAX = 99999;
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString("es", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : null;
const NAME_KEY = "contygo-contador-nombre";

export default function CaseCounterEditor() {
  const [state, setState] = useState<"loading" | "ready" | "denied" | "off" | "error">("loading");
  const [data, setData] = useState<Data | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [name, setName] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [key, setKey] = useState("");

  const load = useCallback(async (llave: string) => {
    try {
      const response = await fetch("/api/admin/cases", { cache: "no-store", headers: llave ? { "x-contador-llave": llave } : {} });
      if (response.status === 401 || response.status === 429) return setState("denied");
      if (response.status === 503) return setState("off");
      if (!response.ok) return setState("error");
      const body = await response.json() as Data;
      setData(body); setRows(body.counter.rows); setState("ready");
      setName(current => current || (body.who === "owner" ? "Henry" : ""));
    } catch { setState("error"); }
  }, []);
  useEffect(() => {
    const llave = new URLSearchParams(window.location.search).get("k") ?? "";
    setKey(llave);
    try { const kept = window.localStorage.getItem(NAME_KEY); if (kept) setName(kept); } catch { /* no storage: the name is asked each time */ }
    void load(llave);
  }, [load]);

  const totals = useMemo(() => Object.values(rows).reduce((sum, row) => ({ created: sum.created + row.created, pending: sum.pending + row.pending, won: sum.won + row.won }), { created: 0, pending: 0, won: 0 }), [rows]);
  // Example figures count as unsaved work: saving them as they are makes them the record.
  const changed = useMemo(() => data ? data.counter.example === true || JSON.stringify(rows) !== JSON.stringify(data.counter.rows) : false, [rows, data]);
  const set = (id: string, field: Field, value: number) => { setSaving("idle"); setRows(all => ({ ...all, [id]: { ...all[id], [field]: Math.min(MAX, Math.max(0, Math.round(Number.isFinite(value) ? value : 0))) } })); };

  async function save() {
    if (!name.trim()) return;
    setSaving("saving");
    try {
      const response = await fetch("/api/admin/cases", { method: "PUT", headers: { "Content-Type": "application/json", ...(key ? { "x-contador-llave": key } : {}) }, body: JSON.stringify({ rows, by: name.trim() }) });
      const body = await response.json().catch(() => null) as { ok?: boolean; counter?: Data["counter"] } | null;
      if (!response.ok || !body?.ok || !body.counter) return setSaving("failed");
      setData(current => current ? { ...current, counter: body.counter! } : current); setRows(body.counter.rows); setSaving("saved");
      try { window.localStorage.setItem(NAME_KEY, name.trim()); } catch { /* nothing to keep it in */ }
    } catch { setSaving("failed"); }
  }

  if (state !== "ready" || !data) return (
    <main className={s.page}><div className={s.notice}>
      <Image className={s.logo} src="/contygo/brand/logo-dark.png" alt="ContyGo" width={170} height={48} priority />
      {state === "loading" && <p>Cargando el contador…</p>}
      {state === "denied" && <><b>Este link no abre el contador.</b><p>Puede estar incompleto o haber cambiado. Pídele a Henry que te copie el link nuevo desde su panel.</p></>}
      {state === "off" && <><b>El contador todavía no tiene dónde guardarse.</b><p>Falta conectar el almacén del panel.</p></>}
      {state === "error" && <><b>No pudimos leer el contador.</b><p>Revisa tu internet y vuelve a intentarlo.</p><button type="button" onClick={() => { setState("loading"); void load(key); }}>Reintentar</button></>}
    </div></main>
  );

  const last = when(data.counter.updatedAt);
  return (
    <main className={s.page}>
      <header className={s.top}>
        <Image className={s.logo} src="/contygo/brand/logo-dark.png" alt="ContyGo" width={170} height={48} priority />
        <h1>Contador de casos</h1>
        <p>{last ? <>Última actualización: <b>{last}</b>, por <b>{data.counter.updatedBy}</b>.</> : "Todavía no se ha guardado ninguna cifra."} Lo que guardes aquí es lo que Henry enseña en vivo.</p>
        {data.counter.example && <p className={s.mock}><b>Estas cifras son de EJEMPLO.</b> En la página salen marcadas como «Cifras de ejemplo». Pon las reales y toca «Guardar cambios»: la marca se quita sola.</p>}
        <div className={s.totals}>
          {FIELDS.map(field => <div key={field.key} data-kind={field.key}><span>{totals[field.key].toLocaleString("en-US")}</span><b>{field.label}</b></div>)}
        </div>
      </header>

      <ul className={s.list}>
        {data.services.map(service => {
          const row = rows[service.id] ?? { created: 0, pending: 0, won: 0 }, over = row.won + row.pending > row.created;
          return (
            <li key={service.id} className={s.row} data-over={over || undefined}>
              <div className={s.name}><Image src={`/contygo/v8/servicio-${service.id}.webp`} alt="" width={52} height={52} /><h2>{service.name}</h2></div>
              <div className={s.fields}>
                {FIELDS.map(field => (
                  <label key={field.key} className={s.field} data-kind={field.key} title={field.hint}>
                    <span>{field.label}</span>
                    <div>
                      <button type="button" onClick={() => set(service.id, field.key, row[field.key] - 1)} disabled={row[field.key] <= 0} aria-label={`Quitar uno a ${field.label.toLowerCase()} de ${service.name}`}>−</button>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={row[field.key]} onFocus={event => event.target.select()} onChange={event => set(service.id, field.key, Number(event.target.value.replace(/\D/g, "")))} aria-label={`${field.label} de ${service.name}`} />
                      <button type="button" onClick={() => set(service.id, field.key, row[field.key] + 1)} aria-label={`Sumar uno a ${field.label.toLowerCase()} de ${service.name}`}>+</button>
                    </div>
                  </label>
                ))}
              </div>
              {over && <p className={s.warn}>Revisa esta fila: ganados más pendientes ({row.won + row.pending}) es más que creados ({row.created}).</p>}
            </li>
          );
        })}
      </ul>

      <footer className={s.save}>
        <label><span>¿Quién actualiza?</span><input type="text" value={name} maxLength={40} onChange={event => setName(event.target.value)} placeholder="Tu nombre" autoComplete="name" /></label>
        <button type="button" onClick={save} disabled={saving === "saving" || !name.trim() || (!changed && saving !== "failed")}>
          {saving === "saving" ? "Guardando…" : saving === "saved" && !changed ? "Guardado" : "Guardar cambios"}
        </button>
        <p role="status">{saving === "failed" ? "No se pudo guardar. Revisa tu internet y vuelve a tocar «Guardar cambios»." : !name.trim() ? "Escribe tu nombre para poder guardar." : changed ? "Tienes cambios sin guardar." : saving === "saved" ? "Listo: ya se ve en la presentación en vivo." : "Sin cambios."}</p>
      </footer>
    </main>
  );
}
