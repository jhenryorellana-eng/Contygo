/* ============================================================
   UsaLatinoPrime — Página propia de cada servicio (/visa-juvenil, …)
   Una URL por servicio para campañas de Meta Ads: el anuncio aterriza
   directo en el servicio, con contratación y evaluación opcional.
   ============================================================ */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ServiceFunnel from "@/components/ServiceFunnel";
import { SERVICES, getServiceBySlug } from "@/lib/services";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";

// Solo existen los slugs declarados en lib/services.ts; el resto → 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const svc = getServiceBySlug(params.slug);
  if (!svc) return {};
  const catalogService = CONTYGO_SERVICES.find((service) => service.id === svc.id);
  const title = `${catalogService?.name ?? svc.name} — Contratación en ContyGo`;
  const description = `${catalogService?.description ?? svc.desc} Inicia tu contratación en ContyGo o responde una evaluación opcional.`;
  return {
    title,
    description,
    alternates: { canonical: `/${svc.slug}` },
    openGraph: {
      title,
      description,
      url: `/${svc.slug}`,
      type: "website",
    },
    twitter: { title, description },
  };
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const svc = getServiceBySlug(params.slug);
  if (!svc) notFound();
  return <ServiceFunnel serviceId={svc.id} />;
}
