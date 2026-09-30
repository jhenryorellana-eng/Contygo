"use client";

/* ============================================================
   UsaLatinoPrime — Barra superior compartida (home, servicios, califica)
   ============================================================ */
import Image from "next/image";
import Link from "next/link";
import { waRoute } from "@/lib/wa-route";
import { trackBrowser } from "@/lib/meta/pixel-client";
import { Ico } from "./icons";

export default function SiteHeader() {
  return (
    <header className="topbar">
      <Link href="/" aria-label="USA Latino Prime — inicio">
        <Image
          className="topbar__logo"
          src="/logo.png"
          alt="USA Latino Prime"
          width={59}
          height={46}
          priority
          style={{ width: "auto" }}
        />
      </Link>
      <div className="topbar__right">
        <a
          className="topbar__phone"
          href={waRoute()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackBrowser("Contact")}
        >
          {Ico.whatsapp}
          <span>WhatsApp</span>
        </a>
      </div>
    </header>
  );
}
