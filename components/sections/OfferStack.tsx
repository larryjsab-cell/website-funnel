import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { landing } from "@/lib/content";

/** Value anchor: general agency framing vs. the Starter plan. */
export function OfferStack() {
  const o = landing.offer;
  const [usualCol, oursCol] = o.compare.columns;
  return (
    <Section id="offer" tone="surface">
      <div className="max-w-wide">
        <Heading id="offer-heading">{o.heading}</Heading>
        <p className="mt-4 max-w-measure text-lg">{o.intro}</p>
        <div className="mt-8">
          <CtaButton location="offer" />
        </div>
      </div>

      <table className="mt-10 w-full border-2 border-ink text-left">
        <caption className="sr-only">
          {usualCol} compared with {oursCol}
        </caption>
        <thead className="hidden bg-ink text-on-ink md:table-header-group">
          <tr>
            <td className="p-4" />
            <th scope="col" className="p-4 font-mono text-sm font-bold mono-semi">
              {usualCol}
            </th>
            <th scope="col" className="border-l-2 border-ink bg-canvas p-4 font-mono text-sm font-bold text-ink mono-semi">
              {oursCol}
            </th>
          </tr>
        </thead>
        <tbody>
          {o.compare.rows.map((r, i) => (
            <tr key={r.label} className={`grid grid-cols-2 md:table-row ${i > 0 ? "border-t-2 border-ink" : ""}`}>
              <th scope="row" className="col-span-2 p-4 pb-0 font-mono text-lg font-heavy mono-condensed md:table-cell md:pb-4 md:align-top">
                {r.label}
              </th>
              <td className="p-4 pr-2 text-base text-muted md:table-cell md:pr-4 md:align-top">
                <span className="block font-mono text-sm mono-semi md:hidden" aria-hidden="true">
                  {usualCol}
                </span>
                {r.usual}
              </td>
              <td className="p-4 pl-2 font-mono text-lg font-bold mono-semi md:table-cell md:border-l-2 md:border-ink md:pl-4 md:align-top">
                <span className="block font-mono text-sm font-normal text-muted md:hidden" aria-hidden="true">
                  {oursCol}
                </span>
                {r.ours}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-muted">{o.compare.note}</p>
      <p className="mt-6 font-mono text-lg font-bold mono-semi">{o.yearly}</p>

      <div className="mt-8">
        <CtaButton location="offer" variant="secondary" />
      </div>
    </Section>
  );
}
