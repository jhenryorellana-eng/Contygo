"use client";

/* ============================================================
   Confeti de celebración (sólo en resultados positivos)
   Se genera en cliente tras el montaje para evitar desajustes
   de hidratación y respeta prefers-reduced-motion vía CSS.
   ============================================================ */
import { useEffect, useState } from "react";

interface Bit {
  left: string;
  background: string;
  animationDuration: string;
  animationDelay: string;
  transform: string;
  borderRadius: string;
}

const COLORS = ["#2563c4", "#d99b2b", "#efc44d", "#d8201f", "#1b4fa0", "#1e9e6a"];

export default function Confetti({ go }: { go: boolean }) {
  const [bits, setBits] = useState<Bit[]>([]);

  useEffect(() => {
    if (!go) {
      setBits([]);
      return;
    }
    const generated: Bit[] = Array.from({ length: 60 }).map((_, i) => ({
      left: Math.random() * 100 + "%",
      background: COLORS[i % COLORS.length],
      animationDuration: 2.4 + Math.random() * 2 + "s",
      animationDelay: Math.random() * 0.6 + "s",
      transform: `rotate(${Math.random() * 360}deg)`,
      borderRadius: Math.random() > 0.6 ? "50%" : "1px",
    }));
    setBits(generated);
  }, [go]);

  if (!go || bits.length === 0) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((st, i) => (
        <i key={i} style={st} />
      ))}
    </div>
  );
}
