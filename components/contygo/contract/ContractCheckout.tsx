"use client";

/* Ficha de contratación dentro del recorrido (rediseño 28-09-2026: paso a paso y guiada).
   Una pregunta por pantalla, letra grande y botones grandes: la usan personas de 40 a 60 años que
   usan poco la tecnología. En cada paso la guía por voz dice qué va y va iluminando el campo que
   nombra (frases fijas, grabadas, sin datos de la persona). Al final, un resumen para revisar,
   la casilla de aceptación y el CAPTCHA → «Enviar mi código» → código → firma.
   Sin base de datos (guía §2 bis): este navegador guarda el flujo en sessionStorage (la ficha, el
   verificationId y el cuerpo exacto de la 1.ª llamada) y lo borra al terminar; la Idempotency-Key de
   cada intento vive en memoria. La clave de contygo solo está en el servidor (/api/contratar/*) y la
   URL de firma solo existe en memoria, para el botón. */
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { ContygoService } from "@/lib/contygo-catalog";
import { US_STATES } from "@/lib/agent/visa-intake";
import { publicRef, text, validateContractForm, PHONE_US_MESSAGE, type FieldErrors } from "@/lib/contygo-api/checkout";
import { outcomeMessage, readResend, serviceAlreadyLiveMessage, whatsappHelpMessage, type ScreenOutcome } from "@/lib/contygo-api/messages";
import { waLink } from "@/lib/config";
import type { PublicServiceView } from "@/lib/contygo-api/catalog";
import type { AnswerValue } from "@/lib/contygo-api/types";
import {
  clearDraft, newExternalRef, newIdempotencyKey, pageAttribution, readContract, readDraft, saveContract, saveDraft,
  type DraftForm, type DraftPerson, type SentVerification,
} from "@/lib/contygo-api/browser";
import type { GuideLineId } from "@/lib/agent/guide-scripts";
import { useVisaVoice } from "../juvenil/useVisaVoice";
import type { ClosingVoice } from "../juvenil/closingSpeech";
import { useGuide } from "../guide/useGuide";
import GuideCaption from "../guide/GuideCaption";
import PhoneField, { COUNTRIES, splitPhone } from "../guide/PhoneField";
import s from "./ContractCheckout.module.css";

type Terms = { version: string; es: string; en: string };
type ServiceData = { service: PublicServiceView | null; checkoutEnabled?: boolean; reason?: string; terms: Terms; captchaSiteKey: string | null };
/** The same data once the service is known to be contractable. */
type ReadyData = Omit<ServiceData, "service"> & { service: PublicServiceView };
type Person = DraftPerson;
type Notice = { title: string; detail?: string; tone: "info" | "error" | "success" };
type Result = { clientCreated: boolean; caseNumber: string; signingUrl: string | null; token: string | null; serviceAlreadyLive: string | null; firstName: string };
type Stage = "loading" | "form" | "code" | "done" | "blocked" | "failed";
type ApiOutcome = ScreenOutcome & {
  errors?: FieldErrors; maskedEmail?: string; expiresAt?: string | null; caseNumber?: string; signingUrl?: string; token?: string;
  verificationId?: string; body?: SentVerification["body"]; ticket?: string; role?: string | null; retryAfter?: number | null; ref?: string; code?: string; clientCreated?: boolean; firstName?: string;
};
/** The key of an attempt that may be repeated as it is after a cut: same key, same body (guía §8). */
type Pending = { op: "start"; key: string; fingerprint: string } | { op: "confirm"; key: string; code: string; verificationId: string };
type Step = "name" | "contact" | "address" | "people" | "plan" | "review";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const cents = (value: number) => money.format(value / 100);
/** The contract phone is US only (+1). A value that is not +1 (the reveal phone may be international) is not carried over. */
const isUsPhone = (value: string) => /^\+1\d{0,10}$/.test(value.trim());

/** Each step: what it asks, which validator errors belong to it and what the guide says there. */
const STEPS: Record<Step, { label: string; title: string; lead?: string; guide: GuideLineId; owns: (key: string) => boolean }> = {
  name: { label: "Tu nombre", title: "¿Cómo te llamas?", lead: "Escríbelo tal como aparece en tus documentos.", guide: "contractName", owns: key => ["firstName", "middleName", "lastName"].includes(key) },
  contact: { label: "Contacto", title: "¿Cómo te escribimos?", lead: "A tu correo llega un código para confirmar que eres tú.", guide: "contractContact", owns: key => key === "email" || key === "phone" },
  address: { label: "Dirección", title: "¿Dónde vives?", lead: "La dirección donde recibes tu correspondencia.", guide: "contractAddress", owns: key => key.startsWith("address.") },
  people: { label: "Personas", title: "Personas de tu expediente", lead: "Sus nombres como aparecen en sus documentos.", guide: "contractPeople", owns: key => key.startsWith("parties") || key.startsWith("role.") },
  plan: { label: "Paquete", title: "Tu paquete", lead: "Precio publicado. Las tasas del gobierno, cuando aplican, van aparte.", guide: "contractPlan", owns: key => key === "servicePlanId" || key === "installmentOptionId" },
  review: { label: "Revisar", title: "Revisa y confirma", lead: "Si algo no está bien, toca «Cambiar».", guide: "contractReview", owns: key => key === "consent" },
};

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, options: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void } }
}

/** Cloudflare Turnstile en modo explícito. Cada token vale una vez: se reinicia tras cada envío.
 *  `slot` names the place where the widget lives (review step, code screen): a new place, a new widget. */
function useTurnstile(siteKey: string | null, slot: string) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!siteKey || !element || !slot) return;
    let cancelled = false;
    const theme = element.closest("[data-contygo-theme]")?.getAttribute("data-contygo-theme") === "light" ? "light" : "dark";
    const mount = () => {
      if (cancelled || widget.current || !window.turnstile) return;
      widget.current = window.turnstile.render(element, {
        sitekey: siteKey, action: "contratar", theme, size: "flexible", language: "es",
        callback: (value: string) => setToken(value),
        "expired-callback": () => setToken(null),
        "error-callback": () => setToken(null),
      });
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true; script.defer = true; script.dataset.turnstile = "true";
      document.head.appendChild(script);
    }
    if (window.turnstile) mount(); else script.addEventListener("load", mount, { once: true });
    return () => {
      cancelled = true;
      script?.removeEventListener("load", mount);
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, slot]);
  const reset = useCallback(() => { setToken(null); if (widget.current && window.turnstile) window.turnstile.reset(widget.current); }, []);
  // Sin clave de sitio (desarrollo), el servidor no exige CAPTCHA.
  return { container, token: siteKey ? token : "dev", reset, required: Boolean(siteKey) };
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const data = await response.json().catch(() => null) as ({ ok?: boolean; error?: string; outcome?: ApiOutcome } & Record<string, unknown>) | null;
  const header = Number(response.headers.get("Retry-After"));
  return { status: response.status, data, retryAfter: Number.isFinite(header) && header > 0 ? header : null };
}

/** +13055550199 → 🇺🇸 +1 (305) 555-0199, for the summary. */
function phoneLabel(value: string) {
  const { country, national } = splitPhone(value);
  const shown = country.dial === "1" && national.length === 10 ? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}` : national.replace(/(\d{3,4})(?=\d)/g, "$1 ");
  return `${(COUNTRIES.find(c => c.dial === country.dial) ?? country).flag} +${country.dial} ${shown}`;
}

type Props = {
  service: ContygoService;
  /** From the journey: its conversation lives in this browser, not on the server (guía §2 bis). */
  displayName?: string;
  phone?: string;
  answers?: Record<string, AnswerValue>;
  eligible?: boolean | null;
  externalRef?: string;
  voice?: ClosingVoice;
};

export default function ContractCheckout({ service, displayName = "", phone = "", answers, eligible = null, externalRef, voice: sharedVoice }: Props) {
  const ownVoice = useVisaVoice();
  const guide = useGuide(sharedVoice ?? ownVoice);
  const [data, setData] = useState<ReadyData | null>(null);
  const [phoneHint, setPhoneHint] = useState(false);
  /** The short reference of the web attempt the server named (WEB-XXXXXX), for the WhatsApp message. */
  const [helpRef, setHelpRef] = useState<string | null>(null);
  /** The blocked screen offers «Reintentar» when what failed may pass (a cut, a hiccup). */
  const [retryable, setRetryable] = useState(false);
  const [stage, setStage] = useState<Stage>("loading");
  const [step, setStep] = useState<Step>("name");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pendingRestart, setPendingRestart] = useState(false);
  const [form, setForm] = useState<DraftForm>({ firstName: "", middleName: "", lastName: "", email: "", phone: "", line1: "", apartment: "", city: "", state: "", zip: "", locale: "es", planId: "", installmentId: "" });
  const [persons, setPersons] = useState<Person[]>([]);
  const [consent, setConsent] = useState<{ accepted: boolean; at: string }>({ accepted: false, at: "" });
  const [sent, setSent] = useState<SentVerification | null>(null);
  /** While the flow runs, this tab keeps it in sessionStorage; at the end it forgets it. */
  const [keeping, setKeeping] = useState(false);
  const reference = useRef("");
  const pending = useRef<Pending | null>(null);
  const resendKey = useRef<string | null>(null);
  const journey = useRef({ displayName, phone, answers, eligible, externalRef });
  journey.current = { displayName, phone, answers, eligible, externalRef };
  const personKey = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const uid = useId();
  const captcha = useTurnstile(data?.captchaSiteKey ?? null, stage === "code" ? "code" : stage === "form" && step === "review" ? "review" : "");

  const load = useCallback(async () => {
    setStage("loading"); setNotice(null);
    try {
      const { status, data: body } = await postJson("/api/contratar/servicio", { serviceId: service.id });
      if (status !== 200 || !body?.ok) throw new Error(body?.error ?? String(status));
      const answer = body as unknown as ServiceData;
      const from = journey.current;
      reference.current = from.externalRef || reference.current;
      // Kill switch (CONTYGO_CHECKOUT_ENABLED=0) or a catalog the key cannot read: WhatsApp from the first moment.
      if (answer.checkoutEnabled === false || !answer.service) {
        setRetryable(false); setStage("blocked"); setNotice({ tone: "info", ...outcomeMessage({ step: "UNAVAILABLE_ONLINE" }) });
        return;
      }
      const next: ReadyData = { ...answer, service: answer.service };
      setData(next);
      // A contract already made in this tab goes straight to its screen (the link can be resent).
      const saved = readContract();
      if (saved?.serviceId === service.id) {
        setResult({ clientCreated: saved.clientCreated, caseNumber: saved.caseNumber, signingUrl: null, token: saved.token, serviceAlreadyLive: null, firstName: "" });
        setStage("done"); setNotice({ tone: "info", ...outcomeMessage({ step: "ALREADY_DONE", caseNumber: saved.caseNumber }) });
        return;
      }
      if (from.eligible === false) { setRetryable(false); setStage("blocked"); setNotice({ tone: "info", ...outcomeMessage({ step: "NOT_ELIGIBLE" }) }); return; }
      // A question this web cannot answer (a kind it does not know) is never guessed: WhatsApp.
      if (next.service.questions.some(question => question.kind === "unknown")) { setRetryable(false); setStage("blocked"); setNotice({ tone: "info", ...outcomeMessage({ step: "UNAVAILABLE_ONLINE" }) }); return; }
      if (!next.service.questions.every(question => from.answers?.[question.id] !== undefined)) { setRetryable(false); setStage("blocked"); setNotice({ tone: "info", ...outcomeMessage({ step: "NEEDS_ANSWERS" }) }); return; }

      const draft = readDraft();
      const mine = draft?.serviceId === service.id ? draft : null;
      reference.current = from.externalRef || mine?.externalRef || reference.current || newExternalRef();
      if (mine) {
        // A draft from before the US-only phone may carry a foreign number: it does not go in the contract.
        const usable = isUsPhone(mine.form.phone) ? mine.form.phone : "";
        if (mine.form.phone && !usable) setPhoneHint(true);
        setForm({ ...mine.form, phone: usable }); setPersons(mine.persons); setConsent(mine.consent);
        personKey.current = Math.max(personKey.current, ...mine.persons.map(person => person.key));
      } else {
        const plan = next.service.plans[0];
        const name = from.displayName.trim();
        // The reveal phone may be international; the contract needs +1. If it is not, the field starts empty with the hint.
        const prefill = from.phone && isUsPhone(from.phone) ? from.phone : "";
        if (from.phone?.trim() && !prefill) setPhoneHint(true);
        setForm(current => ({ ...current, planId: current.planId || plan?.id || "", firstName: current.firstName || name.split(" ")[0] || "", phone: current.phone || prefill }));
        setPersons(current => current.length ? current : next.service.partyRoles.filter(role => role.isRequired).map(role => ({ key: ++personKey.current, role: role.roleKey, firstName: "", middleName: "", lastName: "", dateOfBirth: "" })));
      }
      setKeeping(true);
      // A code already sent in this same conversation is still waiting on its screen.
      if (mine?.sent && mine.externalRef === reference.current) {
        setSent(mine.sent); setMaskedEmail(mine.sent.maskedEmail); setStage("code");
        setNotice({ tone: "info", ...outcomeMessage({ step: "ASK_CODE", maskedEmail: mine.sent.maskedEmail }) });
      } else setStage("form");
    } catch {
      setStage("failed");
      setNotice({ tone: "error", title: "No pudimos cargar los datos de tu servicio.", detail: "Revisa tu conexión e inténtalo de nuevo." });
    }
  }, [service.id]);
  useEffect(() => { void load(); }, [load]);

  // Guía §2 bis: while the flow runs this tab remembers it, so a refresh or a trip back to the video
  // keeps the form and a code already sent. sessionStorage only, never localStorage.
  useEffect(() => {
    if (!keeping || (stage !== "form" && stage !== "code")) return;
    saveDraft({ v: 1, serviceId: service.id, externalRef: reference.current, form, persons, consent, ...(sent ? { sent } : {}) });
  }, [keeping, stage, service.id, form, persons, consent, sent]);
  /** The flow is over: this browser forgets the form, the envelope and the body. */
  function finish() { setKeeping(false); setSent(null); clearDraft(); }

  const roles = useMemo(() => data?.service.partyRoles ?? [], [data]);
  const steps = useMemo<Step[]>(() => ["name", "contact", "address", ...(roles.length ? ["people" as const] : []), "plan", "review"], [roles.length]);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const plan = data?.service.plans.find(item => item.id === form.planId) ?? data?.service.plans[0];
  const input = useMemo(() => ({
    firstName: form.firstName, middleName: form.middleName, lastName: form.lastName, email: form.email, phone: form.phone,
    address: { line1: form.line1, apartment: form.apartment, city: form.city, state: form.state, zip: form.zip },
    locale: form.locale, servicePlanId: form.planId, ...(form.installmentId ? { installmentOptionId: form.installmentId } : {}),
    parties: persons.map(({ role, firstName, middleName, lastName, dateOfBirth }) => ({ role, firstName, ...(middleName.trim() ? { middleName } : {}), lastName, ...(dateOfBirth ? { dateOfBirth } : {}) })),
    consent,
  }), [form, persons, consent]);

  // The guide speaks when a step (or the code / done screen) appears, once the screen has settled.
  const spokenFor = useRef("");
  const guideRef = useRef(guide); guideRef.current = guide;
  useEffect(() => {
    const key = stage === "form" ? `form:${step}` : stage === "code" ? "code" : stage === "done" ? `done:${Boolean(result?.signingUrl)}` : "";
    if (!key || spokenFor.current === key) return;
    spokenFor.current = key;
    const line: GuideLineId = stage === "form" ? STEPS[step].guide : stage === "code" ? "contractCode" : result?.signingUrl ? "contractDone" : "contractDoneNoLink";
    const timer = window.setTimeout(() => guideRef.current.play(line), 450);
    return () => window.clearTimeout(timer);
  }, [stage, step, result?.signingUrl]);
  useEffect(() => { guideRef.current.prefetch(["contractName", "contractContact", "contractAddress", "contractPlan", "contractReview", "contractCode"]); }, []);
  useEffect(() => () => guideRef.current.stop(), []);

  function show(outcome: ApiOutcome) {
    const roleLabel = outcome.step === "INVALID_PARTIES" ? text(roles.find(role => role.roleKey === outcome.role)?.label) : undefined;
    const message = outcomeMessage(outcome, roleLabel);
    const tone: Notice["tone"] = ["WRONG_CODE", "ERROR", "INVALID", "INVALID_PARTIES", "RETRY_LATER"].includes(outcome.step) ? "error" : "info";
    setNotice({ tone, ...message });
  }

  /** Go to a step and put the person on its first field (or its first error). */
  function goTo(next: Step, withErrors?: FieldErrors) {
    setStep(next);
    window.requestAnimationFrame(() => {
      body.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      const target = withErrors && Object.keys(withErrors).length
        ? root.current?.querySelector<HTMLElement>("[data-invalid=true] input, [data-invalid=true] select")
        : root.current?.querySelector<HTMLElement>("[data-step-body] input:not([type=radio]):not([type=checkbox]), [data-step-body] select");
      target?.focus({ preventScroll: true });
    });
  }
  /** Server-side field errors send the person back to the first step that has one. */
  function reopen(found: FieldErrors) {
    const first = steps.find(item => Object.keys(found).some(key => STEPS[item].owns(key))) ?? "review";
    setErrors(found); setStage("form"); goTo(first, found);
  }

  function handle(status: number, body: Awaited<ReturnType<typeof postJson>>["data"], retryAfter: number | null = null) {
    const outcome = body?.outcome;
    // contygo answered for good: the next attempt gets a new key. Only «busy» (IN_PROGRESS, 503, a cut)
    // lets the same key and body be repeated as they are (guía §8).
    if (outcome && !(outcome.step === "RETRY_LATER" && outcome.reason === "busy")) pending.current = null;
    if (status === 429) { show({ step: "RETRY_LATER", reason: "destination", retryAfter }); return; }
    if (status === 403 && body?.error?.startsWith("captcha")) { setNotice({ tone: "error", title: "No pudimos confirmar que no eres un robot.", detail: "Espera a que se complete la verificación e inténtalo de nuevo." }); return; }
    // 502, 504, 503 or a page that is not JSON: our own route did not answer. It is «busy»: same key, same body.
    if (!outcome && (status >= 500 || status === 200)) { show({ step: "RETRY_LATER", reason: "busy" }); return; }
    // Anything else without an outcome (400, 404, 413…): not transient, but the person can still try again or write.
    if (status !== 200 || !outcome) { pending.current = null; setRetryable(true); setStage("blocked"); show({ step: "ERROR" }); return; }
    if (outcome.ref) setHelpRef(outcome.ref);
    switch (outcome.step) {
      case "INVALID":
        if (outcome.errors?.code) { setErrors(outcome.errors); setNotice({ tone: "error", title: outcome.errors.code }); }
        else { show(outcome); reopen(outcome.errors ?? {}); }
        return;
      case "ASK_CODE":
        if (!outcome.body || !outcome.ticket || !outcome.verificationId) { finish(); setRetryable(false); setStage("blocked"); show({ step: "ERROR" }); return; }
        // Guía §4, paso 3: the UI keeps the verificationId and the exact body; the server keeps nothing.
        setSent({ body: outcome.body, ticket: outcome.ticket, verificationId: outcome.verificationId, maskedEmail: outcome.maskedEmail ?? "", expiresAt: outcome.expiresAt ?? null });
        setMaskedEmail(outcome.maskedEmail ?? ""); setCode(""); setStage("code"); show(outcome);
        window.requestAnimationFrame(() => codeInput.current?.focus({ preventScroll: true }));
        return;
      case "SIGN": {
        const caseNumber = outcome.caseNumber ?? "", token = outcome.token ?? null;
        // Only the signed token (no personal data) stays, for the «gracias» page. The link stays in memory.
        finish();
        if (token) saveContract({ v: 1, serviceId: service.id, token, caseNumber, clientCreated: outcome.clientCreated });
        setResult({ clientCreated: outcome.clientCreated, caseNumber, signingUrl: outcome.signingUrl ?? null, token, serviceAlreadyLive: outcome.serviceAlreadyLive, firstName: outcome.firstName });
        setStage("done"); setNotice({ tone: "success", ...outcomeMessage(outcome) });
        return;
      }
      case "SIGN_LINK_PENDING": {
        // The case exists but the link did not come back: show the case and offer «Enviarme el enlace» (/reenviar).
        const caseNumber = outcome.caseNumber ?? "", token = outcome.token ?? null;
        finish();
        if (token) saveContract({ v: 1, serviceId: service.id, token, caseNumber, clientCreated: outcome.clientCreated ?? false });
        setResult({ clientCreated: outcome.clientCreated ?? false, caseNumber, signingUrl: null, token, serviceAlreadyLive: null, firstName: outcome.firstName ?? "" });
        setStage("done"); setNotice({ tone: "info", ...outcomeMessage({ step: "SIGN_LINK_PENDING", caseNumber }) });
        return;
      }
      case "WRONG_CODE": setCode(""); show(outcome); return;
      case "RESTART": setSent(null); show(outcome); setStage("code"); setPendingRestart(true); return;
      case "INVALID_PARTIES": setSent(null); show(outcome); setStage("form"); goTo(steps.includes("people") ? "people" : "review"); return;
      case "RETRY_LATER": show(outcome); return;
      // ERROR keeps the form (and a code already sent) so «Reintentar» comes back to where the person was.
      case "ERROR": setRetryable(true); setStage("blocked"); show(outcome); return;
      default: finish(); setRetryable(false); setStage("blocked"); show(outcome); // HUMAN, NOT_ELIGIBLE, UNAVAILABLE, UNAVAILABLE_ONLINE, NEEDS_ANSWERS
    }
  }

  /** «Continuar»: only this step's answers are checked; the rest waits for its own step. */
  function next() {
    if (!data) return;
    const check = validateContractForm(input, data.service);
    const mine = check.ok ? {} : Object.fromEntries(Object.entries(check.errors).filter(([key]) => STEPS[step].owns(key)));
    if (Object.keys(mine).length) {
      setErrors(current => ({ ...current, ...mine }));
      setNotice({ tone: "error", title: "Revisa lo que está marcado en rojo.", detail: Object.values(mine)[0] });
      window.requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[data-invalid=true] input, [data-invalid=true] select")?.focus());
      return;
    }
    setNotice(null);
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !STEPS[step].owns(key))));
    const following = steps[stepIndex + 1];
    if (following) goTo(following);
  }
  function back() { setNotice(null); const previous = steps[stepIndex - 1]; if (previous) goTo(previous); }

  async function start() {
    if (!data || busy) return;
    const check = validateContractForm(input, data.service);
    if (!check.ok) { show({ step: "INVALID" }); reopen(check.errors); return; }
    if (!captcha.token) { setNotice({ tone: "info", title: "Un momento: estamos confirmando que no eres un robot.", detail: "Cuando termine la verificación, toca «Enviar mi código» otra vez." }); return; }
    const answersNow = journey.current.answers ?? {};
    // After a cut, the same form and answers go again with the same key: contygo answers the same
    // and nothing is sent twice. Anything else is a new attempt with a new key.
    const fingerprint = JSON.stringify([input, answersNow]);
    const last = pending.current;
    const key = last?.op === "start" && last.fingerprint === fingerprint ? last.key : newIdempotencyKey();
    pending.current = { op: "start", key, fingerprint };
    setErrors({}); setBusy(true);
    try {
      const { status, data: body, retryAfter } = await postJson("/api/contratar/iniciar", {
        serviceId: service.id, externalRef: reference.current, form: input, answers: answersNow, attribution: pageAttribution(), idempotencyKey: key, captchaToken: captcha.token,
      });
      handle(status, body, retryAfter);
    } catch { show({ step: "RETRY_LATER", reason: "busy" }); }
    finally { captcha.reset(); setBusy(false); }
  }

  // Código caducado: se pide uno nuevo en cuanto hay un token de CAPTCHA fresco.
  const startRef = useRef(start); startRef.current = start;
  useEffect(() => {
    if (!pendingRestart || !captcha.token || busy) return;
    setPendingRestart(false);
    void startRef.current();
  }, [pendingRestart, captcha.token, busy]);

  async function confirm() {
    if (busy) return;
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 6) { setNotice({ tone: "error", title: "El código tiene 6 números." }); return; }
    if (!sent) { show({ step: "RESTART" }); setPendingRestart(true); return; }
    // The same code again after a cut reuses its key; a new code gets a new one (guía §4, paso 4).
    const last = pending.current;
    const key = last?.op === "confirm" && last.code === clean && last.verificationId === sent.verificationId ? last.key : newIdempotencyKey();
    pending.current = { op: "confirm", key, code: clean, verificationId: sent.verificationId };
    setBusy(true);
    try {
      const { status, data: body, retryAfter } = await postJson("/api/contratar/confirmar", { body: sent.body, verificationId: sent.verificationId, ticket: sent.ticket, code: clean, idempotencyKey: key });
      handle(status, body, retryAfter);
    } catch { show({ step: "RETRY_LATER", reason: "busy" }); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (busy || !result?.token) return;
    // One key per resend; a cut repeats it (guía §6).
    const key = resendKey.current ?? newIdempotencyKey();
    resendKey.current = key;
    setBusy(true);
    try {
      const { status, data: body, retryAfter } = await postJson("/api/contratar/reenviar", { token: result.token, idempotencyKey: key });
      const reading = readResend(status, body?.outcome as Parameters<typeof readResend>[1], retryAfter);
      // Busy / in progress / a cut: the next try repeats the same key; anything else gets a new one.
      if (reading.kind === "link" || !reading.keepKey) resendKey.current = null;
      if (reading.kind === "link") {
        setResult(current => current ? { ...current, signingUrl: reading.signingUrl } : current);
        setNotice({ tone: "success", title: "Listo: te lo enviamos también a tu correo y a tu app de ContyGo." });
      } else setNotice({ tone: reading.tone, title: reading.title, ...(reading.detail ? { detail: reading.detail } : {}) });
    } catch { show({ step: "RETRY_LATER", reason: "busy" }); }
    finally { setBusy(false); }
  }

  // Cada campo de la ficha y la clave con la que el validador nombra su error.
  const errorKey: Partial<Record<keyof typeof form, string>> = { line1: "address.line1", apartment: "address.apartment", city: "address.city", state: "address.state", zip: "address.zip" };
  const clear = (key: string) => setErrors(current => { if (!(key in current)) return current; const next = { ...current }; delete next[key]; return next; });
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setForm(current => ({ ...current, [key]: value }));
    clear(errorKey[key] ?? key);
  };
  const setPerson = (key: number, patch: Partial<Person>) => setPersons(current => current.map(person => person.key === key ? { ...person, ...patch } : person));
  /** A large, labelled field; `guide` names it for the voice guide's spotlight. */
  const field = (name: string, label: string, control: ReactNode, options: { hint?: string; guide?: string; wide?: boolean } = {}) =>
    <label className={s.field} data-invalid={Boolean(errors[name])} data-guided={(options.guide && guide.target === options.guide) || undefined} data-wide={options.wide || undefined}>
      <span className={s.label}>{label}</span>{control}
      {errors[name] ? <small className={s.error} role="alert">{errors[name]}</small> : options.hint ? <small className={s.hint}>{options.hint}</small> : null}
    </label>;
  const whatsapp = waLink(whatsappHelpMessage(service.name, helpRef ?? (reference.current ? publicRef(reference.current) : null)));
  /** «Reintentar» from the blocked screen: back to the code (if one was sent) or to the last step of the form. */
  function retryFromBlocked() {
    setNotice(null); setRetryable(false);
    if (sent) { setStage("code"); return; }
    if (!data) { void load(); return; }
    setStage("form"); goTo("review");
  }
  const stateName = US_STATES.find(item => item.code === form.state)?.name ?? (form.state === "PR" ? "Puerto Rico" : form.state);
  const summary: { step: Step; title: string; lines: string[] }[] = [
    { step: "name", title: "Tu nombre", lines: [[form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ")] },
    { step: "contact", title: "Contacto", lines: [form.email, form.phone ? phoneLabel(form.phone) : ""] },
    { step: "address", title: "Dirección", lines: [[form.line1, form.apartment].filter(Boolean).join(", "), [form.city, stateName, form.zip].filter(Boolean).join(", ")] },
    ...(roles.length ? [{ step: "people" as const, title: "Personas", lines: persons.map(person => `${text(roles.find(role => role.roleKey === person.role)?.label)}: ${[person.firstName, person.lastName].filter(Boolean).join(" ") || "—"}`) }] : []),
    { step: "plan", title: "Paquete", lines: [plan ? `${text(plan.name)} · ${cents(plan.priceCents)}` : "", form.locale === "es" ? "Contrato y correos en español" : "Contract and emails in English"] },
  ];
  const title = stage === "done" ? "Tu contrato está listo para firmar." : stage === "code" ? "Confirma que eres tú." : stage === "form" ? STEPS[step].title : "Preparemos tu contrato.";

  return <div ref={root} className={s.checkout} data-stage={stage} aria-busy={busy || stage === "loading"}>
    <div className={s.card}>
      <header className={s.head}>
        <span className={s.eyebrow}><span className={s.nucleus} aria-hidden="true"><Image src="/contygo/brand/symbol-light.png" alt="" width={1024} height={1024} sizes="20px" /></span>{service.name} · Tu contrato</span>
        {stage === "form" && <div className={s.progress} aria-label={`Paso ${stepIndex + 1} de ${steps.length}: ${STEPS[step].label}`}>
          <ol>{steps.map((item, index) => <li key={item} data-state={index < stepIndex ? "done" : index === stepIndex ? "current" : "next"}><span>{STEPS[item].label}</span></li>)}</ol>
          <p>Paso {stepIndex + 1} de {steps.length} · <strong>{STEPS[step].label}</strong></p>
        </div>}
        <h3 className={s.title} key={title}>{title}</h3>
        {stage === "form" && STEPS[step].lead && <p className={s.lead}>{STEPS[step].lead}</p>}
      </header>

      {(stage === "form" || stage === "code" || stage === "done") && <GuideCaption guide={guide} />}
      {notice && <div className={s.notice} data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}><strong>{notice.title}</strong>{notice.detail && <span>{notice.detail}</span>}</div>}

      {stage === "loading" && <div className={s.loading} role="status"><i /><i /><i /><span>Preparando tu contrato…</span></div>}
      {stage === "failed" && <div className={s.links}>
        <button type="button" className={s.secondary} onClick={() => void load()}>Reintentar</button>
        <a className={s.secondary} href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
      </div>}

      {stage === "form" && data && <form className={s.form} noValidate onSubmit={event => { event.preventDefault(); if (step === "review") void start(); else next(); }}>
        <div ref={body} className={s.stepBody} data-step-body key={step}>
          {step === "name" && <div className={s.fields}>
            {field("firstName", "Nombre", <input autoComplete="given-name" maxLength={80} value={form.firstName} onChange={set("firstName")} placeholder="Ej.: María" />, { guide: "firstName" })}
            {field("middleName", "Segundo nombre (si tienes)", <input autoComplete="additional-name" maxLength={80} value={form.middleName} onChange={set("middleName")} />, { hint: "Puedes dejarlo vacío." })}
            {field("lastName", "Apellidos", <input autoComplete="family-name" maxLength={120} value={form.lastName} onChange={set("lastName")} placeholder="Ej.: López García" />, { guide: "lastName" })}
          </div>}

          {step === "contact" && <div className={s.fields}>
            {field("email", "Correo electrónico", <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={160} value={form.email} onChange={set("email")} placeholder="nombre@correo.com" />, { hint: "Aquí te llega el código para confirmar.", guide: "email" })}
            <div className={s.field} data-invalid={Boolean(errors.phone)} data-guided={guide.target === "phone" || undefined}>
              <span className={s.label} id={`${uid}-phone`}>Teléfono</span>
              <PhoneField usOnly value={form.phone} onChange={value => { setForm(current => ({ ...current, phone: value })); clear("phone"); setPhoneHint(false); }} invalid={Boolean(errors.phone)} describedBy={`${uid}-phone-help`} />
              {errors.phone ? <small className={s.error} role="alert" id={`${uid}-phone-help`}>{errors.phone}</small> : <small className={s.hint} id={`${uid}-phone-help`}>{phoneHint && !form.phone ? PHONE_US_MESSAGE : "Un teléfono de EE. UU. (+1) para tu cuenta."}</small>}
            </div>
          </div>}

          {step === "address" && <div className={s.fields}>
            {field("address.line1", "Calle y número", <input autoComplete="address-line1" maxLength={200} value={form.line1} onChange={set("line1")} placeholder="Ej.: 1234 NW 7th St" />, { guide: "line1" })}
            {field("address.apartment", "Apartamento (si tienes)", <input autoComplete="address-line2" maxLength={200} value={form.apartment} onChange={set("apartment")} placeholder="Ej.: Apt 5B" />, { hint: "Puedes dejarlo vacío." })}
            {field("address.city", "Ciudad", <input autoComplete="address-level2" maxLength={120} value={form.city} onChange={set("city")} placeholder="Ej.: Miami" />, { guide: "city" })}
            <div className={s.pair}>
              {field("address.state", "Estado", <select autoComplete="address-level1" value={form.state} onChange={set("state")}>
                <option value="">Elige tu estado</option>
                {US_STATES.map(state => <option key={state.code} value={state.code}>{state.name}</option>)}
                <option value="PR">Puerto Rico</option>
              </select>, { guide: "state" })}
              {field("address.zip", "Código postal", <input inputMode="numeric" autoComplete="postal-code" maxLength={5} value={form.zip} onChange={event => set("zip")({ target: { value: event.target.value.replace(/\D/g, "").slice(0, 5) } })} placeholder="33125" />, { guide: "zip" })}
            </div>
          </div>}

          {step === "people" && <div className={s.fields} data-guided-zone={guide.target === "people" || undefined}>
            {roles.map(role => {
              const list = persons.filter(person => person.role === role.roleKey);
              const label = text(role.label);
              return <div key={role.roleKey} className={s.role}>
                <p className={s.roleTitle}>{label}{role.isRequired ? <em>Obligatorio</em> : <em data-optional>Opcional</em>}</p>
                {errors[`role.${role.roleKey}`] && <small className={s.error} role="alert">{errors[`role.${role.roleKey}`]}</small>}
                {list.map(person => {
                  const index = persons.indexOf(person);
                  return <fieldset key={person.key} className={s.person}>
                    <legend>{label}{list.length > 1 ? ` ${list.indexOf(person) + 1}` : ""}</legend>
                    {field(`parties.${index}.firstName`, "Nombre", <input maxLength={80} value={person.firstName} onChange={event => { setPerson(person.key, { firstName: event.target.value }); clear(`parties.${index}.firstName`); }} />)}
                    {field(`parties.${index}.middleName`, "Segundo nombre (si tiene)", <input maxLength={80} value={person.middleName} onChange={event => setPerson(person.key, { middleName: event.target.value })} />)}
                    {field(`parties.${index}.lastName`, "Apellidos", <input maxLength={120} value={person.lastName} onChange={event => { setPerson(person.key, { lastName: event.target.value }); clear(`parties.${index}.lastName`); }} />)}
                    {field(`parties.${index}.dateOfBirth`, "Fecha de nacimiento (si la sabes)", <input type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={person.dateOfBirth} onChange={event => setPerson(person.key, { dateOfBirth: event.target.value })} />)}
                    {!(role.isRequired && list.length === 1) && <button type="button" className={s.linkButton} onClick={() => setPersons(current => current.filter(item => item.key !== person.key))}>Quitar a esta persona</button>}
                  </fieldset>;
                })}
                {(role.cardinality !== "single" || list.length === 0) && <button type="button" className={s.add} onClick={() => setPersons(current => [...current, { key: ++personKey.current, role: role.roleKey, firstName: "", middleName: "", lastName: "", dateOfBirth: "" }])}>+ Añadir {label.toLowerCase()}</button>}
              </div>;
            })}
          </div>}

          {step === "plan" && <div className={s.fields}>
            <div className={s.options} role="radiogroup" aria-label="Tu paquete" data-guided-zone={guide.target === "plan" || undefined}>
              {data.service.plans.map(item => <label key={item.id} className={s.option} data-selected={form.planId === item.id}>
                <input type="radio" name={`${uid}-plan`} checked={form.planId === item.id} onChange={() => setForm(current => ({ ...current, planId: item.id, installmentId: "" }))} />
                <span className={s.optionMark} aria-hidden="true" />
                <span className={s.optionText}>{text(item.name)}{item.extraPartyPriceCents > 0 && <small>+ {cents(item.extraPartyPriceCents)} por persona adicional</small>}</span>
                <strong>{cents(item.priceCents)}</strong>
              </label>)}
            </div>
            {errors.servicePlanId && <small className={s.error} role="alert">{errors.servicePlanId}</small>}
            {plan && plan.installmentOptions.length > 0 ? <div className={s.options} role="radiogroup" aria-label="Cómo prefieres pagar" data-guided-zone={guide.target === "pay" || undefined}>
              <p className={s.groupTitle}>¿Cómo prefieres pagar?</p>
              <label className={s.option} data-selected={!form.installmentId}><input type="radio" name={`${uid}-pay`} checked={!form.installmentId} onChange={() => setForm(current => ({ ...current, installmentId: "" }))} /><span className={s.optionMark} aria-hidden="true" /><span className={s.optionText}>Plan de pagos del paquete</span></label>
              {plan.installmentOptions.map(option => <label key={option.id} className={s.option} data-selected={form.installmentId === option.id}>
                <input type="radio" name={`${uid}-pay`} checked={form.installmentId === option.id} onChange={() => setForm(current => ({ ...current, installmentId: option.id }))} />
                <span className={s.optionMark} aria-hidden="true" />
                <span className={s.optionText}>{option.installmentCount} {option.installmentCount === 1 ? "pago" : option.frequency === "weekly" ? "pagos semanales" : "pagos mensuales"}{option.downpaymentCents !== null && <small>Anticipo de {cents(option.downpaymentCents)}</small>}</span>
              </label>)}
            </div> : <p className={s.note} data-guided-zone={guide.target === "pay" || undefined}>El plan de pagos aparece en tu contrato antes de firmar.</p>}
            {errors.installmentOptionId && <small className={s.error} role="alert">{errors.installmentOptionId}</small>}
            <div className={s.options} role="radiogroup" aria-label="Idioma de tu contrato">
              <p className={s.groupTitle}>Idioma de tu contrato y tus correos</p>
              <div className={s.segmented}>
                {(["es", "en"] as const).map(locale => <label key={locale} data-selected={form.locale === locale}><input type="radio" name={`${uid}-lang`} checked={form.locale === locale} onChange={() => { setForm(current => ({ ...current, locale })); setConsent({ accepted: false, at: "" }); }} />{locale === "es" ? "Español" : "English"}</label>)}
              </div>
            </div>
          </div>}

          {step === "review" && <div className={s.fields}>
            <dl className={s.summary} data-guided-zone={guide.target === "summary" || undefined}>
              {summary.map(item => <div key={item.step} className={s.summaryRow}>
                <dt>{item.title}</dt>
                <dd>{item.lines.filter(Boolean).map((line, index) => <span key={index}>{line}</span>)}</dd>
                <button type="button" className={s.change} onClick={() => goTo(item.step)}>Cambiar</button>
              </div>)}
            </dl>
            <label className={s.consent} data-invalid={Boolean(errors.consent)} data-guided={guide.target === "consent" || undefined}>
              <input type="checkbox" checked={consent.accepted} onChange={event => { setConsent(event.target.checked ? { accepted: true, at: new Date().toISOString() } : { accepted: false, at: "" }); clear("consent"); }} />
              <span className={s.check} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <span lang={form.locale}>{form.locale === "en" ? data.terms.en : data.terms.es} <a href="/terminos" target="_blank" rel="noopener noreferrer">{form.locale === "en" ? "Terms" : "Términos"}</a> · <a href="/privacidad" target="_blank" rel="noopener noreferrer">{form.locale === "en" ? "Privacy" : "Privacidad"}</a></span>
            </label>
            {errors.consent && <small className={s.error} role="alert">{errors.consent}</small>}
            <div ref={captcha.container} className={s.captchaBox} />
            <p className={s.note}>Te enviaremos un código a tu correo para confirmar que eres tú. Firmas en ContyGo solo cuando estés listo.</p>
          </div>}
        </div>

        <nav className={s.stepNav} aria-label="Pasos del contrato">
          {stepIndex > 0 ? <button type="button" className={s.back} onClick={back}><Arrow back />Atrás</button> : <span />}
          {step === "review"
            ? <button type="submit" className={s.primary} disabled={busy} data-guided={guide.target === "submit" || undefined}><span>{busy ? "Enviando…" : "Enviar mi código"}</span><i aria-hidden="true"><Arrow /></i></button>
            : <button type="submit" className={s.primary}><span>Continuar</span><i aria-hidden="true"><Arrow /></i></button>}
        </nav>
      </form>}

      {stage === "code" && <form className={s.form} onSubmit={event => { event.preventDefault(); void confirm(); }}>
        <div className={s.stepBody}>
          <label className={s.codeField} data-guided={guide.target === "code" || undefined}>
            <span className={s.label}>Código de 6 números</span>
            <input ref={codeInput} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" aria-describedby={`${uid}-code-help`} disabled={busy || pendingRestart} placeholder="••••••" />
          </label>
          <p id={`${uid}-code-help`} className={s.note}>Lo enviamos a <strong>{maskedEmail || "tu correo"}</strong>. Si no lo ves, revisa la carpeta de correo no deseado.</p>
          <div ref={captcha.container} className={s.captchaBox} />
        </div>
        <nav className={s.stepNav}>
          <button type="button" className={s.back} disabled={busy} onClick={() => { setSent(null); pending.current = null; setStage("form"); setCode(""); goTo("review"); setNotice({ tone: "info", title: "Corrige lo que necesites y toca «Enviar mi código»: te mandamos uno nuevo." }); }}><Arrow back />Corregir</button>
          <button type="submit" className={s.primary} disabled={busy || pendingRestart || code.length !== 6}><span>{busy ? "Confirmando…" : "Confirmar"}</span><i aria-hidden="true"><Arrow /></i></button>
        </nav>
        <button type="button" className={s.linkButton} disabled={busy || pendingRestart} onClick={() => void start()}>¿No te llegó? Enviar otro código</button>
      </form>}

      {stage === "done" && result && <div className={s.done}>
        <Image className={s.doneArt} src="/contygo/v8/flujo-contrato.webp" width={512} height={512} sizes="220px" alt="" />
        {result.serviceAlreadyLive && <p className={s.warning}>{serviceAlreadyLiveMessage(result.serviceAlreadyLive)}</p>}
        <div className={s.signAction} data-guided={guide.target === "sign" || undefined}>
          {result.signingUrl
            ? <a className={s.primary} href={result.signingUrl} target="_blank" rel="noopener noreferrer"><span>Firmar mi contrato</span><i aria-hidden="true"><Arrow /></i></a>
            : <button type="button" className={s.primary} disabled={busy || !result.token} onClick={() => void resend()}><span>{busy ? "Enviando…" : "Enviarme el enlace"}</span><i aria-hidden="true"><Arrow /></i></button>}
        </div>
        {result.caseNumber && <p className={s.caseNumber}>Tu número de caso: <strong>{result.caseNumber}</strong></p>}
        {result.clientCreated && <p className={s.note}>Entra a tu app de ContyGo con tu correo. Tu contraseña inicial son los 10 dígitos de tu teléfono.</p>}
        <p className={s.note}>El enlace para firmar vale 14 días y también te llega por correo.{result.token && <> <a href="/contratar/gracias">Ver el estado de mi contrato</a></>}</p>
        {result.signingUrl && <button type="button" className={s.linkButton} disabled={busy} onClick={() => void resend()}>¿No te llegó el enlace? Reenviarlo</button>}
      </div>}

      {stage === "blocked" && <div className={s.links}>
        <a className={s.secondary} href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
        {retryable && <button type="button" className={s.secondary} onClick={retryFromBlocked}>Reintentar</button>}
      </div>}
      {(stage === "form" || stage === "code") && <a className={s.help} href={whatsapp} target="_blank" rel="noopener noreferrer">¿Necesitas ayuda? Escríbenos por WhatsApp</a>}
    </div>
  </div>;
}

function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" style={back ? { transform: "scaleX(-1)" } : undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
