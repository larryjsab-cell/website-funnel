# Affiliate Program: Build Brief

Prepared October 28, 2026. Updated October 29: **live.** Hosting commission is for the first **2 years** (24 months) of each customer's plan, per the owner.

---

## ⚠️ First: one blog post still needs deleting (before Oct 30, 9 AM)

You asked me to delete the **"Best Website Provider for Small Business"** post. I tried twice. Both times Supabase showed an approval prompt that you couldn't see, and it timed out. **The post is still scheduled to go live Thursday, Oct 30 at 9:00 AM Detroit time.**

Pick one:

- **Quickest:** Dashboard → **Blog** → that post → **Move to Draft**. It won't go live, and nothing is sent to n8n.
- **To delete it for good:** in Supabase → SQL Editor, run:
  ```sql
  delete from ryzon_landing_blog where slug = 'best-website-provider-small-business';
  ```

I already removed it from the repo's seed file. The other post's links no longer point to it; that change was made in the live database earlier. Its image (`public/images/blog/best-website-provider-small-business.webp`) is still in the repo on purpose. Delete the image once the post is gone, so a deploy in between can't leave a broken image.

---

## What was built

### 1. The Affiliate Program page: `/affiliates`

It's linked from the footer only, not the main nav. Sections, top to bottom:

- **Hero:** "Send us local businesses. Get paid every month for 2 years." Two big cards: **25% of monthly hosting** and **50% of upfront design cost**.
- **What you earn per customer:** a table for each plan:
  - Starter: $10/mo
  - Growth: $25/mo
  - Complete: $50/mo
  - Yearly versions too (hidden on phones).
  - Also an "it adds up" example: 10 Growth customers = $250/month.
- **Design fees, said honestly:** while the $0-upfront offer runs, most customers pay no design fee. The **$99 design files** purchase counts as design, so it earns $49.50.
- **How it works:** Apply → Get your link → Share it → Get paid.
- **Why it's an easy recommendation:** free demo first, $0 upfront, done for them, cancel anytime.
- **How credit works:** the 60-day window, last click wins, `?aff=` works on any page, and every click is recorded.
- **Program terms in short**, with a link to the full terms.
- **"More services coming":** graphic design and other services will be added at a later date.
- **10 FAQs**, also marked up for Google as an FAQ page.
- **Apply to join form.**
  - Fields:
    - Name
    - Email
    - Phone (optional)
    - Business/brand (optional)
    - Website or social profile (optional)
    - Who do you know or reach?
    - How will you share it? (dropdown)
    - Anything else?
    - Agree-to-terms checkbox
  - It has the same spam trap as your other forms.
  - It works without JavaScript too.

**The rates and window on the page are pulled live from your dashboard settings.** Change them in the dashboard and the page updates within 5 minutes.

### 2. Link tracking with cookie history

Every affiliate gets a link like **`ryzonautomationllc.com/a/jane-k3p9`**.

- Opening it records a click and sends the visitor to the home page.
- They can link anywhere instead: `/a/jane-k3p9?to=/blog`, or add `?aff=jane-k3p9` to any page address.
- Other tags like `utm_source` are kept.
- Only links on your own site are allowed, so it can't be used to bounce people to other sites.

What's remembered on the visitor's device (first-party cookies, only readable by your server):

| Cookie | What it holds | How long |
|---|---|---|
| `rz_aff` | The most recent affiliate code and time | The window (60 days) |
| `rz_aff_first` | The first affiliate who ever sent them | The window |
| `rz_aff_hist` | The last 10 affiliate visits | The window |
| `rz_vid` | A random visitor ID, so refreshing doesn't count as 10 clicks | ~13 months |

No cookies are set for a fake or paused code.

**Who gets credit** is decided by the database when someone sends the demo or contact form:

- **Last click wins.** The most recent affiliate inside the window gets the lead.
- **The window is 60 days** (you can change it, see below). Clicks older than that don't count, even if the cookie is somehow still there.
- **Only active affiliates count.**
- **No self-referrals.** An affiliate can't credit themselves.
- **No credit for people already in touch.** Someone who sent a form before clicking the link isn't the affiliate's referral.
- **Once credited, they stay credited.** A later link click doesn't steal an existing customer.
- The person's full click history is saved on their record, for disputes.

### 3. Commissions (automatic)

When a credited customer pays:

- **First checkout:**
  - Plan payments → **25% hosting** commission on what they actually paid (after discounts).
  - **$99 design files** → **50% design** commission.
  - Room for a future upfront design fee: if checkout ever charges one, it's split out and gets 50%.
- **Every renewal:** each monthly or yearly renewal payment → another 25% hosting commission.
  - This needs Stripe's `invoice.paid` event, which switches on automatically with the program (see "Turning it on").
- Each commission is recorded once, even if Stripe retries.
- The rate is locked in at the time it's earned. Changing rates later doesn't rewrite old commissions.

Each commission moves **Pending → Approved → Paid** (or **Void**).

### 4. Emails (sent by your existing n8n email sender)

- **To you:** "Affiliate application: [name]", with all their answers and a button to the dashboard.
- **To the applicant:** "We got your affiliate application", with what happens next.
- **To the affiliate when approved:** "You're in: your Ryzon affiliate link". Includes:
  - Their link
  - What they earn
  - How the 60-day credit works
  - A copy-paste message they can send

### 5. Dashboard → new **Affiliates** tab

- **Totals:** active affiliates, applications waiting, clicks (30 days), leads, paying customers, owed, paid out.
- **Applications:** shows what they wrote, with **Approve and Send Link** or **Decline**.
- **Each affiliate:**
  - Their link with a **Copy** button
  - Clicks, leads and paid customers
  - Earned, owed and paid amounts
  - Buttons: **Send/Resend Link Email**, **Pause**/**Resume**, and **Edit**
    - Edit covers name, phone, payout email, private notes, and changing their code (with a warning, because it breaks links already shared).
  - A list of the people they sent.
- **Add an affiliate:** for someone you recruited yourself. They're active right away.
- **Program settings:** credit window (days), hosting %, design %, and an optional "pay hosting commission for N months" (empty = for life).
- **Commissions ledger:** filter by Owed, Pending, Approved, Paid, Void or All. Tick rows, add a note ("Paid by PayPal Nov 1"), then **Approve**, **Mark Paid** or **Void**.
- **On each person's page**, a new **Affiliate** box shows who gets credit, with a dropdown to set or change it by hand (for example a phone lead).

Until the database update below is run, the tab shows "Affiliates aren't set up yet" instead of an error.

### 6. Legal pages

Hidden until the program is on:

- **Terms of Service** gets an **Affiliate program** section:
  - Commission basis and the $0-upfront note
  - Who counts and the 60-day last-click rule
  - Payment after the refund window
  - Clawback for refunds and chargebacks
  - Tax info (W-9)
  - Fair-play rules: no spam, no ads on your brand name, FTC disclosure
  - Other services later
  - How changes work, and that affiliates aren't employees
- **Privacy Policy** gets **Affiliate links** (the cookies above) and **Affiliate applications** (what the form collects and why).

---

## The on/off switch

`site.config.json` has an `"affiliates"` block, now `"enabled": true`. Setting it back to false (and deploying) hides everything again:

- `/affiliates` and its thank-you page show "page not found"
- No footer link, no sitemap entry, no extra legal sections
- The application and tracking APIs answer "not found"
- `/a/<code>` links just go to the home page without setting cookies
- Stripe renewals aren't requested or processed

I checked every one of these on a local copy of the site.

---

## Turning it on (done Oct 29)

All done:

1. **Database:** Supabase → SQL Editor → paste and run the whole file `supabase/migrations/20261028_13_ryzon_landing_affiliates.sql`.
   - It's safe to run twice.
   - It only touches `ryzon_landing_` tables and functions.
2. **Edge function:** redeploy `ryzon-landing` so it knows the new `record_invoice` action (`supabase/functions/ryzon-landing/index.ts`). I can do this for you.
3. **Flip the switch:** in `site.config.json`, set `"affiliates": { "enabled": true, ... }`.
4. **Deploy the site.** The deploy's Stripe step adds `invoice.paid` to your webhook by itself (`scripts/stripe-webhook.mjs`).
5. **Test it:**
   - Dashboard → Affiliates → **Add an affiliate** with your own second email.
   - Open their link in a private window, then send a demo request with a different email.
   - The lead should show "Credited to …" on its page.

---

## Decisions for you to confirm

These are the defaults I chose. All of them can be changed in the dashboard or with a quick edit.

1. **Hosting commission lasts 2 years** (24 months from the customer's first payment), as you decided. It's the "Pay hosting commission for (months)" setting; change it there and the page, emails and terms wording follow.
2. **60-day credit window.** Common range is 30 to 90 days.
3. **Last click wins** when two affiliates touched the same person. The first-click affiliate is recorded too, in case you want to change the rule later.
4. **Commission is on what the customer actually pays** (after the 50%-off offers), not list price.
5. **Design fees are $299 / $399 / $499** (Starter / Growth / Complete), shown on the affiliate page with the 50% earnings ($149.50 / $199.50 / $249.50). The page says the $0 design offer is temporary. When checkout starts charging the fee, pass it as `design_fee_cents` on the payment so it's split out at 50%; until then plan payments count as hosting.
6. **Payouts:** the page says "paid monthly, once the payment clears and is past our refund window." You still need to pick:
   - the refund window (I'd suggest 30 days)
   - the payout method (PayPal, Venmo, ACH)
   - a payout day
   - whether there's a minimum payout
   - when to ask for a W-9 (needed once an affiliate passes $600 in a year)
7. **Applications are approved by hand.** Nobody gets a working link until you click Approve.
8. **Affiliates don't have their own login** to see stats. You can send them their numbers from the dashboard. A self-serve affiliate portal could be a later add-on.
9. **The $50 referral program stays as it is**, separate from this. The page explains the difference.
10. **A lawyer should read the new Terms section** before launch, mainly the clawback and tax wording.

---

## How it was tested

- **Database:** I ran migration 13 on a local copy of your full database (all 13 migrations in order), plus a test script covering:
  - applications and duplicates
  - blocking public access
  - approval creating a code and email
  - click logging and de-duplication
  - last click, the expired window, self-referral and already-in-touch cases
  - junk cookie data ignored
  - the first-payment and $99 commissions
  - renewals (including duplicates, the first invoice skipped, the month cap)
  - the commission statuses
  - settings
  - the 3 emails rendering with no leftover `{{placeholders}}`
  - "delete person" also removing their affiliate record

  All passed. Running the migration twice is also fine.
- **Live database check (read-only):** your live form-saving function matches the repo exactly, so replacing it loses nothing.
- **Site, with a stand-in for Supabase, using the real SQL behind it:**
  - `/a/` sets the 4 cookies with a 60-day life; a fake code sets none; outside redirects are blocked.
  - A demo request sent with the cookies was credited to the right affiliate.
  - `?aff=` on any page sets the cookies and removes itself from the address bar.
  - The form shows errors and puts the cursor in the first one.
  - A real submit saved the application and queued both emails.
  - No sideways scrolling on desktop or phone.
- **Code:** typecheck and lint are clean.
- **Not tested in a browser:** the dashboard tab, because it needs a real Supabase login. It typechecks, and the database functions it calls are all tested. Try it once after step 1 above.

---

## Files

**New**
- `supabase/migrations/20261028_13_ryzon_landing_affiliates.sql`: tables, tracking, attribution, commissions, emails, admin functions
- `app/(site)/affiliates/page.tsx`, `app/(site)/affiliates/thanks/page.tsx`: the page and the no-JavaScript thank-you
- `app/a/[code]/route.ts`: affiliate links
- `app/api/affiliate/route.ts` (applications), `app/api/affiliate/track/route.ts` (`?aff=`)
- `lib/affiliate.ts` (tracking, cookies, on/off switch), `lib/affiliateForm.ts` (form rules)
- `components/forms/AffiliateForm.tsx`, `components/layout/AffiliateCapture.tsx`
- `components/admin/Affiliates.tsx`, `app/admin/affiliates/page.tsx`

**Changed**
- `site.config.json`: `affiliates` block (off)
- `app/api/lead/route.ts`: sends the cookie history with each form
- `app/api/stripe/webhook/route.ts`, `lib/server/stripe.ts`, `scripts/stripe-webhook.mjs`: renewals (only when on)
- `supabase/functions/ryzon-landing/index.ts`: `record_invoice` action
- `components/layout/SiteFooter.tsx`, `app/sitemap.ts`, `app/(site)/layout.tsx`: footer link, sitemap, `?aff=` pickup (only when on)
- `content/legal.json`, `components/sections/LegalPage.tsx`: new legal sections (only when on), plus jump links on section headings
- `components/admin/AdminShell.tsx`, `components/admin/SubmissionDetail.tsx`: new tab and Affiliate box
- `supabase/seed/ryzon_landing_blog_posts_4.sql`: best-provider post removed

**Also**
- `next dev` reports that Next.js 16.4.0 has a known security vulnerability and recommends `next upgrade --agent=security`. Want me to run that upgrade in a separate copy of the code, so it can be checked before it touches the main branch?
