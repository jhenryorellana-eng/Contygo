// Vista previa (og:image, 1200×630 JPG) del link de cada servicio (/visa-juvenil, /apelacion-bia…): lo que ve el cliente en
// WhatsApp antes de abrirlo. JPG y no WebP: es el formato que todas las apps de mensajería muestran.
// Los tres servicios con guía propia usan un fotograma de su vídeo (el mismo del cierre de la landing);
// los demás, su escultura de papel sobre el tono de su familia, como en el catálogo (ServiceShowcase).
// Uso: node scripts/build-share-previews.mjs  (necesita ffmpeg en el PATH; Node 22.6+ importa el catálogo .ts)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CONTYGO_SERVICES } from "../lib/contygo-catalog.ts";

const out = "public/contygo/compartir";
fs.mkdirSync(out, { recursive: true });
// Tonos claros del catálogo (components/contygo/v7/ServiceShowcase.module.css, data-family).
const tint = {
  familia: ["e9f8ef", "d4f1df"],
  asilo: ["eaf0fc", "d6e2f8"],
  corte: ["eef1f8", "dce3f1"],
  fiscal: ["f8f2e4", "efe4cb"],
  empresa: ["f8f2e4", "efe4cb"],
};
const frame = id => `public/contygo/v7/cierre-${id}.webp`;
const logo = "public/contygo/brand/logo-light.png";

function ffmpeg(args) {
  const run = spawnSync("ffmpeg", ["-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`ffmpeg falló (${run.status})`);
}

for (const service of CONTYGO_SERVICES) {
  const target = path.join(out, `${service.id}.jpg`);
  if (fs.existsSync(frame(service.id))) {
    ffmpeg(["-i", frame(service.id), "-vf", "scale=1200:-2,crop=1200:630", "-frames:v", "1", "-q:v", "3", target]);
  } else {
    const [from, to] = tint[service.category];
    ffmpeg([
      "-f", "lavfi", "-i", `gradients=s=1200x630:c0=0x${from}:c1=0x${to}:x0=0:y0=0:x1=1200:y1=630:nb_colors=2:d=1`,
      "-i", `public/contygo/v8/servicio-${service.id}.webp`,
      "-i", logo,
      "-filter_complex", "[1]scale=470:470[art];[2]scale=210:-1[logo];[0][art]overlay=(W-w)/2:(H-h)/2+12:format=rgb[base];[base][logo]overlay=44:40:format=rgb",
      "-frames:v", "1", "-q:v", "3", target,
    ]);
  }
  console.log(target, `${Math.round(fs.statSync(target).size / 1024)} KB`);
}
