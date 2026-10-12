# QA scripts

Browser checks behind the quality bars in `DESIGN.md`. They drive a production build with Playwright. The customer pages and the dashboard run against offline stand-ins, so no real data is touched.

## Setup

```bash
npm i -g playwright && npx playwright install chromium   # or set CHROME_PATH to a Chromium binary
npm i --prefix scripts/qa axe-core                        # only for a11y.mjs (or set AXE_PATH)

node scripts/qa/mockedge.mjs &                            # stand-in edge function on :4000
npm run build
URL=http://localhost:3000 RYZON_EDGE_TOKEN=test-token RYZON_EDGE_URL=http://localhost:4000 npx next start -p 3000
```

`PLAYWRIGHT_MODULE` can point at a Playwright install that isn't on the import path.

The dashboard pages use a mocked Supabase (`mocks.mjs`). The customer pages use these test tokens: `a…a` (in demo review), `b…b` (paid), `c…c` (closed) and `d…d` (design files offer), each 48 characters long.

## Scripts

| Script | Checks |
|---|---|
| `mobile.mjs [outDir] [--quick]` | 21 routes and states × 12 device profiles, plus 7 styles. Reports sideways scroll, text spill, undersized or crowded tap targets, text under 16px, inputs that zoom on iOS, fixed-bar height, what fits on the first screen, and hover rules outside `(hover: hover)` |
| `sheets.mjs [outDir] [names]` | Screenshots taken one screen at a time, tiled into contact sheets for visual review |
| `mforms.mjs` | Phone form walkthrough: keyboard hints, step change, success message, booking |
| `a11y.mjs` | axe on every page and state, keyboard traversal with focus rings, hover and disabled contrast, reduced motion, landmarks, announced errors |
| `sweep.mjs` | Console errors and CSP violations, security headers, links and anchors, every demo CTA, the 404, unique metadata |
| `nojs.mjs` | Content and forms with JavaScript off, field markup, `llms.txt`, `robots.txt` |
| `jsform.mjs` | Demo and contact forms submit inline with JavaScript on |
| `flowtest.mjs`, `admintest.mjs`, `adminbulk.mjs` | Customer flow pages, the dashboard, and the dashboard with 150 leads |
| `seoaudit.mjs` | Titles, descriptions, canonicals, OG and Twitter tags, headings, JSON-LD, sitemap, robots, manifest, icons |
| `inp.mjs` | Interaction latency at 4× CPU slowdown |
