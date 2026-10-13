# TODO: needs owner input

Every item below appears in the site or config. Nothing here was invented.

## Resolved (from owner, round 2)
- ZIP 48382 · cancel anytime (no design files before year one) · edits $20/hr or free for simple tasks · demo changes need a plan unless it's a completely different design · $0 upfront on all plans (limited time) · no socials · no logo yet (wordmark in use)

## Business facts
- [ ] `[SITE_URL]`: production domain
- [ ] Confirm state is **MI** (inferred from Commerce Township + the 248 area code)
- [ ] Logo file when ready (a text wordmark is in use)
- [ ] **Limited-time $0 upfront:** is there an end date? Is Starter's $0 design fee permanent after it ends? The site currently says "Limited-time offer: $0 upfront on every plan" with no date.
- [ ] "$20/hour, well below typical agency rates": wording is the owner's claim. Keep it, or drop the comparison?
- [ ] Hosting and domain: included in plans? (not claimed anywhere yet)
- [ ] Target niche: defaulted to "local small businesses". Confirm, or name industries.

## Proof (loud: these sections are live with placeholders)
- [ ] `[TESTIMONIAL]` ×3 + `[CUSTOMER_NAME]`, `[BUSINESS_TYPE, CITY]`: real testimonials only
- [ ] `[REVIEW_COUNT]`: real review count + source
- [ ] `[SITES_LAUNCHED]`: real number
- [ ] `[CLIENT_LOGOS]`: client logos (with permission)
- [ ] Images: example screenshots go in `assets/examples/<id>.png` (ids: landscaping, salon, cafe, plumbing, auto, cleaning), then `npm run shots`. Landscaping is done (544×14104 source). The other 5 cards and the hero mockup still show labeled placeholders. Each slot's image prompt is in `content/examples.json` / `content/landing.json`; drop in real screenshots or generated images (keep 4:3 and 16:10).

## Integrations
- [ ] `[ANALYTICS_ID]`: analytics provider + ID
- [x] Forms → Supabase → n8n → Gmail (done; see "Client pipeline" below). `N8N_WEBHOOK_URL` is no longer used.

## Client pipeline (from the Client Pipeline & Email Automation Plan)
Live on the preview site. Supabase project `woejhqidgykrcdyktuio` holds the pipeline; n8n only sends email.
- **Dashboard:** `/admin`, login larryjsab@gmail.com (password given in chat; change it under Account).
- **Database:** `supabase/migrations/*` (tables, security, state machine, email queue). Email copy: `scripts/emails/templates.mjs` → `node scripts/emails/templates.mjs` regenerates `supabase/seed/ryzon_landing_email_templates.sql`, then run that SQL in Supabase.
- **Edge function:** `supabase/functions/ryzon-landing` (token in `ryzon_landing_config.edge_token`).
- **Sending:** Supabase calls the n8n webhook the moment an email is due (pg_net) and pg_cron checks every minute for scheduled ones; day-21 closes run hourly. n8n: "Ryzon Landing – Email sender" and "Ryzon Landing – Errors" (owner alert, max 1/hour per failure). Generators in `n8n/`.
- **Stripe (test mode):** prices, coupons and the webhook were created by `POST /api/stripe/setup` (needs the `x-ryzon-token` header). Netlify env: `RYZON_EDGE_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`.

Owner to-dos:
- [ ] Do the test payment: open the "your new website is ready" email for Setup Test Co → Get my website live → card 4242 4242 4242 4242, any future date, any CVC. Then try the change form, Ready to launch and Live from the dashboard.
- [ ] Delete the Setup Test Co test lead when done (ask, or run `delete from ryzon_landing_submissions where email = 'larryjsab@gmail.com' and business_name = 'Setup Test Co'` in Supabase).
- [ ] Rotate the Stripe test keys (they were pasted in chat), and use live keys only when launching: update `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` in Netlify, redeploy, then `POST /api/stripe/setup` once on the live domain.
- [ ] In Netlify, mark `STRIPE_SECRET_KEY` and `RYZON_EDGE_TOKEN` as secret (the API used here couldn't save secrets).
- [ ] Optional hardening: move the two tokens in the n8n email sender into an n8n Header Auth credential; turn on Supabase Auth leaked-password protection; move the `pg_net` extension to the `extensions` schema from the Supabase dashboard.
- [ ] Not built: Cloudflare Turnstile on the request form (needs a Cloudflare site key; the honeypot is in place), email open/click tracking (Gmail has no event webhook), file attachments on the change form (customers reply with files instead).
- [ ] When the real domain is live: update `site_url` in `ryzon_landing_config` (email links) and `[SITE_URL]` in `site.config.json`.

## Legal (/privacy and /terms are real pages, draft copy from your terms; have a lawyer review)
- [ ] Privacy: analytics provider (once chosen), how long form submissions are kept
- [ ] Terms: billing method and renewal terms, confirm Michigan as governing law

## Launch (Phases 8–12)
- [x] Netlify plan upgraded; Phases 8–12 are live on https://ryzon-funnel-preview.netlify.app.
- [ ] Once the domain is set, submit `https://<domain>/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Security headers (CSP, HSTS, nosniff, frame-deny, referrer and permissions policies) are set in `next.config.ts`. A new third-party script, font or API needs its origin added to the CSP there.
- `/llms.txt` is generated from `site.config.json` and the content files, so it updates itself.
- Forms work without JavaScript: they post to `/api/lead` and land on `/thank-you` (noindex).
- Design system and conventions: `DESIGN.md`.
