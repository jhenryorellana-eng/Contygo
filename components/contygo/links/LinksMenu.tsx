"use client";

/* The team's menu (/links), made for whoever answers clients all day: a short header so the list starts on the first
   screen, the search at hand, and each service in a compact row — its clay picture, its live price, one line, and
   three actions always in sight (the message for the client's chat, straight to WhatsApp, or the link alone). What a
   client asks next (who it is for, what it includes) opens under the row, and each row has the assistant's own box:
   a question written there is about that service (components/contygo/links/TeamChat.tsx). Prices come from the platform as on the rest
   of the site (useServicePrices): while they load or if they fail, no price is shown, never an old one. */
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { EXTRAS_SEEN_ON, LINK_SECTIONS, type LinkItem, type LinkPlan } from "@/lib/contygo-links";
import { useServicePrices, type PriceMap } from "@/lib/contygo-api/prices-client";
import { copyText } from "./copy";
import Brain3D from "./Brain3D";
import TeamChat, { ServiceAsk } from "./TeamChat";
import s from "./LinksMenu.module.css";

const money = (dollars: number) => "$" + dollars.toLocaleString("en-US");
const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The plans to show: the item's own, or the live ones of its service. `null` = a priced service whose price is not known yet. */
function plansOf(item: LinkItem, prices: PriceMap | null): LinkPlan[] | null | undefined {
  if (item.plans) return item.plans;
  if (!item.slug) return undefined;
  const live = prices?.[item.slug];
  if (!live) return null;
  return [...live.plans].sort((a, b) => a.priceCents - b.priceCents).map(plan => ({ name: plan.name.es || plan.name.en || "", dollars: plan.priceCents / 100 }));
}
const amount = (plan: LinkPlan) => money(plan.dollars) + (plan.per ?? "");
const each = (plans: LinkPlan[]) => plans.map(plan => `${plan.name} ${amount(plan)}`).join(", ");
const clean = (name: string) => name.replace(" · ", " - ");

function message(item: LinkItem, plans: LinkPlan[] | null | undefined) {
  const price = !plans?.length ? "" : plans.length > 1 ? `Precio: desde ${amount(plans[0])} (${each(plans)})\n` : `Precio: ${amount(plans[0])}\n`;
  return `*${clean(item.name)}*\n${price}${item.say}\nhttps://${item.url}`;
}
const line = (item: LinkItem, plans: LinkPlan[] | null | undefined) => `${clean(item.name)}${plans?.length ? ": " + (plans.length > 1 ? each(plans) : amount(plans[0])) : ""}\nhttps://${item.url}`;

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = {
  copy: <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.3" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></svg>,
  link: <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.4" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.400-6.400l-1.200 1.200" /><path d="M14 10a4.5 4.5 0 0 0-6.400 0l-3 3a4.500 4.500 0 0 0 6.400 6.400l1.200-1.200" /></svg>,
  whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2a9.800 9.800 0 0 0-8.400 14.800L2.300 21.800l4.900-1.300A9.800 9.800 0 1 0 12 2.200zm0 1.800a8 8 0 1 1-4.200 14.800l-.3-.2-2.700.7.700-2.600-.2-.3A8 8 0 0 1 12 4zm-3.300 3.900c-.2 0-.5.100-.7.400-.300.300-1 1-1 2.400s1 2.800 1.200 3c.100.200 2 3.200 5 4.300 2.500 1 3 .800 3.500.700.500 0 1.700-.700 2-1.400.200-.700.200-1.200.100-1.400l-.500-.300-1.800-.900c-.300-.100-.500-.100-.700.200l-.800 1c-.100.200-.300.200-.600.100-.300-.200-1.200-.500-2.300-1.400a8.500 8.500 0 0 1-1.600-2c-.200-.300 0-.400.100-.600l.400-.500.300-.500v-.500l-.800-2c-.200-.500-.400-.500-.600-.500h-.200z" /></svg>,
  done: <svg viewBox="0 0 24 24" {...stroke} strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>,
  find: <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.800-3.800" /></svg>,
  more: <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.800" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>,
  seen: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#061b3d" /><path d="M6.800 12.400l3.400 3.400 7-7.400" fill="none" stroke="#25d366" strokeWidth="2.800" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

/** A button that copies and says so for a moment. */
function Copy({ text, label, icon, kind, className }: { text: () => string; label: string; icon: JSX.Element; kind?: "main"; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = async () => {
    setState((await copyText(text())) ? "done" : "failed");
    clearTimeout(timer.current); timer.current = setTimeout(() => setState("idle"), 1700);
  };
  return (
    <button type="button" className={`${s.act} ${kind === "main" ? s.main : ""} ${className ?? ""}`} data-state={state} onClick={run}>
      {state === "done" ? Icon.done : icon}
      <span aria-live="polite">{state === "done" ? "Copiado" : state === "failed" ? "No se pudo" : label}</span>
    </button>
  );
}

function Dish({ item, prices, flash, onJump }: { item: LinkItem; prices: PriceMap | null; flash: boolean; onJump: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const plans = plansOf(item, prices);
  const text = () => message(item, plans);
  const details = Boolean(item.who || item.includes?.length);
  return (
    <article className={s.item} id={`servicio-${item.key}`} data-flash={flash || undefined}>
      <Image src={`/contygo/v8/${item.art}.webp`} alt="" width={64} height={64} />
      <div className={s.body}>
        <div className={s.name}>
          <h3>{item.name}</h3>
          {plans !== undefined && <i className={s.dots} />}
          {plans?.length ? (
            <span className={s.price}>{plans.length > 1 && <small>desde</small>}{money(plans[0].dollars)}{plans.length === 1 && plans[0].per ? <sub>{plans[0].per}</sub> : null}</span>
          ) : plans === null ? <span className={s.pending} aria-label="Cargando el precio" /> : null}
        </div>
        {item.top && <span className={s.top}>Más pedido</span>}
        <p className={s.about}>{item.about}</p>
        {plans && plans.length > 1 && (
          <ul className={s.plans}>
            {plans.map(plan => <li key={plan.name}><span>{plan.name}</span><i className={s.dots} /><b>{amount(plan)}</b></li>)}
          </ul>
        )}
        <div className={s.meta}>
          <a className={s.url} href={`https://${item.url}`} target="_blank" rel="noopener noreferrer">{item.url.split("/").map((part, index) => index ? <span key={index}>/<wbr />{part}</span> : part)}</a>
          {details && (
            <button type="button" className={s.more} aria-expanded={open} onClick={() => setOpen(value => !value)}>
              {open ? "Ocultar" : "Qué incluye"}{Icon.more}
            </button>
          )}
        </div>
        {details && open && (
          <div className={s.details}>
            {item.who && <><h4>Para quién es</h4><p>{item.who}</p></>}
            {item.includes?.length ? <><h4>Qué incluye</h4><ul>{item.includes.map(entry => <li key={entry}>{entry}</li>)}</ul></> : null}
            {item.mind?.length ? <><h4>Ten en cuenta</h4><ul>{item.mind.map(entry => <li key={entry}>{entry}</li>)}</ul></> : null}
          </div>
        )}
      </div>
      <div className={s.acts}>
        <Copy kind="main" text={text} label="Copiar mensaje" icon={Icon.copy} />
        <a className={`${s.act} ${s.wa}`} href={`https://wa.me/?text=${encodeURIComponent(text())}`} target="_blank" rel="noopener noreferrer">{Icon.whatsapp}<span>WhatsApp</span></a>
        <Copy text={() => `https://${item.url}`} label="Link" icon={Icon.link} />
      </div>
      {item.slug && <ServiceAsk serviceId={item.key} name={item.name} onJump={onJump} />}
    </article>
  );
}

export default function LinksMenu() {
  const prices = useServicePrices();
  const [query, setQuery] = useState("");
  const [stuck, setStuck] = useState(false);
  const [late, setLate] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [chat, setChat] = useState(false);
  const tools = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setStuck((tools.current?.getBoundingClientRect().top ?? 1) <= 0);
    check(); window.addEventListener("scroll", check, { passive: true });
    // At a desk the keyboard is already under the hands: start in the search. (On a phone that would raise the keyboard over the list.)
    if (window.matchMedia("(hover:hover) and (min-width:900px)").matches) field.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  // Prices that have not come after a while: say so instead of leaving the card silently without them.
  useEffect(() => { if (prices) return; const wait = setTimeout(() => setLate(true), 6000); return () => clearTimeout(wait); }, [prices]);

  // From the assistant: «Ver Permiso de Trabajo» clears the search, goes to that row and marks it for a moment.
  const jump = (key: string) => {
    setQuery(""); setFlash(key);
    window.setTimeout(() => document.getElementById(`servicio-${key}`)?.scrollIntoView({ block: "center" }), 60);
    window.setTimeout(() => setFlash(current => current === key ? null : current), 2600);
  };

  const q = plain(query.trim());
  const sections = useMemo(() => LINK_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => !q || plain(`${item.name} ${item.about} ${section.title} ${item.url}`).includes(q)),
  })).filter(section => section.items.length), [q]);

  const everything = () => "ContyGo - Carta de servicios\n\n" + LINK_SECTIONS.map(section => section.title.toUpperCase() + "\n" + section.items.map(item => line(item, plansOf(item, prices))).join("\n")).join("\n\n");

  return (
    <div className={s.page}>
      <header className={s.cover}>
        <div className={s.wrap}>
          <Image className={s.logo} src="/contygo/brand/logo-dark.png" alt="ContyGo" width={170} height={40} priority />
          <Brain3D className={s.hero} />
          <h1>Carta de servicios</h1>
          <p>El precio, el link y lo que incluye cada servicio, listos para enviar al cliente.</p>
          <span className={s.seen}>{Icon.seen}Precios al día</span>
        </div>
      </header>

      <main className={s.sheet}>
        <div className={s.tools} ref={tools} data-stuck={stuck || undefined}>
          <div className={s.wrap}>
            <label className={s.find}>
              {Icon.find}
              <input ref={field} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Busca: permiso, asilo, ITIN…" aria-label="Busca un servicio" autoComplete="off" enterKeyHint="search" />
            </label>
            <nav className={s.chips} aria-label="Secciones de la carta">
              {LINK_SECTIONS.map(section => <a key={section.id} href={`#${section.id}`} onClick={() => setQuery("")}>{section.chip}</a>)}
            </nav>
          </div>
        </div>

        <div className={s.wrap}>
          <button type="button" className={s.band} onClick={() => setChat(true)}>
            <Image src="/contygo/v8/producto-henry.webp" alt="" width={56} height={56} />
            <span><b>¿Tu cliente tiene una duda?</b>Pregúntale al Cerebro: costos, pagos, documentos, cortes y edades por estado.</span>
            <i>Preguntar</i>
          </button>
          <p className={s.rule}>Precios en dólares. Son los <b>honorarios de ContyGo</b>: las tasas del gobierno se pagan aparte.</p>
          {!prices && late && <p className={s.wait} role="status"><b>Los precios no cargaron.</b>Revisa tu internet y recarga la página. Los links sí funcionan.</p>}

          {sections.map(section => (
            <section className={s.course} id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              <p>{section.note}</p>
              <div className={s.list}>{section.items.map(item => <Dish key={item.key} item={item} prices={prices} flash={flash === item.key} onJump={jump} />)}</div>
            </section>
          ))}

          {!sections.length && <p className={s.none}><b>No hay un servicio con ese nombre.</b>Borra lo que escribiste para ver la carta completa.</p>}

          <footer className={s.foot}>
            <h2>Antes de dar un precio</h2>
            <ul>
              <li>Los precios de los servicios se leen de la plataforma cada vez que abres esta página: <b>siempre son los de hoy</b>.</li>
              <li>Los del Club y de la asesoría con Henry son los que mostraban sus páginas el {EXTRAS_SEEN_ON}.</li>
              <li>«Copiar mensaje» copia el nombre, el precio y el link; «WhatsApp» abre el mismo mensaje para elegir el chat.</li>
              <li>El asistente responde con lo que ContyGo tiene escrito de cada servicio; en la fila de un servicio, responde sobre ese servicio. Si no tiene un dato, lo dice: confírmalo antes de responder.</li>
              <li>Henry Orellana es consultor de inmigración registrado en Utah. <b>No es abogado</b> y no da asesoría legal.</li>
            </ul>
            <Copy className={s.all} text={everything} label="Copiar toda la carta" icon={Icon.copy} />
          </footer>
        </div>
      </main>
      <TeamChat open={chat} onOpen={setChat} onJump={jump} />
    </div>
  );
}
