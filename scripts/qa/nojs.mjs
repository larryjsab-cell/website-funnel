const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const B = "http://localhost:3000";
const t = (c) => c.repeat(48);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const row = (k, v) => console.log(k.padEnd(48), v);
const FACTS = ["$40", "$0 design fee", "free demo", "(248) 974-4220", "larryjsab@gmail.com", "3230 Glen Iris Drive", "Commerce Township", "9am–10pm", "Nationwide", "Starter Website", "Growth Package", "Complete Package", "$100", "$200", "$400", "No credit card"];
for (const width of [1280, 375]) {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  const pages = ["/", "/privacy", "/terms", "/nope", `/go-live?t=${t("a")}`, `/changes?t=${t("b")}`, `/book?t=${t("b")}`, `/unsubscribe?t=${t("c")}`, "/admin"];
  for (const path of pages) {
    const res = await p.goto(B + path, { waitUntil: "load" });
    const info = await p.evaluate(() => {
      const main = document.querySelector("main");
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && Number(s.opacity) > 0.05; };
      const hiddenText = [...document.querySelectorAll("main section, main article, main h2, main p")].filter((el) => el.textContent.trim().length > 20 && !el.closest("details:not([open])") && !el.closest("[hidden],[aria-hidden=true]") && !vis(el) && !el.closest(".sr-only") && getComputedStyle(el).display !== "none").map((el) => el.tagName + ":" + el.textContent.trim().slice(0, 50));
      const navLinks = [...document.querySelectorAll("header a")].filter(vis).map((a) => a.textContent.trim());
      return { h1: document.querySelector("h1")?.innerText.trim() ?? "", text: main?.innerText ?? "", hiddenText: hiddenText.slice(0, 5), navLinks, faqQs: document.querySelectorAll("main details summary").length };
    });
    row(`${path.slice(0, 30)}@${width}`, `${res.status()} | h1: ${info.h1.slice(0, 40)} | ${info.text.length} chars | header links: ${info.navLinks.length}`);
    if (!info.h1 && path !== "/admin") problems.push(`${path}@${width}: no h1 without JS`);
    if (info.hiddenText.length) problems.push(`${path}@${width}: text invisible without JS: ${info.hiddenText.join(" | ")}`);
    if (path === "/") {
      const missing = FACTS.filter((f) => !info.text.toLowerCase().includes(f.toLowerCase()));
      row("  key facts missing from visible text", missing.join(", ") || "none");
      row("  FAQ questions visible", info.faqQs);
      row("  header links", info.navLinks.join(" / "));
      if (missing.length) problems.push(`home@${width}: facts missing ${missing.join(", ")}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log("\nPROBLEMS:", problems.length ? "\n- " + problems.join("\n- ") : "none");

// ---- forms without JS, and agent-fillable markup
const b2 = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const out = [];
{
  const ctx = await b2.newContext({ javaScriptEnabled: false, reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(B + "/");
  const step2Visible = await p.locator("#demo-business").isVisible();
  row("no-JS: demo step 2 fields visible", step2Visible);
  row("no-JS: submit label", (await p.locator("#demo form button[type=submit]").innerText()).trim());
  await p.fill("#demo-name", "Nora NoJS");
  await p.fill("#demo-email", "nora@example.com");
  await p.fill("#demo-business", "NoJS Bakery");
  await p.fill("#demo-phone", "(555) 123-4567");
  await p.selectOption("#demo-industry", { index: 1 });
  await p.click("#demo form button[type=submit]");
  await p.waitForLoadState("load");
  row("no-JS: demo lands on", new URL(p.url()).pathname + " | " + (await p.locator("h1").innerText()));
  if (!p.url().includes("/thank-you") || (await p.locator("h1").innerText()).includes("fix")) out.push("no-JS demo submit failed");
  await p.goto(B + "/");
  await p.fill("#demo-name", "Nora NoJS");
  await p.fill("#demo-email", "nora@example.com");
  await p.fill("#demo-business", "NoJS Bakery");
  await p.fill("#demo-phone", "123");
  await p.selectOption("#demo-industry", { index: 1 });
  await p.click("#demo form button[type=submit]");
  await p.waitForLoadState("load");
  row("no-JS: bad phone shows", (await p.locator("h1").innerText()) + " | " + (await p.locator("main li").first().innerText()));
  await p.goto(B + "/");
  await p.fill("#contact-name", "Cal NoJS");
  await p.fill("#contact-email", "cal@example.com");
  await p.fill("#contact-message", "Do you build sites for food trucks?");
  await p.click("#contact form button[type=submit]");
  await p.waitForLoadState("load");
  row("no-JS: contact lands on", new URL(p.url()).pathname + " | " + (await p.locator("h1").innerText()));
  if (!(await p.locator("h1").innerText()).includes("sent")) out.push("no-JS contact submit failed");
  await ctx.close();
}
{
  const ctx = await b2.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const T = (c) => c.repeat(48);
  for (const path of ["/", `/book?t=${T("b")}`, "/book?purpose=launch", `/changes?t=${T("b")}`, "/admin"]) {
    await p.goto(B + path, { waitUntil: "networkidle" });
    const bad = await p.evaluate(() =>
      [...document.querySelectorAll("input:not([type=hidden]), select, textarea")]
        .filter((el) => !el.closest("[aria-hidden=true]"))
        .filter((el) => !el.name || !el.id || !el.getAttribute("autocomplete") && el.type !== "radio" && el.type !== "file" && el.tagName !== "SELECT" || !(el.labels?.length || el.getAttribute("aria-label")))
        .map((el) => `${el.tagName.toLowerCase()}#${el.id || "?"}[name=${el.name || "?"}]`),
    );
    row(`fields lacking name/id/autocomplete/label ${path.slice(0, 18)}`, bad.join(", ") || "none");
    if (bad.length) out.push(`${path}: ${bad.join(", ")}`);
  }
  const txt = await (await p.request.get(B + "/llms.txt")).text();
  row("llms.txt", `${txt.length} chars | sections: ${(txt.match(/^## .+/gm) || []).join(" / ")}`);
  for (const must of ["$40/month", "$0", "Free demo", "(248) 974-4220", "Nationwide", "/#demo", "/privacy"]) if (!txt.includes(must)) out.push(`llms.txt missing ${must}`);
  const robots = await (await p.request.get(B + "/robots.txt")).text();
  row("robots.txt AI agents allowed", (robots.match(/User-Agent: (\S+)/g) || []).length);
  await ctx.close();
}
await b2.close();
console.log("\nFORM/AGENT PROBLEMS:", out.length ? "\n- " + out.join("\n- ") : "none");
