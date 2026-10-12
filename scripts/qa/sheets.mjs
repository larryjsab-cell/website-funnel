// Viewport-by-viewport phone screenshots, tiled into contact sheets for review.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mockSupabase } from "./mocks.mjs";
const B = "http://localhost:3000";
const OUT = process.argv[2] || ".website-audit/mobile/sheets";
const only = process.argv[3] ? process.argv[3].split(",") : null;
mkdirSync(OUT, { recursive: true });
const T = { review: "a".repeat(48), paid: "b".repeat(48), closed: "c".repeat(48), files: "d".repeat(48) };
const jobs = [
  ["home-375", "/", 375, 667], ["home-320", "/", 320, 568], ["home-landscape", "/", 667, 375],
  ["golive-375", `/go-live?t=${T.review}&offer=standard`, 375, 667], ["files-375", `/go-live?t=${T.files}&offer=files99`, 375, 667],
  ["book-375", `/book?t=${T.paid}`, 375, 667], ["changes-375", `/changes?t=${T.paid}`, 375, 667], ["legal-375", "/privacy", 375, 667],
  ["admin-today-375", "/admin", 375, 667], ["admin-table-375", "/admin?view=table", 375, 667], ["admin-detail-375", "/admin/s/s1", 375, 667],
  ["menu-375", "/#menu", 375, 667], ["menu-landscape", "/#menu", 667, 375],
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
for (const [name, path, w, h] of jobs) {
  if (only && !only.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  if (path.startsWith("/admin")) {
    await mockSupabase(p);
    await p.goto(B + "/admin", { waitUntil: "networkidle" });
    await p.fill("#admin-email", "larryjsab@gmail.com");
    await p.fill("#admin-password", "x");
    await p.getByRole("button", { name: /sign in/i }).click();
    await p.waitForTimeout(600);
  }
  await p.goto(B + path.replace("#menu", ""), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const files = [];
  if (path.endsWith("#menu")) {
    await p.getByRole("button", { name: /open menu/i }).tap();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${name}-0.png` });
    files.push(`${OUT}/${name}-0.png`);
  } else {
    const total = await p.evaluate(() => document.documentElement.scrollHeight);
    let i = 0;
    for (let y = 0; y < total && i < 40; y += h - 40, i++) {
      await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
      await p.waitForTimeout(350);
      const f = `${OUT}/${name}-${String(i).padStart(2, "0")}.png`;
      await p.screenshot({ path: f });
      files.push(f);
    }
  }
  // tile: up to 6 per row for portrait, 3 for landscape
  const per = w > h ? 3 : 6;
  execFileSync("python3", ["-c", `
import sys
from PIL import Image, ImageDraw
files=sys.argv[2:]; out=sys.argv[1]; per=${per}
ims=[Image.open(f) for f in files]
w,h=ims[0].size; gap=12
for s in range(0,len(ims),per*2):
  chunk=ims[s:s+per*2]; rows=(len(chunk)+per-1)//per
  sheet=Image.new('RGB',(per*w+(per+1)*gap, rows*h+(rows+1)*gap),(120,120,120))
  d=ImageDraw.Draw(sheet)
  for k,im in enumerate(chunk):
    x=gap+(k%per)*(w+gap); y=gap+(k//per)*(h+gap); sheet.paste(im,(x,y)); d.text((x+4,y+4),str(s+k),fill=(255,0,0))
  sheet.save(f"{out}-sheet{s//(per*2)}.png")
`, `${OUT}/${name}`, ...files]);
  await ctx.close();
}
await browser.close();
