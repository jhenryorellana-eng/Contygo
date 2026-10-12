"use client";

/* Elegir el servicio antes del contrato (Visa Juvenil Básico o Premium, 12-10-2026).
   Cada opción es una carpeta de expediente: sus pestañas de papel son las etapas que incluye
   (la misma carpeta del segundo vídeo), así que Premium se distingue de un vistazo por su pestaña I-485.
   Hoja de papel (tu información), carpetas marinas y verde solo para lo que avanza: la elección y «Continuar».
   El precio llega vivo de contygo (/api/contratar/servicio); al continuar, las respuestas de la conversación
   que también sirven a esa opción viajan con ella (carryAnswers) y lo que falte lo pide la ficha. */
import { useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { ContygoService } from "@/lib/contygo-catalog";
import type { PublicServiceView } from "@/lib/contygo-api/catalog";
import type { AnswerValue } from "@/lib/contygo-api/types";
import { formatMoney } from "@/lib/contygo-api/payment-options";
import { carryAnswers } from "@/lib/contygo-api/variants";
import s from "./ServiceVariantPicker.module.css";

type Live = { status: "loading" } | { status: "ready"; view: PublicServiceView } | { status: "unavailable" };
type Props = {
  variants: ContygoService[];
  /** The conversation's answers, keyed by the questions of the service the chat asked for. */
  answers?: Record<string, AnswerValue>;
  /** The option already chosen, when the picker opens again from the contract. */
  current?: string;
  onChoose: (service: ContygoService, answers: Record<string, AnswerValue>) => void;
  onClose: () => void;
};

async function loadView(serviceId: string): Promise<PublicServiceView | null> {
  const response = await fetch("/api/contratar/servicio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId }), cache: "no-store" });
  const data = await response.json().catch(() => null) as { ok?: boolean; service?: PublicServiceView | null } | null;
  return response.ok && data?.ok && data.service ? data.service : null;
}

/** «$2,500» for one package, «Desde $2,500» for several. No price until the live one arrives. */
function priceOf(live: Live | undefined) {
  if (!live || live.status !== "ready") return null;
  const prices = live.view.plans.map(plan => plan.priceCents).filter(cents => Number.isFinite(cents) && cents > 0);
  if (!prices.length) return null;
  const from = Math.min(...prices);
  return prices.length > 1 ? `Desde ${formatMoney(from)}` : formatMoney(from);
}

/** Form numbers never break across lines: «I‑485», not «I-» and «485». */
const keep = (text: string) => text.replace(/([A-Z])-(\d)/g, "$1\u2011$2");

/** «Visa Juvenil» from «Visa Juvenil Básico» and «Visa Juvenil Premium». */
function familyName(variants: ContygoService[]) {
  const words = variants.map(variant => variant.name.split(" "));
  const shared: string[] = [];
  for (let index = 0; words.every(list => list[index] !== undefined && list[index] === words[0][index]); index++) shared.push(words[0][index]);
  return shared.join(" ") || "servicio";
}

function Close() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function ServiceVariantPicker({ variants, answers = {}, current, onChoose, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const chosenRef = useRef(false);
  const [selected, setSelected] = useState<string | null>(current ?? null);
  const [live, setLive] = useState<Record<string, Live>>(() => Object.fromEntries(variants.map(variant => [variant.id, { status: "loading" } as Live])));
  const titleId = useId();
  const group = useId();
  const labelOf = (id: string | null) => { const variant = variants.find(item => item.id === id); return variant?.variant?.label ?? variant?.name ?? ""; };

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    // The title takes the focus (read first by a screen reader) without showing an option as chosen.
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let alive = true;
    for (const variant of variants) {
      void loadView(variant.id)
        .then(view => { if (alive) setLive(state => ({ ...state, [variant.id]: view ? { status: "ready", view } : { status: "unavailable" } })); })
        .catch(() => { if (alive) setLive(state => ({ ...state, [variant.id]: { status: "unavailable" } })); });
    }
    return () => { alive = false; };
  }, [variants]);

  function choose(id: string) {
    const variant = variants.find(item => item.id === id);
    if (!variant || chosenRef.current) return;
    chosenRef.current = true;
    const views = Object.values(live).flatMap(item => item.status === "ready" ? [item.view] : []);
    const target = live[variant.id];
    const carried = target?.status === "ready"
      ? carryAnswers(target.view.questions, views.filter(view => view !== target.view).flatMap(view => view.questions), answers)
      : answers;
    onChoose(variant, carried);
  }

  function clickOutside(event: MouseEvent<HTMLDialogElement>) {
    event.stopPropagation();
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }

  return <dialog ref={dialogRef} className={s.sheet} aria-labelledby={titleId} onClick={clickOutside} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <form className={s.body} onSubmit={event => { event.preventDefault(); if (selected) choose(selected); }}>
      <header className={s.header}>
        <h2 id={titleId} ref={titleRef} tabIndex={-1}>¿Qué {familyName(variants)} quieres contratar?</h2>
        <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar y volver"><Close /></button>
      </header>
      <p className={s.lead}>Cada pestaña es una etapa que preparamos contigo.</p>

      <div className={s.folders} role="radiogroup" aria-labelledby={titleId}>
        {variants.map((variant, index) => {
          const price = priceOf(live[variant.id]);
          const loading = live[variant.id]?.status === "loading";
          return <label key={variant.id} className={s.folder} data-selected={selected === variant.id || undefined} style={{ "--i": index } as CSSProperties}>
            <input type="radio" name={group} value={variant.id} checked={selected === variant.id} onChange={() => setSelected(variant.id)} />
            <span className={s.tabs} aria-hidden="true">{(variant.variant?.stages ?? []).map(stage => <span key={stage} className={s.tab}>{keep(stage)}</span>)}</span>
            <span className={s.front}>
              <span className={s.mark} aria-hidden="true" />
              <span className={s.text}>
                <span className={s.name}>{variant.variant?.label ?? variant.name}</span>
                <span className={s.summary}>{keep(variant.variant?.summary ?? variant.description)}</span>
              </span>
              {price ? <span className={s.price}>{price}</span> : loading ? <span className={s.pending}>Consultando precio</span> : null}
            </span>
          </label>;
        })}
      </div>

      <p className={s.note}>Las tasas del gobierno, cuando aplican, van aparte.</p>
      <button type="submit" className={s.primary} disabled={!selected}>
        <span>{selected ? `Continuar con ${labelOf(selected)}` : "Elige una opción"}</span>
        <i aria-hidden="true"><Arrow /></i>
      </button>
    </form>
  </dialog>;
}
