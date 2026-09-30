"use client";

/* ============================================================
   Ficha de contacto (panel lateral; pantalla completa en móvil)
   · Cabecera: nombre, teléfono, WhatsApp y llamada con un toque.
   · Etapa: chips; "Perdido" pide motivo.
   · Próximo paso con fecha (atajos: mañana, 3 días, próxima semana).
   · Datos: servicio, asesora (solo dueño), monto pagado, notas.
   · Historial: notas, llamadas, WhatsApp, citas, cambios de etapa.
   · Respuestas del cuestionario si llegó desde la web.
   Sin contacto (contact=null) funciona como formulario de alta.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { STAGES, STAGE_LABEL, type Activity, type ActivityKind, type Contact, type Stage } from "@/lib/crm";
import { getServiceById } from "@/lib/services";
import { formatPhone } from "@/lib/wa-route";
import { Ico } from "../icons";
import type { SessionInfo } from "./AdminPanel";
import { DAY, dateTimeFmt, startOfDay, timeAgo, toLocalInput, whenLabel } from "./fmt";

export interface AdvisorLite {
  id: string;
  name: string;
  whatsapp?: string;
  active: boolean;
}

interface Props {
  contact: Contact | null;
  advisors: AdvisorLite[];
  session: SessionInfo;
  services: { id: string; name: string }[];
  onClose: () => void;
  onChange: (c: Contact) => void;
}

const ACT_LABEL: Record<ActivityKind, string> = {
  nota: "Nota",
  etapa: "Etapa",
  whatsapp: "WhatsApp",
  llamada: "Llamada",
  cita: "Cita",
  seguimiento: "Seguimiento",
  sistema: "Sistema",
};

const NOTE_KINDS: ActivityKind[] = ["nota", "llamada", "whatsapp", "cita"];

export default function ContactDrawer({ contact, advisors, session, services, onClose, onChange }: Props) {
  const isOwner = session.role === "owner";
  const isNew = contact === null;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingAct, setLoadingAct] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // formulario de alta
  const [draft, setDraft] = useState({ name: "", phone: "", serviceId: "", advisorId: session.advisorId ?? "", notes: "" });

  // edición en la ficha
  const [editHead, setEditHead] = useState(false);
  const [head, setHead] = useState({ name: contact?.name ?? "", phone: contact ? formatPhone(contact.phone ?? "") : "" });
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [nextAction, setNextAction] = useState(contact?.next_action ?? "");
  const [nextAt, setNextAt] = useState(toLocalInput(contact?.next_action_at ?? null));
  const [amount, setAmount] = useState(contact?.amount != null ? String(contact.amount) : "");
  const [lostReason, setLostReason] = useState(contact?.lost_reason ?? "");
  const [askLost, setAskLost] = useState(false);
  const [noteKind, setNoteKind] = useState<ActivityKind>("nota");
  const [noteText, setNoteText] = useState("");

  // Sincroniza cuando cambia el contacto abierto.
  useEffect(() => {
    if (!contact) return;
    setHead({ name: contact.name, phone: formatPhone(contact.phone ?? "") });
    setNotes(contact.notes ?? "");
    setNextAction(contact.next_action ?? "");
    setNextAt(toLocalInput(contact.next_action_at));
    setAmount(contact.amount != null ? String(contact.amount) : "");
    setLostReason(contact.lost_reason ?? "");
    setAskLost(contact.stage === "perdido" && !contact.lost_reason);
  }, [contact]);

  useEffect(() => {
    if (!contact) return;
    let alive = true;
    setLoadingAct(true);
    void (async () => {
      try {
        const res = await fetch(`/api/crm/contacts/${contact.id}`, { cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          const data = (await res.json()) as { activities: Activity[] };
          setActivities(data.activities ?? []);
          setNow(Date.now());
        }
      } finally {
        if (alive) setLoadingAct(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  // Cerrar con Escape y bloquear el scroll de fondo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const service = contact?.service_id ? getServiceById(contact.service_id) : undefined;

  /** Respuestas del cuestionario con el texto de cada pregunta. */
  const answerRows = useMemo(() => {
    if (!contact?.answers || !service) return [];
    const rows: { q: string; a: string }[] = [];
    for (const q of service.questions) {
      const v = contact.answers[q.id];
      if (v === undefined) continue;
      let a = "";
      if (Array.isArray(v)) a = v.map((id) => q.items?.find((i) => i.id === id)?.label ?? id).join(", ") || "ninguno";
      else if (q.kind === "yesno") a = v === "yes" || v === "si" || v === "sí" ? "Sí" : v === "no" ? "No" : v;
      else a = q.options?.find((o) => o.value === v)?.label ?? v;
      rows.push({ q: q.text, a });
    }
    return rows;
  }, [contact, service]);

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    if (!contact) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError("No se pudo guardar. Intenta de nuevo.");
        return false;
      }
      const data = (await res.json()) as { contact: Contact; activities: Activity[] };
      if (data.contact) onChange(data.contact);
      if (data.activities) setActivities(data.activities);
      setNow(Date.now());
      return true;
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function setStage(stage: Stage) {
    if (!contact || contact.stage === stage) return;
    if (stage === "perdido") {
      setAskLost(true);
      await patch({ stage });
      return;
    }
    await patch({ stage });
  }

  async function addActivity(kind: ActivityKind, body: string | null) {
    if (!contact) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, body }),
      });
      if (!res.ok) return setError("No se pudo guardar la nota.");
      const data = (await res.json()) as { contact: Contact; activities: Activity[] };
      if (data.contact) onChange(data.contact);
      setActivities(data.activities ?? []);
      setNoteText("");
      setNow(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function create() {
    const name = draft.name.trim();
    const phone = draft.phone.replace(/\D/g, "");
    if (name.length < 2) return setError("Escribe el nombre.");
    if (phone && !/^[0-9]{8,15}$/.test(phone)) return setError("Revisa el teléfono: +1 (xxx) xxx-xxxx.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, serviceId: draft.serviceId || null, advisorId: draft.advisorId || null, notes: draft.notes.trim() || null }),
      });
      if (!res.ok) return setError("No se pudo crear el contacto.");
      const { id } = (await res.json()) as { id: string };
      const full = await fetch(`/api/crm/contacts/${id}`, { cache: "no-store" });
      if (full.ok) {
        const data = (await full.json()) as { contact: Contact };
        onChange(data.contact);
      }
    } finally {
      setSaving(false);
    }
  }

  function quickDate(days: number, hour = 10): string {
    const d = new Date(startOfDay(Date.now()) + days * DAY);
    d.setHours(hour, 0, 0, 0);
    return toLocalInput(d.toISOString());
  }

  const waHref = contact?.phone
    ? `https://wa.me/${contact.phone}?text=${encodeURIComponent(`Hola ${contact.name.split(" ")[0]}, soy ${session.name} de USA Latino Prime. Te escribo para ayudarte con tu trámite${service ? ` de ${service.name}` : ""}.`)}`
    : null;

  return (
    <div className="dr" role="dialog" aria-modal="true" aria-label={isNew ? "Nuevo contacto" : contact!.name} onClick={onClose}>
      <aside className="dr__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dr__x" onClick={onClose} aria-label="Cerrar">
          {Ico.close}
        </button>

        {/* ================= ALTA ================= */}
        {isNew ? (
          <div className="dr__body">
            <h2 className="dr__title">Nuevo contacto</h2>
            <p className="ld__muted">Lo justo para no perderlo: nombre y WhatsApp. El resto se completa después.</p>
            {error && <p className="admin__error">{error}</p>}
            <label className="tm__field">
              <span>Nombre</span>
              <input className="rate__input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
            </label>
            <label className="tm__field">
              <span>WhatsApp</span>
              <input className="rate__input" inputMode="tel" placeholder="+1 (xxx) xxx-xxxx" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </label>
            <label className="tm__field">
              <span>Servicio</span>
              <select className="rate__input" value={draft.serviceId} onChange={(e) => setDraft({ ...draft, serviceId: e.target.value })}>
                <option value="">Todavía no se sabe</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {isOwner && (
              <label className="tm__field">
                <span>Asesora</span>
                <select className="rate__input" value={draft.advisorId} onChange={(e) => setDraft({ ...draft, advisorId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {advisors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="tm__field">
              <span>Notas</span>
              <textarea className="rate__input rate__textarea" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Cómo llegó, qué necesita…" />
            </label>
            <div className="dr__actions">
              <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void create()}>
                {Ico.check} Crear contacto
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* ================= FICHA ================= */
          <div className="dr__body">
            <header className="dr__head">
              {editHead ? (
                <div className="dr__edit">
                  <input className="rate__input" value={head.name} onChange={(e) => setHead({ ...head, name: e.target.value })} aria-label="Nombre" />
                  <input className="rate__input" inputMode="tel" value={head.phone} onChange={(e) => setHead({ ...head, phone: e.target.value })} aria-label="WhatsApp" placeholder="+1 (xxx) xxx-xxxx" />
                  <div className="dr__actions">
                    <button
                      type="button"
                      className="btn btn--primary admin__btn-sm"
                      disabled={saving}
                      onClick={async () => {
                        if (await patch({ name: head.name.trim(), phone: head.phone })) setEditHead(false);
                      }}
                    >
                      Guardar
                    </button>
                    <button type="button" className="btn btn--ghost admin__btn-sm" onClick={() => setEditHead(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="dr__title">{contact!.name}</h2>
                  <div className="dr__sub">
                    <span>{contact!.phone ? formatPhone(contact!.phone) : "Sin teléfono"}</span>
                    <span>·</span>
                    <span>llegó {timeAgo(contact!.created_at, now)}</span>
                    <span>·</span>
                    <span>{contact!.source === "embudo" ? "desde la web" : contact!.source === "prime" ? "desde Prime" : "cargado a mano"}</span>
                    <button type="button" className="ld__link" onClick={() => setEditHead(true)}>
                      Editar
                    </button>
                  </div>
                  <div className="dr__cta">
                    {waHref ? (
                      <a className="btn btn--wa" href={waHref} target="_blank" rel="noopener noreferrer" onClick={() => void addActivity("whatsapp", "Escribió por WhatsApp")}>
                        {Ico.whatsapp} WhatsApp
                      </a>
                    ) : (
                      <span className="ld__muted">Añade un teléfono para escribirle.</span>
                    )}
                    {contact!.phone && (
                      <a className="btn btn--ghost" href={`tel:+${contact!.phone}`} onClick={() => void addActivity("llamada", "Llamó")}>
                        {Ico.phone} Llamar
                      </a>
                    )}
                  </div>
                </>
              )}
            </header>

            {error && <p className="admin__error">{error}</p>}

            {/* etapa */}
            <section className="dr__sec">
              <h3 className="dr__h">Etapa</h3>
              <div className="stages">
                {STAGES.map((s) => (
                  <button key={s} type="button" className={"stage stage--" + s + (contact!.stage === s ? " is-on" : "")} aria-pressed={contact!.stage === s} disabled={saving} onClick={() => void setStage(s)}>
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
              {(askLost || contact!.stage === "perdido") && (
                <div className="dr__inline">
                  <input className="rate__input" placeholder="¿Por qué se perdió? (precio, no contestó, otro servicio…)" value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
                  <button
                    type="button"
                    className="btn btn--ghost admin__btn-sm"
                    disabled={saving}
                    onClick={async () => {
                      if (await patch({ lostReason })) setAskLost(false);
                    }}
                  >
                    Guardar motivo
                  </button>
                </div>
              )}
              {contact!.first_contact_at && (
                <p className="ld__muted">
                  Primer contacto: {dateTimeFmt.format(new Date(contact!.first_contact_at))} (
                  {Math.max(1, Math.round((new Date(contact!.first_contact_at).getTime() - new Date(contact!.created_at).getTime()) / 60000))} min después de llegar)
                </p>
              )}
            </section>

            {/* próximo paso */}
            <section className="dr__sec">
              <h3 className="dr__h">Próximo paso</h3>
              <div className="dr__quick">
                <button type="button" className="ld__chip" onClick={() => setNextAt(quickDate(0, new Date().getHours() + 2))}>
                  En 2 horas
                </button>
                <button type="button" className="ld__chip" onClick={() => setNextAt(quickDate(1))}>
                  Mañana
                </button>
                <button type="button" className="ld__chip" onClick={() => setNextAt(quickDate(3))}>
                  En 3 días
                </button>
                <button type="button" className="ld__chip" onClick={() => setNextAt(quickDate(7))}>
                  Próxima semana
                </button>
              </div>
              <div className="dr__row">
                <input className="rate__input" placeholder="Qué hay que hacer (llamar, pedir documentos…)" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
                <input className="rate__input" type="datetime-local" value={nextAt} onChange={(e) => setNextAt(e.target.value)} aria-label="Cuándo" />
              </div>
              <div className="dr__actions">
                <button
                  type="button"
                  className="btn btn--primary admin__btn-sm"
                  disabled={saving}
                  onClick={() => void patch({ nextAction, nextActionAt: nextAt ? new Date(nextAt).toISOString() : null })}
                >
                  Guardar próximo paso
                </button>
                {contact!.next_action_at && (
                  <button
                    type="button"
                    className="btn btn--ghost admin__btn-sm"
                    disabled={saving}
                    onClick={async () => {
                      const ok = await patch({ nextAction: "", nextActionAt: null });
                      if (ok) await addActivity("seguimiento", `Seguimiento hecho: ${contact!.next_action ?? ""}`.trim());
                    }}
                  >
                    {Ico.check} Hecho
                  </button>
                )}
                {contact!.next_action_at && <span className="ld__muted">Programado: {whenLabel(contact!.next_action_at, now)}</span>}
              </div>
            </section>

            {/* datos */}
            <section className="dr__sec dr__grid">
              <label className="tm__field">
                <span>Servicio</span>
                <select className="rate__input" value={contact!.service_id ?? ""} disabled={saving} onChange={(e) => void patch({ serviceId: e.target.value })}>
                  <option value="">Todavía no se sabe</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {isOwner && (
                <label className="tm__field">
                  <span>Asesora</span>
                  <select className="rate__input" value={contact!.advisor_id ?? ""} disabled={saving} onChange={(e) => void patch({ advisorId: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {advisors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {(contact!.stage === "pagado" || contact!.stage === "en_tramite" || contact!.stage === "cerrado" || contact!.amount != null) && (
                <label className="tm__field">
                  <span>Monto pagado (USD)</span>
                  <input
                    className="rate__input"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onBlur={() => {
                      const n = amount.trim() === "" ? null : Number(amount);
                      if (n === null || (Number.isFinite(n) && n >= 0)) void patch({ amount: n });
                    }}
                  />
                </label>
              )}
              <label className="tm__field tm__field--wide">
                <span>Notas del caso</span>
                <textarea className="rate__input rate__textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (contact!.notes ?? "") && void patch({ notes })} placeholder="Situación, documentos, acuerdos…" />
              </label>
            </section>

            {/* cuestionario */}
            {answerRows.length > 0 && (
              <section className="dr__sec">
                <h3 className="dr__h">
                  Respondió en la web {contact!.result_tone && <span className={"tone tone--" + contact!.result_tone}>{contact!.result_tone === "success" ? "califica" : contact!.result_tone === "urgent" ? "urgente" : contact!.result_tone === "contact" ? "revisar" : contact!.result_tone}</span>}
                </h3>
                <dl className="qa">
                  {answerRows.map((r, i) => (
                    <div key={i} className="qa__row">
                      <dt>{r.q}</dt>
                      <dd>{r.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* historial */}
            <section className="dr__sec">
              <h3 className="dr__h">Historial</h3>
              <div className="note">
                <div className="note__kinds" role="group" aria-label="Tipo">
                  {NOTE_KINDS.map((k) => (
                    <button key={k} type="button" className={"ld__chip" + (noteKind === k ? " is-on" : "")} onClick={() => setNoteKind(k)}>
                      {ACT_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="dr__row">
                  <input
                    className="rate__input"
                    placeholder={noteKind === "nota" ? "Escribe una nota…" : `Qué pasó en la ${ACT_LABEL[noteKind].toLowerCase()}…`}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && noteText.trim()) void addActivity(noteKind, noteText.trim());
                    }}
                  />
                  <button type="button" className="btn btn--primary admin__btn-sm" disabled={saving || (noteKind === "nota" && !noteText.trim())} onClick={() => void addActivity(noteKind, noteText.trim() || null)}>
                    Guardar
                  </button>
                </div>
              </div>
              {loadingAct ? (
                <div className="ld__muted">Cargando historial…</div>
              ) : (
                <ol className="tl">
                  {activities.map((a) => (
                    <li key={a.id} className={"tl__it tl__it--" + a.kind}>
                      <span className="tl__dot" aria-hidden="true" />
                      <div className="tl__body">
                        <span className="tl__text">
                          {a.kind === "etapa" && a.meta ? (
                            <>
                              Pasó de <b>{STAGE_LABEL[(a.meta.from as Stage) ?? "nuevo"] ?? String(a.meta.from)}</b> a <b>{STAGE_LABEL[(a.meta.to as Stage) ?? "nuevo"] ?? String(a.meta.to)}</b>
                              {typeof a.meta.lost_reason === "string" && a.meta.lost_reason ? ` · ${a.meta.lost_reason}` : ""}
                            </>
                          ) : (
                            <>
                              {a.kind !== "nota" && a.kind !== "sistema" && <b>{ACT_LABEL[a.kind]}: </b>}
                              {a.body ?? ACT_LABEL[a.kind]}
                            </>
                          )}
                        </span>
                        <span className="tl__meta">
                          {a.author ? `${a.author} · ` : ""}
                          {dateTimeFmt.format(new Date(a.created_at))}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
