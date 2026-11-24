"use client";

/* The team's menu (/links): the services by course, each with its clay picture, its live price, one line about it and
   its link, plus two buttons — the message for the client's chat, or the link alone. Prices come from the platform
   as on the rest of the site (useServicePrices): while they load or if they fail, no price is shown, never an old one. */
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { EXTRAS_SEEN_ON, LINK_SECTIONS, type LinkItem, type LinkPlan } from "@/lib/contygo-links";
import { useServicePrices, type PriceMap } from "@/lib/contygo-api/prices-client";
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

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { // browsers that refuse the clipboard API: the old way, through a hidden field
    const field = document.createElement("textarea");
    field.value = text; field.setAttribute("readonly", ""); field.style.cssText = "position:fixed;opacity:0;font-size:16px";
    document.body.appendChild(field); field.select(); field.setSelectionRange(0, text.length);
    let done = false;
    try { done = document.execCommand("copy"); } catch { done = false; }
    field.remove();
    return done;
  }
}

const Icon = {
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z" /></svg>,
  done: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>,
  out: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.500v-11A1.500 1.500 0 0 1 5.500 6H10" /></svg>,
  find: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.800-3.800" /></svg>,
  seen: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#061b3d" /><path d="M6.800 12.400l3.400 3.400 7-7.400" fill="none" stroke="#25d366" strokeWidth="2.800" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

/** A button that copies and says so for a moment. */
function Copy({ text, label, icon, main, className }: { text: () => string; label: string; icon: JSX.Element; main?: boolean; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = async () => {
    setState((await copyText(text())) ? "done" : "failed");
    clearTimeout(timer.current); timer.current = setTimeout(() => setState("idle"), 1700);
  };
  return (
    <button type="button" className={`${s.copy} ${main ? s.main : ""} ${className ?? ""}`} data-state={state} onClick={run}>
      {state === "done" ? Icon.done : icon}
      <span aria-live="polite">{state === "done" ? "Copiado" : state === "failed" ? "No se pudo copiar" : label}</span>
    </button>
  );
}

export default function LinksMenu() {
  const prices = useServicePrices();
  const [query, setQuery] = useState("");
  const [stuck, setStuck] = useState(false);
  const [late, setLate] = useState(false);
  const tools = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setStuck((tools.current?.getBoundingClientRect().top ?? 1) <= 0);
    check(); window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  // Prices that have not come after a while: say so instead of leaving the card silently without them.
  useEffect(() => { if (prices) return; const wait = setTimeout(() => setLate(true), 6000); return () => clearTimeout(wait); }, [prices]);

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
          <Image className={s.hero} src="/contygo/v8/producto-servicios.webp" alt="" width={340} height={340} priority />
          <h1>Carta de servicios</h1>
          <p>Cada servicio con su <b>precio</b> y su <b>link</b>. Toca «Copiar mensaje» y pégalo en el chat del cliente.</p>
          <span className={s.seen}>{Icon.seen}Precios al día: los mismos de la página</span>
        </div>
      </header>

      <main className={s.sheet}>
        <div className={s.tools} ref={tools} data-stuck={stuck || undefined}>
          <div className={s.wrap}>
            <label className={s.find}>
              {Icon.find}
              <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Busca un servicio" aria-label="Busca un servicio" autoComplete="off" />
            </label>
            <nav className={s.chips} aria-label="Secciones de la carta">
              {LINK_SECTIONS.map(section => <a key={section.id} href={`#${section.id}`} onClick={() => setQuery("")}>{section.chip}</a>)}
            </nav>
          </div>
        </div>

        <div className={s.wrap}>
          {!prices && late && <p className={s.wait} role="status"><b>Los precios no cargaron.</b>Revisa tu internet y recarga la página. Los links sí funcionan.</p>}

          {sections.map(section => (
            <section className={s.course} id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              <p>{section.note}</p>
              <div className={s.list}>
                {section.items.map(item => {
                  const plans = plansOf(item, prices);
                  return (
                    <article className={s.item} key={item.key}>
                      <Image src={`/contygo/v8/${item.art}.webp`} alt="" width={76} height={76} />
                      <div>
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
                      </div>
                      <div className={s.acts}>
                        <a className={s.url} href={`https://${item.url}`} target="_blank" rel="noopener noreferrer">{Icon.out}<span>{item.url}</span></a>
                        <Copy main text={() => message(item, plans)} label="Copiar mensaje" icon={Icon.chat} />
                        <Copy text={() => `https://${item.url}`} label="Copiar link" icon={Icon.copy} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {!sections.length && <p className={s.none}><b>No hay un servicio con ese nombre.</b>Borra lo que escribiste para ver la carta completa.</p>}

          <footer className={s.foot}>
            <h2>Antes de dar un precio</h2>
            <ul>
              <li>Los precios son en dólares y son los <b>honorarios de ContyGo</b>. Las tasas del gobierno se pagan aparte.</li>
              <li>Los de los servicios se leen de la plataforma cada vez que abres esta página: <b>siempre son los de hoy</b>.</li>
              <li>Los del Club y de la asesoría con Henry son los que mostraban sus páginas el {EXTRAS_SEEN_ON}.</li>
              <li>Henry Orellana es consultor de inmigración registrado en Utah. <b>No es abogado</b> y no da asesoría legal.</li>
            </ul>
            <Copy className={s.all} text={everything} label="Copiar toda la carta" icon={Icon.copy} />
          </footer>
        </div>
      </main>
    </div>
  );
}
