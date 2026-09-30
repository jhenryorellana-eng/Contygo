"use client";

/* Página de «gracias»: en qué punto está el contrato de ESTE navegador y, si hace falta, el reenvío
   del enlace de firma. Sin base de datos (guía §2 bis): el navegador guarda en sessionStorage solo
   el token firmado del contrato (sin datos personales) y lo borra cuando el contrato ya no espera
   nada más de la persona. */
import { useCallback, useEffect, useRef, useState } from "react";
import { clearContract, newIdempotencyKey, readContract, type SavedContract } from "@/lib/contygo-api/browser";
import s from "./ContractCheckout.module.css";

type Status = { caseNumber: string | null; contract: "draft" | "sent" | "signed" | "cancelled"; signingExpiresAt: string | null; downpayment: "none" | "pending" | "paid" | "waived"; checkedAt: string | null };
const dateFormat = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "long" });

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  return { status: response.status, body: await response.json().catch(() => null) as Record<string, unknown> | null };
}

/** Nothing left to wait for: signed and paid (or waived), or cancelled. */
const settled = (status: Status) => status.contract === "cancelled" || (status.contract === "signed" && (status.downpayment === "paid" || status.downpayment === "waived"));

export default function ContractThanks() {
  const [saved, setSaved] = useState<SavedContract | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const resendKey = useRef<string | null>(null);

  const refresh = useCallback(async (contract: SavedContract | null) => {
    if (!contract) { setState("missing"); return; }
    setBusy(true);
    try {
      const { status: code, body } = await post("/api/contratar/estado", { token: contract.token });
      if (code === 404) { clearContract(); setState("missing"); return; }
      if (code !== 200 || !body?.ok) { setState(current => current === "ready" ? "ready" : "error"); setMessage("No pudimos consultar el estado ahora. Inténtalo en un minuto."); return; }
      const next = body as unknown as Status;
      setStatus(next); setState("ready"); setMessage("");
      // Guía §2 bis: the UI deletes its sessionStorage at the end.
      if (settled(next)) clearContract();
    } catch { setState("error"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const contract = readContract(); setSaved(contract); void refresh(contract); }, [refresh]);

  async function resend() {
    if (!saved) return;
    // One key per resend; a cut repeats it.
    const key = resendKey.current ?? newIdempotencyKey();
    resendKey.current = key;
    setBusy(true);
    try {
      const { status: code, body } = await post("/api/contratar/reenviar", { token: saved.token, idempotencyKey: key });
      const outcome = body?.outcome as { step?: string; signingUrl?: string; reason?: string } | undefined;
      if (!(outcome?.step === "RETRY_LATER" && outcome.reason === "busy")) resendKey.current = null;
      if (code === 200 && outcome?.step === "SIGN_LINK" && outcome.signingUrl) { setSigningUrl(outcome.signingUrl); setMessage("Listo: también te lo enviamos a tu correo y a tu app de ContyGo."); }
      else if (outcome?.step === "ALREADY_SIGNED") { setMessage("Tu contrato ya está firmado."); void refresh(saved); }
      else if (code === 429 || outcome?.step === "RETRY_LATER") setMessage("Por seguridad, espera unos minutos antes de intentarlo de nuevo.");
      else setMessage("No pudimos reenviar el enlace. Un asesor te contactará.");
    } catch { setMessage("No pudimos reenviar el enlace. Revisa tu conexión."); }
    finally { setBusy(false); }
  }

  const signed = status?.contract === "signed";
  const title = state === "missing" ? "No encontramos un contrato en este navegador."
    : !status ? "Consultando tu contrato…"
    : signed ? status.downpayment === "paid" || status.downpayment === "waived" ? "¡Listo! Tu caso ya arrancó." : "¡Contrato firmado!"
    : status.contract === "cancelled" ? "Este contrato se canceló." : "Tu contrato espera tu firma.";
  const detail = state === "missing" ? "El enlace para firmar también te llegó a tu correo."
    : !status ? "" : signed
    ? status.downpayment === "paid" || status.downpayment === "waived" ? "Recibimos tu pago inicial. Sigue tus próximos pasos en tu app de ContyGo." : "El siguiente paso es el pago inicial. Lo verás en tu app de ContyGo."
    : status.contract === "sent" ? `Lo preparamos con tus datos. ${status.signingExpiresAt ? `El enlace para firmar vale hasta el ${dateFormat.format(new Date(status.signingExpiresAt))}.` : ""}` : "";
  const caseNumber = status?.caseNumber ?? saved?.caseNumber;

  return <div className={s.checkout} style={{ minHeight: "100dvh", height: "auto" }}>
    <div className={s.card}>
      <header className={s.head}>
        <span className={s.nucleus} aria-hidden="true"><img src="/contygo/brand/symbol-light.png" alt="" /></span>
        <span className={s.eyebrow}>ContyGo · Tu contrato</span>
        <h1 className={s.title}>{title}</h1>
        {detail && <p className={s.lead}>{detail}</p>}
      </header>
      {caseNumber && state !== "missing" && <p className={s.caseNumber}>Tu número de caso: <strong>{caseNumber}</strong></p>}
      {message && <div className={s.notice} data-tone="info" role="status"><strong>{message}</strong></div>}
      {status?.contract === "sent" && (signingUrl
        ? <a className={s.primary} href={signingUrl} target="_blank" rel="noopener noreferrer"><span>Firmar mi contrato</span><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></i></a>
        : <button type="button" className={s.primary} disabled={busy} onClick={() => void resend()}><span>{busy ? "Enviando…" : "Enviarme el enlace para firmar"}</span><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></i></button>)}
      {saved?.clientCreated && state !== "missing" && <p className={s.note}>Entra a tu app de ContyGo con tu correo. Tu contraseña inicial son los 10 dígitos de tu teléfono.</p>}
      <div className={s.links}>
        {state !== "missing" && <button type="button" className={s.linkButton} disabled={busy} onClick={() => void refresh(saved)}>Actualizar estado</button>}
        <a className={s.linkButton} href="https://contygo.app/entrar">Entrar a mi cuenta</a>
        <a className={s.linkButton} href="/">Volver al inicio</a>
      </div>
    </div>
  </div>;
}
