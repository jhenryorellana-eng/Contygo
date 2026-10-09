import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { agentEnabled, clientIp, getGenAI, rateLimit } from "@/lib/agent/server";
import { INTAKE_VOICE_SCRIPTS, isSameOriginIntakeRequest } from "@/lib/agent/visa-intake";
import { GUIDE_VOICE_SCRIPTS } from "@/lib/agent/guide-scripts";
import { liveSpeechStream } from "@/lib/agent/visa-live-audio";
import { VISA_LIVE_MODEL, VISA_LIVE_VOICE, visaLiveSpeechIdentity } from "@/lib/agent/visa-live-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Voice-Model": VISA_LIVE_MODEL, "X-Voice-Name": VISA_LIVE_VOICE };
const error = (code: string, status: number) => NextResponse.json({ ok:false, error:code }, { status, headers });
/** Approved public lines recorded by scripts/prepare-visa-live-voice.cjs: the interview and the voice guide. */
const PREPARED_SCRIPTS = new Set([...INTAKE_VOICE_SCRIPTS, ...GUIDE_VOICE_SCRIPTS]);

export async function POST(req: NextRequest) {
  if (!isSameOriginIntakeRequest(req)) return error("forbidden_origin",403);
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error("json_required",415);
  if (!rateLimit(`visa-live:${clientIp(req)}`,60,10*60*1000)) return error("rate_limited",429);
  if (Number(req.headers.get("content-length")) > 12*1024) return error("too_large",413);
  let body: unknown;
  const reader = req.body?.getReader();
  if (!reader) return error("bad_json",400);
  try {
    const chunks: Uint8Array[] = []; let size=0;
    while (true) {
      const {done,value}=await reader.read(); if(done)break;
      size+=value.byteLength;
      if(size>12*1024){await reader.cancel();return error("too_large",413);}
      chunks.push(value);
    }
    body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {return error("bad_json",400);} finally {reader.releaseLock();}
  if(!body||typeof body!=="object"||Array.isArray(body)||!("text" in body)||typeof body.text!=="string"||!body.text.trim()||body.text.length>2000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body.text))return error("invalid_text",400);
  const text=body.text.trim();
  if(PREPARED_SCRIPTS.has(text)) {
    const hash=createHash("sha256").update(visaLiveSpeechIdentity(text)).digest("hex").slice(0,20);
    try {
      const wav=await readFile(join(process.cwd(),"public","contygo","audio","live",`${hash}.wav`));
      if(wav.length>44&&wav.length<24_000*2*90&&wav.toString("ascii",0,4)==="RIFF"&&wav.toString("ascii",8,12)==="WAVE"&&wav.readUInt32LE(40)===wav.length-44&&wav.readUInt32LE(24)===24000&&wav.readUInt16LE(22)===1&&wav.readUInt16LE(34)===16) {
        return new Response(new Uint8Array(wav).buffer,{headers:{...headers,"Content-Type":"audio/wav","X-Voice-Prepared":"1"}});
      }
    }catch{/* Missing prepared script falls through to real streaming. */}
  }
  if(!agentEnabled)return error("not_configured",503);
  return new Response(liveSpeechStream(getGenAI(),text,req.signal),{
    headers:{...headers,"Content-Type":"application/x-ndjson","X-Accel-Buffering":"no"},
  });
}
