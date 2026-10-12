// INP-style measurement: slowest interaction (event timing) across common actions, CPU throttled 4x.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const p = await b.newPage({ viewport: { width: 375, height: 812 } });
const cdp = await p.context().newCDPSession(p);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await p.addInitScript(() => {
  window.__inp = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.interactionId) window.__inp.push({ name: e.name, d: e.duration, t: e.target?.textContent?.trim().slice(0, 30) || e.target?.id || e.target?.tagName });
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
});
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.getByRole("button", { name: "Open menu" }).click();
await p.waitForTimeout(300);
await p.getByRole("button", { name: "Close menu" }).click();
await p.waitForTimeout(300);
const styleButtons = p.locator("#styles button, #styles [role=radio], #styles input[type=radio]");
const n = await styleButtons.count();
for (let i = 0; i < Math.min(n, 7); i++) {
  await styleButtons.nth(i).click({ force: true });
  await p.waitForTimeout(250);
}
await p.locator("#demo-name").fill("Jordan Smith");
await p.locator("#demo-email").type("jordan@example.com", { delay: 20 });
await p.getByRole("button", { name: /Next/ }).first().click();
await p.waitForTimeout(400);
const faq = p.locator("#faq summary, #faq button[aria-expanded]");
for (let i = 0; i < Math.min(await faq.count(), 3); i++) {
  await faq.nth(i).click();
  await p.waitForTimeout(150);
}
await p.waitForTimeout(500);
const rows = await p.evaluate(() => window.__inp);
console.log("clicks in order:", rows.filter((r) => r.name === "click").map((r) => `${Math.round(r.d)}:${r.t}`).join(" , "));
const byInteraction = rows.sort((a, b) => b.d - a.d);
console.log("interactions measured:", rows.length, "| style options clicked:", Math.min(n, 7));
console.log("worst 5:", byInteraction.slice(0, 5).map((r) => `${Math.round(r.d)}ms ${r.name} "${r.t}"`).join(" | "));
console.log("INP (worst, CPU 4x):", Math.round(byInteraction[0]?.d ?? 0), "ms");
await b.close();
