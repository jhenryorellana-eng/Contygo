"use client";

/* Teléfono con país (28-09-2026). Estados Unidos (+1) por defecto; los países de donde más nos
   escriben, primero. Es un <select> nativo a propósito: en el celular abre el selector del
   sistema, grande y conocido, lo más fácil para personas que usan poco la tecnología.
   El valor que sale es "+<código><número>" (E.164 sin espacios), que normalizePhone acepta tal
   cual; un número de EE. UU. se muestra como (305) 555-0199 mientras se escribe. */
import { useEffect, useId, useMemo, useState } from "react";
import s from "./PhoneField.module.css";

export type Country = { iso: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { iso: "US", name: "Estados Unidos", dial: "1", flag: "🇺🇸" },
  { iso: "MX", name: "México", dial: "52", flag: "🇲🇽" },
  { iso: "GT", name: "Guatemala", dial: "502", flag: "🇬🇹" },
  { iso: "HN", name: "Honduras", dial: "504", flag: "🇭🇳" },
  { iso: "SV", name: "El Salvador", dial: "503", flag: "🇸🇻" },
  { iso: "NI", name: "Nicaragua", dial: "505", flag: "🇳🇮" },
  { iso: "CR", name: "Costa Rica", dial: "506", flag: "🇨🇷" },
  { iso: "PA", name: "Panamá", dial: "507", flag: "🇵🇦" },
  { iso: "CU", name: "Cuba", dial: "53", flag: "🇨🇺" },
  { iso: "DO", name: "República Dominicana", dial: "1", flag: "🇩🇴" },
  { iso: "PR", name: "Puerto Rico", dial: "1", flag: "🇵🇷" },
  { iso: "CO", name: "Colombia", dial: "57", flag: "🇨🇴" },
  { iso: "VE", name: "Venezuela", dial: "58", flag: "🇻🇪" },
  { iso: "EC", name: "Ecuador", dial: "593", flag: "🇪🇨" },
  { iso: "PE", name: "Perú", dial: "51", flag: "🇵🇪" },
  { iso: "BO", name: "Bolivia", dial: "591", flag: "🇧🇴" },
  { iso: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { iso: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { iso: "PY", name: "Paraguay", dial: "595", flag: "🇵🇾" },
  { iso: "UY", name: "Uruguay", dial: "598", flag: "🇺🇾" },
  { iso: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { iso: "HT", name: "Haití", dial: "509", flag: "🇭🇹" },
  { iso: "CA", name: "Canadá", dial: "1", flag: "🇨🇦" },
  { iso: "ES", name: "España", dial: "34", flag: "🇪🇸" },
];
const US = COUNTRIES[0];

/** "+52 55 1234 5678" or "(305) 555-0199" → country and national digits. A bare number is from the US. */
export function splitPhone(value: string): { country: Country; national: string } {
  const raw = value.trim();
  if (!raw.startsWith("+")) return { country: US, national: raw.replace(/\D/g, "") };
  const digits = raw.replace(/\D/g, "");
  // Longest dial code first (+502 before +50…); +1 stays the United States unless told otherwise.
  const match = [...COUNTRIES].filter(c => c.iso !== "DO" && c.iso !== "PR" && c.iso !== "CA").sort((a, b) => b.dial.length - a.dial.length).find(c => digits.startsWith(c.dial));
  return match ? { country: match, national: digits.slice(match.dial.length) } : { country: US, national: digits };
}

/** Pretty national number while typing: (305) 555-0199 for +1, groups of 3–4 digits elsewhere. */
function pretty(country: Country, digits: string) {
  if (country.dial === "1") {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return digits.slice(0, 13).replace(/(\d{3,4})(?=\d)/g, "$1 ").trim();
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  describedBy?: string;
  autoFocus?: boolean;
  /** Contract contact step: the account needs a US number, so the country is fixed to +1 (no selector). */
  usOnly?: boolean;
};

/** Digits of a US number as typed or pasted: «+1 (305) 555-0199», «1-305-555-0199» and «3055550199» all give 3055550199.
 *  A number that starts with another country code (+52…) is kept whole and flagged `foreign`: the contract validator rejects it
 *  with the +1 message instead of silently turning it into a wrong US number. */
function usDigits(typed: string): { digits: string; foreign: boolean } {
  const raw = typed.trim();
  const all = raw.replace(/\D/g, "");
  const international = raw.startsWith("+") ? all : raw.startsWith("00") ? all.slice(2) : null;
  if (international !== null) return international.startsWith("1") ? { digits: international.slice(1, 11), foreign: false } : { digits: international.slice(0, 15), foreign: true };
  return { digits: (all.length === 11 && all.startsWith("1") ? all.slice(1) : all).slice(0, 10), foreign: false };
}

export default function PhoneField({ value, onChange, onBlur, disabled, invalid, id, describedBy, autoFocus, usOnly }: Props) {
  const initial = useMemo(() => usOnly ? { country: US, national: usDigits(value).digits } : splitPhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [foreign, setForeign] = useState(false);
  const selectId = useId();

  // A value set from outside (prefill from the chat, a correction) replaces what is shown.
  useEffect(() => {
    const own = national ? `+${country.dial}${national}` : "";
    if (value === own) return;
    if (usOnly) { const next = usDigits(value); setNational(next.digits); setForeign(next.foreign); return; }
    const next = splitPhone(value);
    setNational(next.national);
    if (value.trim().startsWith("+")) setCountry(current => current.dial === next.country.dial ? current : next.country);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function emit(nextCountry: Country, digits: string) {
    onChange(digits ? `+${nextCountry.dial}${digits}` : "");
  }

  return <div className={s.phone} data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
    {usOnly ? <span className={s.country} data-fixed="true">
      <span className={s.flag} aria-hidden="true">{US.flag}</span>
      <span className={s.dial}>+1</span>
    </span> : <label className={s.country} htmlFor={selectId}>
      <span className={s.flag} aria-hidden="true">{country.flag}</span>
      <span className={s.dial} aria-hidden="true">+{country.dial}</span>
      <svg className={s.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <select id={selectId} aria-label="País del teléfono" value={country.iso} disabled={disabled} onChange={event => {
        const next = COUNTRIES.find(item => item.iso === event.target.value) ?? US;
        setCountry(next); emit(next, national);
      }}>
        {COUNTRIES.map(item => <option key={item.iso} value={item.iso}>{item.flag} {item.name} (+{item.dial})</option>)}
      </select>
    </label>}
    <input
      id={id} type="tel" inputMode="tel" autoComplete="tel-national" maxLength={usOnly ? 24 : country.dial === "1" ? 14 : 18}
      value={usOnly && foreign ? `+${national}` : pretty(country, national)} disabled={disabled} autoFocus={autoFocus}
      placeholder={country.dial === "1" ? "(305) 555-0199" : "Número"} aria-describedby={describedBy} aria-invalid={invalid || undefined}
      onBlur={onBlur}
      onChange={event => {
        const typed = event.target.value;
        if (usOnly) { const next = usDigits(typed); setNational(next.digits); setForeign(next.foreign); emit(US, next.digits); return; }
        // Someone who types the full international number (+52…) gets their country picked for them.
        if (typed.trim().startsWith("+")) { const next = splitPhone(typed); setCountry(next.country); setNational(next.national); emit(next.country, next.national); return; }
        const digits = typed.replace(/\D/g, "").slice(0, country.dial === "1" ? 10 : 13);
        setNational(digits); emit(country, digits);
      }}
    />
  </div>;
}
