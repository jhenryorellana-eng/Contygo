// The real screens for the clay phones, sharp: each capture of the assistant's window (780 px wide) with the dimmed
// page that shows outside its rounded top corners painted white, so the screen is a clean rectangle.
const sharp = require("sharp"), fs = require("fs"); const D = "/Users/pepitobillo/Documents/Trabajo/Contygo/docs/proceso-capturas", O = "/Users/pepitobillo/Documents/Trabajo/Contygo/public/contygo/v8/proceso";
const frames = JSON.parse(fs.readFileSync(D + "/frames.json", "utf8")), pick = ["tramite", "servicio", "pregunta-1", "pregunta-7", "listo", "nombre", "contacto", "codigo", "firmar"], R = 60;
(async () => { let total = 0; for (const [i, name] of pick.entries()) { const f = frames.find(x => x.name === name);
  const { data, info } = await sharp(D + "/" + f.file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const w = info.width;
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) if ((R - x) ** 2 + (R - y) ** 2 > (R - 1.5) ** 2) for (const X of [x, w - 1 - x]) { const k = (y * w + X) * 3; data[k] = data[k + 1] = data[k + 2] = 255; }
  await sharp(data, { raw: { width: w, height: info.height, channels: 3 } }).webp({ quality: 86 }).toFile(`${O}/p${i + 1}.webp`); total += fs.statSync(`${O}/p${i + 1}.webp`).size; if (!i) console.log("size", w + "x" + info.height); }
  console.log("total", Math.round(total / 1024) + " KB"); })();
