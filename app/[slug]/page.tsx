/* El link de cada servicio (/visa-juvenil, /apelacion-bia, /llc-florida…): para los anuncios y para mandárselo
   a un cliente. Abre la landing con la guía del servicio ya en pantalla —vídeo → conversación → contrato—.
   Los servicios que tenían página en el embudo antiguo conservan su dirección (legacySlug); los alias de
   next.config.mjs, incluido el slug de contygo.app, redirigen aquí. Su og:image es la vista previa que muestra
   WhatsApp (scripts/build-share-previews.mjs). */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContygoLanding from "@/components/contygo/v7/ContygoLanding";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { getServiceGuideUrl } from "@/lib/contygo";
import { getRebuildServiceFilm } from "@/lib/contygo-rebuild-media";

// Solo existen los links del catálogo; el resto → 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return CONTYGO_SERVICES.map(service => ({ slug: getServiceGuideUrl(service.id)!.slice(1) }));
}

const findService = (slug: string) => CONTYGO_SERVICES.find(service => getServiceGuideUrl(service.id) === `/${slug}`);

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const service = findService(params.slug);
  if (!service) return {};
  const title = `${service.name} · ContyGo`;
  // Only a service whose guide has a film promises a video; the rest open on the questions.
  const description = getRebuildServiceFilm(service.id).src
    ? `Mira la guía en vídeo de ${service.name} y conoce su proceso paso a paso. Con el precio y tu contrato a la vista, decides cuándo empezar.`
    : `Conoce ${service.name} y su proceso paso a paso. Con el precio y tu contrato a la vista, decides cuándo empezar.`;
  const url = `/${params.slug}`;
  const image = { url: `/contygo/compartir/${service.id}.jpg`, width: 1200, height: 630, alt: service.name };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", locale: "es_US", siteName: "ContyGo", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const service = findService(params.slug);
  if (!service) notFound();
  return <ContygoLanding initialServiceId={service.id} />;
}
