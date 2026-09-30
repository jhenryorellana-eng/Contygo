/* ============================================================
   /equipo — panel de las asesoras (contactos propios y su cuenta)
   ============================================================ */
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import TeamApp from "@/components/admin/TeamApp";

export const metadata: Metadata = {
  title: "Equipo — USA Latino Prime",
  robots: { index: false, follow: false },
};

export default function EquipoPage() {
  return (
    <div className="home rate">
      <SiteHeader />
      <main className="rate__main rate__main--wide">
        <TeamApp />
      </main>
    </div>
  );
}
