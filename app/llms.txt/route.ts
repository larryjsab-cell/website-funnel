/**
 * /llms.txt (llmstxt.org): the business, the offer and a page map in plain
 * Markdown for AI assistants and agents. Built from the same config and
 * content the pages render, so it can't drift from the site.
 */
import { faq, landing } from "@/lib/content";
import { formatAddress, formatPrice, site, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

const b = site.business;
const o = site.offer;
const url = (path: string) => `${siteUrl}${path}`;

function plans() {
  return site.pricing.tiers
    .map((t) => {
      const base = t.inheritsFrom ? `Everything in ${t.inheritsFrom}, plus: ` : "";
      return `- ${t.name}: ${formatPrice(t.monthly)}/month, or ${formatPrice(t.yearly)}/year. ${t.upfront}. ${base}${t.includes.join(", ")}.`;
    })
    .join("\n");
}

function body() {
  const steps = landing.steps.items.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join("\n");
  const questions = faq.groups
    .map((g) => `### ${g.title}\n\n${g.items.map((i) => `**${i.q}**\n${i.a}`).join("\n\n")}`)
    .join("\n\n");

  return `# ${b.name}

> ${landing.meta.description}

${b.name} designs, hosts and manages websites for local small businesses across the United States. The offer: plans start at ${o.startingPrice}, there is a ${o.designFee}, and every customer gets a free design demo first, ready ${o.demoTurnaround}. No credit card, no commitment.

## Key facts

- Starting price: ${o.startingPrice} (Starter Website plan)
- Design fee: $0
- Upfront cost: ${o.upfrontNote}
- Free demo: we design a preview of your site before you pay anything, ready ${o.demoTurnaround}
- Yearly billing: ${o.yearlyDiscount}
- Cancellation: ${o.cancellation}
- Ownership: ${o.ownership}
- Changes after launch: ${o.edits}
- Service area: ${b.serviceArea}
- Phone: ${b.phone}
- Email: ${b.email}
- Address: ${formatAddress()}
- Hours: ${b.hours.label}

## Plans

${plans()}

## How it works

${steps}

## Pages

- [Home](${url("/")}): The whole funnel on one page: offer, examples, design styles, pricing, FAQ, demo request and contact.
- [Request a free demo](${url("/#demo")}): Two-step form. Step 1 asks for name and email; step 2 asks for business name, phone and industry, plus optional preferred style, current website and notes.
- [How it works](${url("/#how-it-works")}): The three steps from demo request to launch.
- [Examples](${url("/#examples")}): Sample designs for local service businesses.
- [Design styles](${url("/#styles")}): Seven visual styles a demo can be designed in.
- [Pricing](${url("/#pricing")}): The three plans, monthly and yearly prices, and what each includes.
- [FAQ](${url("/#faq")}): Answers about the offer, the free demo and life after launch.
- [Contact](${url("/#contact")}): Phone, email, hours, address and a short message form.
- [Blog](${url("/blog")}): Guides for small business owners on website costs, what to include, and getting found locally.
- [Privacy policy](${url("/privacy")}): What we collect through the forms and how we use it.
- [Terms of service](${url("/terms")}): Plans, billing, cancellation, ownership and changes.

Customer pages (/go-live, /changes, /book, /unsubscribe) open from personal links in our emails and are not meant to be indexed.

## FAQ

${questions}
`;
}

export function GET() {
  return new Response(body(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
