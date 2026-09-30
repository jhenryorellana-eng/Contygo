"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readLiveSpeech } from "./liveSpeechReader";

export type VisaVoiceStatus = "idle" | "loading" | "speaking" | "blocked" | "unavailable";
export type VisaMicrophoneStatus = "idle" | "recording" | "processing" | "error";
export interface VisaRecordedAudio { data: string; mimeType: string }
export interface VisaSpeechEvents {
  onStart?: () => void; onComplete?: () => void;
  continuation?: string;
  onContinuation?: () => void;
  cuePhrase?: string;
  onCue?: () => void;
}

/** Transcript chunks provide an approximate phrase cue, not word-level alignment. */
export function speechCueSeconds(marks:Array<{text:string;seconds:number}>,phrase:string):number|null {
  const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const needle=normalize(phrase);if(!needle)return null;
  let text="",previousLength=0,previousTime=0;
  const spans:Array<{start:number;end:number;from:number;to:number}>=[];
  for(const mark of marks){text+=mark.text;const length=normalize(text).length;spans.push({start:previousLength,end:length,from:previousTime,to:mark.seconds});previousLength=length;previousTime=mark.seconds;}
  const index=normalize(text).indexOf(needle);if(index<0)return null;
  const span=spans.find(part=>index>=part.start&&index<part.end);
  return span&&span.to>span.from?span.from+(span.to-span.from)*(index-span.start)/Math.max(1,span.end-span.start):null;
}

/** Keep a natural breath around cached speech; never trim interior pauses. */
function trimSpeechEdges(context: AudioContext, audio: AudioBuffer) {
    const pcm=audio.getChannelData(0),rate=audio.sampleRate;
    let start=0,end=pcm.length;
    while(start<end&&Math.abs(pcm[start])<.0005)start++;
    while(end>start&&Math.abs(pcm[end-1])<.0005)end--;
    if(start===end)return audio;
    start=Math.max(0,start-Math.round(rate*.08));
    end=Math.min(pcm.length,end+Math.round(rate*.14));
    const result=context.createBuffer(audio.numberOfChannels,end-start,rate);
    for(let channel=0;channel<audio.numberOfChannels;channel++)result.getChannelData(channel).set(audio.getChannelData(channel).subarray(start,end));
    return result;
}

const MAX_RECORDING_SECONDS = 25;
const MAX_RECORDING_BYTES = 5 * 1024 * 1024;
const SPEECH_TIMEOUT_MS = 60_000;
const SPEECH_CACHE_LIMIT = 8;
const AUDIO_RESUME_WAIT_MS = 300;
const VOICE_METER_INTERVAL_MS = 1000 / 18;
const VOICE_METER_ATTACK_MS = 45;
const VOICE_METER_RELEASE_MS = 160;

type SafariAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
interface PreparedSpeech {
  text: string;
  controller: AbortController;
  promise: Promise<AudioBuffer>;
  audio: AudioBuffer | null;
  prefetched: boolean;
  chunks: AudioBuffer[];
  listeners: Set<(audio: AudioBuffer) => void>;
  duration: number;
  transcript: Array<{text:string;seconds:number}>;
}

/** Call unlock() directly in a click/tap, then speak() when the AI text arrives. */
export function useVisaVoice() {
  const [status, setStatus] = useState<VisaVoiceStatus>("idle");
  const [progress, setProgress] = useState(1);
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const cacheRef = useRef(new Map<string, PreparedSpeech>());
  const activeEntryRef = useRef<PreparedSpeech | null>(null);
  const resumeWaitRef = useRef<{ finish: () => void } | null>(null);
  const frameRef = useRef<number | null>(null);
  const mutedRef = useRef(false);
  const lastTextRef = useRef("");
  const lastEventsRef = useRef<VisaSpeechEvents | undefined>(undefined);

  const clearPlayback = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (contextRef.current) contextRef.current.onstatechange = null;
    unsubscribeRef.current?.(); unsubscribeRef.current=null;
    const sources = Array.from(sourcesRef.current);
    sourcesRef.current.clear();
    sourceRef.current = null;
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* The source may already have ended. */ }
      source.disconnect();
    }
    analyserRef.current?.disconnect();
    analyserRef.current = null;
  }, []);

  const cancelWork = useCallback((preserveText?: string) => {
    generationRef.current += 1;
    const active = activeEntryRef.current;
    activeEntryRef.current = null;
    // Shared prefetches remain useful after stop(); superseded on-demand work does not.
    if (active && !active.audio && !active.prefetched && active.text !== preserveText) {
      active.controller.abort();
      if (cacheRef.current.get(active.text) === active) cacheRef.current.delete(active.text);
    }
    resumeWaitRef.current?.finish();
    clearPlayback();
  }, [clearPlayback]);

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === "closed") {
      const Constructor = window.AudioContext || (window as SafariAudioWindow).webkitAudioContext;
      if (!Constructor) throw new Error("AudioContext unavailable");
      contextRef.current = new Constructor();
    }
    return contextRef.current;
  }, []);

  const prepareSpeech = useCallback((text: string, prefetched: boolean): PreparedSpeech => {
    const cache = cacheRef.current;
    const existing = cache.get(text);
    if (existing && !existing.controller.signal.aborted) {
      existing.prefetched ||= prefetched;
      cache.delete(text);
      cache.set(text, existing);
      return existing;
    }
    if (existing) cache.delete(text);
    // Bound both pending requests and decoded buffers. Never evict the active reply.
    while (cache.size >= SPEECH_CACHE_LIMIT) {
      const oldest = Array.from(cache.values()).find((entry) => entry !== activeEntryRef.current);
      if (!oldest) break;
      cache.delete(oldest.text);
      if (!oldest.audio) oldest.controller.abort();
    }

    const context = getContext(); // Decoding works while suspended; prefetch never resumes it.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SPEECH_TIMEOUT_MS);
    const clearRequestTimeout = () => clearTimeout(timeout);
    controller.signal.addEventListener("abort", clearRequestTimeout, { once: true });
    const entry: PreparedSpeech = {
      text,
      controller,
      audio: null,
      prefetched,
      chunks: [], listeners: new Set(), duration: 0, transcript: [],
      promise: Promise.resolve().then(async () => {
        if (controller.signal.aborted || !mountedRef.current) throw new Error("Speech cancelled");
        const response = await fetch("/api/agent/visa-live-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Speech unavailable");
        const audio = response.headers?.get("content-type")?.includes("application/x-ndjson")
          ? await readLiveSpeech(response, context, controller.signal, chunk => {
            if(controller.signal.aborted||!mountedRef.current)return;
            entry.chunks.push(chunk);entry.duration+=chunk.duration;
            entry.listeners.forEach(listener=>listener(chunk));
          },(text,seconds)=>entry.transcript.push({text,seconds}))
          : await context.decodeAudioData(await response.arrayBuffer());
        if (controller.signal.aborted || !mountedRef.current) throw new Error("Speech cancelled");
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) throw new Error("Empty speech");
        entry.audio = audio;
        entry.duration = audio.duration;
        return audio;
      }).catch((cause: unknown) => {
        if (cache.get(text) === entry) cache.delete(text);
        throw cause;
      }).finally(() => {
        clearRequestTimeout();
        controller.signal.removeEventListener("abort", clearRequestTimeout);
      }),
    };
    cache.set(text, entry);
    return entry;
  }, [getContext]);

  /** Best-effort warmup, eight texts in memory. Errors are retried by speak(), without UI changes. */
  const prefetch = useCallback(async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!mountedRef.current || !trimmed) return;
    try { await prepareSpeech(trimmed, true).promise; } catch { /* Warmup cannot disrupt the current reply. */ }
  }, [prepareSpeech]);

  const discardPrefetch = useCallback((text:string) => {
    const entry=cacheRef.current.get(text.trim());
    if(!entry||entry===activeEntryRef.current)return;
    cacheRef.current.delete(entry.text);
    if(!entry.audio)entry.controller.abort();
  },[]);

  const stop = useCallback(() => {
    cancelWork();
    if (!mountedRef.current) return;
    setStatus("idle");
    setProgress(1);
    setLevel(0);
    // Keep the gesture-unlocked context for the next reply; close it on unmount.
  }, [cancelWork]);

  const unlock = useCallback(() => {
    if (!mountedRef.current) return;
    const generation = generationRef.current;
    try {
      const context = getContext();
      // Do not await: browsers need resume() inside the original user gesture.
      void context.resume().catch(() => {
        if (!mountedRef.current || generationRef.current !== generation || contextRef.current !== context) return;
        setStatus("blocked");
        setProgress(1);
        setLevel(0);
      });
    } catch {
      setStatus("unavailable");
      setProgress(1);
      setLevel(0);
    }
  }, [getContext]);

  const speak = useCallback(async (text: string, events?: VisaSpeechEvents): Promise<void> => {
    if (!mountedRef.current) return;
    const trimmed = text.trim();
    cancelWork(trimmed);
    const generation = generationRef.current;
    const isCurrent = () => mountedRef.current && generationRef.current === generation;
    lastTextRef.current = trimmed;
    lastEventsRef.current = events;
    setLevel(0);
    if (!trimmed || mutedRef.current) {
      setStatus("idle");
      setProgress(1);
      return;
    }
    setStatus("loading");
    setProgress(0);

    try {
      const context = getContext();
      // Attempt this before the network await; unlock() may already have resumed it.
      // A blocked resume promise can remain pending, so never wait on that promise.
      const resumeAttempt = context.state === "running" ? null : context.resume().catch(() => undefined);
      const entry = prepareSpeech(trimmed, false);
      activeEntryRef.current = entry;
      let continuationAt: number | null = null;
      // Prepare the CTA concurrently, but never hold the greeting behind it.
      const next=events?.continuation?.trim()?prepareSpeech(events.continuation.trim(),true):null;
      void next?.promise.catch(()=>undefined);
      // A stream may arrive while resume() is still pending. Its decoded chunks
      // stay in the entry, so none are lost and no rejected warmup goes unhandled.
      void entry.promise.catch(() => undefined);
      if (context.state !== "running" && resumeAttempt) {
        // Cached audio may beat an authorized resume(). Give it a bounded moment,
        // while a permanently blocked autoplay promise must still reveal the text.
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (resumeWaitRef.current?.finish === finish) resumeWaitRef.current = null;
            resolve();
          };
          const timer = setTimeout(finish, AUDIO_RESUME_WAIT_MS);
          resumeWaitRef.current = { finish };
          void resumeAttempt.then(finish, finish);
        });
        if (!isCurrent()) return;
      }
      if (context.state !== "running") {
        setStatus("blocked");
        setProgress(1);
        return;
      }

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(context.destination);
      analyserRef.current = analyser;
      const samples = new Uint8Array(analyser.fftSize);
      const segments: Array<{ start:number; duration:number }> = [];
      let scheduledUntil=context.currentTime;
      let completed=Boolean(entry.audio)&&!next;
      let firstComplete=Boolean(entry.audio);
      let firstDuration=entry.duration;
      let received=0;
      let shownProgress=0;
      let lastPaint = -Infinity;
      let smoothedLevel = 0;
      let playbackStarted = false;
      let playbackFinished = false;
      let continuationStarted = false;
      let cueStarted = false;
      const finishPlayback = () => {
        if(!isCurrent()||!completed||sourcesRef.current.size||playbackFinished)return;
        playbackFinished = true;
        clearPlayback();setProgress(1);setLevel(0);setStatus("idle");
        events?.onComplete?.();
      };
      const enqueue = (audio:AudioBuffer) => {
        if(!isCurrent())return;
        const source=context.createBufferSource();source.buffer=audio;source.connect(analyser);
        sourcesRef.current.add(source);sourceRef.current=source;
        // Stream chunks share one audio clock: no per-chunk playback reset or gap.
        const start=Math.max(context.currentTime,scheduledUntil);
        scheduledUntil=start+audio.duration;received+=audio.duration;
        segments.push({start,duration:audio.duration});
        source.onended=()=>{sourcesRef.current.delete(source);source.disconnect();finishPlayback();};
        source.start(start);setStatus("speaking");
        if(!playbackStarted){playbackStarted=true;events?.onStart?.();}
      };
      context.onstatechange = () => {
        if (!isCurrent() || context.state === "running") return;
        cancelWork();
        setProgress(1);
        setLevel(0);
        setStatus("blocked");
      };
      const tick = (now: number) => {
        if (!isCurrent()) return;
        // Bound React updates to 18 fps; timing always follows the audio clock.
        if (now - lastPaint >= VOICE_METER_INTERVAL_MS) {
          const elapsed = Number.isFinite(lastPaint) ? now - lastPaint : VOICE_METER_INTERVAL_MS;
          lastPaint = now;
          analyser.getByteTimeDomainData(samples);
          let squareSum = 0;
          for (let i = 0; i < samples.length; i += 1) {
            const amplitude = (samples[i] - 128) / 128;
            squareSum += amplitude * amplitude;
          }
          const measuredLevel = Math.min(1, Math.sqrt(squareSum / samples.length) * 3);
          const responseTime = measuredLevel > smoothedLevel ? VOICE_METER_ATTACK_MS : VOICE_METER_RELEASE_MS;
          // Fast attack follows syllables; slower release prevents jitter in pauses.
          // The envelope is driven only by measured audio, never a synthetic wave.
          smoothedLevel += (measuredLevel - smoothedLevel) * (1 - Math.exp(-elapsed / responseTime));
          if (smoothedLevel < 0.002) smoothedLevel = 0;
          setLevel(smoothedLevel);
          const played=segments.reduce((sum,part)=>sum+Math.min(part.duration,Math.max(0,context.currentTime-part.start)),0);
          if(events?.cuePhrase&&!cueStarted){
            const transcriptCue=speechCueSeconds(entry.transcript,events.cuePhrase);
            const index=trimmed.indexOf(events.cuePhrase);
            const fallback=firstComplete&&index>=0?firstDuration*index/Math.max(1,trimmed.length):null;
            const cue=transcriptCue??fallback;
            if(cue!==null&&played>=cue){cueStarted=true;events.onCue?.();}
          }
          if(continuationAt!==null&&!continuationStarted&&context.currentTime>=continuationAt){continuationStarted=true;events?.onContinuation?.();}
          // Cached questions have an exact duration. Live replies use a monotonic
          // estimate until EOF provides their duration, never move text backwards.
          const duration=firstComplete?firstDuration:Math.max(received,trimmed.split(/\s+/).length*.37);
          shownProgress=Math.max(shownProgress,Math.min(firstComplete?1:.96,played/Math.max(.01,duration)));
          setProgress(shownProgress);
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      if(entry.audio){
        const audio=next?trimSpeechEdges(context,entry.audio):entry.audio;
        firstDuration=audio.duration;enqueue(audio);
      }
      else{
        entry.chunks.forEach(enqueue);
        entry.listeners.add(enqueue);
        unsubscribeRef.current=()=>entry.listeners.delete(enqueue);
      }
      frameRef.current=requestAnimationFrame(tick);
      if(!entry.audio){
        const audio=await entry.promise;
        if(!isCurrent())return;
        firstComplete=true;
        completed=!next;
        unsubscribeRef.current?.();unsubscribeRef.current=null;
        // Prepared WAVs arrive as a single buffer, streaming sends its own chunks.
        if(!entry.chunks.length){
          const prepared=next?trimSpeechEdges(context,audio):audio;
          enqueue(prepared);
        }
        firstDuration=received;
      }
      if(!isCurrent())return;
      activeEntryRef.current=null;
      if(next){
        const audio=trimSpeechEdges(context,await next.promise);
        if(!isCurrent())return;
        // 140ms tail + 220ms breath + 80ms onset: a deliberate, natural handoff.
        scheduledUntil=Math.max(context.currentTime,scheduledUntil+.22);
        continuationAt=scheduledUntil;
        enqueue(audio);
        completed=true;
      }
      finishPlayback();
    } catch {
      if (!isCurrent()) return;
      cancelWork();
      setStatus("unavailable");
      setProgress(1);
      setLevel(0);
    }
  }, [cancelWork, clearPlayback, getContext, prepareSpeech]);

  const retry = useCallback(() => {
    if (!mountedRef.current) return;
    unlock();
    void speak(lastTextRef.current,lastEventsRef.current);
  }, [speak, unlock]);

  const toggleMute = useCallback(() => {
    if (!mountedRef.current) return;
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (mutedRef.current) stop();
    else { unlock(); if(lastTextRef.current)void speak(lastTextRef.current,lastEventsRef.current); }
  }, [stop, unlock, speak]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelWork();
      cacheRef.current.forEach((entry) => entry.controller.abort());
      cacheRef.current.clear();
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
    };
  }, [cancelWork]);

  return { status, progress, level, muted, speak, stop, unlock, retry, toggleMute, prefetch, discardPrefetch };
}

/** start() belongs in a user action. stop() submits; cancel() discards, including pending permission. */
export function useVisaMicrophone(onRecorded: (audio: VisaRecordedAudio) => void) {
  const [status, setStatus] = useState<VisaMicrophoneStatus>("idle");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bytesRef = useRef(0);
  const readerRef = useRef<FileReader | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRecordedRef = useRef(onRecorded);

  useEffect(() => { onRecordedRef.current = onRecorded; }, [onRecorded]);

  const clearTimers = useCallback(() => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    if (limitRef.current !== null) clearTimeout(limitRef.current);
    intervalRef.current = null;
    limitRef.current = null;
  }, []);

  const releaseTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const discard = useCallback(() => {
    generationRef.current += 1;
    clearTimers();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* Tracks are still released below. */ }
      }
    }
    releaseTracks();
    const reader = readerRef.current;
    readerRef.current = null;
    if (reader) {
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    }
    chunksRef.current = [];
    bytesRef.current = 0;
  }, [clearTimers, releaseTracks]);

  const fail = useCallback((message: string) => {
    discard();
    if (!mountedRef.current) return;
    setStatus("error");
    setError(message);
  }, [discard]);

  const cancel = useCallback(() => {
    discard();
    if (!mountedRef.current) return;
    setStatus("idle");
    setError("");
    setSeconds(0);
  }, [discard]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive" || !mountedRef.current) return;
    clearTimers();
    setStatus("processing");
    try {
      recorder.stop();
      releaseTracks();
    } catch {
      fail("No pudimos terminar la grabación. Puedes escribir tu respuesta.");
    }
  }, [clearTimers, fail, releaseTracks]);

  const start = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;
    discard();
    const generation = generationRef.current;
    const isCurrent = () => mountedRef.current && generationRef.current === generation;
    setError("");
    setSeconds(0);
    setStatus("processing");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      fail("Este navegador no permite grabar audio aquí. Puedes escribir tu respuesta.");
      return;
    }

    try {
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) {
        fail("Este navegador no admite el formato de audio. Puedes escribir tu respuesta.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (!isCurrent()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (!isCurrent() || !event.data.size) return;
        bytesRef.current += event.data.size;
        if (bytesRef.current > MAX_RECORDING_BYTES) {
          fail("El audio es demasiado grande. Graba una respuesta más corta o escríbela.");
          return;
        }
        chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (isCurrent()) fail("No pudimos grabar el audio. Puedes escribir tu respuesta.");
      };
      recorder.onstop = () => {
        if (!isCurrent()) return;
        clearTimers();
        releaseTracks();
        recorderRef.current = null;
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
        chunksRef.current = [];
        bytesRef.current = 0;
        if (!blob.size || blob.size > MAX_RECORDING_BYTES) {
          fail("No recibimos una grabación válida. Vuelve a intentarlo o escribe tu respuesta.");
          return;
        }
        setStatus("processing");
        const reader = new FileReader();
        readerRef.current = reader;
        reader.onerror = () => {
          if (isCurrent()) fail("No pudimos leer el audio. Puedes escribir tu respuesta.");
        };
        reader.onload = () => {
          if (!isCurrent()) return;
          const result = reader.result;
          if (typeof result !== "string" || !result.includes(",")) {
            fail("No pudimos preparar el audio. Puedes escribir tu respuesta.");
            return;
          }
          readerRef.current = null;
          reader.onload = null;
          reader.onerror = null;
          setStatus("idle");
          onRecordedRef.current({ data: result.slice(result.indexOf(",") + 1), mimeType: blob.type });
        };
        reader.readAsDataURL(blob);
      };
      recorder.start(250);
      const startedAt = performance.now();
      setStatus("recording");
      intervalRef.current = setInterval(() => {
        if (!isCurrent()) return;
        setSeconds(Math.min(MAX_RECORDING_SECONDS, Math.floor((performance.now() - startedAt) / 1000)));
      }, 200);
      limitRef.current = setTimeout(() => {
        if (!isCurrent()) return;
        setSeconds(MAX_RECORDING_SECONDS);
        stop();
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (cause) {
      if (!isCurrent()) return;
      const name = cause instanceof DOMException ? cause.name : "";
      const message = name === "NotAllowedError" || name === "SecurityError"
        ? "El permiso del micrófono está bloqueado. Puedes habilitarlo en tu navegador o escribir tu respuesta."
        : name === "NotFoundError" || name === "DevicesNotFoundError"
          ? "No encontramos un micrófono. Puedes conectar uno o escribir tu respuesta."
          : "No pudimos activar el micrófono. Puedes escribir tu respuesta.";
      fail(message);
    }
  }, [clearTimers, discard, fail, releaseTracks, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      discard();
    };
  }, [discard]);

  return { status, error, seconds, start, stop, cancel };
}
