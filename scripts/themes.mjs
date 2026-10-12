// Single source for the 7 style palettes. `node scripts/themes.mjs` checks
// WCAG contrast for every text/background pair the components use, then
// writes app/styles/themes.css. Edit values here, never in the CSS.
import { writeFileSync, mkdirSync } from "node:fs";

const base = {
  "w-normal": "400",
  "tracking-tight": "-0.02em",
  "tracking-snug": "-0.01em",
  "radius-ui": "0",
  "radius-card": "0",
  "bw-hair": "1px",
  "bw-strong": "1px",
  "bw-heavy": "2px",
  "shadow-1": "none",
  "shadow-2": "none",
  "shadow-1-band": "none",
  "shadow-2-band": "none",
  "lift-x": "0px",
  "lift-y": "0px",
  "dur-fast": "150ms",
  "dur-base": "220ms",
  "dur-slow": "480ms",
  "grid-opacity": "0",
  "display-variation": "normal",
  "ui-variation": "normal",
};

export const themes = {
  brutalist: {
    c: { canvas: "#E4E5E0", surface: "#FFFFFF", ink: "#000000", muted: "#45483F", rule: "#A3A69E", grid: "#C4C6BF",
         accent: "#1A33E8", cta: "#FF4F00", "on-cta": "#000000", band: "#000000", "on-band": "#E4E5E0",
         "on-ink": "#E4E5E0", "on-accent": "#FFFFFF", danger: "#A1251B" },
    t: { "font-display": "var(--font-martian)", "font-ui": "var(--font-martian)", "font-body": "var(--font-archivo)", "w-heavy": "800", "w-bold": "700",
         "tracking-tight": "-0.03em", "tracking-snug": "-0.015em", "bw-strong": "2px", "bw-heavy": "3px",
         "shadow-1": "4px 4px 0 0 #000000", "shadow-2": "8px 8px 0 0 #000000",
         "shadow-1-band": "4px 4px 0 0 #E4E5E0", "shadow-2-band": "8px 8px 0 0 #E4E5E0",
         "lift-x": "0.25rem", "lift-y": "0.25rem", "grid-opacity": "1",
         "display-variation": '"wdth" 75', "ui-variation": '"wdth" 87.5' },
  },
  minimal: {
    c: { canvas: "#FAFAF8", surface: "#FFFFFF", ink: "#18181A", muted: "#5C5C60", rule: "#D9D9D6", grid: "#EDEDEA",
         accent: "#2F49C9", cta: "#0B6E4F", "on-cta": "#FFFFFF", band: "#18181A", "on-band": "#FAFAF8",
         "on-ink": "#FFFFFF", "on-accent": "#FFFFFF", danger: "#B42318" },
    t: { "font-display": "var(--font-instrument)", "font-ui": "var(--font-instrument)", "font-body": "var(--font-instrument)", "w-heavy": "600", "w-bold": "600",
         "tracking-tight": "-0.035em", "tracking-snug": "-0.02em", "radius-ui": "999px", "radius-card": "16px",
         "shadow-1": "0 1px 2px rgba(24,24,26,0.08)",
         "shadow-2": "0 1px 2px rgba(24,24,26,0.06), 0 16px 40px -20px rgba(24,24,26,0.25)",
         "lift-y": "1px" },
  },
  editorial: {
    c: { canvas: "#FFFFFF", surface: "#F2F1EE", ink: "#0A0A0A", muted: "#4D4D4D", rule: "#BDBDBD", grid: "#E6E6E6",
         accent: "#0A0A0A", cta: "#D7141A", "on-cta": "#FFFFFF", band: "#0A0A0A", "on-band": "#FFFFFF",
         "on-ink": "#FFFFFF", "on-accent": "#FFFFFF", danger: "#8F0E0E" },
    t: { "font-display": "var(--font-bodoni)", "font-ui": "var(--font-franklin)", "font-body": "var(--font-franklin)", "w-heavy": "700", "w-bold": "700",
         "tracking-tight": "-0.025em", "tracking-snug": "-0.015em", "bw-strong": "1px", "bw-heavy": "4px" },
  },
  organic: {
    c: { canvas: "#F3EDE2", surface: "#FFFBF4", ink: "#2A251E", muted: "#5E554A", rule: "#D8CCBA", grid: "#E8DFD0",
         accent: "#4E6B35", cta: "#B4441F", "on-cta": "#FFFFFF", band: "#3D4A2F", "on-band": "#F3EDE2",
         "on-ink": "#FFFBF4", "on-accent": "#FFFFFF", danger: "#A12A1B" },
    t: { "font-display": "var(--font-fraunces)", "font-ui": "var(--font-karla)", "font-body": "var(--font-karla)", "w-heavy": "600", "w-bold": "700",
         "radius-ui": "999px", "radius-card": "28px", "bw-strong": "1.5px",
         "shadow-1": "0 6px 16px -8px rgba(42,37,30,0.35)", "shadow-2": "0 28px 56px -28px rgba(42,37,30,0.4)",
         "shadow-1-band": "0 6px 16px -8px rgba(0,0,0,0.45)", "shadow-2-band": "0 16px 32px -16px rgba(0,0,0,0.5)",
         "lift-y": "2px", "display-variation": '"SOFT" 100, "WONK" 1' },
  },
  corporate: {
    c: { canvas: "#F4F6F9", surface: "#FFFFFF", ink: "#0E1B2C", muted: "#4A5568", rule: "#D3DAE3", grid: "#E4E9EF",
         accent: "#1F4FBF", cta: "#12805C", "on-cta": "#FFFFFF", band: "#0F2747", "on-band": "#FFFFFF",
         "on-ink": "#FFFFFF", "on-accent": "#FFFFFF", danger: "#B42318" },
    t: { "font-display": "var(--font-public)", "font-ui": "var(--font-public)", "font-body": "var(--font-public)", "w-heavy": "700", "w-bold": "600",
         "tracking-tight": "-0.025em", "tracking-snug": "-0.01em", "radius-ui": "6px", "radius-card": "10px",
         "shadow-1": "0 1px 2px rgba(14,27,44,0.14)",
         "shadow-2": "0 2px 4px rgba(14,27,44,0.06), 0 16px 32px -16px rgba(14,27,44,0.28)",
         "lift-y": "1px" },
  },
  luxury: {
    c: { canvas: "#0E0D0B", surface: "#181613", ink: "#EEE7D8", muted: "#ADA492", rule: "#3B362E", grid: "#1F1C18",
         accent: "#A9B7C2", cta: "#CDAA5E", "on-cta": "#0E0D0B", band: "#050504", "on-band": "#EEE7D8",
         "on-ink": "#0E0D0B", "on-accent": "#0E0D0B", danger: "#F08A7A" },
    t: { "font-display": "var(--font-cormorant)", "font-ui": "var(--font-jost)", "font-body": "var(--font-jost)", "w-heavy": "600", "w-bold": "500",
         "tracking-tight": "-0.01em", "tracking-snug": "0.005em",
         "dur-fast": "260ms", "dur-base": "420ms", "dur-slow": "900ms" },
  },
  playful: {
    c: { canvas: "#FFF3D6", surface: "#FFFFFF", ink: "#1E1446", muted: "#4B4270", rule: "#E9C766", grid: "#FBE6AE",
         accent: "#2B54E0", cta: "#FF3B7A", "on-cta": "#1E1446", band: "#2B54E0", "on-band": "#FFFFFF",
         "on-ink": "#FFFFFF", "on-accent": "#FFFFFF", danger: "#B0102A" },
    t: { "font-display": "var(--font-bricolage)", "font-ui": "var(--font-bricolage)", "font-body": "var(--font-nunito)", "w-heavy": "800", "w-bold": "800",
         "tracking-tight": "-0.03em", "tracking-snug": "-0.01em", "radius-ui": "999px", "radius-card": "24px",
         "bw-hair": "2px", "bw-strong": "3px", "bw-heavy": "3px",
         "shadow-1": "4px 4px 0 0 #1E1446", "shadow-2": "7px 7px 0 0 #1E1446",
         "shadow-1-band": "4px 4px 0 0 #1E1446", "shadow-2-band": "7px 7px 0 0 #1E1446",
         "lift-x": "3px", "lift-y": "3px" },
  },
};

// [foreground, background, minimum ratio, where it's used]
const pairs = [
  ["ink", "canvas", 4.5, "body text"], ["ink", "surface", 4.5, "text on panels"],
  ["muted", "canvas", 4.5, "secondary text"], ["muted", "surface", 4.5, "secondary text on panels"],
  ["accent", "canvas", 4.5, "annotations, focus ring"], ["accent", "surface", 4.5, "placeholder tokens"],
  ["on-cta", "cta", 4.5, "CTA label"], ["on-band", "band", 4.5, "pricing band, footer"],
  ["on-ink", "ink", 4.5, "wordmark, table head"], ["danger", "surface", 4.5, "form errors"],
];

// Non-text contrast (WCAG 1.4.11): a button's fill OR its border must stand off the background.
const edges = [
  [["cta", "ink"], "canvas", "CTA on page"],
  [["cta", "on-band"], "band", "CTA on band"],
];

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

let failed = 0;
for (const [name, th] of Object.entries(themes)) {
  for (const [fg, bg, min, use] of pairs) {
    const r = ratio(th.c[fg], th.c[bg]);
    if (r < min) { failed++; console.log(`FAIL ${name}: ${fg} on ${bg} = ${r.toFixed(2)} (< ${min}) — ${use}`); }
  }
}
for (const [name, th] of Object.entries(themes)) {
  for (const [[fill, border], bg, use] of edges) {
    const r = Math.max(ratio(th.c[fill], th.c[bg]), ratio(th.c[border], th.c[bg]));
    if (r < 3) { failed++; console.log(`FAIL ${name}: ${use} edge = ${r.toFixed(2)} (< 3)`); }
  }
}
if (failed) { console.log(`${failed} contrast failure(s). CSS not written.`); process.exit(1); }
console.log(`Contrast OK: ${Object.keys(themes).length} themes × ${pairs.length + edges.length} checks.`);

const block = (th) => [
  ...Object.entries(th.c).map(([k, v]) => `  --c-${k}: ${v};`),
  ...Object.entries({ ...base, ...th.t }).map(([k, v]) => `  --${k}: ${v};`),
].join("\n");

const css = [
  "/* Generated by scripts/themes.mjs. Do not edit by hand. */",
  `:root,\n[data-theme="brutalist"] {\n${block(themes.brutalist)}\n  color-scheme: light;\n}`,
  ...Object.entries(themes).filter(([n]) => n !== "brutalist").map(([n, th]) =>
    `[data-theme="${n}"] {\n${block(th)}\n  color-scheme: ${lum(th.c.canvas) < 0.2 ? "dark" : "light"};\n}`),
].join("\n\n") + "\n";
mkdirSync(new URL("../app/styles/", import.meta.url), { recursive: true });
writeFileSync(new URL("../app/styles/themes.css", import.meta.url), css);
console.log("Wrote app/styles/themes.css");

// The browser toolbar (<meta name="theme-color">) follows the page background of each style.
const canvas = Object.fromEntries(Object.entries(themes).map(([n, th]) => [n, th.c.canvas]));
writeFileSync(new URL("../content/theme-canvas.json", import.meta.url), JSON.stringify(canvas, null, 2) + "\n");
console.log("Wrote content/theme-canvas.json");
