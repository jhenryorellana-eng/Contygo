"use client";

/* ============================================================
   Prime — modo LLAMADA (voz en tiempo real con la Live API)
   Flujo: pide un token efímero al servidor → abre la sesión Live
   desde el navegador → micrófono (PCM 16 kHz) ↔ voz de Prime (24 kHz).
   Soporta interrupciones (barge-in).
   Visual: "orbe de voz" (VoiceOrb) que reacciona al audio. No se
   muestra la transcripción: en su lugar, cuando Prime recomienda un
   servicio (herramienta recomendar_servicio) o pasa a una persona
   (pasar_a_humano), aparecen los botones en pantalla.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import { waRoute } from "@/lib/wa-route";
import { trackBrowser } from "@/lib/meta/pixel-client";
import { getServiceBySlug } from "@/lib/services";
import { TOOL_HUMAN, TOOL_RECOMMEND, VOICE_TOOLS, detectServiceSlug } from "@/lib/agent/voice-tools";
import { Ico } from "../icons";
import ServiceLink from "../ServiceLink";
import { INPUT_RATE, OUTPUT_RATE, base64ToFloat32, floatTo16BitPCM, int16ToBase64 } from "./audio";
import VoiceOrb, { type OrbLevels, type OrbMode } from "./VoiceOrb";

type Status = "connecting" | "listening" | "speaking" | "unavailable" | "error" | "ended";

interface CallViewProps {
  /** Vuelve al chat; recibe la duración en segundos. */
  onExit: (seconds: number) => void;
}

interface LiveSessionLike {
  close: () => void;
  sendRealtimeInput: (p: { audio: { data: string; mimeType: string } }) => void;
  sendToolResponse: (p: { functionResponses: Array<{ id?: string; name?: string; response?: Record<string, unknown> }> }) => void;
}

const MicIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const MicOffIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 3l18 18M9 9v2a3 3 0 0 0 5.1 2.1M15 10V6a3 3 0 0 0-6 0M5 11a7 7 0 0 0 11.6 5.3M19 11a7 7 0 0 1-.4 2.3M12 18v3" />
  </svg>
);
const ChatIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </svg>
);

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** RMS 0..1 (amplificado) de un AnalyserNode. */
function analyserLevel(an: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>): number {
  if (!an) return 0;
  an.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
}

export default function CallView({ onExit }: CallViewProps) {
  const [status, setStatus] = useState<Status>("connecting");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  /** slugs de servicios recomendados por Prime durante la llamada */
  const [suggested, setSuggested] = useState<string[]>([]);
  const [human, setHuman] = useState(false);

  const mutedRef = useRef(false);
  const secondsRef = useRef(0);
  const sessionRef = useRef<LiveSessionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxInRef = useRef<AudioContext | null>(null);
  const ctxOutRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inAnalyserRef = useRef<AnalyserNode | null>(null);
  const outAnalyserRef = useRef<AnalyserNode | null>(null);
  const analyserBuf = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(new ArrayBuffer(256)));
  const nextPlayRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const turnTextRef = useRef("");
  const aliveRef = useRef(true);

  const getLevels = useCallback((): OrbLevels => {
    const buf = analyserBuf.current;
    return {
      input: mutedRef.current ? 0 : analyserLevel(inAnalyserRef.current, buf),
      output: analyserLevel(outAnalyserRef.current, buf),
    };
  }, []);

  const addSuggestion = useCallback((slug: string) => {
    if (!getServiceBySlug(slug)) return;
    setSuggested((cur) => (cur.includes(slug) || cur.length >= 2 ? cur : [...cur, slug]));
    try {
      navigator.vibrate?.(12);
    } catch {
      /* sin háptica */
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    function flushPlayback() {
      sourcesRef.current.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* ya detenido */
        }
      });
      sourcesRef.current.clear();
      nextPlayRef.current = 0;
    }

    function playChunk(b64: string) {
      const ctx = ctxOutRef.current;
      if (!ctx) return;
      const f32 = base64ToFloat32(b64);
      if (f32.length === 0) return;
      const buf = ctx.createBuffer(1, f32.length, OUTPUT_RATE);
      buf.copyToChannel(f32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(outAnalyserRef.current ?? ctx.destination);
      const start = Math.max(ctx.currentTime, nextPlayRef.current);
      src.start(start);
      nextPlayRef.current = start + buf.duration;
      sourcesRef.current.add(src);
      src.onended = () => {
        sourcesRef.current.delete(src);
        if (sourcesRef.current.size === 0 && aliveRef.current) setStatus("listening");
      };
      setStatus("speaking");
    }

    async function start() {
      try {
        const r = await fetch("/api/agent/voice-token", { method: "POST" });
        if (r.status === 503) {
          setStatus("unavailable");
          return;
        }
        if (!r.ok) throw new Error("token");
        const { token, model } = (await r.json()) as { token: string; model: string };

        const { GoogleGenAI, Modality } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (!aliveRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const ctxIn = new AudioContext({ sampleRate: INPUT_RATE });
        const ctxOut = new AudioContext({ sampleRate: OUTPUT_RATE });
        ctxInRef.current = ctxIn;
        ctxOutRef.current = ctxOut;
        await ctxIn.resume();
        await ctxOut.resume();

        const outAn = ctxOut.createAnalyser();
        outAn.fftSize = 256;
        outAn.smoothingTimeConstant = 0.6;
        outAn.connect(ctxOut.destination);
        outAnalyserRef.current = outAn;

        const session = await ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            tools: VOICE_TOOLS,
          },
          callbacks: {
            onopen: () => {
              if (aliveRef.current) setStatus("listening");
            },
            onmessage: (msg) => {
              if (!aliveRef.current) return;

              // Herramientas: Prime pide dibujar botones en pantalla.
              const calls = msg.toolCall?.functionCalls;
              if (calls && calls.length > 0) {
                for (const fc of calls) {
                  if (fc.name === TOOL_RECOMMEND) {
                    const slug = String((fc.args as { slug?: unknown } | undefined)?.slug ?? "");
                    addSuggestion(slug);
                  } else if (fc.name === TOOL_HUMAN) {
                    setHuman(true);
                  }
                }
                try {
                  session.sendToolResponse({
                    functionResponses: calls.map((fc) => ({
                      id: fc.id,
                      name: fc.name,
                      response: { ok: true, mostrado_en_pantalla: true },
                    })),
                  });
                } catch {
                  /* sesión cerrada */
                }
              }

              const sc = msg.serverContent;
              if (!sc) return;
              if (sc.interrupted) flushPlayback();
              const outT = sc.outputTranscription?.text;
              if (outT) turnTextRef.current += outT;
              const parts = sc.modelTurn?.parts ?? [];
              for (const p of parts) {
                const data = p.inlineData?.data;
                if (data) playChunk(data);
              }
              if (sc.turnComplete) {
                // Respaldo: si Prime nombró un servicio sin usar la herramienta, lo mostramos igual.
                const slug = detectServiceSlug(turnTextRef.current);
                if (slug) addSuggestion(slug);
                turnTextRef.current = "";
              }
            },
            onerror: () => {
              if (aliveRef.current) setStatus("error");
            },
            onclose: () => {
              if (aliveRef.current) setStatus((s) => (s === "error" || s === "unavailable" ? s : "ended"));
            },
          },
        });
        sessionRef.current = session;

        const source = ctxIn.createMediaStreamSource(stream);
        const inAn = ctxIn.createAnalyser();
        inAn.fftSize = 256;
        inAn.smoothingTimeConstant = 0.5;
        source.connect(inAn);
        inAnalyserRef.current = inAn;

        const processor = ctxIn.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (mutedRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          const b64 = int16ToBase64(floatTo16BitPCM(input));
          try {
            session.sendRealtimeInput({ audio: { data: b64, mimeType: `audio/pcm;rate=${INPUT_RATE}` } });
          } catch {
            /* sesión cerrada */
          }
        };
        source.connect(processor);
        processor.connect(ctxIn.destination);

        trackBrowser("AgentCall", { content_name: "prime" });
        timer = setInterval(() => {
          secondsRef.current += 1;
          setSeconds(secondsRef.current);
        }, 1000);
      } catch {
        if (aliveRef.current) setStatus("error");
      }
    }

    void start();

    return () => {
      aliveRef.current = false;
      if (timer) clearInterval(timer);
      flushPlayback();
      try {
        processorRef.current?.disconnect();
      } catch {
        /* nada */
      }
      try {
        sessionRef.current?.close();
      } catch {
        /* nada */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxInRef.current?.close();
      void ctxOutRef.current?.close();
    };
  }, [addSuggestion]);

  function toggleMute() {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }

  const live = status === "listening" || status === "speaking";
  const orbMode: OrbMode =
    status === "speaking" ? "speaking" : status === "listening" ? "listening" : status === "connecting" ? "idle" : "off";
  const hasCards = suggested.length > 0 || human;

  const title =
    status === "connecting"
      ? "Conectando con Prime…"
      : status === "listening"
        ? "Te escucho"
        : status === "speaking"
          ? "Prime"
          : status === "unavailable"
            ? "Las llamadas llegan muy pronto"
            : status === "ended"
              ? "Llamada finalizada"
              : "No pudimos conectar";

  const hint = live
    ? hasCards
      ? "Cuando quieras, toca el botón para continuar."
      : "Cuéntame tu caso. Puedes interrumpirme cuando quieras."
    : status === "connecting"
      ? "Permite el micrófono cuando el navegador lo pida."
      : status === "unavailable"
        ? "Mientras tanto, escríbeme aquí o habla con el equipo por WhatsApp."
        : status === "error"
          ? "Revisa el permiso del micrófono o inténtalo de nuevo."
          : "";

  return (
    <div className={"pa-call" + (hasCards ? " has-cards" : "")}>
      <div className="pa-call__top">
        <span className={"pa-call__pill" + (live ? " is-live" : "")}>
          <span className="pa-call__dot" />
          {live ? `En llamada · ${fmt(seconds)}` : status === "connecting" ? "Conectando" : "Llamada"}
        </span>
        <span className="pa-call__lang">ESPAÑOL</span>
      </div>

      <div className="pa-call__body">
        <div className="pa-orbwrap">
          <VoiceOrb mode={orbMode} getLevels={getLevels} />
          <div className="pa-orb__center">
            <span className={"pa-orb__who" + (status === "speaking" ? " is-prime" : "")}>{title}</span>
            {hint && <span className="pa-orb__hint">{hint}</span>}
          </div>
        </div>

        {/* Botones que Prime deja en pantalla durante la llamada */}
        {hasCards && (
          <div className="pa-call__suggest">
            {suggested.length > 0 && <span className="pa-call__suggest-k">Tu trámite recomendado</span>}
            {suggested.map((slug) => {
              const svc = getServiceBySlug(slug);
              if (!svc) return null;
              return (
                <ServiceLink key={slug} href={`/${svc.slug}`} video={svc.video} className="pa-card pa-pop">
                  <span className="pa-card__t">
                    <span className="pa-card__name">{svc.name}</span>
                    <span className="pa-card__sub">Calificar ahora · 2 min</span>
                  </span>
                  {Ico.arrow}
                </ServiceLink>
              );
            })}
            {human && (
              <a
                className="pa-btn pa-btn--wa pa-pop"
                href={waRoute({ kind: "prime_call", message: "Hola, vengo de la llamada con Prime y quiero hablar con una persona sobre mi trámite." })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackBrowser("Contact")}
              >
                {Ico.whatsapp} Hablar con una persona
              </a>
            )}
          </div>
        )}

        {(status === "unavailable" || status === "error") && (
          <a
            className="pa-btn pa-btn--wa"
            href={waRoute({ kind: "prime_call", message: "Hola, quiero hablar con una persona sobre mi trámite." })}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBrowser("Contact")}
          >
            {Ico.whatsapp} Hablar por WhatsApp
          </a>
        )}
      </div>

      <div className="pa-call__controls">
        <button
          type="button"
          className={"pa-ctl" + (muted ? " is-on" : "")}
          onClick={toggleMute}
          aria-pressed={muted}
          disabled={!live}
        >
          <span className="pa-ctl__btn">{muted ? MicOffIcon : MicIcon}</span>
          <span className="pa-ctl__lbl">{muted ? "Activar" : "Silenciar"}</span>
        </button>
        <button type="button" className="pa-ctl pa-ctl--end" onClick={() => onExit(secondsRef.current)} aria-label="Colgar">
          <span className="pa-ctl__btn pa-ctl__btn--end">{Ico.phone}</span>
          <span className="pa-ctl__lbl">Colgar</span>
        </button>
        <button type="button" className="pa-ctl" onClick={() => onExit(secondsRef.current)}>
          <span className="pa-ctl__btn">{ChatIcon}</span>
          <span className="pa-ctl__lbl">Escribir</span>
        </button>
      </div>
    </div>
  );
}
