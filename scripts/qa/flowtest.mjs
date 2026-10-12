const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = process.argv[2];
const B = "http://localhost:3000";
const T = { review: "a".repeat(48), paid: "b".repeat(48), closed: "c".repeat(48), files: "d".repeat(48) };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const errs = [];
const log = (k, v) => console.log(k.padEnd(46), v);
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Los_Angeles" });
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push(e.message));
const h1 = async () => (await p.locator("h1").first().textContent())?.trim();

await p.goto(`${B}/go-live?t=${T.review}&offer=standard`);
log("go-live standard h1", await h1());
log("plan cards (monthly)", await p.locator("form[action='/api/checkout']").count());
log("starter monthly price", (await p.locator("form", { hasText: "Starter" }).locator("p").nth(0).textContent())?.trim());
await p.screenshot({ path: `${out}/golive-standard.png`, fullPage: true });

await p.goto(`${B}/go-live?t=${T.review}&offer=host50-year&interval=year`);
log("host50-year h1", await h1());
log("ends banner", (await p.getByText(/This offer ends/).textContent())?.trim());
log("starter yearly first price", (await p.locator("form", { hasText: "Starter" }).locator("p").nth(0).textContent())?.trim());
log("starter deal line", (await p.locator("form", { hasText: "Starter" }).locator("p").nth(1).textContent())?.trim());
await p.screenshot({ path: `${out}/golive-host50year.png`, fullPage: true });

await p.goto(`${B}/go-live?t=${T.review}&offer=host50-month`);
log("expired offer falls back to", await h1());
log("fallback notice", await p.getByText(/That offer has ended/).count());

// Checkout can't reach Stripe from here, so it should bounce back with a friendly error.
await p.goto(`${B}/go-live?t=${T.review}&offer=standard`);
await p.getByRole("button", { name: "Get started now with Growth" }).click();
await p.waitForURL(/error=checkout/);
log("checkout error banner", (await p.locator("main [role=alert]").textContent())?.trim().slice(0, 40));

await p.goto(`${B}/go-live?t=${T.files}&offer=files99`);
log("files99 h1", await h1());
await p.screenshot({ path: `${out}/golive-files.png`, fullPage: true });

await p.goto(`${B}/go-live?t=${T.paid}&offer=standard`);
log("paid h1", await h1());
await p.goto(`${B}/go-live?t=${T.closed}&offer=standard`);
log("closed h1", await h1());
await p.goto(`${B}/go-live?t=nonsense&offer=standard`);
log("bad token h1", await h1());

await p.goto(`${B}/changes?t=${T.review}`);
log("changes (unpaid) h1", await h1());
await p.goto(`${B}/changes?t=${T.paid}`);
log("changes (paid) h1", await h1());
await p.getByRole("button", { name: "Send my changes" }).click();
log("empty changes error", (await p.locator("main [role=alert]").textContent())?.trim().slice(0, 30));
await p.fill("#changes", "Bigger logo\nNew hours");
await p.getByRole("button", { name: "Send my changes" }).click();
await p.getByRole("heading", { name: /on it/ }).waitFor();
log("changes sent", true);

await p.goto(`${B}/book?t=${T.paid}&purpose=changes`);
log("book h1", await h1());
await p.getByText(/Time \(/).waitFor();
log("timezone legend", (await p.getByText(/Time \(/).textContent())?.trim());
log("day buttons", await p.locator("fieldset").nth(0).locator("button").count());
await p.screenshot({ path: `${out}/book.png`, fullPage: true });
await p.locator("fieldset").nth(1).locator("button").nth(1).click();
await p.getByLabel("Google Meet (video)").check();
await p.getByRole("button", { name: /^Book / }).click();
log("taken slot message", (await p.locator("main [role=alert]").textContent())?.trim().slice(0, 40));
await p.locator("fieldset").nth(1).locator("button").nth(1).click();
await p.getByRole("button", { name: /^Book / }).click();
await p.getByRole("heading", { name: /booked/ }).waitFor();
log("booked text", (await p.locator("h2 + p").textContent())?.trim().slice(0, 70));

await p.goto(`${B}/book`);
await p.getByText(/Time \(/).waitFor();
log("public booking asks name", await p.locator("#b-name").isVisible());

await p.goto(`${B}/unsubscribe?t=${T.review}`);
log("unsubscribe h1", await h1());
await p.getByRole("button", { name: "Unsubscribe from offers" }).click();
await p.waitForURL(/done=1/);
log("after unsubscribe h1", await h1());

await p.setViewportSize({ width: 375, height: 812 });
for (const [name, url] of [["golive-mobile", `/go-live?t=${T.review}&offer=standard`], ["book-mobile", `/book?t=${T.paid}`]]) {
  await p.goto(B + url);
  await p.waitForTimeout(400);
  log(`${name}: no horizontal scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
log("console errors", errs.length ? errs.join(" | ").slice(0, 400) : "none");
await b.close();
