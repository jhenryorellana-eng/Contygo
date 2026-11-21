"use client";

/* The page of 21-11-2026: the hero as a short story, the route woven with its dotted line, every step as a sheet with
   its tickets, «De la mano de Henry Orellana» and the brand's sound. The owner reviewed it piece by piece on the local
   page and asked to publish it all («sube todo de una vez»), so it is the page: LIVE.
   The page before it is still in the code, behind this same switch, for one release: in development a control
   (RouteSteps) shows it, to compare; setting LIVE to false brings it back whole. Its parts (the single hero photo, the
   band of figures, Station and Panel in RouteSteps, ServiceShowcase) can go once this one has proved itself. */
import { useEffect, useState } from "react";

const LIVE = true, KEY = "cg-ruta-on", EVENT = "cg-fresh";

export function useFresh(): [boolean, (next: boolean) => void] {
  const [fresh, setFresh] = useState(LIVE);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const read = () => { try { setFresh(localStorage.getItem(KEY) !== "no"); } catch { setFresh(LIVE); } };
    read();
    addEventListener(EVENT, read);
    return () => removeEventListener(EVENT, read);
  }, []);
  const choose = (next: boolean) => { try { localStorage.setItem(KEY, next ? "si" : "no"); } catch {} dispatchEvent(new Event(EVENT)); };
  return [fresh, choose];
}

/* The pieces of the hero under review that can be taken off (21-11-2026: «la pantalla del hero está muy cargada, hay
   cosas que no quiero que vayan», without saying which). In development a small panel (ContygoLanding) turns each
   one off and on, so the owner can see it and say; what he settles on becomes the hero. `HERO_OFF` is how it starts:
   without the three pieces he never asked for. */
export const HERO_PARTS = [
  ["pantalla", "Pantalla que sale del teléfono"], ["cifras", "Cifras"], ["luces", "Luces de fondo"], ["letrero", "Letrero Black Friday"],
  ["bandera", "Bandera"], ["simbolo", "Símbolo ✓"], ["comprobaciones", "Las 3 comprobaciones"],
] as const;
const HERO_OFF = ["pantalla", "cifras", "luces"], PARTS_KEY = "cg-hero-off";

export function useHeroParts(): [string[], (part: string) => void] {
  const [off, setOff] = useState<string[]>(HERO_OFF);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    try { const saved = localStorage.getItem(PARTS_KEY); if (saved !== null) setOff(saved.split(",").filter(Boolean)); } catch {}
  }, []);
  const toggle = (part: string) => setOff(now => { const next = now.includes(part) ? now.filter(item => item !== part) : [...now, part]; try { localStorage.setItem(PARTS_KEY, next.join(",")); } catch {} return next; });
  return [off, toggle];
}
