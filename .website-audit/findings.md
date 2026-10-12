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
