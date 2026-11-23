// The clay scenes with their phone, at full size. For each: trims it, finds the magenta marker of the phone's screen
// (its box and how round its corners are, in shares of the picture), paints the marker white (the app's own
// background), lowers the exposure a touch (baked in: a CSS filter would soften the close-up) and saves it.
const sharp = require("sharp"), fs = require("fs"); const [base, out] = process.argv.slice(2); const SIDE = 1254;
(async () => { const found = {}; let total = 0;
  for (const name of ["tocas", "respondes", "llena", "confirmas", "firmas"]) {
    const { data, info } = await sharp(`${base}/${name}.png`).trim({ threshold: 2 }).resize(SIDE, SIDE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, mark = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3]; if (a > 200 && r > 170 && b > 170 && g < 120 && r - g > 90 && b - g > 90) mark[i] = 1; }
    const seen = new Uint8Array(w * h); let best = [];
    for (let s = 0; s < w * h; s++) { if (!mark[s] || seen[s]) continue; const stack = [s], patch = []; seen[s] = 1;
      while (stack.length) { const p = stack.pop(); patch.push(p); const x = p % w, y = (p - x) / w; for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && mark[q] && !seen[q]) { seen[q] = 1; stack.push(q); } }
      if (patch.length > best.length) best = patch; }
    const inside = new Uint8Array(w * h); let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (const p of best) { inside[p] = 1; const x = p % w, y = (p - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    // How round each corner is: along the corner's diagonal, how far in the screen begins (r − r/√2 from the corner).
    const reach = (cx, cy, dx, dy) => { for (let k = 0; k < 200; k++) if (inside[(cy + k * dy) * w + cx + k * dx]) return k / (1 - Math.SQRT1_2); return 0; };
    const radius = (reach(x0, y0, 1, 1) + reach(x1, y0, -1, 1) + reach(x1, y1, -1, -1) + reach(x0, y1, 1, -1)) / 4;
    // Paint the marker, and a few pixels around it where it fades into the phone's frame.
    const wide = new Uint8Array(w * h); for (const p of best) { const x = p % w, y = (p - x) / w; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && X < w && Y >= 0 && Y < h) wide[Y * w + X] = 1; } }
    for (let i = 0; i < w * h; i++) if (wide[i]) { data[i * 4] = 255; data[i * 4 + 1] = 255; data[i * 4 + 2] = 255; }
    const toned = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).linear(1.07, -14).modulate({ brightness: .96, saturation: 1.06 }).raw().toBuffer();
    // (The screen stays white: only the clay is toned.)
    for (let i = 0; i < w * h; i++) if (wide[i]) { toned[i * 4] = 255; toned[i * 4 + 1] = 255; toned[i * 4 + 2] = 255; }
    await sharp(toned, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 84, alphaQuality: 90 }).toFile(`${out}/${name}.webp`); total += fs.statSync(`${out}/${name}.webp`).size;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    found[name] = [+(x0 / w * 100).toFixed(2), +(y0 / h * 100).toFixed(2), +(bw / w * 100).toFixed(2), +(bh / h * 100).toFixed(2), +(radius / bw * 100).toFixed(1), +(radius / bh * 100).toFixed(1)]; }
  console.log(JSON.stringify(found)); console.log("total", Math.round(total / 1024) + " KB"); })();
