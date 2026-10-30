"use client";

/* ============================================================
   La guía gratuita de la Lotería de Visas DV-2027 como inscripción guiada (28-10-2026). Un boleto que se va sellando:
   cinco pasos (¿puedo participar?, documentos, foto, formulario, número de confirmación), cada uno con algo que hacer,
   no solo que leer. El avance se guarda en el celular de la persona (localStorage), nunca en un servidor; la foto
   tampoco sale de su celular. Contenido y fuentes: lib/loteria-guide.ts y docs/loteria-dv-2027.md.
   Celular: barra de avance abajo, al alcance del pulgar. Escritorio: el talón del boleto acompaña a la izquierda.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DV_INSTRUCTIONS_URL, DV_OFFICIAL_URL } from "@/lib/agent/lottery-intake";
import { LOTTERY_AFTER, LOTTERY_COUNTRIES, LOTTERY_FORM_STEPS, LOTTERY_GUIDE_UPDATED, LOTTERY_NEEDS, LOTTERY_OPENS, LOTTERY_PAUSED, LOTTERY_PAUSE_NOTE, LOTTERY_PHOTO_RULES, LOTTERY_RESULTS, LOTTERY_SCAMS } from "@/lib/loteria-guide";
import PhotoStudio from "./PhotoStudio";
import NotifyDialog from "./NotifyDialog";
import s from "./LotteryGuide.module.css";

type Answer = "yes" | "no";
type Saved = { country?: string; spouse?: Answer; school?: Answer; trade?: Answer; docs: boolean[]; photo?: boolean; form?: boolean; confirmation?: string; reminder?: boolean; notified?: string };
const KEY = "contygo.guia-loteria.v1";
const EMPTY: Saved = { docs: LOTTERY_NEEDS.map(() => false) };
const OTHER = "otro";
const COUNTRIES = [...LOTTERY_COUNTRIES.yes, ...LOTTERY_COUNTRIES.no].sort((a, b) => a.localeCompare(b, "es"));
const ALL_STEPS = [
  { id: "pais", title: "¿Puedo participar?", short: "País", art: "paso-pais" },
  { id: "documentos", title: "Lo que necesitas", short: "Documentos", art: "paso-documentos" },
  { id: "foto", title: "Deja tu foto lista", short: "Foto", art: "paso-foto" },
  { id: "formulario", title: "El formulario, campo por campo", short: "Formulario", art: "paso-formulario" },
  { id: "confirmacion", title: "Envía y guarda tu número", short: "Confirmación", art: "paso-confirmacion" },
] as const;
// While registration is suspended there is nothing to send: the guide is four steps of preparation.
const STEPS = LOTTERY_PAUSED ? ALL_STEPS.slice(0, 4) : ALL_STEPS;

const dayNumber = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
/** An all-day calendar date (yyyymmdd), some days after an ISO date. */
const icsDay = (iso: string, plus = 0) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + plus)).toISOString().slice(0, 10).replace(/-/g, ""); };
const todayNumber = () => { const now = new Date(); return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5; };

function eligibility(saved: Saved) {
  const country = !saved.country ? null : saved.country === OTHER ? "other" : LOTTERY_COUNTRIES.yes.includes(saved.country) ? "yes" : "no";
  const blockedByCountry = country === "no" && saved.spouse === "no";
  const countryOk = country === "yes" || country === "other" || (country === "no" && saved.spouse === "yes");
  const studiesOk = saved.school === "yes" || (saved.school === "no" && saved.trade === "yes");
  const studiesFail = saved.school === "no" && saved.trade === "no";
  const verdict = blockedByCountry ? "country" : !countryOk ? null : studiesFail ? "studies" : studiesOk ? "ok" : null;
  return { country, countryOk, verdict };
}

function Check() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5.5 12.5 4 4 9-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Arrow({ back = false }: { back?: boolean }) { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={back ? { transform: "scaleX(-1)" } : undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Star() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" fill="currentColor" /></svg>; }
function Whatsapp() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm0 17.2a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.7Zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.6 2.6 0 0 0-.8 1.9 4.5 4.5 0 0 0 .9 2.4 10.3 10.3 0 0 0 4 3.5c1.5.6 2 .7 2.8.6a2.3 2.3 0 0 0 1.5-1.1 1.9 1.9 0 0 0 .1-1.1c0-.1-.2-.2-.5-.3Z" /></svg>; }
const NEED_ICONS = [
  <svg key="passport" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5.5" y="3.5" width="13" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.6" /><path d="M9 16.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  <svg key="photo" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.6" /><path d="M7 18c.8-2.6 2.7-4 5-4s4.2 1.4 5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  <svg key="you" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5h16M4 12h10M4 16.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="m15 16 2 2 3.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  <svg key="family" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.6" /><circle cx="16.5" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 19c.5-3.2 2.2-5 4.5-5s4 1.8 4.5 5M12.5 19c.4-2.6 1.8-4 4-4s3.5 1.4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
];

export default function LotteryGuide({ helpHref }: { helpHref: string }) {
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [restored, setRestored] = useState(false);
  const [today, setToday] = useState<number | null>(null);
  const [notify, setNotify] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [current, setCurrent] = useState<string>(STEPS[0].id);
  const [card, setCard] = useState(0);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const deck = useRef<HTMLOListElement>(null);

  // What this person already did comes back from their own phone; the date is the visitor's, never the server's.
  useEffect(() => {
    try { const raw = window.localStorage.getItem(KEY); if (raw) { const value = JSON.parse(raw) as Saved; setSaved({ ...EMPTY, ...value, docs: LOTTERY_NEEDS.map((_, i) => Boolean(value.docs?.[i])) }); setDraft(value.confirmation ?? ""); } } catch { /* private mode: starts empty */ }
    setRestored(true); setToday(todayNumber());
  }, []);
  useEffect(() => { if (restored) try { window.localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* not kept */ } }, [saved, restored]);
  const update = useCallback((patch: Partial<Saved>) => setSaved(value => ({ ...value, ...patch })), []);

  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), { rootMargin: "-40% 0px 0px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const sections = STEPS.map(step => document.getElementById(step.id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target.id); }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const elig = eligibility(saved);
  const done = useMemo(() => ({
    pais: elig.verdict !== null,
    documentos: saved.docs.every(Boolean),
    foto: Boolean(saved.photo),
    formulario: Boolean(saved.form),
    confirmacion: Boolean(saved.confirmation || saved.reminder),
  }), [elig.verdict, saved]);
  const doneCount = Object.values(done).filter(Boolean).length;
  const next = STEPS.find(step => !done[step.id]);

  const opens = dayNumber(LOTTERY_OPENS), results = dayNumber(LOTTERY_RESULTS);
  const daysLeft = today === null ? null : opens - today;
  const opened = !LOTTERY_PAUSED && daysLeft !== null && daysLeft <= 0;
  const after = today !== null && today > results;

  function scrollDeck(direction: number) {
    const element = deck.current;
    if (!element) return;
    const first = element.firstElementChild as HTMLElement | null;
    element.scrollBy({ left: direction * ((first?.offsetWidth ?? 300) + 14), behavior: "smooth" });
  }
  function deckScrolled() {
    const element = deck.current;
    if (!element) return;
    const first = element.firstElementChild as HTMLElement | null;
    const index = Math.round(element.scrollLeft / ((first?.offsetWidth ?? 300) + 14));
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 8;
    const shown = atEnd ? LOTTERY_FORM_STEPS.length - 1 : Math.min(LOTTERY_FORM_STEPS.length - 1, index);
    setCard(shown);
    if (atEnd && !saved.form) update({ form: true });
  }

  function reminder() {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const number = saved.confirmation ? ` Tu número: ${saved.confirmation}.` : "";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ContyGo//Loteria DV-2027//ES", "BEGIN:VEVENT", `UID:dv2027-resultado-${stamp}@contygo.app`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDay(LOTTERY_RESULTS)}`, `DTEND;VALUE=DATE:${icsDay(LOTTERY_RESULTS, 1)}`,
      "SUMMARY:Revisa tu resultado de la Lotería de Visas DV-2027", `DESCRIPTION:Entra a dvprogram.state.gov > Entrant Status Check con tu número de confirmación.${number} El gobierno no avisa por correo.`,
      `URL:${DV_OFFICIAL_URL}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url; link.download = "resultado-loteria-dv-2027.ics";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    update({ reminder: true });
  }
  async function copyNumber() {
    try { await navigator.clipboard.writeText(saved.confirmation ?? ""); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* no clipboard */ }
  }

  const countdown = LOTTERY_PAUSED
    ? { big: "II", unit: "En pausa", label: "sin fecha de apertura" }
    : today === null
    ? { big: "1", unit: "de noviembre", label: "apertura prevista" }
    : after ? { big: "✓", unit: "resultados", label: "consulta el tuyo en el sitio oficial" }
    : opened ? { big: "¡Ya!", unit: "abierta", label: "tienes 30 días desde el 1 de noviembre" }
    : daysLeft === 1 ? { big: "1", unit: "día", label: "para la apertura prevista" }
    : { big: String(daysLeft), unit: "días", label: "para la apertura prevista" };

  const stepHead = (index: number, text: string) => {
    const step = STEPS[index];
    return <header className={s.stepHead}>
      <span className={s.stamp} data-done={done[step.id]} aria-hidden="true">{done[step.id] ? <Check /> : index + 1}</span>
      <div className={s.stepTitles}>
        <span className={s.stepKicker}>Paso {index + 1} de {STEPS.length}{done[step.id] ? " · listo" : ""}</span>
        <h2>{step.title}</h2>
      </div>
      <img className={s.stepArt} src={`/contygo/loteria/${step.art}.webp`} width={512} height={512} alt="" loading="lazy" draggable={false} />
      <p className={s.stepLead}>{text}</p>
    </header>;
  };

  return <main className={s.page}>
    <header className={s.top}>
      <Link href="/" className={s.logo} aria-label="ContyGo · Inicio"><img src="/contygo/brand/logo-dark.png" alt="ContyGo" width={150} height={42} /></Link>
      <nav className={s.topNav}>
        <Link href="/loteria-de-visas" className={s.topLink}>Ver en vídeo</Link>
        <a href={helpHref} target="_blank" rel="noopener noreferrer" className={s.topHelp}><Whatsapp />Ayuda</a>
      </nav>
    </header>

    <section ref={hero} className={s.hero}>
      <div className={s.heroGlow} aria-hidden="true" />
      <div className={s.sparkles} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
      <div className={s.heroCopy}>
        <span className={s.season}><Star />{LOTTERY_PAUSED ? "DV-2027 · Inscripción en pausa" : "Temporada DV-2027 · Gratis"}</span>
        <h1>{LOTTERY_PAUSED ? "Prepárate para la" : "Inscríbete tú mismo en la"} <span className={s.highlight}>Lotería de Visas</span> 2027</h1>
        <p className={s.lead}>{LOTTERY_PAUSED ? "Hoy no se aceptan inscripciones y no hay fecha. Mientras tanto, revisa gratis si podrías participar y deja tus documentos listos, por si abre." : "Paso a paso, en español y sin intermediarios. Revisa si puedes participar, deja tu foto lista y llena el formulario oficial sin errores."}</p>
        <div className={s.heroActions}>
          <a className={s.primary} href="#pais">{LOTTERY_PAUSED ? (doneCount ? "Seguir preparándome" : "Prepararme gratis") : doneCount ? "Seguir con mi inscripción" : "Empezar mi inscripción guiada"}<Arrow /></a>
          {saved.notified ? <span className={s.notified}><Check />{LOTTERY_PAUSED ? "Te avisamos si abre" : "Te avisamos por WhatsApp"}</span>
            : <button type="button" className={s.ghostLight} onClick={() => setNotify(true)}>{opened ? "Quiero ayuda por WhatsApp" : LOTTERY_PAUSED ? "Avísame si abre" : "Avísame cuando abra"}</button>}
        </div>
      </div>

      <div className={s.ticketWrap}>
        <div className={s.ticketShadow}><div className={s.ticket} role="group" aria-label={`Lotería de Visas DV-2027: ${LOTTERY_PAUSED ? "" : `${countdown.big} `}${countdown.unit}, ${countdown.label}. Tu avance: ${doneCount} de ${STEPS.length} pasos.`}>
          <div className={s.ticketMain}>
            <div className={s.ticketTop}>
              <span className={s.ticketKicker}>Boleto · DV-2027</span>
            </div>
            <div className={s.count} aria-hidden="true">
              <b>{countdown.big}</b>
              <span><strong>{countdown.unit}</strong>{countdown.label}</span>
            </div>
            <dl className={s.ticketFacts}>
              <div><dt>Abre</dt><dd>{LOTTERY_PAUSED ? "Sin fecha" : "1 nov"}</dd></div>
              <div><dt>Dura</dt><dd>{LOTTERY_PAUSED ? "Por confirmar" : "30 días"}</dd></div>
              <div><dt>Cuesta</dt><dd>US$1</dd></div>
              <div><dt>Resultados</dt><dd>{LOTTERY_PAUSED ? "Sin fecha" : "antes del 3 dic"}</dd></div>
            </dl>
            <img className={s.ticketArt} src="/contygo/v8/servicio-loteria-dv-2027.webp" width={512} height={512} alt="" draggable={false} />
          </div>
          <div className={s.ticketStub}>
            <span className={s.stubLabel}>Tu avance</span>
            <ol className={s.stubStamps}>{STEPS.map((step, index) => <li key={step.id} data-done={done[step.id]}><a href={`#${step.id}`} aria-label={`${step.title}${done[step.id] ? ", listo" : ""}`}>{done[step.id] ? <Check /> : index + 1}</a></li>)}</ol>
            <span className={s.stubCount}>{doneCount}/{STEPS.length}</span>
          </div>
        </div></div>
        <p className={s.ticketNote}>{LOTTERY_PAUSE_NOTE}</p>
      </div>
      <ul className={s.trust}>
        <li><Check />{LOTTERY_PAUSED ? "Hoy nadie puede inscribirte: desconfía" : "Cuesta 1 dólar en el sitio oficial"}</li>
        <li><Check />Tu foto lista en 1 minuto</li>
        <li><Check />Tu avance se guarda en tu celular</li>
      </ul>
    </section>

    <div className={s.layout}>
      <aside className={s.rail} aria-label="Tu avance">
        <div className={s.railCard}>
          <span className={s.railKicker}>Tu boleto</span>
          <div className={s.railMeter}><i style={{ transform: `scaleX(${doneCount / STEPS.length})` }} /></div>
          <span className={s.railCount}>{doneCount} de {STEPS.length} pasos listos</span>
          <ol className={s.railSteps}>{STEPS.map((step, index) => <li key={step.id}><a href={`#${step.id}`} data-done={done[step.id]} data-current={current === step.id} aria-current={current === step.id ? "step" : undefined}><span className={s.railStamp}>{done[step.id] ? <Check /> : index + 1}</span>{step.title}</a></li>)}</ol>
          <a className={s.railHelp} href={helpHref} target="_blank" rel="noopener noreferrer"><Whatsapp /><span><strong>¿Te trabaste?</strong>ContyGo lo hace por ti</span></a>
        </div>
      </aside>

      <div className={s.steps}>
        <section id="pais" className={s.step} data-done={done.pais}>
          {stepHead(0, "Cuenta el país donde naciste, no tu nacionalidad ni dónde vives hoy. Y necesitas secundaria completa o experiencia en un oficio.")}
          <div className={s.stepBody}>
            <label className={s.select}>
              <span>¿En qué país naciste?</span>
              <select value={saved.country ?? ""} onChange={event => update({ country: event.target.value || undefined, spouse: undefined })}>
                <option value="">Elige tu país</option>
                {COUNTRIES.map(country => <option key={country} value={country}>{country}</option>)}
                <option value={OTHER}>Otro país</option>
              </select>
            </label>
            <div aria-live="polite" className={s.flow}>
              {elig.country === "yes" && <p className={s.chip} data-tone="good"><Check />{saved.country} participó en la edición anterior. La lista oficial de la DV-2027 aún no se publica.</p>}
              {elig.country === "other" && <p className={s.chip} data-tone="info">Revisa si tu país está en la <a href={DV_INSTRUCTIONS_URL} target="_blank" rel="noopener noreferrer">lista oficial</a>. Si participa, sigue con estas preguntas.</p>}
              {elig.country === "no" && <div className={s.question}>
                <p className={s.chip} data-tone="warn">{saved.country} no participó en la edición anterior. Pero puedes usar el país de tu cónyuge.</p>
                <span className={s.ask}>¿Tu esposa o esposo nació en un país que sí participa?</span>
                <div className={s.choices}>{(["yes", "no"] as const).map(value => <button key={value} type="button" aria-pressed={saved.spouse === value} onClick={() => update({ spouse: value })}>{value === "yes" ? "Sí" : "No"}</button>)}</div>
              </div>}
              {elig.countryOk && <div className={s.question}>
                <span className={s.ask}>¿Terminaste la secundaria?</span>
                <div className={s.choices}>{(["yes", "no"] as const).map(value => <button key={value} type="button" aria-pressed={saved.school === value} onClick={() => update({ school: value, trade: undefined })}>{value === "yes" ? "Sí" : "No"}</button>)}</div>
              </div>}
              {elig.countryOk && saved.school === "no" && <div className={s.question}>
                <span className={s.ask}>¿Tienes 2 años de experiencia, en los últimos 5, en un oficio que pide al menos 2 años de formación?</span>
                <div className={s.choices}>{(["yes", "no"] as const).map(value => <button key={value} type="button" aria-pressed={saved.trade === value} onClick={() => update({ trade: value })}>{value === "yes" ? "Sí" : "No"}</button>)}</div>
              </div>}
              {elig.verdict === "ok" && <div className={s.verdict} data-tone="good">
                <span className={s.verdictSeal} aria-hidden="true"><Check /></span>
                <div><strong>{LOTTERY_PAUSED ? "Podrías participar" : "¡Puedes participar!"}</strong><span>{saved.spouse === "yes" ? "Con el país de tu cónyuge. Inclúyelo en tu inscripción con su foto." : LOTTERY_PAUSED ? "Si la inscripción abre. Sigue con tus documentos: te toma unos minutos." : "Sigue con tus documentos: te toma unos minutos."}</span></div>
                <a href="#documentos" className={s.verdictGo}>Siguiente<Arrow /></a>
              </div>}
              {elig.verdict === "country" && <div className={s.verdict} data-tone="bad">
                <div><strong>Este año no podrías participar</strong><span>Con tu país de nacimiento no se puede. En casos especiales cuenta el país de uno de tus padres: <a href={helpHref} target="_blank" rel="noopener noreferrer">pregúntanos por WhatsApp</a>.</span></div>
              </div>}
              {elig.verdict === "studies" && <div className={s.verdict} data-tone="bad">
                <div><strong>Te falta el requisito de estudios o de trabajo</strong><span>Sin secundaria completa ni 2 años en un oficio calificado, la inscripción se descalifica. Si tienes dudas, <a href={helpHref} target="_blank" rel="noopener noreferrer">pregúntanos</a>.</span></div>
              </div>}
            </div>
          </div>
        </section>

        <section id="documentos" className={s.step} data-done={done.documentos}>
          {stepHead(1, "Tenlo a mano antes de abrir el formulario: la sesión del sitio oficial se cierra si tardas mucho.")}
          <div className={s.stepBody}>
            <div className={s.meter}><i style={{ transform: `scaleX(${saved.docs.filter(Boolean).length / LOTTERY_NEEDS.length})` }} /><span>{saved.docs.filter(Boolean).length} de {LOTTERY_NEEDS.length} listos</span></div>
            <div className={s.needs}>{LOTTERY_NEEDS.map((need, index) => <label key={need.title} className={s.need} data-checked={saved.docs[index]}>
              <input type="checkbox" checked={saved.docs[index]} onChange={event => update({ docs: saved.docs.map((value, i) => i === index ? event.target.checked : value) })} />
              <span className={s.needIcon}>{NEED_ICONS[index]}</span>
              <span className={s.needText}><strong>{need.title}</strong><span>{need.text}</span></span>
              <span className={s.needBox} aria-hidden="true"><Check /></span>
            </label>)}</div>
          </div>
        </section>

        <section id="foto" className={s.step} data-done={done.foto}>
          {stepHead(2, LOTTERY_PAUSED ? "Es la razón número uno de descalificación. Practica aquí: al inscribirte, debe ser de los últimos 6 meses." : "Es la razón número uno de descalificación. Súbela aquí y la dejamos como la pide el sitio oficial.")}
          <div className={s.stepBody}>
            <PhotoStudio onReady={() => update({ photo: true })} />
            <details className={s.rules}>
              <summary>Las reglas oficiales de la foto</summary>
              <ul>{LOTTERY_PHOTO_RULES.map(rule => <li key={rule}><Check />{rule}</li>)}</ul>
            </details>
          </div>
        </section>

        <section id="formulario" className={s.step} data-done={done.formulario}>
          {stepHead(3, "El formulario oficial está en inglés. Pasa las tarjetas: te decimos qué dice cada campo y cómo llenarlo.")}
          <div className={s.stepBody}>
            <div className={s.deckBar}>
              <span className={s.deckCount}><b>{String(card + 1).padStart(2, "0")}</b> / {LOTTERY_FORM_STEPS.length}</span>
              <div className={s.deckTrack}><i style={{ transform: `scaleX(${(card + 1) / LOTTERY_FORM_STEPS.length})` }} /></div>
              <div className={s.deckArrows}>
                <button type="button" onClick={() => scrollDeck(-1)} aria-label="Campo anterior" disabled={card === 0}><Arrow back /></button>
                <button type="button" onClick={() => scrollDeck(1)} aria-label="Campo siguiente" disabled={card === LOTTERY_FORM_STEPS.length - 1}><Arrow /></button>
              </div>
            </div>
            <ol ref={deck} className={s.deck} onScroll={deckScrolled} aria-label="Los campos del formulario oficial">
              {LOTTERY_FORM_STEPS.map((step, index) => <li key={step.title} className={s.formCard}>
                <span className={s.formNum}>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {step.official && <div className={s.mock}>
                  <span className={s.mockLabel}>En el formulario dice</span>
                  <b>{step.official}</b>
                  {step.example && <span className={s.mockInput}>{step.example}</span>}
                </div>}
              </li>)}
            </ol>
            <div className={s.deckFoot}>
              <a className={s.primary} href={DV_OFFICIAL_URL} target="_blank" rel="noopener noreferrer">{opened ? "Ir al sitio oficial" : "Ver el sitio oficial"}<Arrow /></a>
              <span className={s.deckNote}>{LOTTERY_PAUSED ? <>Hoy <b>dvprogram.state.gov</b> no acepta inscripciones. Si abre, es el único sitio válido.</> : <>Solo en <b>dvprogram.state.gov</b>. Ten esta guía abierta en otra pestaña mientras llenas.</>}</span>
            </div>
          </div>
        </section>

        {!LOTTERY_PAUSED && <section id="confirmacion" className={s.step} data-done={done.confirmacion}>
          {stepHead(4, "Al enviar, el sitio te da un número de confirmación. Sin él no puedes ver tu resultado: el gobierno no avisa por correo.")}
          <div className={s.stepBody}>
            <div className={s.confirmGrid}>
              {saved.confirmation ? <div className={s.stubTicket}>
                <span className={s.stubTicketKicker}>Tu número de confirmación</span>
                <b className={s.stubTicketNumber}>{saved.confirmation}</b>
                <div className={s.stubTicketActions}>
                  <button type="button" onClick={copyNumber}>{copied ? "¡Copiado!" : "Copiar"}</button>
                  <button type="button" onClick={() => { update({ confirmation: undefined }); setDraft(""); }}>Cambiar</button>
                </div>
                <span className={s.stubTicketNote}>Guardado solo en este celular. Haz también una captura.</span>
              </div> : <form className={s.saveNumber} onSubmit={event => { event.preventDefault(); const value = draft.replace(/\s+/g, "").toUpperCase(); if (value.length >= 6) update({ confirmation: value }); }}>
                <label htmlFor="dv-confirmation">Guarda aquí tu número</label>
                <div className={s.saveRow}>
                  <input id="dv-confirmation" value={draft} onChange={event => setDraft(event.target.value.toUpperCase())} maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="2027AB1C2D3E4F5G" />
                  <button type="submit" disabled={draft.replace(/\s+/g, "").length < 6}>Guardar</button>
                </div>
                <span>Se guarda solo en este celular, para que no lo pierdas.</span>
              </form>}
              <div className={s.reminder}>
                <strong>Revisa tu resultado</strong>
                <span>Entra a <b>dvprogram.state.gov</b> → <b>Entrant Status Check</b> con tu número. Resultados antes del 3 de diciembre.</span>
                <button type="button" className={s.ghostDark} onClick={reminder}>{saved.reminder ? <><Check />Recordatorio añadido</> : "Añadir recordatorio al calendario"}</button>
              </div>
            </div>
          </div>
        </section>}

        <section className={s.after}>
          <div className={s.afterCol}>
            <h2>{LOTTERY_PAUSED ? "Si abre: después de enviar" : "Después de enviar"}</h2>
            <ol className={s.timeline}>{LOTTERY_AFTER.map(item => <li key={item}>{item}</li>)}</ol>
          </div>
          <div className={s.scams}>
            <h2><span aria-hidden="true">!</span>Cuidado con las estafas</h2>
            <ul>{LOTTERY_SCAMS.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
        </section>

        <section className={s.help}>
          <img className={s.helpArt} src="/contygo/v8/flujo-contrato.webp" width={512} height={512} alt="" loading="lazy" draggable={false} />
          <div className={s.helpCopy}>
            <span className={s.season}><Star />Si prefieres</span>
            <h2>¿Quieres que ContyGo lo haga por ti?</h2>
            <p>{LOTTERY_PAUSED ? "Si la inscripción abre, revisamos" : "Revisamos"} tus fotos y tus datos, enviamos tu inscripción y te entregamos tu número de confirmación. Por WhatsApp y en español.</p>
            <div className={s.helpActions}>
              <a className={s.whatsapp} href={helpHref} target="_blank" rel="noopener noreferrer"><Whatsapp />Que ContyGo lo haga por mí</a>
              <Link className={s.ghostLight} href="/loteria-de-visas">Ver la guía en vídeo</Link>
            </div>
          </div>
        </section>

        <footer className={s.footer}>
          <p>ContyGo, marca de USA LATINO PRIME LLC, no es el gobierno de Estados Unidos ni está afiliada a él, y no es un bufete de abogados. Esta guía resume las instrucciones oficiales del Programa de Visas de Diversidad; las reglas que valen son las del Departamento de Estado. Nadie puede garantizar la selección.</p>
          <p>Actualizada el {LOTTERY_GUIDE_UPDATED}.</p>
        </footer>
      </div>
    </div>

    <nav className={s.dock} data-show={pastHero} aria-label="Tu avance en la guía">
      <ol className={s.dockStamps}>{STEPS.map((step, index) => <li key={step.id}><a href={`#${step.id}`} data-done={done[step.id]} data-current={current === step.id} aria-label={`${step.title}${done[step.id] ? ", listo" : ""}`}>{done[step.id] ? <Check /> : index + 1}</a></li>)}</ol>
      <span className={s.dockLabel}><b>{doneCount}/{STEPS.length}</b>{next ? next.short : "¡Todo listo!"}</span>
      <a className={s.dockHelp} href={helpHref} target="_blank" rel="noopener noreferrer" aria-label="Ayuda por WhatsApp"><Whatsapp /></a>
    </nav>

    <NotifyDialog open={notify} opened={opened} onClose={() => setNotify(false)} onDone={name => update({ notified: name })} />
  </main>;
}
