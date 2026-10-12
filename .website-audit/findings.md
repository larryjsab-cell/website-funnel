# Findings log

## Phase 1 — Intake
- [fixed] site.config.json, content/*.json, PRODUCT.md, TODO.md written from intake. `/impeccable init` isn't installed, so PRODUCT.md was written by hand.
- [deferred] ZIP, social links, logo, cancellation terms, Starter/Growth edit policy, hosting/domain, demo revisions, Complete upfront cost, and proof (testimonials, review count, sites launched, logos). All listed in TODO.md.

## Phase 2 — Foundation + landing
Skills: `/impeccable` and `/ui-ux-pro-max` aren't installed. I substituted `nextjs-website-builder` (stages 2, 5, 6, 7) + `frontend-design`. `web-design-guidelines` ran as the gate.

### Design system
- [fixed] Tailwind theme replaced, not extended. Default colors, spacing, type, radius and shadow scales don't exist, so `blue-500` cannot compile. Semantic tokens: canvas, surface, ink, primary, muted, rule, grid, accent, cta, on-ink, on-accent.
- [fixed] Contrast measured: ink/canvas 16.6, muted/canvas 7.4, muted/surface 9.3, ink on cta 6.4, accent/canvas 6.2, white on accent 7.8. The cta color is never used as text on canvas (2.6) and is only used on CTAs (verified by grep).
- [fixed] Type: Martian Mono (wdth axis) + Archivo via next/font, display swap. Smallest step 16px.

### Landing page
- [fixed] All 11 sections in the brief's order, each a component in /components/sections. Copy comes from /content.
- [fixed] One orchestrated motion: hero mockup wireframe → finished (CSS only, transform/opacity). Reduced motion shows the final state. Verified with a mid-animation screenshot.
- [fixed] Analytics: `track()` + delegated `[data-cta]` listener; `cta_click` with location verified in dataLayer.
- [fixed] Stub pages for /pricing, /examples, /how-it-works, /faq, /demo, /contact, /privacy, /terms (noindex). They keep every nav and CTA link resolvable until Phase 3.

### Visual review (screenshots 375/768/1024/1440)
- [fixed] Mobile header CTA wrapped onto 2 lines: nowrap + condensed width, wordmark text hidden <375px.
- [fixed] Grid lines too strong through body text: new lighter `grid` token (1.36:1).
- [fixed] Trust strip: 5 stacked rows on mobile → 2-col; tokens broke mid-word at xl, now resized; md uses a 6-col span layout.
- [fixed] Section padding conflict (py-0 vs py-16 specificity): Section `padding` prop.
- [fixed] Phone mockup crowded the browser at lg: phone shown from xl only.
- [fixed] Mobile CTA spacing: in-content primary CTAs at 0.5, 2.4, 4.0, 6.6, 8.7, 10.7, 11.3, 12.7 screens, plus the sticky bar always visible.

### Viewport audit (skill script, 9 widths × 3 routes)
- [fixed] H-scroll at 320 (header) and 768 (desktop nav too wide): desktop nav now from lg, drawer below.
- [fixed] Footer social placeholder tokens overflowed: break-all.
- [fixed] Text links and the wordmark were under 44px tall/wide: min-h-11 / min-w-11.
- Remaining flags are sr-only elements (skip link, captions, sr headings). They're intentional, not defects.

### web-design-guidelines
- [fixed] Drawer: overscroll-contain, focus trap, Escape closes, focus returns, closes on navigate and on resize to lg (verified via Playwright at 375 and 768).
- [fixed] Sticky bottom bar could cover focused elements: scroll-padding-bottom under md.
- [fixed] Straight quotes and apostrophes in content → curly.
- [fixed] touch-action: manipulation + tap highlight on interactive elements; translate="no" on the brand name; tabular-nums on prices; min-w-0 on the truncating URL bar.
- [fixed] The focus ring on the ink band and the footer link hover were using the cta color: switched to on-ink, so the cta color stays exclusive.
- [deferred] Guideline asks for Title Case headings and second-person-only copy. Headings stay sentence case (design direction) and "we" is the business voice. CTAs are Title Case as specified.
- [not-verified] Real-device/Safari check: only Chromium is available.

### CHECK
- [fixed] `npm run build` passes, `tsc` clean, `eslint` 0 problems.
- [fixed] Zero console errors/warnings (Playwright, 375/768/1440).
- [fixed] Zero broken internal links (scripts/check-links.mjs, 9 pages).

## Phase 2, round 2: owner feedback
- [fixed] Single-page funnel: removed /pricing, /examples, /how-it-works, /faq, /demo, /contact. Nav and every CTA use section anchors. The link checker now verifies that anchor targets exist (10 anchors, 0 missing).
- [fixed] Demo form is now a section: 2 steps (name+email, then details), inline errors with fixes, focus on first error, honeypot, loading state, inline success with next steps. `/api/lead` re-validates server-side. With no webhook configured, the form shows "not connected yet, call or email" (no dead button).
- [fixed] Contact section: plain-text NAP, hours, service area + short form (secondary button style).
- [fixed] Mobile CTA bar hides (inert) while a form section is on screen.
- [fixed] Owner terms applied: ZIP, cancel, edits ($20/hr), demo changes, $0 upfront limited-time; socials removed.
- [fixed] BUG found in screenshots: both form steps rendered at once (`grid` overrode `hidden`). Fixed, and the form test now asserts visibility per step.

## Style switcher (owner request)
- [fixed] 7 styles via CSS variables (color, display/UI/body faces, weights, tracking, radius, border widths, shadows, hover lift, motion durations, grid visibility, variable-font axes). The component markup is identical across styles.
- [fixed] Contrast gate: all 7 styles pass 12 checks (text pairs ≥ 4.5, CTA edge ≥ 3).
- [fixed] Switcher: native radios (arrow keys, screen reader group), live scoped previews, `?style=` shareable URL, localStorage, `style_select` event, pre-fills "Style you like" on the demo form.
- [fixed] Luxury: Cormorant old-style numerals → lining figures sitewide; small UI text uses a separate UI face (Jost / Franklin / Karla) so labels stay legible.
- [fixed] Verified per style at 1440 and 375: correct theme applied, no horizontal scroll, no console errors.
- [deferred] Hero mockup, examples and placeholders are style-neutral illustrations. Phase 6 images are one photoshoot, so they won't change with the style.

## Legal pages (owner: "/privacy and /terms can be pages")
- [fixed] /privacy and /terms are real, indexable pages (StubPage removed). Copy comes from content/legal.json and is written only from the owner's stated terms. Unknowns are marked [CONFIRM] (analytics provider, retention period, billing/renewal, governing law). A draft notice recommends legal review.
- [fixed] Verified: no overflow at 9 widths, links OK, renders in all styles.

## Per-style CSS (owner: "each design needs its own color palette and CSS")
- [fixed] Added stable `rz-*` hooks to every component plus one stylesheet per style (app/styles/looks/*.css) on top of its palette tokens. Layout and text are identical; each style changes section dividers, backgrounds, card treatment, button shape and finish, headings, numbering, list markers, table and FAQ treatment.
  - Minimal: no section rules, hairline floating cards, pill chips, light bands, small circled numbers.
  - Editorial: double rules, oversized Bodoni, italic standfirsts, drop cap, pull-quote testimonials, column layout instead of boxes.
  - Organic: paper grain, soft hero blobs, rounded floating panels, pebble numbers, rounded FAQ.
  - Corporate: dotted hero, accent bars on headings, numbered squares, check marks, zebra table, boxed FAQ.
  - Luxury: gold ornaments between sections, double gold frames, metallic buttons, tracked caps (desktop), gold numerals.
  - Playful: confetti, candy-colored cards, tilted stickers, wavy heading underlines, bubbly numbers.
- [fixed] Mobile issues found in screenshots: Luxury header labels collided with the logo at 375px; placeholder tokens broke mid-word; Editorial trust value overflowed. All fixed. A header-overlap check now runs per style at 320/375/1024.
- [fixed] axe-core scan per style at 1440 and 375: 14/14 runs with 0 violations, after putting the mobile CTA bar in an `<aside>` landmark.

## Netlify
- [fixed] Created a separate project `ryzon-funnel-preview` (the existing `ryzon-automation` project was left untouched, per the owner). Added netlify.toml.
- [fixed] Owner allowed the Netlify API hosts. First deploy was "ready" but broken: no functions and pages under server/app (Next.js runtime didn't run). Fixed by adding @netlify/plugin-nextjs 5.16.0 to netlify.toml + devDependencies. Redeploy 6acd1b26b5160ff3c0367b71: plugin_state success, Next.js Server Handler function deployed, 3 redirect + 1 header rules.
- [not-verified] Live URL in a browser: this container can't reach ryzon-funnel-preview.netlify.app (only the Netlify API hosts are allowed). Verified via the Netlify deploy record only.

## Mobile optimization (plan: `mobile-plan.md`)
Baseline: `scripts/qa/mobile.mjs` on 21 routes and states × 12 device profiles (phones 320–430 portrait, landscape 568–932, tablets 768/1024), plus 7 styles. Every phone view was also reviewed by eye on contact sheets (`sheets.mjs`).
- [fixed] Bars stacked on phones: three "Get My Free Demo" buttons at once (header, hero, bottom bar). Header plus bar took 25% of a 320×568 screen and up to 44% in landscape.
  - Below md the header drops its CTA. The bar now waits until the hero CTA has scrolled off the top (on legal pages, until the title has).
  - The header is 56px on phones and auto-hides on scroll down. It returns only on a user scroll up, on focus, or near the top.
  - The bar is 66px, or 62px in `short:` landscape.
  - While reading, fixed UI is now about 10% of the screen.
- [fixed] Header returned mid-page when late fonts shifted the layout (luxury style). The reveal now needs real touch, wheel or key input.
- [fixed] First screen at 320×568: the hero CTA was 19px below the fold. Tighter hero spacing and lede size under 375px; headline, offer line and CTA now fit.
- [fixed] The logo mark was squeezed in the open-menu header (shrink-0). The "Ryzon" wordmark now shows at every width.
- [fixed] Menu drawer was cut off in landscape. `short:` two-column layout; the drawer top follows the header height; safe-area bottom padding.
- [fixed] Tap targets under 44px: footer nav (FAQ, Styles, Terms), flow header phone link, flow footer links, "View your demo", admin header and table links, admin contact links, "Back to the pipeline".
- [fixed] Crowded targets: header gap, footer phone/email gap, tablet nav gap set to 8px.
- [fixed] Example cards clipped "Neighborhood café" at 320px. Under 375px the cards turn sideways (image left); titles wrap.
- [fixed] Trust strip "Nationwide" ran out of its cell at 320px. Smaller value size under 375px, cells wrap.
- [fixed] /go-live on phones: the billing toggle is full width with the "2 Months Free" label on its own line; the recommended plan comes first under md; the price scales down in the narrow tablet layout.
- [fixed] Flow footer email broke mid-word (break-all → break-words). Plain-text phone numbers are now tel: links.
- [fixed] Admin on phones:
  - Title and Account sit on one row, with Today, Board and Table as a full-width tab bar marked with aria-current.
  - The table becomes cards under md, and filters fold behind "Filters (n)".
  - Email rows wrap their buttons instead of squeezing the text to 14px.
  - The customer name heading wraps.
- [fixed] Sticky hover on touch: Tailwind `hoverOnlyWhenSupported`, and the per-style hover rules are wrapped in `@media (hover: hover) and (pointer: fine)`. Press feedback through `active:` states, plus link, summary and menu dimming on `(hover: none)`.
- [fixed] Browser chrome: `theme-color` follows the active style (luxury gets a dark toolbar), generated from `scripts/themes.mjs`. iOS auto-linking of numbers, addresses and emails is off.
- [fixed] Phone keyboards: `enterkeyhint="next"` on single-line fields and autocapitalized names (demo, contact and booking forms). Inputs are 17px, so iOS never zooms on focus.
- [fixed] /book layout shift 0.186 on mobile: the calendar used to render as "Loading…" on the server. It now server-renders in the business timezone, then swaps in the visitor's zone. CLS is now 0.037.
- [fixed] Mobile Lighthouse (DevTools throttling: 4× CPU and throttled network, median of 3):

  | Page | Perf | LCP | CLS |
  |---|---|---|---|
  | home | 96 | 1.81s | 0 |
  | /go-live | 98 | 1.61s | 0 |
  | /book | 96 | 1.60s | 0.037 |
  | /changes | 97 | 1.58s | 0 |
  | /thank-you | 98 | 1.62s | 0 |
  | /privacy | 97 | 1.62s | 0 |

  TBT stays at 144–185ms on every page.
- [fixed] Final sweep: `mobile.mjs` (full) is clean, apart from the two accepted items below. Phone form walkthrough (`mforms.mjs`): keyboard hints, step 2 heading clear of the header, success message in view.
- [fixed] Regression suites all pass after the changes: a11y (52 scans, 0 violations), sweep (0 console or CSP errors), flow, admin, admin with 150 leads, JS and no-JS forms.
- [deferred] Landscape phones (height 320–430): the hero CTA sits 40–100px below the first screen. The headline and offer are visible, and the bar takes over after one short scroll. Accepted, since forcing it up would shrink the headline.
- [deferred] Organic style: the decorative hero shapes are clipped by the hero section on purpose (aria-hidden, not text).
- [not-verified] Real iOS Safari and Android Chrome: notch and home-bar insets, the on-screen keyboard covering fields, and momentum scrolling with the auto-hiding header. This environment only has headless Chromium with mobile emulation. `viewport-fit=cover` was deliberately not enabled, so content never sits under the notch.
