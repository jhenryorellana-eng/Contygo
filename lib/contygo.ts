import type { Tone } from "./types";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";

export const CONTYGO_URL = "https://contygo.app/";

/** Landing choice opens the service video before the external contract. */
export function getServicePresentationUrl(serviceId: string): string | null {
  const service = CONTYGO_SERVICES.find(item => item.id === serviceId);
  return service ? `/servicios/${service.slug}` : null;
}

/** Link to send a client: the landing opens straight on this service's guide (video → conversation → contract).
 * Services that had a page on the old funnel keep that same address (legacySlug), so ads and links already sent still work. */
export function getServiceGuideUrl(serviceId: string): string | null {
  const service = CONTYGO_SERVICES.find(item => item.id === serviceId);
  return service ? `/${service.legacySlug ?? service.slug}` : null;
}

/** Public detail page: ContyGo handles account, plan, signature and payment. */
export function getContygoServiceUrl(serviceId: string): string | null {
  const service = CONTYGO_SERVICES.find((item) => item.id === serviceId);
  return service ? `${CONTYGO_URL}servicios/${service.slug}` : null;
}

/** Qualified results can continue independently; review/denied keep assistance. */
export function getSelfServiceUrl(serviceId: string, tone: Tone): string | null {
  if (tone !== "success" && tone !== "urgent") return null;
  return getContygoServiceUrl(serviceId);
}
