"use client";

/* La hoja del contrato, llenándose (22-11-2026). El dueño quiere «un sistema de autocompletado de contrato para que
   al usuario se le haga rápido y fácil»: mientras la persona contesta en el asistente, ve su contrato tomar forma,
   renglón a renglón: el servicio, su nombre, su contacto, su dirección, su plan, su código y su firma. Cada renglón
   que se llena se escribe solo y gana su check; al final, el sello.
   Lo que muestra es lo que la persona acaba de escribir, en su pantalla: no sale de ahí. En la sección de la portada
   se usa con datos de EJEMPLO (y lo dice). */
import type { CSSProperties } from "react";
import type { ContractSnapshot } from "../contract/ContractCheckout";
import c from "./ContractSheet.module.css";

export type SheetData = Pick<ContractSnapshot, "stage" | "firstName" | "lastName" | "email" | "phone" | "city" | "state" | "plan" | "caseNumber">;
const Tick = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** The lines of the sheet and what each holds so far. */
export function sheetRows(service: string, data: SheetData | null) {
  const name = [data?.firstName, data?.lastName].filter(Boolean).join(" ");
  const contact = [data?.email, data?.phone].filter(Boolean).join(" · ");
  const address = [data?.city, data?.state].filter(Boolean).join(", ");
  const coded = data?.stage === "done", sent = data?.stage === "code";
  return [
    { label: "Servicio", value: service, done: true },
    { label: "A nombre de", value: name, done: Boolean(data?.firstName && data.lastName) },
    { label: "Contacto", value: contact, done: Boolean(data?.email && data.phone) },
    { label: "Dirección", value: address, done: Boolean(data?.city && data.state) },
    { label: "Plan", value: data?.plan ?? "", done: Boolean(data?.plan) },
    { label: "Código", value: coded ? "Confirmado" : sent ? "Enviado a tu correo" : "", done: coded },
    { label: "Firma", value: coded ? "Lista para firmar" : "", done: false },
  ];
}

export default function ContractSheet({ service, data, example, compact }: { service: string; data: SheetData | null; /** The landing's showpiece: example data, marked as such. */ example?: boolean; /** One line that opens (a phone). */ compact?: boolean }) {
  const rows = sheetRows(service, data), filled = rows.filter(row => row.done).length, signed = data?.stage === "done";
  const body = <>
    <ol className={c.rows}>{rows.map(row => <li key={row.label} data-done={row.done || undefined} data-has={row.value ? "" : undefined}>
      <i aria-hidden="true">{row.done && <Tick />}</i>
      <span className={c.label}>{row.label}</span>
      {/* (The key makes the words write themselves when they arrive.) */}
      <span key={row.value ? "value" : "blank"} className={c.value}>{row.value || <em aria-hidden="true" />}</span>
    </li>)}</ol>
    {signed && <span className={c.seal} aria-hidden="true"><Tick /></span>}
    {data?.caseNumber && <p className={c.caseNumber}>Caso <b>{data.caseNumber}</b></p>}
  </>;
  const head = <><span className={c.title}><strong>Tu contrato</strong><small>{example ? "Ejemplo" : signed ? "Listo para firmar" : `${filled} de ${rows.length - 1} datos`}</small></span>
    <span className={c.meter} style={{ "--fill": Math.min(1, filled / (rows.length - 1)) } as CSSProperties} aria-hidden="true"><i /></span></>;
  return compact
    ? <details className={c.sheet} data-compact data-signed={signed || undefined}><summary>{head}<span className={c.chevron} aria-hidden="true" /></summary>{body}</details>
    : <div className={c.sheet} data-signed={signed || undefined} data-example={example || undefined} aria-label={example ? "Ejemplo de un contrato llenándose" : "Tu contrato, con lo que llevas"} role="group"><div className={c.head}>{head}</div>{body}</div>;
}
