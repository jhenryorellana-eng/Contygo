"use client";

/* Precios VIVOS en el navegador (GET /api/contratar/precios, que lee el catálogo de contygo).
   Se piden una sola vez por carga de página y se comparten entre todas las tarjetas. Mientras llegan,
   o si fallan, no hay precio: nunca se muestra el de lib/contygo-catalog.ts (puede estar desactualizado). */
import { useEffect, useState } from "react";

export type PlanPrice = { name: { es?: string; en?: string }; priceCents: number };
export type PriceMap = Record<string, { fromCents: number; plans: PlanPrice[] }>;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const formatCents = (cents: number) => money.format(cents / 100);

let cached: PriceMap | null = null;
let inflight: Promise<PriceMap | null> | null = null;
let failedAt = 0;
const RETRY_AFTER_MS = 30_000;

export function loadPrices(): Promise<PriceMap | null> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return Promise.resolve(null);
  inflight = fetch("/api/contratar/precios", { cache: "no-store" })
    .then(async response => {
      const data = await response.json().catch(() => null) as { ok?: boolean; prices?: PriceMap } | null;
      if (!response.ok || !data?.ok || !data.prices) throw new Error("prices_unavailable");
      cached = data.prices; failedAt = 0;
      return cached;
    })
    .catch(() => { failedAt = Date.now(); return null; })
    .finally(() => { inflight = null; });
  return inflight;
}

/** The live price map, or null while it loads or when the catalog is down (then show no price). */
export function useServicePrices(): PriceMap | null {
  const [prices, setPrices] = useState<PriceMap | null>(cached);
  useEffect(() => {
    let alive = true;
    void loadPrices().then(next => { if (alive && next) setPrices(next); });
    return () => { alive = false; };
  }, []);
  return prices;
}

/** «$250» for one service, or null (no price shown). */
export const fromPriceLabel = (prices: PriceMap | null, slug: string) => {
  const entry = prices?.[slug];
  return entry ? formatCents(entry.fromCents) : null;
};

/** The live price of one plan of a local service, matched by the plan's Spanish name; a lone plan matches a lone plan. */
export function planPriceCents(prices: PriceMap | null, slug: string, planName: string, localPlanCount: number): number | null {
  const entry = prices?.[slug];
  if (!entry) return null;
  const byName = entry.plans.find(plan => plan.name.es?.trim().toLowerCase() === planName.trim().toLowerCase());
  if (byName) return byName.priceCents;
  return localPlanCount <= 1 && entry.plans.length === 1 ? entry.plans[0].priceCents : null;
}

/** Lowest live price among all services (landing-wide «desde»), or null. */
export function lowestCents(prices: PriceMap | null): number | null {
  const values = Object.values(prices ?? {}).map(entry => entry.fromCents).filter(value => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : null;
}
