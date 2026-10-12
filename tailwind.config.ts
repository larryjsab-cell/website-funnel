import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Ryzon design tokens. The theme is replaced, not extended: default palette,
 * spacing, type, radius and shadow scales do not exist. Every themeable value
 * resolves to a CSS variable set per style in app/styles/themes.css, so one
 * attribute (<html data-theme>) restyles the whole page.
 */
const v = (name: string) => `var(--${name})`;

const config: Config = {
  // hover: styles only on devices that can hover, so a tap never leaves a "stuck" hover look.
  future: { hoverOnlyWhenSupported: true },
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "375px",
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      canvas: v("c-canvas"),
      surface: v("c-surface"),
      ink: v("c-ink"),
      primary: v("c-ink"),
      muted: v("c-muted"),
      rule: v("c-rule"),
      grid: v("c-grid"),
      accent: v("c-accent"),
      cta: v("c-cta"),
      "on-cta": v("c-on-cta"),
      band: v("c-band"),
      "on-band": v("c-on-band"),
      "on-ink": v("c-on-ink"),
      "on-accent": v("c-on-accent"),
      danger: v("c-danger"),
    },
    spacing: {
      0: "0",
      px: "1px",
      0.5: "0.125rem",
      1: "0.25rem",
      2: "0.5rem",
      3: "0.75rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      8: "2rem",
      10: "2.5rem",
      11: "2.75rem",
      12: "3rem",
      14: "3.5rem",
      16: "4rem",
      20: "5rem",
      24: "6rem",
      32: "8rem",
      40: "10rem",
      48: "12rem",
      64: "16rem",
      80: "20rem",
    },
    fontFamily: {
      display: [v("font-display"), "ui-sans-serif", "system-ui", "sans-serif"],
      body: [v("font-body"), "ui-sans-serif", "system-ui", "sans-serif"],
    },
    fontSize: {
      // Named steps. Nothing below 16px.
      sm: ["1rem", { lineHeight: "1.5" }],
      base: ["1.0625rem", { lineHeight: "1.6" }],
      lg: ["1.1875rem", { lineHeight: "1.55" }],
      xl: ["1.5rem", { lineHeight: "1.3" }],
      "2xl": ["1.875rem", { lineHeight: "1.15" }],
      "3xl": ["2.375rem", { lineHeight: "1.05" }],
      "4xl": ["3rem", { lineHeight: "1" }],
      "5xl": ["3.75rem", { lineHeight: "0.98" }],
      "6xl": ["4.75rem", { lineHeight: "0.95" }],
      "7xl": ["6rem", { lineHeight: "0.92" }],
    },
    fontWeight: {
      normal: v("w-normal"),
      medium: "500",
      semibold: "600",
      bold: v("w-bold"),
      heavy: v("w-heavy"),
    },
    letterSpacing: {
      tight: v("tracking-tight"),
      snug: v("tracking-snug"),
      normal: "0",
    },
    lineHeight: {
      none: "1",
      tight: "1.1",
      snug: "1.3",
      normal: "1.5",
      relaxed: "1.65",
    },
    borderRadius: {
      none: "0",
      ui: v("radius-ui"),
      card: v("radius-card"),
      full: "9999px",
    },
    borderWidth: {
      0: "0",
      DEFAULT: v("bw-hair"),
      2: v("bw-strong"),
      3: v("bw-heavy"),
    },
    boxShadow: {
      none: "none",
      hard: v("shadow-1"),
      "hard-lg": v("shadow-2"),
      "hard-inverse": v("shadow-1-band"),
      "hard-inverse-lg": v("shadow-2-band"),
    },
    extend: {
      maxWidth: {
        page: "75rem",
        measure: "38rem",
        wide: "48rem",
      },
      zIndex: {
        grid: "0",
        content: "10",
        header: "50",
        bar: "45",
        drawer: "50",
      },
      transitionProperty: {
        button: "transform, box-shadow, background-color, color",
      },
      transitionDuration: {
        fast: v("dur-fast"),
        base: v("dur-base"),
        slow: v("dur-slow"),
      },
      translate: {
        "lift-x": v("lift-x"),
        "lift-y": v("lift-y"),
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      aspectRatio: {
        "4/3": "4 / 3",
        "16/10": "16 / 10",
        "9/19": "9 / 19",
      },
    },
  },
  plugins: [
    // `short:` = phones in landscape (and any very short window): tighter bars and menus.
    plugin(({ addVariant }) => addVariant("short", "@media (max-height: 500px)")),
  ],
};

export default config;
