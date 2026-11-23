// The chosen takes become the hero's frames. In the frame where she shows the phone, the blue of its screen is found
// (its four corners, in thousandths of the image) and painted the app's welcome colour, so nothing flashes blue.
const sharp = require("sharp"); const base = process.argv[2], out = "/Users/pepitobillo/Documents/Trabajo/Contygo/public/contygo/v8/";
const pick = { claro: { lee: "a", mira: "a", muestra: "a" }, oscuro: { lee: "a", mira: "a", muestra: "a" } }; const SIDE = 1200;
const INK = [6, 27, 61];
(async () => { for (const [tema, takes] of Object.entries(pick)) {
  // The first frame: where the ribbon leaves the image through its bottom edge (the page's green thread starts there).
  { const { data: d1, info: i1 } = await sharp(`${base}/${tema}-lee-${takes.lee}/cuadro.png`).resize(SIDE, SIDE).removeAlpha().raw().toBuffer({ resolveWithObject: true }); let sum = 0, n = 0;
    for (let y = i1.height - 6; y < i1.height; y++) for (let x = 0; x < i1.width * .5; x++) { const k = (y * i1.width + x) * 3, r = d1[k], g = d1[k + 1], b = d1[k + 2]; if (g > 110 && g - r > 55 && g - b > 45) { sum += x; n++; } }
    console.log(tema, "ribbon exit", n ? (sum / n / i1.width).toFixed(4) : "not found", "green pixels", n);
    await sharp(d1, { raw: { width: i1.width, height: i1.height, channels: 3 } }).webp({ quality: 88 }).toFile(`${out}hero-henry-${tema}-1.webp`); }
  await sharp(`${base}/${tema}-mira-${takes.mira}/cuadro.png`).resize(SIDE, SIDE).webp({ quality: 88 }).toFile(`${out}hero-henry-${tema}-2.webp`);
  const { data, info } = await sharp(`${base}/${tema}-muestra-${takes.muestra}/cuadro.png`).resize(SIDE, SIDE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info, blue = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]; if (b > 150 && r < 90 && g > 50 && g < 150 && b - g > 60 && b - r > 90) blue[i] = 1; }
  // The largest connected patch of that blue is the screen.
  const seen = new Int32Array(w * h); let best = [], label = 0;
  for (let s = 0; s < w * h; s++) { if (!blue[s] || seen[s]) continue; label++; const stack = [s], patch = []; seen[s] = label;
    while (stack.length) { const p = stack.pop(); patch.push(p); const x = p % w, y = (p - x) / w; for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && blue[q] && !seen[q]) { seen[q] = label; stack.push(q); } }
    if (patch.length > best.length) best = patch; }
  let tl, tr, br, bl; const key = { tl: Infinity, tr: -Infinity, br: -Infinity, bl: Infinity };
  // Its sides, each fitted through the points of that side (the corners are rounded, so the corners are where the sides meet).
  const xs = new Map(), ys = new Map();
  for (const p of best) { const x = p % w, y = (p - x) / w; const a = ys.get(y) || [Infinity, -Infinity]; a[0] = Math.min(a[0], x); a[1] = Math.max(a[1], x); ys.set(y, a); const b = xs.get(x) || [Infinity, -Infinity]; b[0] = Math.min(b[0], y); b[1] = Math.max(b[1], y); xs.set(x, b); }
  const rows = [...ys.keys()].sort((a, b) => a - b), cols = [...xs.keys()].sort((a, b) => a - b);
  const mid = (list, from, to) => list.slice(Math.round(list.length * from), Math.round(list.length * to));
  const fit = pts => { const n = pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; } const m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return [m, (sy - m * sx) / n]; };
  // Left and right sides as x = m·y + c; top and bottom as y = m·x + c.
  const left = fit(mid(rows, .2, .8).map(y => [y, ys.get(y)[0]])), right = fit(mid(rows, .2, .8).map(y => [y, ys.get(y)[1]]));
  const top = fit(mid(cols, .25, .75).map(x => [x, xs.get(x)[0]])), bottom = fit(mid(cols, .25, .75).map(x => [x, xs.get(x)[1]]));
  const cross = ([mv, cv], [mh, ch]) => { const y = (mh * cv + ch) / (1 - mh * mv); return [mv * y + cv, y]; };
  const quad = [cross(left, top), cross(right, top), cross(right, bottom), cross(left, bottom)].map(([x, y]) => [+(x / w * 1000).toFixed(1), +(y / h * 1000).toFixed(1)]);
  // Paint the screen (and two pixels around it, where the blue fades into the frame) the welcome colour.
  const mark = new Uint8Array(w * h); for (const p of best) { const x = p % w, y = (p - x) / w; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && X < w && Y >= 0 && Y < h) mark[Y * w + X] = 1; } }
  for (let i = 0; i < w * h; i++) if (mark[i]) { data[i * 3] = INK[0]; data[i * 3 + 1] = INK[1]; data[i * 3 + 2] = INK[2]; }
  await sharp(data, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 88 }).toFile(`${out}hero-henry-${tema}-3.webp`);
  console.log(tema, `${w}x${h}`, "screen", JSON.stringify(quad), "pixels", best.length);
} })();
