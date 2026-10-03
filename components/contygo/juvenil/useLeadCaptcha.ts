"use client";

/* Turnstile invisible para registrar el lead (SEC-02). El navegador pide un token con la acción «lead»
   mientras la persona está en el paso de contacto; POST /api/contratar/lead lo manda como captchaToken
   y el servidor lo verifica con esa misma acción. Apariencia «interaction-only»: no se ve nada salvo que
   Cloudflare necesite una interacción. Registrar el lead sigue siendo «lanzar y olvidar»: si el token no
   llega a tiempo, el lead sale sin él y el recorrido no se detiene nunca.
   La clave de sitio es NEXT_PUBLIC_*: Next la incrusta en el build, igual que la ficha de contratación. */
import { useCallback, useEffect, useRef } from "react";

type TurnstileApi = { render: (el: HTMLElement, options: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void };
const turnstileApi = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

export const LEAD_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
/** How long the lead waits for a token that is still being solved. */
const WAIT_MS = 4000;

export function useLeadCaptcha(active: boolean) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<Array<(value: string | null) => void>>([]);

  const settle = useCallback((value: string | null) => {
    token.current = value;
    if (value) { const list = waiting.current; waiting.current = []; list.forEach(resolve => resolve(value)); }
  }, []);

  useEffect(() => {
    const element = container.current;
    if (!active || !LEAD_SITE_KEY || !element) return;
    let cancelled = false;
    const mount = () => {
      const api = turnstileApi();
      if (cancelled || widget.current || !api) return;
      widget.current = api.render(element, {
        sitekey: LEAD_SITE_KEY, action: "lead", appearance: "interaction-only", size: "normal", language: "es",
        callback: (value: string) => settle(value),
        "expired-callback": () => settle(null),
        "error-callback": () => settle(null),
      });
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true; script.defer = true; script.dataset.turnstile = "true";
      document.head.appendChild(script);
    }
    if (turnstileApi()) mount(); else script.addEventListener("load", mount, { once: true });
    return () => {
      cancelled = true;
      script?.removeEventListener("load", mount);
      const api = turnstileApi();
      if (widget.current && api) api.remove(widget.current);
      widget.current = null; token.current = null;
    };
  }, [active, settle]);

  /** The token, if it is ready or arrives within a few seconds; null otherwise (the lead goes without it). A token is single use. */
  const take = useCallback((): Promise<string | null> => {
    if (!LEAD_SITE_KEY) return Promise.resolve(null);
    const ready = token.current;
    const spend = (value: string | null) => { token.current = null; const api = turnstileApi(); if (value && widget.current && api) api.reset(widget.current); return value; };
    if (ready) return Promise.resolve(spend(ready));
    return new Promise<string | null>(resolve => {
      const timer = window.setTimeout(() => { waiting.current = waiting.current.filter(item => item !== done); resolve(null); }, WAIT_MS);
      const done = (value: string | null) => { window.clearTimeout(timer); resolve(spend(value)); };
      waiting.current.push(done);
    });
  }, []);

  return { container, take };
}
