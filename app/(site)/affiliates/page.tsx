import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateForm } from "@/components/forms/AffiliateForm";
import { primaryButton } from "@/components/flow/Message";
import { FaqList } from "@/components/sections/FaqList";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { affiliatesEnabled, getAffiliateTerms } from "@/lib/affiliate";
import { FILES_PRICE } from "@/lib/offers";
import { breadcrumbs } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";
import { formatPrice, site, siteUrl } from "@/lib/site";

/**
 * The affiliate program (footer link only). Off until site.config.json affiliates.enabled
 * is true. Rates and the cookie window come live from the dashboard settings.
 */
export const revalidate = 300;

const path = site.affiliates.path;
const title = `Affiliate Program: Earn 25% Monthly | ${site.business.name}`;
const description = `Refer local businesses to ${site.business.name} and earn ${site.affiliates.hostingRate}% of their monthly hosting for their first 2 years, plus ${site.affiliates.designRate}% of the upfront design cost. Free to join.`;

export const metadata = pageMeta({ title, description, path, image: { alt: `${site.business.name} affiliate program` } });

const onBand = "inline-flex min-h-12 items-center justify-center rounded-ui border-2 border-on-band px-6 text-center font-display text-sm font-bold text-on-band display-ui transition-button duration-fast hover:bg-surface hover:text-ink";

export default async function AffiliatesPage() {
  if (!affiliatesEnabled()) notFound();
  const t = await getAffiliateTerms();
  const hosting = t.rate_hosting;
  const design = t.rate_design;
  const days = t.cookie_days;
  const lifetime = !t.hosting_months;
  const per = (amount: number, rate: number) => formatPrice(Math.round(amount * rate) / 100);
  const term = t.hosting_months % 12 === 0 ? (t.hosting_months === 12 ? "year" : `${t.hosting_months / 12} years`) : `${t.hosting_months} months`;
  const durationText = lifetime ? "for as long as they stay a customer" : `for their first ${term}`;

  const steps = [
    { title: "Apply", body: "Fill in the short form below. It takes about two minutes and it's free. We review every application by hand." },
    { title: "Get your link", body: "Once you're approved we email you a personal link. It works on any page of our site, so you can link straight to pricing or the blog too." },
    { title: "Share it", body: "Send it to business owners who need a new website or don't have one. They get a free demo of their new site before they pay anything." },
    { title: "Get paid", body: `When they become a customer you earn ${hosting}% of their hosting every time they pay and ${design}% of any upfront design cost. Paid monthly.` },
  ];

  const faq = [
    {
      id: "aff-cost",
      q: "Does it cost anything to join?",
      a: "No. The program is free. There's nothing to buy and no minimum number of referrals.",
    },
    {
      id: "aff-how-much",
      q: "How much can I actually earn?",
      a: `${hosting}% of what each customer pays for hosting, ${durationText}. On our plans that's ${per(40, hosting)} to ${per(200, hosting)} a month per customer, or ${per(400, hosting)} to ${per(2000, hosting)} a year when they pay yearly. Ten customers on the Growth plan would earn you ${formatPrice(Math.round(10 * 100 * hosting) / 100)} every month.`,
    },
    {
      id: "aff-design",
      q: "What is the upfront design cost?",
      a: `It's the one-time amount a customer pays for their site to be designed and built, and you earn ${design}% of it. Right now we're running a limited-time offer where every plan is $0 upfront, so most customers won't pay a design fee while it lasts. One exception: customers who buy just their design files for ${formatPrice(FILES_PRICE)} count as a design payment, so you'd earn ${per(FILES_PRICE, design)}.`,
    },
    {
      id: "aff-window",
      q: "How long do I get credit after someone clicks my link?",
      a: `${days} days. When someone opens your link we remember it on their device. If they ask for a free demo or message us within ${days} days, they're yours, even if they leave and come back later. If they open another affiliate's link after yours, the most recent link gets the credit.`,
    },
    {
      id: "aff-tracking",
      q: "How do I know my referrals were counted?",
      a: "Every click on your link and every demo request that comes through it is recorded and tied to your code. Ask us any time and we'll send you your numbers: clicks, leads, customers and what you've earned.",
    },
    {
      id: "aff-paid",
      q: "When and how do I get paid?",
      a: "Commissions are confirmed once the customer's payment clears and is past our refund window, then paid monthly by the method we agree on when you're approved. If a payment is refunded or disputed, the commission on it isn't paid.",
    },
    {
      id: "aff-who",
      q: "Who makes a good affiliate?",
      a: "Anyone who knows local business owners: marketers, bookkeepers, accountants, business coaches, photographers, printers, chambers of commerce, community groups and our happy customers. You don't need a website or a big following.",
    },
    {
      id: "aff-referral",
      q: "How is this different from the $50 referral credit?",
      a: "Our referral program gives customers a $50 credit toward our services for each business they send. The affiliate program pays you a share of what each customer pays, in cash, every month. It's built for people who plan to refer regularly.",
    },
    {
      id: "aff-other",
      q: "Do other services count, like graphic design?",
      a: "Not yet. Commissions currently cover website hosting and website design. We'll be adding other services, like graphic design, at a later date, with rates we'll publish here.",
    },
    {
      id: "aff-rules",
      q: "Are there any rules?",
      a: "A few simple ones: no spam, no promises we don't make on our site, no paid ads on our business name, and let people know you earn a commission when you share your link. You can't refer yourself. The full terms are in our Terms of Service.",
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${siteUrl}${path}#page`,
              url: `${siteUrl}${path}`,
              name: `${site.business.name} Affiliate Program`,
              description,
              isPartOf: { "@id": `${siteUrl}/#website` },
              publisher: { "@id": `${siteUrl}/#business` },
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
            breadcrumbs([{ name: "Affiliate Program", path }]),
          ],
        }}
      />

      {/* Hero */}
      <section aria-labelledby="affiliates-heading" className="rz-hero border-b-2 border-ink bg-band py-16 text-on-band md:py-24">
        <Container>
          <nav aria-label="Breadcrumb" className="font-display text-sm display-ui">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Affiliate Program</li>
            </ol>
          </nav>
          <div className="mt-4 grid items-end gap-10 lg:grid-cols-12" data-cta-bar-after="">
            <div className="lg:col-span-7">
              <p className="font-display text-sm font-bold uppercase display-ui">Affiliate Program</p>
              <h1 id="affiliates-heading" className="mt-3 font-display text-3xl font-heavy text-balance display-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Send us local businesses. Get paid every month {lifetime ? "they stay" : `for ${term}`}.
              </h1>
              <p className="mt-6 max-w-measure text-lg">
                Earn {hosting}% of every customer&rsquo;s monthly hosting {durationText}, plus {design}% of the upfront design cost. It&rsquo;s an easy
                yes for business owners: they see a free demo of their new site before they pay anything.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#apply" className={primaryButton}>
                  Apply to Join
                </a>
                <a href="#how" className={onBand}>
                  See How It Works
                </a>
              </div>
              <p className="mt-4 font-display text-sm display-ui">Free to join · {days}-day tracking · Paid monthly</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              <div className="rounded-card border-2 border-ink bg-surface p-6 text-ink shadow-hard">
                <dt className="font-display text-sm font-bold uppercase display-ui">Monthly hosting</dt>
                <dd className="mt-2">
                  <span className="block font-display text-6xl font-heavy leading-none display-tight">{hosting}%</span>
                  <span className="mt-2 block text-base">of what they pay, every month {lifetime ? "they stay" : `for ${term}`}</span>
                </dd>
              </div>
              <div className="rounded-card border-2 border-ink bg-surface p-6 text-ink shadow-hard">
                <dt className="font-display text-sm font-bold uppercase display-ui">Upfront design cost</dt>
                <dd className="mt-2">
                  <span className="block font-display text-6xl font-heavy leading-none display-tight">{design}%</span>
                  <span className="mt-2 block text-base">of the one-time design payment</span>
                </dd>
              </div>
            </dl>
          </div>
        </Container>
      </section>

      {/* Earnings */}
      <Section id="earnings" tone="surface">
        <Heading id="earnings-heading">What you earn per customer</Heading>
        <p className="mt-4 max-w-measure text-lg">
          Your share is based on what the customer actually pays. Here&rsquo;s what {hosting}% of hosting works out to on each plan.
        </p>
        <div className="mt-10 overflow-x-auto rounded-card border-2 border-ink">
          <table className="w-full border-collapse bg-surface text-left text-base">
            <caption className="sr-only">Commission per customer by plan</caption>
            <thead className="bg-band text-on-band">
              <tr>
                <th scope="col" className="px-4 py-3 font-display text-sm font-bold display-ui md:px-6">Plan</th>
                <th scope="col" className="px-4 py-3 font-display text-sm font-bold display-ui md:px-6">Customer pays</th>
                <th scope="col" className="px-4 py-3 font-display text-sm font-bold display-ui md:px-6">You earn</th>
                <th scope="col" className="hidden px-4 py-3 font-display text-sm font-bold display-ui sm:table-cell md:px-6">Or, paid yearly</th>
              </tr>
            </thead>
            <tbody>
              {site.pricing.tiers.map((tier) => (
                <tr key={tier.id} className="border-t-2 border-ink">
                  <th scope="row" className="px-4 py-4 font-display font-bold display-ui md:px-6">{tier.name}</th>
                  <td className="px-4 py-4 md:px-6">{formatPrice(tier.monthly)}/mo</td>
                  <td className="px-4 py-4 font-display text-lg font-heavy display-tight md:px-6">{per(tier.monthly, hosting)}/mo</td>
                  <td className="hidden px-4 py-4 sm:table-cell md:px-6">{per(tier.yearly, hosting)}/yr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-card border-2 border-ink p-6">
            <h3 className="font-display text-lg font-heavy display-tight">It adds up</h3>
            <p className="mt-2 text-base">
              Ten customers on the Growth plan pay you {formatPrice(Math.round(10 * 100 * hosting) / 100)} every month, which is{" "}
              {formatPrice(Math.round(10 * 1200 * hosting) / 100)} a year{lifetime ? "" : ` for ${term}`}, from ten introductions.
            </p>
          </div>
          <div className="rounded-card border-2 border-ink p-6">
            <h3 className="font-display text-lg font-heavy display-tight">About design fees right now</h3>
            <p className="mt-2 text-base">
              We&rsquo;re running a limited-time $0-upfront offer, so most customers don&rsquo;t pay a design fee at the moment. When they do, you get{" "}
              {design}%. Customers who buy only their design files ({formatPrice(FILES_PRICE)}) earn you {per(FILES_PRICE, design)}.
            </p>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section id="how">
        <Heading id="how-heading">How it works</Heading>
        <ol className="rz-steps mt-10 grid md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className={`rz-step border-t-2 border-ink pb-8 pt-4 lg:pb-0 lg:pr-6 ${i > 0 ? "lg:border-l-2 lg:pl-6" : ""}`}>
              <span aria-hidden="true" className="rz-step-num block font-display text-6xl font-heavy leading-none display-tight">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-xl font-heavy display-tight">
                <span className="sr-only">{`Step ${i + 1}: `}</span>
                {step.title}
              </h3>
              <p className="mt-2 max-w-measure text-base">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Why it's easy to recommend */}
      <Section id="why" tone="surface">
        <Heading id="why-heading">Why it&rsquo;s an easy recommendation</Heading>
        <p className="mt-4 max-w-measure text-lg">You&rsquo;re not asking anyone to take a risk. Here&rsquo;s what the people you send get:</p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["A free demo first", `We design a preview of their new website, usually ready ${site.offer.demoTurnaround}. No credit card.`],
            ["$0 upfront", "Every plan is $0 upfront during our limited-time offer. Plans start at $40 a month."],
            ["Done for them", "We build it, host it, keep it secure and handle changes. They don't touch any tech."],
            ["Cancel anytime", "No long contracts. Owners stay because the site works for them."],
          ].map(([h, b]) => (
            <li key={h} className="rounded-card border-2 border-ink bg-canvas p-6">
              <h3 className="font-display text-lg font-heavy display-tight">{h}</h3>
              <p className="mt-2 text-base">{b}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Tracking and terms */}
      <Section id="tracking">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Heading id="tracking-heading">How credit works</Heading>
            <ul className="mt-6 grid gap-4 text-base">
              <li className="flex gap-3">
                <span aria-hidden="true" className="rz-mark font-display font-bold">+</span>
                <span>
                  <strong>{days}-day window.</strong> When someone opens your link, we remember it on their device for {days} days. If they request a
                  demo or contact us in that time, they&rsquo;re credited to you.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="rz-mark font-display font-bold">+</span>
                <span>
                  <strong>Last click wins.</strong> If they open another affiliate&rsquo;s link after yours, the most recent link gets the credit. Once a
                  customer is credited to you, they stay yours.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="rz-mark font-display font-bold">+</span>
                <span>
                  <strong>Link to any page.</strong> Your link sends people to our home page. Add <code className="font-display text-sm">?aff=yourcode</code>{" "}
                  to any page address on our site to link there instead.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="rz-mark font-display font-bold">+</span>
                <span>
                  <strong>Every click counts.</strong> We record each visit and demo request that comes through your link, so you can always ask for your
                  numbers.
                </span>
              </li>
            </ul>
          </div>
          <div>
            <Heading id="terms-heading">Program terms in short</Heading>
            <ul className="mt-6 grid gap-4 text-base">
              {[
                `${hosting}% of monthly hosting ${durationText}, and ${design}% of the upfront design cost, based on what the customer pays after discounts.`,
                "Commissions are confirmed once the payment clears and is past our refund window, then paid monthly.",
                "Refunded or disputed payments don't earn a commission.",
                "You can't refer yourself, and customers we were already talking to don't count.",
                "No spam, no paid ads on our name, and always disclose that you earn a commission.",
                "We may update rates or terms by changing this page. What you've already earned under the old terms is still paid.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="rz-mark font-display font-bold">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-base">
              Full details are in our{" "}
              <Link href="/terms#affiliate-program" className="font-bold underline decoration-2 underline-offset-4 hover:text-accent">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-12 rounded-card border-2 border-dashed border-ink p-6">
          <h3 className="font-display text-lg font-heavy display-tight">More services coming</h3>
          <p className="mt-2 max-w-measure text-base">
            Commissions currently cover website hosting and design. Other services, like graphic design, will be added at a later date. Affiliates will
            be the first to hear when they are.
          </p>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="affiliate-faq" tone="surface">
        <Heading id="affiliate-faq-heading">Questions</Heading>
        <div className="mt-8 max-w-wide">
          <FaqList items={faq} />
        </div>
      </Section>

      {/* Apply */}
      <Section id="apply" className="scroll-mt-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Heading id="apply-heading">Apply to join</Heading>
            <p className="mt-4 max-w-measure text-lg">
              Tell us a little about yourself and who you know. We review every application by hand and usually reply within two business days.
            </p>
            <p className="mt-4 max-w-measure text-base">
              Questions first? Email{" "}
              <a href={`mailto:${site.business.email}`} className="font-bold underline decoration-2 underline-offset-4 hover:text-accent break-all">
                {site.business.email}
              </a>{" "}
              or call{" "}
              <a href={site.business.phoneHref} className="font-bold underline decoration-2 underline-offset-4 hover:text-accent">
                {site.business.phone}
              </a>
              .
            </p>
          </div>
          <div className="lg:col-span-7">
            <AffiliateForm />
          </div>
        </div>
      </Section>
    </>
  );
}
