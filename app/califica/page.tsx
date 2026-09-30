/* ============================================================
   /califica — página que se envía a los clientes felices
   ============================================================ */
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import RateForm from "@/components/reviews/RateForm";

export const metadata: Metadata = {
  title: "Califica nuestro servicio — USA Latino Prime",
  description:
    "¿Llevaste tu trámite con USA Latino Prime? Cuéntanos tu experiencia: tu reseña ayuda a otras familias a dar el paso.",
  alternates: { canonical: "/califica" },
};

export default function CalificaPage() {
  return (
    <div className="home rate">
      <SiteHeader />
      <main className="rate__main">
        <RateForm />
      </main>
    </div>
  );
}
