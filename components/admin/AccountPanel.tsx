"use client";

/* ============================================================
   Mi cuenta — cambiar mi contraseña (dueño o asesora).
   ============================================================ */
import { useState } from "react";
import { Ico } from "../icons";
import type { SessionInfo } from "./AdminPanel";

export default function AccountPanel({ session }: { session: SessionInfo }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 6) return setMsg({ ok: false, text: "La nueva contraseña debe tener al menos 6 caracteres." });
    if (next !== again) return setMsg({ ok: false, text: "Las dos contraseñas nuevas no coinciden." });
    setBusy(true);
    try {
      const res = await fetch("/api/crm/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Contraseña cambiada. Úsala la próxima vez que entres." });
        setCurrent("");
        setNext("");
        setAgain("");
      } else if (res.status === 401) setMsg({ ok: false, text: "La contraseña actual no es correcta." });
      else if (res.status === 400) setMsg({ ok: false, text: "Esta sesión usa la clave maestra; se cambia en Vercel (ADMIN_PASSWORD)." });
      else setMsg({ ok: false, text: "No se pudo cambiar. Intenta de nuevo." });
    } catch {
      setMsg({ ok: false, text: "Sin conexión. Intenta de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ld">
      <section className="ld__balance">
        <h2 className="ld__h">Mi cuenta</h2>
        <p className="ld__muted">
          Usuario <strong>{session.uid}</strong> · {session.role === "owner" ? "dueño: ve y controla todo" : `asesora: ve sus contactos`}.
        </p>
        <form className="acct" onSubmit={submit}>
          <label className="tm__field">
            <span>Contraseña actual</span>
            <input className="rate__input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
          <label className="tm__field">
            <span>Nueva contraseña</span>
            <input className="rate__input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </label>
          <label className="tm__field">
            <span>Repite la nueva</span>
            <input className="rate__input" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
          </label>
          {msg && <p className={msg.ok ? "admin__notice" : "admin__error"}>{msg.text}</p>}
          <div>
            <button type="submit" className="btn btn--primary admin__btn-sm" disabled={busy}>
              {Ico.check} {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
