"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { US_STATES } from "@/lib/agent/visa-intake";
import s from "./VisaStatePicker.module.css";

type StateOption = { code: string; name: string };
type VisaStatePickerProps = {
  onChoose: (code: string) => void; onClose: () => void;
  /** Catalog options ({code, label}) of a us_state question; by default the 50 states and D. C. */
  options?: { code: string; label: string }[];
  /** The «not defined yet» footer button is only for the visa chat (it answers UNKNOWN); a catalog question needs a code. */
  allowUnknown?: boolean;
  description?: string;
};

const cleanSearch = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Close() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export default function VisaStatePicker({ onChoose, onClose, options, allowUnknown = !options, description = "La vía judicial puede cambiar según el estado." }: VisaStatePickerProps) {
  const states: ReadonlyArray<StateOption> = options ? options.map(option => ({ code: option.code, name: option.label })) : US_STATES;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chosenRef = useRef(false);
  const [search, setSearch] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const resultsId = useId();
  const query = cleanSearch(search);
  const filtered = states.filter(state => cleanSearch(`${state.name} ${state.code}`).includes(query));

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    searchRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [search]);

  function choose(code: string) {
    if (chosenRef.current) return;
    chosenRef.current = true;
    onChoose(code);
  }

  function navigate(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    const target = event.target as HTMLElement;
    const fromSearch = target === searchRef.current;
    const fromOption = target.closest("[data-state-option]");
    if (!fromSearch && !fromOption) return;

    if (fromSearch && event.key === "Enter" && filtered.length === 1) {
      event.preventDefault();
      choose(filtered[0].code);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (fromSearch && (event.key === "Home" || event.key === "End")) return;
    const options = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("[data-state-option]") ?? []);
    if (!options.length) return;
    event.preventDefault();
    const current = options.indexOf(fromOption as HTMLButtonElement);
    const index = event.key === "Home" ? 0
      : event.key === "End" ? options.length - 1
      : fromSearch ? event.key === "ArrowUp" ? options.length - 1 : 0
      : Math.max(0, Math.min(options.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)));
    options[index].focus({ preventScroll: true });
    options[index].scrollIntoView({ block: "nearest", behavior: "auto" });
  }

  function clickOutside(event: MouseEvent<HTMLDialogElement>) {
    event.stopPropagation();
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }

  return <dialog ref={dialogRef} className={s.sheet} aria-labelledby={titleId} aria-describedby={descriptionId} onKeyDown={navigate} onClick={clickOutside} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <div className={s.handle} aria-hidden="true" />
    <header className={s.header}>
      <div><span className={s.kicker}>UN DATO IMPORTANTE</span><h2 id={titleId}>¿En qué estado?</h2></div>
      <button className={s.close} type="button" onClick={onClose} aria-label="Cerrar selección de estado"><Close /></button>
    </header>
    <p id={descriptionId} className={s.description}>{description}</p>

    <label className={s.search}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      <input ref={searchRef} autoFocus type="search" aria-label="Buscar estado de Estados Unidos" aria-controls={resultsId} placeholder="Busca un estado o sus siglas" autoComplete="off" spellCheck={false} value={search} onChange={event => setSearch(event.target.value)} />
      {search && <button className={s.clear} type="button" onClick={() => { setSearch(""); searchRef.current?.focus({ preventScroll: true }); }} aria-label="Limpiar búsqueda"><Close /></button>}
    </label>

    <p className={s.resultCount} role="status" aria-live="polite">{query ? `${filtered.length} ${filtered.length === 1 ? "estado encontrado" : "estados encontrados"}` : options ? `${states.length} opciones` : "50 estados y Washington, D. C."}</p>
    <div ref={listRef} id={resultsId} className={s.list} aria-label="Estados de Estados Unidos">
      {filtered.map(state => <button className={s.option} type="button" key={state.code} data-state-option onClick={() => choose(state.code)}><span className={s.code}>{state.code}</span><span className={s.name}>{state.name}</span><Arrow /></button>)}
      {!filtered.length && <p className={s.empty}>No encontramos ese estado.<span>Prueba con su nombre o sus siglas.</span></p>}
    </div>
    {allowUnknown && <footer className={s.footer}>
      <button className={s.unknown} type="button" data-state-option onClick={() => choose("UNKNOWN")}><span>Aún no tengo un estado definido</span><Arrow /></button>
    </footer>}
  </dialog>;
}
