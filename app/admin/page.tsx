/* ============================================================
   /admin — panel privado de moderación de reseñas
   ============================================================ */
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AdminPanel from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "Admin — USA Latino Prime",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="home rate">
      <SiteHeader />
      <main className="rate__main rate__main--wide">
        <AdminPanel />
      </main>
    </div>
  );
}
