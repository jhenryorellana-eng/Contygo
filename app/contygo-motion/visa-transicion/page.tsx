import { notFound } from "next/navigation";
import VisaTransitionPreview from "@/components/contygo/juvenil/VisaTransitionPreview";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <VisaTransitionPreview />;
}
