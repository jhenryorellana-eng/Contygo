/* ============================================================
   Sitemap — home + una URL por servicio (clave para ads/SEO)
   ============================================================ */
import type { MetadataRoute } from "next";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { getServiceGuideUrl } from "@/lib/contygo";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...CONTYGO_SERVICES.map(service => ({ url: `${SITE_URL}/servicios/${service.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...CONTYGO_SERVICES.map(service => ({
      url: `${SITE_URL}${getServiceGuideUrl(service.id)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/califica`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    { url: `${SITE_URL}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
