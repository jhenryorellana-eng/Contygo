"use client";

/* La guía por voz sobre la voz del recorrido (useVisaVoice). play(id) dice una frase fija y, a
   medida que suena, indica qué tramo se está diciendo y qué campo hay que iluminar. Con la voz
   silenciada o sin audio, el texto se ve igual y se ilumina el primer campo de la frase. */
import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDE_LINES, guideText, type GuideLineId, type GuideSegment } from "@/lib/agent/guide-scripts";
import type { ClosingVoice } from "../juvenil/closingSpeech";

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export type Guide = ReturnType<typeof useGuide>;

export function useGuide(voice: ClosingVoice) {
  const [lineId, setLineId] = useState<GuideLineId | null>(null);
  const [mine, setMine] = useState(false);
  const voiceRef = useRef(voice); voiceRef.current = voice;
  const segments: GuideSegment[] = lineId ? GUIDE_LINES[lineId] : [];
  const text = guideText(segments);

  const play = useCallback((id: GuideLineId) => {
    setLineId(id); setMine(true);
    void voiceRef.current.speak(guideText(GUIDE_LINES[id]));
  }, []);
  const replay = useCallback(() => { if (!lineId) return; voiceRef.current.unlock(); setMine(true); void voiceRef.current.speak(guideText(GUIDE_LINES[lineId])); }, [lineId]);
  const stop = useCallback(() => { setMine(false); voiceRef.current.stop(); }, []);
  // Warm the next lines so they sound at once (already recorded on disk: this only fetches them).
  const prefetch = useCallback((ids: GuideLineId[]) => { ids.forEach(id => void voiceRef.current.prefetch(guideText(GUIDE_LINES[id]))); }, []);

  // Another speaker took the voice (the invitation, the chat): the guide steps aside.
  const speaking = mine && voice.status === "speaking";
  const silent = voice.muted || voice.status === "blocked" || voice.status === "unavailable";
  useEffect(() => { if (mine && voice.status === "idle" && voice.progress >= 1) setMine(false); }, [mine, voice.status, voice.progress]);

  // Which segment is being said: proportional to words (the voice does not return word timings).
  const total = Math.max(1, words(text));
  const progress = speaking ? voice.progress : silent || !mine ? 1 : -1;
  let at = 0, active = -1;
  segments.forEach((segment, index) => { if (progress >= 0 && progress * total >= at - .01) active = index; at += words(segment.text); });
  const target = speaking ? segments[active]?.target ?? null : silent && lineId ? segments.find(segment => segment.target)?.target ?? null : null;

  return { lineId, segments, text, progress, active, target, speaking, loading: mine && voice.status === "loading", muted: voice.muted, play, replay, stop, prefetch, toggleMute: voice.toggleMute };
}
