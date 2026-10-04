/* ============================================================
   ContyGo · formas de pago (funciones puras, sin React ni red)
   contygo calcula el desglose (GET /catalog → plans[].paymentOptions);
   la landing SOLO elige la fila correcta y la escribe. Aquí no hay
   aritmética de dinero: ni totales, ni cuotas, ni restos.
   Contrato: docs/contygo-contratacion-api.md §«Formas de pago».
   ============================================================ */
import type {
  CatalogPaymentBreakdown, CatalogPaymentOption, CatalogPaymentRow, CatalogPlan, CatalogService, InstallmentOption,
} from "./types";

// ---------------------------------------------------------------- normalizador

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isCents = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isFrequency = (value: unknown): value is "weekly" | "monthly" => value === "weekly" || value === "monthly";

function breakdownOf(value: Record<string, unknown>): CatalogPaymentBreakdown | null {
  const { totalCents, downpaymentCents, installmentCount, installmentsAfterDownpayment, perInstallmentCents, lastInstallmentCents } = value;
  if (!isCents(totalCents) || !isCents(downpaymentCents) || !isCents(perInstallmentCents) || !isCents(lastInstallmentCents)) return null;
  if (!isCents(installmentCount) || installmentCount < 1 || installmentsAfterDownpayment !== installmentCount - 1) return null;
  return { totalCents, downpaymentCents, installmentCount, installmentsAfterDownpayment, perInstallmentCents, lastInstallmentCents };
}

function paymentOptionOf(value: unknown): CatalogPaymentOption | null {
  if (!isObject(value)) return null;
  const base = breakdownOf(value);
  const id = value.installmentOptionId;
  if (!base || !(id === null || (typeof id === "string" && id)) || typeof value.isDefault !== "boolean" || !isFrequency(value.frequency)) return null;
  const rows: CatalogPaymentRow[] = [];
  if (Array.isArray(value.byExtraParties)) {
    for (const raw of value.byExtraParties) {
      const row = isObject(raw) ? breakdownOf(raw) : null;
      const count = isObject(raw) ? raw.extraPartyCount : null;
      if (row && isCents(count) && count >= 1) rows.push({ ...row, extraPartyCount: count });
    }
  }
  return { ...base, installmentOptionId: id, isDefault: value.isDefault, frequency: value.frequency, ...(rows.length ? { byExtraParties: rows } : {}) };
}

function installmentOptionOf(value: unknown): InstallmentOption | null {
  if (!isObject(value) || typeof value.id !== "string" || !value.id) return null;
  if (!isCents(value.installmentCount) || value.installmentCount < 1 || !isFrequency(value.frequency)) return null;
  if (!(value.downpaymentCents === null || isCents(value.downpaymentCents))) return null;
  return { id: value.id, installmentCount: value.installmentCount, downpaymentCents: value.downpaymentCents, frequency: value.frequency };
}

function list<T>(value: unknown, convert: (item: unknown) => T | null): T[] {
  return Array.isArray(value) ? value.map(convert).filter((item): item is T => item !== null) : [];
}

/** Un paquete con las listas siempre presentes: opciones inválidas fuera, arrays por defecto [], paymentOptions validadas. */
export function normalizePlan(value: unknown): CatalogPlan | null {
  if (!isObject(value) || typeof value.id !== "string" || !value.id) return null;
  const extra = value.extraPartyPriceCents;
  return {
    ...(value as unknown as CatalogPlan),
    installmentOptions: list(value.installmentOptions, installmentOptionOf),
    extraPartyPriceCents: isCents(extra) ? extra : 0,
    paymentOptions: list(value.paymentOptions, paymentOptionOf),
  };
}

/** Valida el catálogo ANTES de cachearlo: un paquete sin arrays ya no tumba /servicio ni el checkout. */
export function normalizeCatalog(services: unknown[]): CatalogService[] {
  const out: CatalogService[] = [];
  for (const raw of services) {
    if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.slug !== "string") continue;
    out.push({
      ...(raw as unknown as CatalogService),
      plans: list(raw.plans, normalizePlan),
      eligibilityQuestions: Array.isArray(raw.eligibilityQuestions) ? raw.eligibilityQuestions : [],
      partyRoles: Array.isArray(raw.partyRoles) ? raw.partyRoles : [],
    });
  }
  return out;
}

// ---------------------------------------------------------------- elección

type WithPayments = { paymentOptions?: CatalogPaymentOption[] };

/** Las formas de pago publicadas de un paquete ([] en una API antigua). */
export const paymentOptionsOf = (plan: WithPayments | null | undefined): CatalogPaymentOption[] => (Array.isArray(plan?.paymentOptions) ? plan.paymentOptions : []);

/** La fila de números para k personas adicionales: k=0 → los base de la opción; k>0 → su fila; sin fila → null. */
export function breakdownFor(option: CatalogPaymentOption, extraParties: number): CatalogPaymentBreakdown | null {
  if (!Number.isInteger(extraParties) || extraParties < 0) return null;
  if (extraParties === 0) return option;
  return option.byExtraParties?.find(row => row.extraPartyCount === extraParties) ?? null;
}

/**
 * Lo que la ficha muestra para k personas. Con precio por persona adicional = 0 no hay filas (contygo las omite) y los números
 * base valen para cualquier k. Con precio > 0 y sin fila (k > filas) → null: se dice que el contrato traerá el plan exacto.
 */
export function breakdownForPlan(plan: Pick<CatalogPlan, "extraPartyPriceCents">, option: CatalogPaymentOption, extraParties: number): CatalogPaymentBreakdown | null {
  if (!(plan.extraPartyPriceCents > 0)) return option;
  return breakdownFor(option, extraParties);
}

/** La opción preseleccionada: la isDefault; si ninguna, la primera; sin opciones, null. */
export function defaultPaymentOption(plan: WithPayments | null | undefined): CatalogPaymentOption | null {
  const options = paymentOptionsOf(plan);
  return options.find(option => option.isDefault) ?? options[0] ?? null;
}

/** El valor de la ficha (form.installmentId) de una opción: su id, o "" cuando es el plan propio del paquete (id null). */
export const selectionOf = (option: CatalogPaymentOption | null | undefined): string => option?.installmentOptionId ?? "";

/** La opción que corresponde al valor guardado en la ficha, o null si ya no existe. */
export function optionForSelection(plan: WithPayments | null | undefined, selection: string): CatalogPaymentOption | null {
  return paymentOptionsOf(plan).find(option => selectionOf(option) === selection) ?? null;
}

/** El cuerpo de la petición lleva installmentOptionId SOLO si la opción elegida tiene id (null ⇒ se omite; null es un 400). */
export function installmentIdForRequest(plan: WithPayments | null | undefined, selection: string): string | undefined {
  return optionForSelection(plan, selection)?.installmentOptionId ?? undefined;
}

/** Un borrador restaurado: paquete inválido → el primero; opción inválida o ausente → la por defecto; id null → "". */
export function reconcileSelection(plans: (WithPayments & { id: string })[], planId: string, installmentId: string): { planId: string; installmentId: string } {
  const found = plans.find(item => item.id === planId);
  const plan = found ?? plans[0];
  if (!plan) return { planId: "", installmentId: "" };
  // The option belongs to the package it was chosen in: a package that no longer exists takes its option with it.
  const chosen = (found ? optionForSelection(plan, installmentId) : null) ?? defaultPaymentOption(plan);
  return { planId: plan.id, installmentId: selectionOf(chosen) };
}

// ---------------------------------------------------------------- texto

const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Centavos → «$500» o «$416.67»: sin decimales si es exacto, con dos si no (nunca redondea una cuota). */
export const formatMoney = (value: number) => (value % 100 === 0 ? wholeDollars : withCents).format(value / 100);

export interface PaymentLabel {
  /** «Pago único» o «Cuota inicial $500». */
  title: string;
  /** «Total $1,500» o «luego 5 pagos mensuales de $400, el último de $401». */
  detail: string;
  /** Todo en una línea, para el resumen. */
  line: string;
}

/** «1 pago mensual» / «5 pagos semanales». */
function paymentsPhrase(count: number, frequency: "weekly" | "monthly") {
  const noun = frequency === "weekly" ? (count === 1 ? "pago semanal" : "pagos semanales") : count === 1 ? "pago mensual" : "pagos mensuales";
  return `${count} ${noun}`;
}

export function paymentLabel(row: CatalogPaymentBreakdown, frequency: "weekly" | "monthly"): PaymentLabel {
  if (row.installmentCount === 1) {
    const total = formatMoney(row.totalCents);
    return { title: "Pago único", detail: `Total ${total}`, line: `Pago único de ${total}` };
  }
  const title = `Cuota inicial ${formatMoney(row.downpaymentCents)}`;
  const last = row.lastInstallmentCents !== row.perInstallmentCents ? `, el último de ${formatMoney(row.lastInstallmentCents)}` : "";
  const detail = `luego ${paymentsPhrase(row.installmentsAfterDownpayment, frequency)} de ${formatMoney(row.perInstallmentCents)}${last}`;
  return { title, detail, line: `${title}, ${detail}` };
}

/** La forma de la opción SIN dinero (cuando no hay fila para las personas actuales): «Pago único» / «Cuota inicial y 5 pagos mensuales». */
export function paymentShape(option: Pick<CatalogPaymentOption, "installmentCount" | "installmentsAfterDownpayment" | "frequency">): string {
  if (option.installmentCount === 1) return "Pago único";
  return `Cuota inicial y ${paymentsPhrase(option.installmentsAfterDownpayment, option.frequency)}`;
}

/** «Incluye 2 personas adicionales» (solo si hay personas adicionales con precio). */
export function extraPartiesNote(extraParties: number, extraPartyPriceCents: number): string | null {
  if (!(extraParties > 0) || !(extraPartyPriceCents > 0)) return null;
  return `Incluye ${extraParties} ${extraParties === 1 ? "persona adicional" : "personas adicionales"}`;
}

export const PAYMENT_NOTE_NO_OPTIONS = "El plan de pagos aparece en tu contrato antes de firmar.";
export const PAYMENT_NOTE_NO_ROW = "Tu contrato mostrará tu plan de pagos exacto.";
