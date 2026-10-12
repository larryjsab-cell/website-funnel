import type { Metadata } from "next";
import Link from "next/link";
import { Message, primaryButton, secondaryButton } from "@/components/flow/Message";
import { Container } from "@/components/ui/Container";
import { FILES_PRICE, isOffer, offerHeadline, quote, tiers, type Interval, type OfferCode } from "@/lib/offers";
import { localDate, lookup, type Lookup } from "@/lib/server/lookup";
import { formatPrice, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get your website live",
  description: "Pick a plan for the website we designed for you. $0 upfront, no design fee, cancel anytime.",
};

type Search = { t?: string; offer?: string; interval?: string; error?: string };

export default async function GoLivePage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const requested: OfferCode = isOffer(q.offer) ? q.offer : "standard";
  let sub = await lookup(q.t, requested);
  let offer = requested;
  let notice = "";

  if (!sub) {
    return (
      <Message title="This link isn’t working">
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
      <Message title={`Let’s talk about ${sub.business_name}`}>
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
            {q.error === "unavailable" ? "That offer just changed. Here is what’s available now." : `We couldn’t open checkout. Please try again, or call ${site.business.phone}.`}
          </p>
        )}

        <GetStarted files={offer === "files99"} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
          <DemoPreview sub={sub} />
          {offer === "files99" ? (
            <FilesCard token={q.t!} />
          ) : (
            <div>
              <div role="group" aria-label="Billing" className="mb-4 grid grid-cols-2 rounded-ui border-2 border-ink sm:inline-grid">
                <Link
                  href={base}
                  aria-current={interval === "month" ? "true" : undefined}
                  className={`flex min-h-12 items-center justify-center px-3 text-center font-display text-sm font-bold sm:px-4 ${interval === "month" ? "bg-ink text-on-ink" : ""}`}
                >
                  Monthly
                </Link>
                <Link
                  href={`${base}&interval=year`}
                  aria-current={interval === "year" ? "true" : undefined}
                  className={`flex min-h-12 flex-col items-center justify-center px-2 py-1 text-center font-display text-sm font-bold sm:flex-row sm:gap-1 sm:px-4 ${interval === "year" ? "bg-ink text-on-ink" : ""}`}
                >
                  Yearly <span className="font-normal xs:whitespace-nowrap">2 Months Free</span>
                </Link>
              </div>
              {/* Phones see the recommended plan first; from md the cards sit in price order. */}
              <div className="grid gap-4 md:grid-cols-3">
                {tiers.map((tier) => (
                  <PlanCard key={tier.id} tier={tier} interval={interval} offer={offer} token={q.t!} />
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-8 text-sm text-muted">
          Secure checkout by Stripe. Questions first? Call{" "}
          <a href={site.business.phoneHref} className="underline underline-offset-4">
            {site.business.phone}
          </a>
          , 9am to 10pm, 7 days a week.
        </p>
      </div>
    </Container>
  );
}

/** The highlighted "what happens after you pay" box, so the next step never feels like a leap. */
function GetStarted({ files }: { files: boolean }) {
  const steps = files
    ? ["Pay the one-time $99 securely.", "We package your design files.", "Your download link arrives by email."]
    : ["Choose your plan and pay securely.", "Tell us your changes, by form or a quick call.", "We get your website ready to launch."];
  return (
    <section aria-labelledby="get-started" className="mt-8 rounded-card border-2 border-ink bg-ink p-5 text-on-ink shadow-hard md:p-6">
      <h2 id="get-started" className="font-display text-2xl font-heavy display-tight md:text-3xl">
        Get Started Now
      </h2>
      <p className="mt-2 max-w-measure text-lg">
        {files
          ? "Once your payment goes through, we email you the design files for your new website."
          : "Once your payment goes through, we start on your changes and get your website ready to launch."}
      </p>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 rounded-ui border-2 border-on-ink p-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui bg-on-ink font-display font-heavy text-ink">
              {i + 1}
            </span>
            <span className="font-semibold">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DemoPreview({ sub }: { sub: Lookup }) {
  if (!sub.demo_url) return null;
  return (
    <figure className="rounded-card border-2 border-ink bg-surface p-3">
      {sub.demo_image_url ? (
        <a href={sub.demo_url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote screenshot URL set per customer */}
          <img
            src={sub.demo_image_url}
            alt={`Preview of the new ${sub.business_name} website`}
            width={1200}
            height={750}
            decoding="async"
            fetchPriority="high"
            className="aspect-16/10 h-auto w-full rounded-ui border border-ink object-cover object-top"
          />
        </a>
      ) : null}
      <figcaption className="mt-3">
        <a href={sub.demo_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-display font-bold underline underline-offset-4">
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
    <form action="/api/checkout" method="post" className={`flex flex-col rounded-card border-2 border-ink bg-surface p-4 ${tier.featured ? "order-first shadow-hard md:order-none" : ""}`}>
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="offer" value={offer} />
      <input type="hidden" name="plan" value={tier.id} />
      <input type="hidden" name="interval" value={interval} />
      {tier.featured && <p className="mb-2 font-display text-sm font-bold text-accent">Most popular</p>}
      <h2 className="font-display text-xl font-heavy display-tight">{tier.name}</h2>
      <p className="mt-3 font-display text-3xl font-heavy display-tight md:text-2xl xl:text-3xl">
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
      <button type="submit" aria-label={`Get Started Now with ${tier.name}`} className={`${(tier.featured ? primaryButton : secondaryButton).replace("px-6", "px-2")} mt-5 w-full whitespace-nowrap`}>
        Get Started Now
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
        Get Started Now
      </button>
      <p className="mt-4 text-sm text-muted">Prefer us to host and run it? Plans start at {site.offer.startingPrice}. Call us to switch.</p>
    </form>
  );
}

function AlreadyPaid({ sub, token }: { sub: Lookup; token: string }) {
  const files = sub.offer === "files99";
  return (
    <Message
      title="You’re all set"
      actions={
        files ? undefined : (
          <>
            <Link href={`/changes?t=${encodeURIComponent(token)}`} className={primaryButton}>
              Request My Changes
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
      <p>{files ? "Your design files arrive by email with a download link." : "Next step: tell us what you’d like changed on your demo, and we’ll get it ready to launch."}</p>
    </Message>
  );
}
