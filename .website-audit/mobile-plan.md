# Mobile optimization plan (site-wide)

Scope: every route and state. That covers home (all 7 styles), /privacy, /terms, 404, /go-live (all offers and states), /go-live/success, /changes, /book, /unsubscribe, /thank-you and /admin (Today, Board, Table, customer page).

Devices covered: phones at 320, 360, 375, 390, 414 and 430 px wide (portrait), phones in landscape (568×320, 667×375, 844×390, 932×430), and tablets at 768×1024 and 1024×768.

Every task ends with find → fix → re-check. Results go into `findings.md` as fixed, deferred or not-verified.

| # | Task | What "done" means |
|---|---|---|
| 1 | **Baseline audit.** A scripted sweep of all routes, states, styles and devices. Screenshots, plus checks for overflow, tap targets, text size, fixed-bar height, and what is visible on first load | A results file and screenshots to review |
| 2 | **No sideways scrolling** | Zero overflow on every route, state and style at every width, 320 and up |
| 3 | **Type on phones** | Heading sizes fit 320–430 without awkward breaks. Body text at least 16px with comfortable line height. Long words and emails wrap |
| 4 | **Tap targets** | Every control is at least 44×44 with at least 8px between neighbors. Text links inside paragraphs are the only exemption |
| 5 | **Mobile navigation** | The menu drawer works one-handed, closes by button, Escape or link tap, keeps focus inside while open, locks page scroll, and fits short landscape screens |
| 6 | **Fixed bars and screen space** | Header plus CTA bar take at most about 20% of a portrait screen. In landscape the bars shrink or step aside |
| 7 | **First screen on a phone** | At 375×667 and 320×568 the headline, the offer ($40/mo · $0 design fee · free demo) and the main CTA are all visible without scrolling |
| 8 | **Forms on phones** | Right keyboards (`inputmode`, `enterkeyhint`, autocapitalize), no zoom-on-focus, nothing hidden behind the keyboard, errors scrolled clear of the header, and moving between demo steps scrolls to the form's top |
| 9 | **Home sections on phones** | Each section reviewed at 320 and 375: hero mockup, trust strip, offer, steps, examples, style switcher grid, testimonials, pricing order, risk band, FAQ, demo, contact, footer |
| 10 | **Customer pages on phones** | /go-live plan cards (recommended plan first on phones), success, changes, book, unsubscribe and thank-you. The header phone link is a full-size target |
| 11 | **Admin on phones** | The table becomes stacked cards on phones. Today, board, customer page, filters and account menu all usable one-handed |
| 12 | **Touch behavior** | Hover effects only on hover-capable devices (no sticky hover after a tap), visible press feedback, nothing that needs hover |
| 13 | **Safe areas and browser chrome** | Notch and home-bar safe areas handled in landscape. `theme-color` follows the chosen style, so the luxury dark style gets a dark toolbar. Dynamic viewport units for full-height UI. Phone-number auto-linking controlled |
| 14 | **Mobile performance** | Lighthouse on mobile (simulated 4G, 4× CPU) for home, /go-live and /book: LCP under 2.5s, CLS under 0.1, TBT kept low. Tap response under 200ms at 4× CPU |
| 15 | **Re-verify and ship** | Accessibility, sweep, flow, admin and no-JavaScript suites all pass. Build, commit, deploy, then confirm on the live site |
