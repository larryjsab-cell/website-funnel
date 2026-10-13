// Builds the example-card screenshots from the originals in assets/examples/<id>.{png,jpg,jpeg,webp}:
//   public/examples/<id>.webp       the full page, for the full-screen popup
//   public/examples/<id>-card.webp  the top of the page cropped to 4:3, for the card
// and records their sizes in content/example-shots.json. Run: npm run shots
import sharp from "sharp";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";

const SRC = new URL("../assets/examples/", import.meta.url);
const OUT = new URL("../public/examples/", import.meta.url);
const FULL_MAX_W = 860; // popup column on desktop is at most ~430 CSS px, so 2x
const CARD_MAX_W = 900; // cards are at most ~420 CSS px wide
const WEBP_MAX = 16383; // WebP's size limit per side

mkdirSync(OUT, { recursive: true });
const shots = {};
for (const file of readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()) {
  const id = file.replace(/\.[^.]+$/, "");
  const src = new URL(file, SRC).pathname;
  const { width: w, height: h } = await sharp(src).metadata();

  const fullW = Math.min(w, FULL_MAX_W, Math.floor((WEBP_MAX * w) / h));
  const full = await sharp(src).resize({ width: fullW }).webp({ quality: 80 }).toFile(new URL(`${id}.webp`, OUT).pathname);

  const cropH = Math.min(h, Math.round(w * 0.75));
  const card = await sharp(src)
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .resize({ width: Math.min(w, CARD_MAX_W) })
    .webp({ quality: 78 })
    .toFile(new URL(`${id}-card.webp`, OUT).pathname);

  shots[id] = {
    full: { src: `/examples/${id}.webp`, width: full.width, height: full.height },
    card: { src: `/examples/${id}-card.webp`, width: card.width, height: card.height },
  };
  console.log(`${id}: source ${w}x${h} → full ${full.width}x${full.height} (${Math.round(full.size / 1024)} KB), card ${card.width}x${card.height} (${Math.round(card.size / 1024)} KB)`);
}
writeFileSync(new URL("../content/example-shots.json", import.meta.url), JSON.stringify(shots, null, 2) + "\n");
