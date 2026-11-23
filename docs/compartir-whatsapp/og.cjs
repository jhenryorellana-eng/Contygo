// Three pictures for the link's preview (1200×630), built from the page's own pieces: Henry from the hero, the clay
// world, the brand's type. Each is an HTML page photographed. usage: node og.cjs
const { chromium } = require("playwright"); const sharp = require("sharp"); const fs = require("fs");
const P = "/Users/pepitobillo/Documents/Trabajo/Contygo/public", O = __dirname + "/../og";
const b64 = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
const font = b64(P + "/fonts/nunito-latin-variable.woff2", "font/woff2"), sans = b64(P + "/fonts/nunito-sans-latin-variable.woff2", "font/woff2");
const logoDark = b64(P + "/contygo/brand/logo-dark.png", "image/png"), logoLight = b64(P + "/contygo/brand/logo-light.png", "image/png");
const henryDark = b64(O + "/henry-dark.png", "image/png"), henryLight = b64(O + "/henry-light.png", "image/png");
const clay = name => b64(`${P}/contygo/v8/viaje/${name}.webp`, "image/webp"), shot = n => b64(`${P}/contygo/v8/proceso/p${n}.webp`, "image/webp");
// At the size WhatsApp shows it (about 300 px wide) only the picture, the mark and the big words are read: so the
// words are few and large, and nothing small carries the message.
const base = `@font-face{font-family:H;src:url(${font});font-weight:800}@font-face{font-family:B;src:url(${sans});font-weight:400 800}*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;font-family:B,sans-serif}
.copy{position:absolute;left:60px;top:54px;width:600px;display:grid;justify-items:start;gap:26px}.logo{height:58px}.h{font:800 88px/.96 H,sans-serif;letter-spacing:-.045em;white-space:nowrap}
.pill{display:inline-flex;align-items:center;gap:14px;padding:12px 30px 12px 12px;border-radius:50px;background:#25d366;color:#061b3d;font:800 44px/1 H,sans-serif;letter-spacing:-.03em;white-space:nowrap}.pill i{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:#061b3d}.pill svg{width:30px;height:30px}
.sub{font:700 31px/1.25 B,sans-serif;white-space:nowrap}`;
const clock = `<svg viewBox="0 0 24 24" fill="none" stroke="#25d366" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>`;
const words = sub => `<div class="h">Haz tu contrato<br>tú mismo.</div><span class="pill"><i>${clock}</i>En menos de 3 minutos</span><p class="sub">${sub}</p>`;
const pages = {
  // A · Henry on navy (the night hero): he shows the app, the promise beside him.
  "a-henry-azul": `<style>${base}body{background:radial-gradient(60% 80% at 80% 30%,#14407f,#061b3d 70%);color:#fff}
    .photo{position:absolute;right:-36px;top:0;width:640px;-webkit-mask-image:linear-gradient(90deg,#0000 4%,#000 24%);mask-image:linear-gradient(90deg,#0000 4%,#000 24%)}.sub{color:#c5d3e8}</style>
    <img class="photo" src="${henryDark}"><div class="copy"><img class="logo" src="${logoDark}">${words("Tu trámite migratorio, desde tu celular.")}</div>`,
  // B · The clay world: the person, their assistant and the phone with the assistant's real screen.
  "b-plastilina": `<style>${base}body{background:radial-gradient(70% 70% at 76% 60%,#2f6fe473,#0000 70%),linear-gradient(150deg,#0e3a7a,#061b3d 70%);color:#fff}
    .scene{position:absolute;right:-44px;top:52px;width:560px;height:560px}.scene img{position:absolute;inset:0;width:100%;height:100%}.scene i{position:absolute;left:58.8%;top:13.6%;width:27.6%;height:47.9%;border-radius:13.6% / 7.8%;overflow:hidden;background:#fff}.scene i img{object-fit:cover;object-position:top}.sub{color:#c5d3e8}</style>
    <div class="scene"><img src="${clay("tocas")}"><i><img src="${shot(1)}"></i></div><div class="copy"><img class="logo" src="${logoDark}">${words("Tu asistente te acompaña paso a paso.")}</div>`,
  // C · Henry on paper white (the day hero).
  "c-henry-claro": `<style>${base}body{background:linear-gradient(120deg,#fff 50%,#e9f4ee);color:#061b3d}
    .photo{position:absolute;right:-36px;top:0;width:640px;-webkit-mask-image:linear-gradient(90deg,#0000 4%,#000 24%);mask-image:linear-gradient(90deg,#0000 4%,#000 24%)}.sub{color:#4f5d73}</style>
    <img class="photo" src="${henryLight}"><div class="copy"><img class="logo" src="${logoLight}">${words("Tu trámite migratorio, desde tu celular.")}</div>`,
};
(async () => { const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [name, html] of Object.entries(pages)) { await page.setContent(`<!doctype html><meta charset="utf-8">${html}`, { waitUntil: "load" }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
    const png = await page.screenshot({ type: "png" }); await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(`${O}/og-${name}.jpg`); console.log(name, Math.round(fs.statSync(`${O}/og-${name}.jpg`).size / 1024) + " KB"); }
  await browser.close(); })();
