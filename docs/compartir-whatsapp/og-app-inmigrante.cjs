// «La app del inmigrante»: three ways to finish the picture under the 3-minute pill. usage: node og2.cjs
const { chromium } = require("playwright"); const sharp = require("sharp"); const fs = require("fs");
const P = "/Users/pepitobillo/Documents/Trabajo/Contygo/public", O = __dirname + "/../og";
const b64 = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
const font = b64(P + "/fonts/nunito-latin-variable.woff2", "font/woff2"), sans = b64(P + "/fonts/nunito-sans-latin-variable.woff2", "font/woff2");
const logoLight = b64(P + "/contygo/brand/logo-light.png", "image/png"), henryLight = b64(O + "/henry-light.png", "image/png");
// The flag, drawn: thirteen stripes and the canton with its stars as dots (at this size a star is a dot).
const stars = Array.from({ length: 9 }, (_, r) => Array.from({ length: r % 2 ? 5 : 6 }, (_, c) => `<circle cx="${(r % 2 ? 6.3 : 3.2) + c * 6.3}" cy="${3 + r * 3.1}" r="1.15"/>`).join("")).join("");
const flag = `<svg class="flag" viewBox="0 0 95 50"><defs><clipPath id="f"><rect width="95" height="50" rx="6"/></clipPath></defs><g clip-path="url(#f)"><rect width="95" height="50" fill="#fff"/>${Array.from({ length: 7 }, (_, i) => `<rect y="${i * 2 * 50 / 13}" width="95" height="${50 / 13}" fill="#b22234"/>`).join("")}<rect width="38" height="${7 * 50 / 13}" fill="#3c3b6e"/><g fill="#fff">${stars}</g></g><rect x=".5" y=".5" width="94" height="49" rx="5.5" fill="none" stroke="#061b3d" stroke-opacity=".14"/></svg>`;
const base = `@font-face{font-family:H;src:url(${font});font-weight:800}@font-face{font-family:B;src:url(${sans});font-weight:400 800}*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;font-family:B,sans-serif;background:linear-gradient(120deg,#fff 50%,#e9f4ee);color:#061b3d}
.photo{position:absolute;right:-36px;top:0;width:640px;-webkit-mask-image:linear-gradient(90deg,#0000 4%,#000 24%);mask-image:linear-gradient(90deg,#0000 4%,#000 24%)}
.copy{position:absolute;left:60px;top:62px;width:640px;display:grid;justify-items:start;gap:24px}.logo{height:58px}.h{font:800 88px/.98 H,sans-serif;letter-spacing:-.045em;white-space:nowrap}
.flag{display:inline-block;height:62px;margin-left:20px;vertical-align:-4px;filter:drop-shadow(0 6px 10px #061b3d2e)}
.pill{display:inline-flex;align-items:center;gap:14px;padding:12px 30px 12px 12px;border-radius:50px;background:#25d366;color:#061b3d;font:800 44px/1 H,sans-serif;letter-spacing:-.03em;white-space:nowrap}.pill i{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:#061b3d}.pill svg{width:30px;height:30px}
.sub{font:700 31px/1.25 B,sans-serif;white-space:nowrap;color:#4f5d73}.sub b{color:#061b3d;font-weight:800}
.chips{display:flex;gap:9px;align-items:center}.chips span{padding:9px 16px;border-radius:40px;background:#fff;border:2.5px solid #061b3d;font:800 24px/1 H,sans-serif;letter-spacing:-.02em;white-space:nowrap}.chips em{font:800 25px/1 H,sans-serif;font-style:normal;color:#4f5d73}
.seals{display:grid;justify-items:start;gap:10px}.seals span{display:inline-flex;align-items:center;gap:11px;padding:9px 20px 9px 11px;border-radius:40px;background:#fff;border:2.5px solid #061b3d;font:800 25px/1 H,sans-serif;letter-spacing:-.02em;white-space:nowrap}.seals svg{width:34px;height:34px}\n.lead{margin-bottom:-12px;font:800 27px/1 B,sans-serif;color:#4f5d73}
.checks{display:flex;gap:17px}.checks span{display:inline-flex;align-items:center;gap:8px;font:800 25px/1 B,sans-serif;white-space:nowrap}.checks svg{width:27px;height:27px}
.tag{position:absolute;right:26px;bottom:24px;padding:11px 18px 12px;border-radius:16px;background:#fffffff0;box-shadow:0 8px 22px #061b3d2e;text-align:right}.tag b{display:block;font:800 25px/1.1 H,sans-serif;letter-spacing:-.02em}.tag span{display:block;margin-top:3px;font:700 17.5px/1.25 B,sans-serif;color:#4f5d73}`;
const clock = `<svg viewBox="0 0 24 24" fill="none" stroke="#25d366" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>`;
const ok = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#25d366"/><path d="M6.8 12.4l3.4 3.4 7-7.4" fill="none" stroke="#061b3d" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const top = `<img class="logo" src="${logoLight}"><div class="h">La app del<br>inmigrante.${flag}</div><span class="pill"><i>${clock}</i>En menos de 3 minutos</span>`;
const page = (below, extra = "") => `<style>${base}</style><img class="photo" src="${henryLight}"><div class="copy">${top}${below}</div>${extra}`;
const shield = `<svg viewBox="0 0 24 24"><path d="M12 1.6 3.4 4.8v6.4c0 5.2 3.6 9.4 8.6 11.2 5-1.8 8.6-6 8.6-11.2V4.8z" fill="#25d366"/><path d="M7.6 12.2l3 3 5.8-6.2" fill="none" stroke="#061b3d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const pages = {
  // 1 · Who stands behind it, as a sentence that follows from the pill.
  "c1-respaldo": page(`<p class="sub"><b>Con el respaldo de Henry Orellana,</b><br><span style="font-size:27px">consultor de inmigración registrado en Utah.</span></p>`),
  // 2 · The figure the owner confirmed, in its own words («atendidos», never «aprobados»).
  "c2-clientes": page(`<p class="sub"><b style="font:800 40px/1.1 H,sans-serif;letter-spacing:-.03em">+500 clientes atendidos</b><br><span style="font-size:27px">Con Henry Orellana, consultor de inmigración<br>registrado en Utah.</span></p>`),
  // 3 · Both, as two seals.
  "c3-sellos": page(`<div class="seals"><span>${shield}Consultor de inmigración registrado en Utah</span><span>${ok}+500 clientes atendidos</span></div>`),
};
(async () => { const browser = await chromium.launch(); const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [name, html] of Object.entries(pages)) { await p.setContent(`<!doctype html><meta charset="utf-8">${html}`, { waitUntil: "load" }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    const w = await p.evaluate(() => [...document.querySelectorAll(".copy > *")].map(e => Math.round(e.getBoundingClientRect().right)));
    const png = await p.screenshot({ type: "png" }); await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(`${O}/og3-${name}.jpg`); console.log(name, Math.round(fs.statSync(`${O}/og3-${name}.jpg`).size / 1024) + " KB", "bordes derechos:", w.join(" ")); }
  await browser.close(); })();
