"use client";

/* ============================================================
   Enlace a la página de un servicio que, en el mismo toque,
   desbloquea el sonido de su video (ver lib/media-unlock.ts).
   ============================================================ */
import Link from "next/link";
import type { ComponentProps } from "react";
import { VIDEO_URL } from "@/lib/config";
import { unlockVideo } from "@/lib/media-unlock";

type Props = ComponentProps<typeof Link> & { video?: string };

export default function ServiceLink({ video, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        unlockVideo(video || VIDEO_URL);
        onClick?.(e);
      }}
    />
  );
}
