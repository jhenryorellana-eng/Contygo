import type { Metadata } from "next";
import ContygoLanding from "@/components/contygo/v7/ContygoLanding";

export const metadata: Metadata = { title: "ContyGo · Tu historia sigue", robots: { index: false, follow: false } };
export default function Page() { return <ContygoLanding />; }
