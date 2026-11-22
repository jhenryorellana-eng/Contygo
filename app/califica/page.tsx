/* ============================================================
   /califica — «Cuéntanos cómo te fue»: la página que se envía a
   los clientes para dejar su felicitación (con foto, si quieren).
   ============================================================ */
import type { Metadata } from "next";
import ShareStory from "@/components/contygo/v7/ShareStory";

export const metadata: Metadata = {
  title: "Cuéntanos cómo te fue · ContyGo",
  description: "¿Hiciste tu trámite con ContyGo? Cuéntanos cómo te fue: tu historia ayuda a otras familias a dar el paso.",
  alternates: { canonical: "/califica" },
};

export default function CalificaPage() {
  return <ShareStory />;
}
