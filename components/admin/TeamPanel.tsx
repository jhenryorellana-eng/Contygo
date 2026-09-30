"use client";

/* ============================================================
   /admin — Equipo y accesos (solo el dueño)
   Cada asesora tiene un usuario para entrar al CRM y ver sus contactos.
   ============================================================ */
import { useCallback, useEffect, useState } from "react";
import type { Advisor } from "@/lib/advisors";
import type { TeamUser } from "@/lib/crm";
import { Ico } from "../icons";
import { slugify, timeAgo } from "./fmt";

export default function TeamPanel() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // id o "new"
  const [form, setForm] = useState({ id: "", name: "", advisorId: "", password: "", role: "advisor" as "advisor" | "owner" });
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, a] = await Promise.all([fetch("/api/crm/team", { cache: "no-store" }), fetch("/api/admin/advisors", { cache: "no-store" })]);
      if (u.status === 503) return setError("Falta conectar la base de datos (variables de Supabase).");
      if (!u.ok || !a.ok) return setError("No se pudo leer la base de datos. Intenta de nuevo.");
      setUsers((await u.json()) as TeamUser[]);
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

  function startNew() {
    setEditing("new");
    setForm({ id: "", name: "", advisorId: advisors.find((a) => !users.some((u) => u.advisor_id === a.id))?.id ?? "", password: "", role: "advisor" });
    setError(null);
    setNotice(null);
  }

  function startEdit(u: TeamUser) {
    setEditing(u.id);
    setForm({ id: u.id, name: u.name, advisorId: u.advisor_id ?? "", password: "", role: u.role });
    setError(null);
    setNotice(null);
  }

  async function save(active: boolean) {
    const isNew = editing === "new";
    const id = isNew ? slugify(form.id || form.name) : form.id;
    const name = form.name.trim();
    if (name.length < 2) return setError("Escribe el nombre.");
    if (!/^[a-z0-9-]{2,30}$/.test(id)) return setError("El usuario solo puede llevar letras, números y guiones.");
    if (form.role === "advisor" && !form.advisorId) return setError("Elige a qué asesora (número de WhatsApp) pertenece este acceso.");
    if (isNew && form.password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (!isNew && form.password && form.password.length < 6) return setError("La nueva contraseña debe tener al menos 6 caracteres.");
    setSaving(true);
    try {
      const res = await fetch("/api/crm/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, role: form.role, advisorId: form.role === "advisor" ? form.advisorId : null, password: form.password || null, active }),
      });
      if (res.status === 400 && ((await res.clone().json()) as { error?: string }).error === "last_owner") return setError("Tiene que quedar al menos un dueño activo.");
      if (!res.ok) return setError("No se pudo guardar. Intenta de nuevo.");
      setNotice(isNew ? `Acceso creado. Usuario: ${id}. Comparte la contraseña con ${name} por un canal seguro.` : "Cambios guardados.");
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(u: TeamUser) {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, name: u.name, role: u.role, advisorId: u.advisor_id, password: null, active: !u.active }),
      });
      if (res.status === 400) setError("Tiene que quedar al menos un dueño activo.");
      else if (!res.ok) setError("No se pudo cambiar el estado.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading && users.length === 0) return <div className="admin__loading">Cargando…</div>;

  const advisorName = (id: string | null) => advisors.find((a) => a.id === id)?.name ?? "—";

  return (
    <div className="ld">
      {error && <p className="admin__error">{error}</p>}
      {notice && <p className="admin__notice">{notice}</p>}

      <section className="ld__balance">
        <div className="ld__row-head" style={{ marginBottom: 0 }}>
          <div>
            <h2 className="ld__h">Accesos del equipo</h2>
            <p className="ld__muted">
              Las asesoras entran en <strong>/equipo</strong> con su usuario y contraseña y ven solo sus contactos. Los
              accesos de dueño entran en <strong>/admin</strong> y ven todo.
            </p>
          </div>
          {editing !== "new" && (
            <button type="button" className="btn btn--primary admin__btn-sm" onClick={startNew}>
              + Crear acceso
            </button>
          )}
        </div>
      </section>

      <div className="ld__grid">
        {editing === "new" && (
          <article className="adv adv--new" style={{ "--c": "var(--accent)" } as React.CSSProperties}>
            <h3 className="tm__h">Nuevo acceso</h3>
            <label className="tm__field">
              <span>Tipo de acceso</span>
              <select className="rate__input adv__input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "advisor" | "owner" })}>
                <option value="advisor">Asesora: ve solo sus contactos (entra en /equipo)</option>
                <option value="owner">Dueño: ve y controla todo (entra en /admin)</option>
              </select>
            </label>
            <label className="tm__field">
              <span>Nombre</span>
              <input className="rate__input adv__input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, id: form.id || "" })} placeholder="Jazmín" autoFocus />
            </label>
            <label className="tm__field">
              <span>Usuario</span>
              <input className="rate__input adv__input" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder={slugify(form.name) || "jazmin"} autoComplete="off" />
            </label>
            <label className="tm__field">
              <span>Contraseña</span>
              <input className="rate__input adv__input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mínimo 6 caracteres" autoComplete="new-password" />
            </label>
            {form.role === "advisor" && (
              <label className="tm__field">
                <span>Asesora (WhatsApp)</span>
                <select className="rate__input adv__input" value={form.advisorId} onChange={(e) => setForm({ ...form, advisorId: e.target.value })}>
                  <option value="">Elegir…</option>
                  {advisors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <footer className="adv__actions">
              <button type="button" className="btn btn--primary admin__btn-sm" disabled={saving} onClick={() => void save(true)}>
                {Ico.check} Crear acceso
              </button>
              <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </footer>
          </article>
        )}

        {users.map((u) => {
          const isEdit = editing === u.id;
          return (
            <article key={u.id} className={"adv" + (u.active ? "" : " is-off")} style={{ "--c": !u.active ? "var(--ink-faint)" : u.role === "owner" ? "var(--accent)" : "var(--primary)" } as React.CSSProperties}>
              <header className="adv__head">
                <span className="adv__avatar" aria-hidden="true">
                  {u.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="adv__who">
                  {isEdit ? (
                    <input className="rate__input adv__input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nombre" />
                  ) : (
                    <strong>{u.name}</strong>
                  )}
                  <span className="adv__phone">
                    {Ico.lock} usuario: <b>{u.id}</b>
                  </span>
                </div>
                <span className={"adv__state" + (u.active ? " adv__state--on" : "")}>{u.active ? "Activo" : "Sin acceso"}</span>
              </header>

              {isEdit ? (
                <>
                  <label className="tm__field">
                    <span>Nueva contraseña <em>(vacío = no cambia)</em></span>
                    <input className="rate__input adv__input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                  </label>
                  {u.role === "advisor" && (
                    <label className="tm__field">
                      <span>Asesora (WhatsApp)</span>
                      <select className="rate__input adv__input" value={form.advisorId} onChange={(e) => setForm({ ...form, advisorId: e.target.value })}>
                        {advisors.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              ) : (
                <div className="adv__foot">
                  <span>
                    {u.role === "owner" ? (
                      <>
                        <strong>Dueño</strong> · ve y controla todo (entra en /admin)
                      </>
                    ) : (
                      <>
                        Ve los contactos de <strong>{advisorName(u.advisor_id)}</strong> (entra en /equipo)
                      </>
                    )}
                  </span>
                  <span className="adv__last">{u.last_login_at ? `Última entrada: ${timeAgo(u.last_login_at, now)}` : "Todavía no ha entrado"}</span>
                </div>
              )}

              <footer className="adv__actions">
                {isEdit ? (
                  <>
                    <button type="button" className="btn btn--primary admin__btn-sm" disabled={saving} onClick={() => void save(u.active)}>
                      {Ico.check} Guardar
                    </button>
                    <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => setEditing(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="ld__link" disabled={saving} onClick={() => startEdit(u)}>
                      Editar o cambiar contraseña
                    </button>
                    <button type="button" className={"ld__link" + (u.active ? " ld__link--danger" : "")} disabled={saving} onClick={() => void toggle(u)}>
                      {u.active ? "Quitar acceso" : "Reactivar"}
                    </button>
                  </>
                )}
              </footer>
            </article>
          );
        })}

        {users.length === 0 && editing !== "new" && (
          <div className="admin__empty">Todavía no hay accesos. Crea uno para cada asesora y podrá entrar desde su celular.</div>
        )}
      </div>
    </div>
  );
}
