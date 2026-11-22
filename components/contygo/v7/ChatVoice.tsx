"use client";

/* La voz del asistente (22-11-2026): «que el usuario pueda escuchar lo que tiene que hacer si así lo desea». Con
   «Escuchar» encendido, lee en voz alta cada mensaje nuevo del asistente (la misma voz de la guía del contrato,
   /api/agent/visa-live-speech). Se carga solo cuando la persona la enciende. Si el navegador no deja sonar sin un
   toque, lo dice y espera ese toque. */
import { useEffect } from "react";
import { useVisaVoice } from "../juvenil/useVisaVoice";
import s from "./LandingChat.module.css";

export default function ChatVoice({ text, turn }: { /** What to read. */ text: string; /** Changes with each new message (the same words may come twice). */ turn: number }) {
  const voice = useVisaVoice();
  const { speak, stop, unlock, retry, status } = voice;
  useEffect(() => { unlock(); }, [unlock]);
  useEffect(() => {
    if (!text) return;
    void speak(text.slice(0, 1500));
    return () => stop();
  }, [text, turn, speak, stop]);
  if (status === "blocked") return <button type="button" className={s.voiceNote} onClick={() => retry()}>Toca aquí para oírlo</button>;
  if (status === "unavailable") return <p className={s.voiceNote} role="status">La voz no está disponible ahora. Puedes seguir leyendo.</p>;
  return null;
}
