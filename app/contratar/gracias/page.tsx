import type { Metadata } from "next";
import ContractThanks from "@/components/contygo/contract/ContractThanks";

export const metadata: Metadata = { title: "Tu contrato · ContyGo", robots: { index: false, follow: false } };

export default function Page() {
  return <main style={{ minHeight: "100dvh", background: "#061B3D" }}><ContractThanks /></main>;
}
