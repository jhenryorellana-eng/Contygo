"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { waLink } from "@/lib/config";
import { CONTYGO_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { CONTYGO_COMMERCIAL_OFFER } from "@/lib/contygo-commercial-offer";
import { CONTYGO_CLAIMS, isPublic } from "@/lib/contygo-claims";
import themeStyles from "../v6/ExperienceTheme.module.css";
import GreenThread from "./GreenThread";
import AppPhone from "./AppPhone";
import RegistryStage from "./RegistryStage";
import ServiceShowcase, { type Star } from "./ServiceShowcase";
import Finale from "./Finale";
import { dropTheme } from "./themeDrop";
import s from "./ContygoLanding.module.css";

// The service flow (video, conversation, contract: gsap, voice, checkout) is the heaviest part of the page.
// It is fetched when the phone is idle after the first paint, not before, so the landing starts light.
const loadCinema = () => import("../rebuild/ServiceCinemaDialog");
const ServiceCinemaDialog = dynamic(loadCinema, { ssr: false });

// V7 · «El hilo verde». Direction and reasons: docs/contygo-v7-direccion-arte.md.
// Copy is kept from V6 unless the direction document says otherwise.
type Theme = "light" | "dark";
const THEME_KEY = "contygo-appearance";
// Illustration system V8 (28-09-2026, material-de-diseno/ilustraciones-v8): one paper sculpture per service, each
// with its own meaning, drawn once for both appearances (see docs/contygo-v7-direccion-arte.md).
const art = (name: string) => `/contygo/v8/${name}.webp`;
// The owner's star products, the most requested (30-09-2026): they lead on their own stage («Vitrina», chosen by
// the owner among three concepts). Every other service follows directly, without category filters.
const featured: Star[] = [
  { id: "visa-juvenil", name: "Visa Juvenil", label: "Para el futuro de tus hijos", copy: "Acompañamos a tu familia en cada etapa, con un expediente preparado con cuidado desde el primer día." },
  { id: "apelacion", name: "Apelación", label: "Cuando cada día cuenta", copy: "Organizamos la documentación de tu apelación ante la BIA con orden y atentos a tus plazos." },
  { id: "reforzar-asilo", name: "Reforzamiento de Asilo", label: "Tu historia, con más respaldo", copy: "Revisamos y fortalecemos el respaldo documental de tu caso, para que llegue completo y bien organizado." },
];
const others = CONTYGO_SERVICES.filter(item => !featured.some(star => star.id === item.id));
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const lowest = (service: ContygoService) => Math.min(service.price, ...service.plans.map(plan => plan.price));
const fromPrice = Math.min(...CONTYGO_SERVICES.map(lowest));
const visa = CONTYGO_SERVICES.find(item => item.id === "visa-juvenil");
const clients = isPublic(CONTYGO_CLAIMS.clientsServed) ? CONTYGO_CLAIMS.clientsServed.text : null;
const guarantee = CONTYGO_COMMERCIAL_OFFER.guarantee;
// The same person through the whole path, one action per step (Codex, 28-09-2026: material-de-diseno/v7-fotos):
// understanding the video guide, reviewing the contract, sending a document from her phone.
const journey = [
  { image: "/contygo/v7/paso-01-entiende-v2.webp", title: "Entiende tu proceso.", text: "Una guía en vídeo y una conversación corta, con tu voz o por escrito, te muestran qué incluye tu servicio y cuánto cuesta." },
  { image: "/contygo/v7/paso-02-decide.webp", title: "Revisa y decide.", text: "Lees tu contrato antes de pagar: alcance, precio y condiciones. Firmas cuando estés listo." },
  { image: "/contygo/v7/paso-03-avanza-v2.webp", title: "Aporta y avanza.", text: "Compartes tus documentos desde el celular. La plataforma te dice qué sigue y el equipo te acompaña." },
];
// Hero «Personas + tecnología» (Codex, 28-09-2026, material-de-diseno/v7-fotos): the ribbon leaves her
// phone, folds into the check and leaves the image through its bottom edge, where the page thread starts.
// `exit` is that point, measured on each file as a fraction of the image width (GreenThread reads it).
const HERO_ART = {
  light: { src: "/contygo/v7/hero-claro.webp", exit: .1746 },
  dark: { src: "/contygo/v7/hero-oscuro.webp", exit: .1748 },
} as const;
// First visit of the session: marked before the first paint, so the entrance never flickers.
const INTRO = `try{var d=document.documentElement;if(!d.dataset.cgIntro){d.dataset.cgIntro=sessionStorage.getItem("contygo-intro")?"done":"play";sessionStorage.setItem("contygo-intro","1")}}catch(e){}`;
const proof = [
  { icon: "shield", text: "Consultor de inmigración registrado en Utah", href: "#registro" },
  { icon: "app", text: "En español, desde tu celular" },
  { icon: "file", text: "Revisas tu contrato antes de decidir" },
];
const faqs = [
  ["¿Qué hace ContyGo por mí?", "Te acompaña en la preparación de los documentos y formularios incluidos en tu servicio. La plataforma organiza la información que aportas y te permite conocer tus siguientes pasos. Revisa el alcance específico antes de contratar."],
  ["¿Cuánto cuesta?", `Cada servicio publica sus honorarios antes de empezar: desde ${money.format(fromPrice)}${visa ? `; Visa Juvenil Básico, ${money.format(lowest(visa))}` : ""}. Las tasas del gobierno, cuando aplican, van aparte y se indican en tu contrato.`],
  ["¿Puedo hacerlo desde mi celular?", "Sí. Puedes conocer el servicio, aportar información y documentos y consultar tus siguientes pasos desde tu cuenta. Si tu proceso requiere originales o actuaciones externas, recibirás las indicaciones correspondientes."],
  ["¿Hay una persona que me acompañe?", "Sí. Puedes comunicarte con el equipo a través de Soporte en tu cuenta. Antes de contratar, también puedes resolver tus dudas por WhatsApp."],
  ["¿Cuándo empieza mi servicio?", "Después de crear tu cuenta, revisar y firmar tu contrato y confirmar el pago inicial correspondiente. Antes de hacerlo podrás consultar el alcance, el precio y las condiciones."],
  ["¿Qué es un consultor de inmigración registrado?", "Una persona registrada ante el Estado de Utah para dar asistencia no legal en trámites migratorios, como completar formularios oficiales y organizar documentos. No es abogado: no da asesoría legal ni representa ante una corte o USCIS."],
  ["¿ContyGo garantiza la aprobación de mi trámite?", "No. ContyGo ofrece preparación documental y acompañamiento. Las decisiones y los tiempos de las autoridades no dependen de nosotros. Las condiciones del servicio y de reembolso se explican en tu contrato."],
];
const help = waLink("Hola, quiero conocer el alcance de un servicio de ContyGo.");

function Icon({ kind = "arrow", loop }: { kind?: string; loop?: boolean }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    moon: <path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z" />,
    play: <path d="m9 5 10 7-10 7Z" />,
    tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1.5" /></>,
    check: <><path d="m7 12 3 3 7-7" /><rect x="3" y="3" width="18" height="18" rx="6" /></>,
    chat: <path d="M7 18 3 21V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H7Zm0-9h10M7 13h6" />,
    family: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M2 21v-3a6 6 0 0 1 12 0v3m1-7a5 5 0 0 1 7 4v3" /></>,
    shelter: <><path d="M3 20v-8a9 9 0 0 1 18 0v8" /><path d="M8 20v-5.5l4-3.5 4 3.5V20" /></>,
    steps: <path d="M3 20h5v-5h5v-5h5V5h3" />,
    receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3" />,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7M3 13h18" /></>,
    path: <><circle cx="5" cy="18" r="2" /><path d="M7 18h8a4 4 0 0 0 0-8h-4a3 3 0 0 1 0-6h9m-4-3 4 3-4 3" /></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h5" /></>,
    app: <><rect x="5" y="2" width="14" height="20" rx="4" /><path d="M10 18h4m-6-9 3 3 5-5" /></>,
    shield: <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 10 3 3 5-6" />,
    send: <path d="M4.5 11.2 19.6 4.4a.6.6 0 0 1 .8.8l-6.8 15.1a.6.6 0 0 1-1.1-.1l-1.9-6.3-6.3-1.9a.6.6 0 0 1-.1-1.1ZM11 13l4.5-4.5" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-loop={loop || undefined}>{paths[kind] ?? paths.arrow}</svg>;
}

export default function ContygoLanding() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerCta, setHeaderCta] = useState(false);
  const [dock, setDock] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [service, setService] = useState<ContygoService | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const heroCta = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    try { const saved = localStorage.getItem(THEME_KEY); if (saved === "dark" || saved === "light") setTheme(saved); } catch { /* In-memory theme remains available. */ }
    setReady(true);
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const warm = () => { void loadCinema(); };
    const warmTimer = idle ? idle(warm, { timeout: 4000 }) : window.setTimeout(warm, 2500);
    return () => { if (!idle) clearTimeout(warmTimer); };
  }, []);
  // The other appearance's art is fetched when the person reaches for the tone button (the drop gives it time).
  const preloaded = useRef(false);
  function preloadOtherTheme() {
    if (preloaded.current) return;
    preloaded.current = true;
    const other = theme === "light" ? "dark" : "light";
    for (const src of [HERO_ART[other].src, `/contygo/v7/simbolo-${other === "dark" ? "oscuro" : "claro"}.png`]) { const img = new window.Image(); img.src = src; }
  }
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Private contexts may disable storage. */ }
    const previous = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = theme === "dark" ? "#061B3D" : "#FFFFFF";
    return () => { document.documentElement.style.backgroundColor = previous; };
  }, [theme, ready]);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 12);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    // The header offers the main action once the hero button has scrolled away.
    const cta = heroCta.current && window.IntersectionObserver ? new IntersectionObserver(([entry]) => { setHeaderCta(!entry.isIntersecting && entry.boundingClientRect.top < 0); setHeroVisible(entry.isIntersecting); }) : null;
    if (cta && heroCta.current) cta.observe(heroCta.current);
    // Phones: a bottom bar keeps the main action under the thumb, except where the person is already
    // choosing (services) or facing the final call to action.
    const seen = new Map<Element, boolean>();
    const watched = ["#servicios", "#empezar"].map(id => document.querySelector(id)).filter(Boolean) as Element[];
    const busy = window.IntersectionObserver ? new IntersectionObserver(entries => {
      entries.forEach(entry => seen.set(entry.target, entry.isIntersecting));
      setDock(!Array.from(seen.values()).some(Boolean));
    }, { rootMargin: "-20% 0px -35% 0px" }) : null;
    watched.forEach(el => busy?.observe(el));
    return () => { removeEventListener("scroll", onScroll); cta?.disconnect(); busy?.disconnect(); };
  }, []);
  useEffect(() => {
    if (!root.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.setAttribute("data-seen", "true"); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    root.current.querySelectorAll("[data-reveal]").forEach(el => observer.observe(el));
    // Looping details (pulses, rings, the floating symbol) only run while their block is on screen.
    const awake = new IntersectionObserver(entries => entries.forEach(entry => entry.target.setAttribute("data-inview", String(entry.isIntersecting))), { rootMargin: "120px 0px" });
    root.current.querySelectorAll("[data-anim]").forEach(el => awake.observe(el));
    return () => { observer.disconnect(); awake.disconnect(); };
  }, []);
  function open(item: ContygoService, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setOrigin({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    setService(item);
    const url = new URL(location.href); url.searchParams.set("servicio", item.id); history.replaceState({}, "", url);
  }
  const logo = `/contygo/brand/logo-${theme}.png`;
  return <div ref={root} className={`${s.page} ${themeStyles.surface}`} data-contygo-theme={theme} data-theme-ready={ready}>
    <script dangerouslySetInnerHTML={{ __html: INTRO }} />
    <a className={s.skip} href="#servicios">Saltar a servicios</a>
    <header className={s.header} data-scrolled={scrolled} data-cta={headerCta}>
      <div className={s.headerInner}>
        <a className={s.logo} href="#inicio" aria-label="ContyGo · Inicio"><Image src={logo} width={3000} height={849} alt="ContyGo" priority sizes="160px" /></a>
        <nav aria-label="Principal"><a href="#servicios">Servicios</a><a href="#recorrido">Cómo funciona</a><a href="#registro">Quién te acompaña</a><a href="#preguntas">Preguntas</a></nav>
        <div className={s.headerActions}>
          <button className={s.themeToggle} type="button" onPointerEnter={preloadOtherTheme} onTouchStart={preloadOtherTheme} onFocus={preloadOtherTheme} onClick={event => { const next: Theme = theme === "light" ? "dark" : "light"; void dropTheme(event.currentTarget, next, () => flushSync(() => setTheme(next))); }} aria-label={`Activar modo ${theme === "light" ? "oscuro" : "claro"}`} aria-pressed={theme === "dark"}><span key={theme} className={s.toggleIcon}><Icon kind={theme === "light" ? "moon" : "sun"} /></span></button>
          <a className={s.login} href="https://contygo.app/entrar">Mi cuenta <Icon /></a>
          <a className={s.headerCta} href="#servicios" tabIndex={headerCta ? 0 : -1} aria-hidden={!headerCta}>Mi servicio <Icon /></a>
        </div>
      </div>
    </header>
    <main ref={main} className={s.main}>
      <section className={s.hero} id="inicio">
        <div className={s.heroCopy}>
          <span className={s.eyebrow}><i /> Personas + tecnología. Contigo.</span>
          <h1>Tu historia sigue.<br />El siguiente paso,<br /><em>ContyGo.</em></h1>
          <p className={s.lead}>Tu trámite, más claro. Preparamos tus documentos contigo y te acompañamos paso a paso, desde una sola plataforma.</p>
          <a ref={heroCta} className={s.primary} href="#servicios">Encontrar mi servicio <span><Icon /></span></a>
          <ul className={s.proof}>{proof.map(item => <li key={item.text}><Icon kind={item.icon} />{item.href ? <a href={item.href}>{item.text}</a> : <span>{item.text}</span>}</li>)}</ul>
        </div>
        <div className={s.heroArt} data-anim data-thread="start" data-exit={HERO_ART[theme].exit} data-exit-dir="down">
          <Image key={theme} src={HERO_ART[theme].src} alt="Una mujer revisa su trámite en el celular; de la pantalla sale una cinta verde que sube hasta el símbolo de ContyGo." fill priority unoptimized sizes="(max-width:760px) 100vw, 52vw" />
          {/* The official symbol, exact to the pixel, where the ribbon's curl points (after the photo: GreenThread reads the first img). */}
          <span className={s.heroMark} data-loop aria-hidden="true"><Image src={`/contygo/v7/simbolo-${theme === "dark" ? "oscuro" : "claro"}.png`} alt="" width={568} height={640} unoptimized priority /></span>
        </div>
      </section>

      <section className={s.facts} aria-label="ContyGo en cifras" data-thread="facts">
        <div data-react="count"><strong data-value={String(CONTYGO_SERVICES.length)}>{CONTYGO_SERVICES.length}</strong><span>servicios con precio publicado</span></div>
        <div data-react="count"><strong data-value={money.format(fromPrice)}>{money.format(fromPrice)}</strong><span>honorarios desde</span></div>
        {clients && <div data-react="count"><strong data-value={clients.split(" ")[0]}>{clients.split(" ")[0]}</strong><span>{clients.split(" ").slice(1).join(" ")}</span></div>}
        <div data-react="count"><strong data-value="100%">100%</strong><span>en español, desde tu celular</span></div>
      </section>

      <section className={s.services} id="servicios" data-thread="services" data-anim>
        <ServiceShowcase stars={featured} others={others} open={open} />
        <a className={s.help} href={help}>¿No sabes por dónde empezar? <b>Hablemos <Icon /></b></a>
      </section>

      <section className={s.journey} id="recorrido">
        <div className={s.sectionHeading} data-reveal data-react="title"><div><span className={s.eyebrow}>02 · A tu ritmo, con claridad</span><h2>No tienes que<br /><em>entenderlo todo hoy.</em></h2></div><p>Hagámoslo paso a paso. Así comienza tu experiencia con ContyGo.</p></div>
        <ol className={s.scenes}>{journey.map((step, i) => <li key={step.title} data-thread="step" data-reveal data-react="scene"><span className={s.stepDot} aria-hidden="true"><b>0{i + 1}</b></span><span className={s.sceneImage}><Image src={step.image} alt="" fill sizes="(max-width:760px) 92vw, 30vw" /></span><span className={s.stepNumber}>0{i + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
        <a className={s.inlineLink} href="#servicios">Elegir dónde empezar <Icon /></a>
      </section>

      <section className={s.platform} id="plataforma" data-thread="platform">
        <div className={s.platformVisual} data-anim data-reveal data-react="phone" data-react-y=".2">
          <span className={s.appAura} aria-hidden="true" />
          <div className={s.appPhone} data-thread="phone"><AppPhone /></div>
          <span className={s.realUi}>Ilustración de tu expediente en ContyGo</span>
        </div>
        <div className={s.platformCopy} data-reveal data-react="title"><span className={s.eyebrow}>03 · Tu expediente, conectado</span><h2>La app organiza.<br /><em>El equipo<br />te acompaña.</em></h2><p>La tecnología pone orden. Las personas te ayudan a avanzar. Tu preparación tiene un lugar, desde el primer documento hasta el siguiente paso.</p><ul><li data-react="pop"><Icon kind="file" /><div><strong>Tu información, en un lugar.</strong><span>Aporta los datos y documentos que tu servicio necesita.</span></div></li><li data-react="pop"><Icon kind="path" /><div><strong>Sabes qué viene después.</strong><span>Consulta el recorrido y las indicaciones de tu preparación.</span></div></li><li data-react="pop"><Icon kind="chat" /><div><strong>Hay alguien del otro lado.</strong><span>Comunícate con el equipo desde Soporte en tu cuenta.</span></div></li></ul><a className={s.inlineLink} href="#servicios">Conocer mi servicio <Icon /></a></div>
      </section>

      {/* Navy ink sheet: the certificate always reads on the brand navy, in both appearances. */}
      <div className={`${s.inkSheet} ${themeStyles.surface}`} data-contygo-theme="dark" data-react="sheet" data-react-y=".25"><RegistryStage /></div>

      <section className={s.backing} id="respaldo">
        <div className={s.backingIntro} data-reveal data-react="title">
          <span className={s.eyebrow}>04 · Todo por escrito</span>
          <h2>Claro desde el principio.<br /><em>Nada escondido.</em></h2>
          <p>Antes de pagar sabes qué incluye tu servicio, cuánto cuesta y qué pasa si algo no sale a tiempo.</p>
          <p className={s.honest}><b>Somos consultores, no abogados.</b> Preparamos tus documentos y te acompañamos; no damos asesoría legal ni representación. Decirlo claro también es cuidarte.</p>
          {visa && <button type="button" className={s.contractCta} onClick={event => open(visa, event.currentTarget)}>Ver la guía de Visa Juvenil <span><Icon kind="play" /></span></button>}
        </div>
        {/* Illustration of what the person reads before paying: the same facts as the page, never a real contract. */}
        <figure className={s.contract} data-anim data-react="contract" data-react-y=".15">
          <article className={s.contractSheet} aria-label="Ilustración de un contrato de servicio de ContyGo">
            <header className={s.contractHead}>
              <span className={s.contractMark}><Image src="/contygo/v7/simbolo-oscuro.png" alt="" width={568} height={640} sizes="24px" /></span>
              <span className={s.contractName}><small>Contrato · ejemplo</small><strong>{visa?.name ?? "Tu servicio"}</strong></span>
              <span className={s.contractChip}>Lo lees antes de pagar</span>
            </header>
            <ol className={s.clauses}>
              <li><span className={s.clauseNo}>1</span><div><h3>Precio publicado</h3><p>Honorarios <mark>desde {money.format(visa ? lowest(visa) : fromPrice)}</mark>, visibles antes de empezar. Las tasas del gobierno, cuando aplican, se indican aparte.</p></div></li>
              <li><span className={s.clauseNo}>2</span><div><h3>Contrato antes de pagar</h3><p>Lees <mark>el alcance, el precio y las condiciones</mark>. Decides y firmas cuando estés listo.</p></div></li>
              {guarantee && <li className={s.clauseGuarantee}><span className={s.clauseNo}>3</span><div><h3>{guarantee.title}</h3><p>{guarantee.description}</p><ul>{guarantee.conditions.map(item => <li key={item}>{item}</li>)}</ul></div></li>}
            </ol>
            <footer className={s.contractSign}><span className={s.signLine}><i data-loop aria-hidden="true" /></span><span>Tu firma, solo cuando estés listo</span></footer>
          </article>
          <figcaption className={s.contractNote}>Ilustración. Tu contrato completo lo lees antes de firmar.</figcaption>
        </figure>
      </section>

      <section className={s.faq} id="preguntas" data-thread="faq">
        <div className={s.faqIntro} data-reveal data-react="title"><span className={s.eyebrow}>Claridad antes de decidir</span><h2>Preguntar también<br /><em>es avanzar.</em></h2><p>Toca una pregunta y te respondemos aquí mismo. Si te queda otra, el equipo te contesta por WhatsApp.</p><a className={s.inlineLink} href="#empezar">Prefiero verlo en vídeo <Icon /></a></div>
        <div className={s.chat} data-anim data-reveal>
          <div className={s.chatHead}><span className={s.chatAvatar}><Image src="/contygo/v7/simbolo-oscuro.png" alt="" width={568} height={640} sizes="24px" /></span><span><strong>ContyGo</strong><small><i aria-hidden="true" />Respuestas claras, en español</small></span></div>
          <div className={s.chatBody}>
            <p className={s.chatHello}>Hola. Estas son las preguntas que más nos hacen. Toca la tuya.</p>
            {faqs.map(([question, answer]) => <details key={question} className={s.qa}><summary>{question}</summary><div className={s.reply}><span className={s.typing} aria-hidden="true"><i /><i /><i /></span><p>{answer}</p></div></details>)}
          </div>
          <a className={s.composer} href={help}><span>¿Otra pregunta? <b>Escríbele al equipo</b></span><i><Icon kind="send" /></i></a>
        </div>
      </section>

      <Finale onOpen={open} />
      <GreenThread scope={main} />
    </main>
    <footer className={s.footer}><div><a href="#inicio" className={s.logo}><Image src={logo} width={3000} height={849} alt="ContyGo" sizes="150px" /></a><span>Siempre contigo. Paso a paso.</span></div><p>El consultor no es abogado y no presta servicios legales. ContyGo ofrece asistencia administrativa y tecnológica. No garantiza decisiones ni tiempos de las autoridades.</p><div className={s.footerBottom}><span>© 2026 USA LATINO PRIME LLC</span><a href="/privacidad">Privacidad</a><a href="/terminos">Términos</a><a href="https://contygo.app/entrar">Mi cuenta <span aria-hidden="true">↗</span></a></div></footer>
    {/* Whenever the hero button is out of sight (above or still below the fold), the dock offers it. */}
    <div className={s.dock} data-show={!heroVisible && dock && !service} aria-hidden={heroVisible || !dock || Boolean(service)}>
      <a href="#servicios" tabIndex={!heroVisible && dock && !service ? 0 : -1}><span><strong>Encontrar mi servicio</strong><small>Precios desde {money.format(fromPrice)}</small></span><i><Icon /></i></a>
    </div>
    <ServiceCinemaDialog service={service} origin={origin} onClose={() => setService(null)} />
  </div>;
}
