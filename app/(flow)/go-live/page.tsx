import type { Metadata } from "next";
import Link from "next/link";
import { Message, primaryButton, secondaryButton } from "@/components/flow/Message";
import { Container } from "@/components/ui/Container";
import { FILES_PRICE, isOffer, offerHeadline, quote, tiers, type Interval, type OfferCode } from "@/lib/offers";
import { localDate, lookup, type Lookup } from "@/lib/server/lookup";
import { formatPrice, site } from "@/lib/site";

export const metadata: Metadata = { title: "Get your website live" };

type Search = { t?: string; offer?: string; interval?: string; error?: string };

export default async function GoLivePage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const requested: OfferCode = isOffer(q.offer) ? q.offer : "standard";
  let sub = await lookup(q.t, requested);
  let offer = requested;
  let notice = "";

  if (!sub) {
    return (
      <Message title="This link isn't working">
        <p>It may be old or cut off. Call or email us and we&rsquo;ll get you sorted in a minute.</p>
      </Message>
    );
  }
  if (sub.paid) return <AlreadyPaid sub={sub} token={q.t!} />;

  // A discount that ended (or hasn't started) falls back to regular pricing while the demo is open.
  if (!sub.offer_active && requested !== "standard" && (sub.offer_reason === "expired" || sub.offer_reason === "not_started")) {
    const standard = await lookup(q.t, "standard");
    if (standard?.offer_active) {
      if (sub.offer_reason === "expired") notice = "That offer has ended, but your demo is still ready at regular pricing.";
      sub = standard;
      offer = "standard";
    }
  }
  if (!sub.offer_active) {
    return (
      <Message title={`Let's talk about ${sub.business_name}`}>
        <p>Hi {sub.first_name}, this offer is no longer available online. We&rsquo;d still love to get your website live: give us a call or send an email and we&rsquo;ll find the best option for you.</p>
      </Message>
    );
  }

  const interval: Interval = q.interval === "year" ? "year" : "month";
  const endsOn = offer !== "standard" && sub.offer_ends_at ? localDate(sub.offer_ends_at, sub.timezone) : "";
  const base = `/go-live?t=${q.t}&offer=${offer}`;

  return (
    <Container>
      <div className="mx-auto max-w-page">
        <p className="font-display text-sm font-bold uppercase display-ui">Hi {sub.first_name}</p>
        <h1 className="mt-2 font-display text-3xl font-heavy display-tight md:text-5xl">{offerHeadline[offer]}</h1>
        <p className="mt-5 max-w-measure text-lg">
          {offer === "files99" ? (
            <>Keep the design we made for <strong>{sub.business_name}</strong> for a one-time {formatPrice(FILES_PRICE)}. We email you the files; no hosting, no subscription.</>
          ) : (
            <>Pick a plan for <strong>{sub.business_name}</strong>. {site.pricing.tiers[0].upfront} and no design fee. Cancel anytime.</>
          )}
        </p>
        {endsOn && <p className="mt-3 inline-block rounded-ui bg-ink px-3 py-1 font-display text-sm font-bold text-on-ink">This offer ends {endsOn}</p>}
        {notice && <p className="mt-4 font-semibold">{notice}</p>}
        {q.error && (
          <p role="alert" className="mt-4 font-semibold text-danger">
            {q.error === "unavailable" ? "That offer just changed. Here is what's available now." : `We couldn't open checkout. Please try again, or call ${site.business.phone}.`}
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
          <DemoPreview sub={sub} />
          {offer === "files99" ? (
            <FilesCard token={q.t!} />
          ) : (
            <div>
              <div role="group" aria-label="Billing" className="mb-4 inline-flex rounded-ui border-2 border-ink">
                <Link href={base} aria-current={interval === "month" ? "true" : undefined} className={`min-h-11 px-4 py-2 font-display text-sm font-bold ${interval === "month" ? "bg-ink text-on-ink" : ""}`}>
                  Monthly
                </Link>
                <Link
                  href={`${base}&interval=year`}
                  aria-current={interval === "year" ? "true" : undefined}
                  className={`min-h-11 px-4 py-2 font-display text-sm font-bold ${interval === "year" ? "bg-ink text-on-ink" : ""}`}
                >
                  Yearly (2 months free)
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {tiers.map((tier) => (
                  <PlanCard key={tier.id} tier={tier} interval={interval} offer={offer} token={q.t!} />
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-8 text-sm text-muted">Secure checkout by Stripe. Questions first? Call {site.business.phone}, 9am to 10pm, 7 days a week.</p>
      </div>
    </Container>
  );
}

function DemoPreview({ sub }: { sub: Lookup }) {
  if (!sub.demo_url) return null;
  return (
    <figure className="rounded-card border-2 border-ink bg-surface p-3">
      {sub.demo_image_url ? (
        <a href={sub.demo_url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote screenshot URL set per customer */}
          <img src={sub.demo_image_url} alt={`Preview of the new ${sub.business_name} website`} className="w-full rounded-ui border border-ink" />
        </a>
      ) : null}
      <figcaption className="mt-3">
        <a href={sub.demo_url} target="_blank" rel="noreferrer" className="font-display font-bold underline underline-offset-4">
          View your demo
        </a>
      </figcaption>
    </figure>
  );
}

function PlanCard({ tier, interval, offer, token }: { tier: (typeof tiers)[number]; interval: Interval; offer: OfferCode; token: string }) {
  const price = quote(tier, interval, offer);
  const unit = interval === "month" ? "/mo" : "/yr";
  const discounted = price.first !== price.then;
  return (
    <form action="/api/checkout" method="post" className={`flex flex-col rounded-card border-2 border-ink bg-surface p-4 ${tier.featured ? "shadow-hard" : ""}`}>
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="offer" value={offer} />
      <input type="hidden" name="plan" value={tier.id} />
      <input type="hidden" name="interval" value={interval} />
      {tier.featured && <p className="mb-2 font-display text-sm font-bold text-accent">Most popular</p>}
      <h2 className="font-display text-xl font-heavy display-tight">{tier.name}</h2>
      <p className="mt-3 font-display text-3xl font-heavy display-tight">
        {formatPrice(price.first)}
        <span className="text-base font-normal">{unit}</span>
      </p>
      {discounted ? (
        <p className="mt-1 text-sm">
          <s className="text-muted">{formatPrice(price.then)}{unit}</s> · {price.deal}, then {formatPrice(price.then)}
          {unit}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{tier.summary}</p>
      )}
      <ul className="mt-4 flex-1 space-y-1 text-sm">
        {tier.inheritsFrom && <li>Everything in {tier.inheritsFrom}</li>}
        {tier.includes.map((i) => (
          <li key={i}>✓ {i}</li>
        ))}
      </ul>
      <button type="submit" className={`${tier.featured ? primaryButton : secondaryButton} mt-5 w-full`}>
        Choose {tier.name.split(" ")[0]}
      </button>
    </form>
  );
}

function FilesCard({ token }: { token: string }) {
  return (
    <form action="/api/checkout" method="post" className="rounded-card border-2 border-ink bg-surface p-6 shadow-hard">
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="offer" value="files99" />
      <input type="hidden" name="plan" value="files99" />
      <h2 className="font-display text-xl font-heavy display-tight">Your design files</h2>
      <p className="mt-3 font-display text-4xl font-heavy display-tight">
        {formatPrice(FILES_PRICE)} <span className="text-base font-normal">one time</span>
      </p>
      <ul className="mt-4 space-y-1">
        <li>✓ The design we made for you, emailed as a download</li>
        <li>✓ Use it with any developer or host</li>
        <li>✓ No subscription</li>
      </ul>
      <button type="submit" className={`${primaryButton} mt-6 w-full`}>
        Get my design files
      </button>
      <p className="mt-4 text-sm text-muted">Prefer us to host and run it? Plans start at {site.offer.startingPrice}. Call us to switch.</p>
    </form>
  );
}

function AlreadyPaid({ sub, token }: { sub: Lookup; token: string }) {
  const files = sub.offer === "files99";
  return (
    <Message
      title="You're all set"
      actions={
        files ? undefined : (
          <>
            <Link href={`/changes?t=${encodeURIComponent(token)}`} className={primaryButton}>
              Request my changes
            </Link>
            <a href={site.business.phoneHref} className={secondaryButton}>
              Call {site.business.phone}
            </a>
          </>
        )
      }
    >
      <p>
        Thanks, {sub.first_name}. Your payment for <strong>{sub.business_name}</strong> already went through, so there&rsquo;s nothing more to pay.
      </p>
      <p>{files ? "Your design files arrive by email with a download link." : "Next step: tell us what you'd like changed on your demo, and we'll get it ready to launch."}</p>
    </Message>
  );
}
