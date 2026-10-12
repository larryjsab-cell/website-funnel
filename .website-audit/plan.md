# Ryzon Automation — Implementation Plan

## Brief
Funnel marketing site for an affordable web design service. The audience is local small business owners, mostly on phones. Primary conversion: free design demo request (/demo). Service area: nationwide.

## Routes
| Route | Purpose | Rendering |
|---|---|---|
| / | Landing, main conversion page | Static |
| /pricing | 3 plans, $0 design fee, push to demo | Static |
| /examples | Sample designs, each with a demo CTA | Static |
| /how-it-works | 3 steps + timeline | Static |
| /faq | Objections, FAQPage schema | Static |
| /demo | Demo request form (slim layout) | Static + client form |
| /demo/thank-you | Confirmation, noindex | Static |
| /contact | General form | Static + client form |
| /privacy, /terms | Legal | Static |

## Design direction: technical brutalist ("spec sheet")
The site reads like an engineering drawing for a website: a visible column grid, heavy 2px ink rules, mono type, and blueprint-blue dimension annotations. International-orange is used for CTAs only.

### Palette
| Token | Hex | Role |
|---|---|---|
| canvas (concrete) | #E4E5E0 | Page background |
| surface | #FFFFFF | Panels, forms, alternating bands |
| ink | #000000 | Text, rules, borders, dark band |
| muted (graphite) | #45483F | Secondary text: 7.4:1 on canvas, 9.3:1 on surface |
| rule | #A3A69E | Decorative grid lines only (never UI boundaries) |
| accent (blueprint) | #1A33E8 | Annotations, focus ring, link hover: 6.2:1 on canvas |
| cta (signal) | #FF4F00 | Primary CTA fill only, ink text 6.4:1, ink border + hard shadow |

### Type
- **Martian Mono** (variable weight + width): headlines, nav, buttons, prices, numbers. Headlines use condensed width (75) at 700–800, sentence case.
- **Archivo**: body copy for readability at 17–18px.
- Smallest step is 16px everywhere (mobile rule).

### Layout
Mobile-first, left-aligned. A 4-column grid on mobile and 12 on lg is drawn behind transparent sections. Sections alternate between canvas (grid visible) and surface (grid hidden), with one ink band for the final CTA.

### Signature element
The hero mockup: a browser window and phone drawn as a blueprint wireframe that "builds" into the finished sample site once on load, with dimension annotations. This is the only non-interactive motion on the page. Everything else stays quiet.

### Review against defaults
- Considered Space Mono and hazard-yellow. Both are stock brutalist moves, so I picked Martian Mono (it has a width axis) and international orange (engineering/aerospace) instead.
- Not near-black with an acid accent: the base is light concrete.
- Not newspaper columns: content is grouped by heavy rules and a spec grid, not a dense broadsheet layout.
- No ALL-CAPS eyebrows and no "→" in button labels. Number markers appear only on the 3-step process, which really is a sequence.
- The offer line renders as three ruled cells, not a middle-dot string.

## Technical decisions
- Next.js 16 App Router, TS, Tailwind 3.4 with a fully replaced theme (no default palette, so blue-500 cannot exist)
- Content in /content/*.json; business facts in /site.config.json
- Analytics: provider-agnostic `track()` pushes to `window.dataLayer`; CTA clicks are captured by event delegation on `[data-cta]`
- Forms POST to the n8n webhook (Phase 7)

## Assumptions
- State = MI (inferred from the city name and the 248 area code)
- Target niche = local small businesses (default)

## Open questions
See TODO.md.
