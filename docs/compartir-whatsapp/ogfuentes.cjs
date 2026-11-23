// Henry from the live hero, with the app on his phone, as a picture: the third frame of the hero's story, on each theme.
const { chromium } = require("playwright");
(async () => { const browser = await chromium.launch();
  for (const theme of ["dark", "light"]) { const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    await page.addInitScript(t => { try { localStorage.setItem("meta_consent", "denied"); localStorage.setItem("contygo-appearance", t); sessionStorage.setItem("contygo.chat-teaser", "1"); } catch {} }, theme);
    await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "[class*=BlackFriday_hero],[class*=LandingChat_chat],[class*=ContygoLanding_thread],[class*=threadHead],[class*=ContygoLanding_dock],[class*=HeroStory_caption],[class*=HeroStory_parts],[class*=HeroStory_soundNote],nextjs-portal{display:none!important}" });
    // The third frame holds from about 3.4 s to 9 s of each round; the screen has come out of the phone by then.
    await page.waitForTimeout(6800);
    const art = page.locator('[data-thread="start"]'); const box = await art.boundingBox();
    await art.screenshot({ path: `../og/henry-${theme}.png` }); console.log(theme, Math.round(box.width) + "x" + Math.round(box.height), await page.evaluate(() => [...document.querySelectorAll('[data-thread="start"] img')].findIndex(i => getComputedStyle(i).opacity === "1")));
    await page.close(); }
  await browser.close(); })();
