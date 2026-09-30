"use client";

/* ============================================================
   Enlace a WhatsApp con tracking de Contact (Pixel).
   Apunta a /ir/whatsapp: el servidor reparte por turno entre las
   asesoras activas y redirige a wa.me (ver lib/wa-route.ts).
   Reutilizable desde componentes de servidor (hero, footer…).
   ============================================================ */
import type { ReactNode } from "react";
import { trackBrowser } from "@/lib/meta/pixel-client";
import { waRoute, type LeadKind } from "@/lib/wa-route";

interface WhatsAppLinkProps {
  message: string;
  /** Origen del lead para el panel (por defecto, botón de WhatsApp). */
  kind?: LeadKind;
  serviceId?: string | null;
  className?: string;
  children: ReactNode;
}

export default function WhatsAppLink({ message, kind, serviceId, className, children }: WhatsAppLinkProps) {
  return (
    <a
      className={className}
      href={waRoute({ message, kind, serviceId })}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={() => trackBrowser("Contact")}
    >
      {children}
    </a>
  );
}
