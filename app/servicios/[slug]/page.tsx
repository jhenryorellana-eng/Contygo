import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import ServicePresentation from "@/components/contygo/ServicePresentation";

export const dynamicParams = false;
export function generateStaticParams() {
  return CONTYGO_SERVICES.map(service => ({ slug: service.slug }));
}
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const service = CONTYGO_SERVICES.find(item => item.slug === params.slug);
  if (!service) return {};
  const title = `${service.name} — Conoce el servicio y crea tu contrato`;
  return { title, description: service.description, alternates: { canonical: `/servicios/${service.slug}` }, openGraph: { title, description: service.description, url: `/servicios/${service.slug}` }, twitter: { title, description: service.description } };
}
export default function ServicePresentationPage({ params }: { params: { slug: string } }) {
  const service = CONTYGO_SERVICES.find(item => item.slug === params.slug);
  if (!service) notFound();
  return <ServicePresentation service={service} />;
}
