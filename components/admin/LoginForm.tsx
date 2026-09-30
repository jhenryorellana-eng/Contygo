"use client";

/* ============================================================
   Formulario de entrada compartido por /admin (dueño) y /equipo.
   ============================================================ */
import { useState } from "react";
import { Ico } from "../icons";
import type { SessionInfo } from "./AdminPanel";

interface Props {
  kicker: string;
  title: string;
  hint: string;
  userPlaceholder: string;
  onLogin: (s: SessionInfo) => void;
}

export default function LoginForm({ kicker, title, hint, userPlaceholder, onLogin }: Props) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user.trim(), password }),
      });
      if (res.ok) {
        const me = await fetch("/api/admin/login", { cache: "no-store" });
        onLogin((await me.json()) as SessionInfo);
      } else if (res.status === 503) setError("Falta configurar el acceso en el servidor.");
      else if (res.status === 429) setError("Demasiados intentos. Espera unos minutos.");
      else setError("Usuario o contraseña incorrectos.");
    } catch {
      setError("Sin conexión con el servidor. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rate__card admin__login slide-anim" onSubmit={submit}>
      <span className="slide-tag">{kicker}</span>
      <h1 className="rate__title">{title}</h1>
      <p className="rate__sub">{hint}</p>
      <div className="rate__field">
        <label className="rate__label" htmlFor="login-user">
          Usuario
        </label>
        <input id="login-user" className="rate__input" autoComplete="username" autoCapitalize="none" value={user} onChange={(e) => setUser(e.target.value)} placeholder={userPlaceholder} required />
      </div>
      <div className="rate__field">
        <label className="rate__label" htmlFor="login-pass">
          Contraseña
        </label>
        <input id="login-pass" className="rate__input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="rate__error">{error}</p>}
      <button type="submit" className="btn btn--primary rate__send" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"} {Ico.arrow}
      </button>
    </form>
  );
}
