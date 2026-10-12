import type { Config } from "tailwindcss";

/**
 * Ryzon design tokens. The theme is replaced, not extended:
 * default palette, spacing, type, radius and shadow scales do not exist.
 * Components may only use the semantic names below.
 */
const palette = {
  concrete: "#E4E5E0",
  white: "#FFFFFF",
  black: "#000000",
  graphite: "#45483F",
  rule: "#A3A69E",
  grid: "#C4C6BF",
  blueprint: "#1A33E8",
  signal: "#FF4F00",
};

const config: Config = {
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
      canvas: palette.concrete,
      surface: palette.white,
      ink: palette.black,
      primary: palette.black,
      muted: palette.graphite,
      rule: palette.rule,
      grid: palette.grid,
      accent: palette.blueprint,
      cta: palette.signal,
      "on-ink": palette.concrete,
      "on-accent": palette.white,
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
      mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      sans: ["var(--font-sans)", "system-ui", "sans-serif"],
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
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      heavy: "800",
    },
    letterSpacing: {
      tight: "-0.03em",
      snug: "-0.015em",
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
    },
    borderWidth: {
      0: "0",
      DEFAULT: "1px",
      2: "2px",
      3: "3px",
    },
    boxShadow: {
      none: "none",
      hard: "4px 4px 0 0 #000000",
      "hard-sm": "2px 2px 0 0 #000000",
      "hard-lg": "8px 8px 0 0 #000000",
      "hard-inverse": "4px 4px 0 0 #E4E5E0",
      "hard-inverse-lg": "8px 8px 0 0 #E4E5E0",
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
        fast: "150ms",
        base: "220ms",
        slow: "480ms",
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
  plugins: [],
};

export default config;
