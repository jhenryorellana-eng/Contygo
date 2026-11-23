// Real frames of the assistant, from the local page with the simulated platform: the whole way from choosing a
// service to the contract ready to sign. Each frame is the assistant's window as the person sees it on a phone, with
// where they tap next (as shares of the window). usage: node captura.cjs <serviceNeed> <outDir>
const { chromium } = require("playwright"); const sharp = require("sharp"); const fs = require("fs");
const [need = "Visa Juvenil", out = "/tmp/frames"] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const frames = [], log = [];
(async () => { const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.addInitScript(() => { try { localStorage.setItem("meta_consent", "denied"); localStorage.setItem("contygo-appearance", "light"); sessionStorage.setItem("contygo.chat-teaser", "1"); } catch {} });
  page.on("pageerror", e => log.push("pageerror " + String(e).slice(0, 120)));
  await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal,[class*=HeroStory_parts]{display:none!important}" });
  await page.evaluate(() => { for (const b of document.querySelectorAll("button")) if (/^(Hoy|Nueva)$/.test(b.textContent.trim())) { let el = b; while (el.parentElement && getComputedStyle(el).position !== "fixed") el = el.parentElement; el.style.display = "none"; } });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("contygo:assistant", { detail: {} })));
  const chat = page.locator('[role=dialog][aria-label="Asistente de ContyGo"]'); await page.waitForTimeout(11000); // the voice bar's halo rests
  const shot = async (name, target) => { const box = await chat.boundingBox(); let tap = null;
    if (target && await target.count()) { const t = await target.first().boundingBox(); if (t) tap = [+((t.x + Math.min(t.width * .5, 150) - box.x) / box.width * 100).toFixed(1), +((t.y + t.height / 2 - box.y) / box.height * 100).toFixed(1)]; }
    const file = `${String(frames.length + 1).padStart(2, "0")}-${name}.png`; await chat.screenshot({ path: `${out}/${file}` }); frames.push({ name, file, tap }); log.push(`frame ${file} tap ${JSON.stringify(tap)}`); };
  const settle = ms => page.waitForTimeout(ms);
  // 1 · the service
  let target = chat.getByRole("button", { name: new RegExp(need) }).first(); await shot("tramite", target); await target.click(); await settle(1300);
  target = chat.getByRole("button", { name: /Revisar si califico/ }); await shot("servicio", target); await target.click(); await settle(2500);
  // 2 · its questions (each with whatever it asks)
  for (let k = 0; k < 14; k++) {
    if (await chat.getByRole("button", { name: /Llenar mi contrato aquí|Hablar con una persona/ }).count()) break;
    const yes = chat.locator("[class*=yesno] button").first(), opt = chat.locator("[class*=reply] [class*=LandingChat_option]").first(), date = chat.locator("[class*=reply] input[type=date]"), sel = chat.locator("[class*=reply] select");
    const q = (await chat.locator("[class*=LandingChat_bot] p").last().textContent() || "").slice(0, 60);
    if (await yes.count()) { if (k === 0 || k === 3) await shot("pregunta-" + (k + 1), yes); await yes.click(); log.push(`q${k + 1} yes: ${q}`); }
    else if (await date.count()) { await date.fill("2012-05-10"); await chat.getByRole("button", { name: "Listo" }).click(); log.push(`q${k + 1} date: ${q}`); }
    else if (await sel.count()) { await sel.selectOption({ label: "Utah" }).catch(() => sel.selectOption({ index: 1 })); log.push(`q${k + 1} select: ${q}`); }
    else if (await opt.count()) { await shot("pregunta-" + (k + 1), opt); await opt.click(); log.push(`q${k + 1} option: ${q}`); }
    await settle(2300); }
  target = chat.getByRole("button", { name: /Llenar mi contrato aquí/ });
  if (!(await target.count())) { log.push("NO CONTRACT: " + (await chat.locator("[class*=caseTitle]").textContent().catch(() => "?"))); console.log(log.join("\n")); await browser.close(); return; }
  await target.scrollIntoViewIfNeeded(); await settle(700); await shot("listo", target); await target.click(); await settle(4500);
  // 3 · the contract, step by step
  const form = chat.locator("[class*=LandingChat_contract]"), submit = () => form.locator("button[type=submit]").first();
  const fill = async (label, value) => { const el = form.getByLabel(label).first(); if (await el.count()) { await el.fill(value); return true; } return false; };
  for (let k = 0; k < 9; k++) { const title = (await chat.locator("[class*=LandingChat_title] small").textContent() || "").trim(); log.push("step: " + title);
    if (/nombre/i.test(title)) { const ins = form.locator("input:visible"); await ins.nth(0).fill("Ana"); await ins.nth((await ins.count()) - 1).fill("Pérez Soto"); await settle(500); await shot("nombre", submit()); }
    else if (/contacto/i.test(title)) { await form.locator("input[type=email]:visible").fill("ana@correo.com"); await form.locator("input[type=tel]:visible").fill("8015550142"); await settle(500); await shot("contacto", submit()); }
    else if (/direcci/i.test(title)) { const ins = form.locator("input:visible"); await ins.nth(0).fill("123 Main St"); for (let i = 1; i < await ins.count(); i++) { const ph = (await ins.nth(i).getAttribute("autocomplete")) || (await ins.nth(i).getAttribute("name")) || ""; if (/level2|city/i.test(ph)) await ins.nth(i).fill("Salt Lake City"); else if (/postal|zip/i.test(ph)) await ins.nth(i).fill("84101"); }
      const st = form.locator("select:visible"); if (await st.count()) await st.first().selectOption("UT").catch(() => {}); await settle(400); }
    else if (/revis/i.test(title)) { const box = form.locator("input[type=checkbox]:visible"); if (await box.count()) await box.first().check({ force: true }); await settle(500); await shot("revisar", submit()); }
    else if (!/paso/i.test(title)) break;
    else { if (!globalThis.peeked) { globalThis.peeked = 1; await chat.screenshot({ path: out + "/zz-otro-paso.png" }); log.push("  inputs: " + JSON.stringify(await form.locator("input:visible, select:visible, button:visible").evaluateAll(els => els.map(e => e.tagName + ":" + (e.type || "") + ":" + (e.getAttribute("aria-label") || e.placeholder || e.textContent || "").trim().slice(0, 30) + ":" + (e.value || "").slice(0, 12))))); }
      log.push("  (otro paso) " + (await form.innerText()).replace(/\s+/g, " ").slice(0, 60)); for (const el of await form.getByLabel("Nombre", { exact: true }).all()) if (await el.isVisible() && !(await el.inputValue())) await el.fill("Luis"); for (const el of await form.getByLabel(/^Apellidos/).all()) if (await el.isVisible() && !(await el.inputValue())) await el.fill("Pérez Soto"); await settle(300); await shot("personas", submit()); const dates = form.locator("input[type=date]:visible"); for (let i = 0; i < await dates.count(); i++) await dates.nth(i).fill("2012-05-10"); }
    await submit().click(); await settle(2600);
    const errs = await form.locator("[class*=error]:visible, [role=alert]:visible").allTextContents(); if (errs.length) log.push("  errores: " + errs.join(" | ").slice(0, 200));
    if (/Confirma que eres tú/.test(await form.innerText())) break; }
  // 4 · the code
  const code = form.locator("input:visible").first();
  if (/Confirma que eres tú/.test(await form.innerText()) && await code.count()) { await shot("codigo-vacio", code); await code.fill("481920"); await settle(500); await shot("codigo", submit()); await submit().click(); await settle(4200); await shot("firmar", form.getByRole("link", { name: /Firmar mi contrato/ })); }
  else log.push("NO CODE STEP: " + (await form.innerText()).replace(/\s+/g, " ").slice(0, 200));
  fs.writeFileSync(`${out}/frames.json`, JSON.stringify(frames, null, 1)); console.log(log.join("\n")); await browser.close(); })().catch(e => { console.log(log.join("\n")); console.error(String(e).slice(0, 500)); process.exit(1); });
