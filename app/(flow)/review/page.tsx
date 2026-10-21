import type { Metadata } from "next";
import { Message, primaryButton, secondaryButton } from "@/components/flow/Message";
import { lookupReview, PLATFORMS, REVIEW_TOKEN, type Platform, type ReviewState } from "@/lib/review";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How did we do?",
  description: "Rate your experience with Ryzon Automation.",
};

type Search = Promise<{ t?: string; r?: string; error?: string; missing?: string }>;

const STAR_LABELS = ["", "Poor", "Fair", "Okay", "Good", "Excellent"];

/** Linked from the review request email. Plain forms, so it works without JavaScript too. */
export default async function ReviewPage({ searchParams }: { searchParams: Search }) {
  const { t, r, error, missing } = await searchParams;
  if (!t || !REVIEW_TOKEN.test(t)) return <BrokenLink />;

  let state: ReviewState | null;
  try {
    state = await lookupReview(t);
  } catch {
    return (
      <Message title="Something went wrong on our end">
        <p>We couldn&rsquo;t load your rating page. Please try again in a minute, or just reply to our email and tell us how we did.</p>
      </Message>
    );
  }
  if (!state) return <BrokenLink />;

  const hi = state.first_name ? `, ${state.first_name}` : "";
  const errorNote = error ? <p role="alert" className="font-bold text-danger">That didn&rsquo;t save. Please try again.</p> : null;

  if (state.status === "sent") {
    const picked = Number(r);
    return (
      <Message title={`How did we do${hi}?`} actions={<></>}>
        <p>Thanks for choosing {site.business.name}. Tell us how your experience has been so far.</p>
        {errorNote}
        <form action="/api/review" method="post" className="mt-2">
          <input type="hidden" name="t" value={t} />
          <input type="hidden" name="action" value="rate" />
          <fieldset>
            <legend className="font-display text-lg font-bold display-ui">Your rating (5 is excellent)</legend>
            {missing === "rating" && (
              <p role="alert" className="mt-2 font-bold text-danger">
                Pick a number of stars first.
              </p>
            )}
            <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-ui border-2 border-ink bg-surface font-display font-bold transition-colors duration-fast hover:bg-canvas has-[:checked]:bg-ink has-[:checked]:text-on-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                >
                  <input type="radio" name="rating" value={n} defaultChecked={picked === n} required className="sr-only" />
                  <span aria-hidden="true" className="text-2xl leading-none text-[#F5A623]">
                    ★
                  </span>
                  <span aria-hidden="true" className="mt-1 text-xl">
                    {n}
                  </span>
                  <span aria-hidden="true" className="hidden text-xs font-normal lg:block">
                    {STAR_LABELS[n]}
                  </span>
                  <span className="sr-only">{`${n} ${n === 1 ? "star" : "stars"}: ${STAR_LABELS[n]}`}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={`${primaryButton} mt-6 w-full sm:w-auto`}>
            Send My Rating
          </button>
        </form>
      </Message>
    );
  }

  const rating = state.rating ?? 0;
  if (rating >= 4) {
    const platforms = (Object.keys(PLATFORMS) as Platform[]).filter((p) => state.links[p]);
    return (
      <Message
        title={`Thank you${hi}!`}
        actions={
          platforms.length ? (
            <>
              {platforms.map((p, i) => (
                <a key={p} href={`/api/review/go?t=${t}&p=${p}`} className={i === 0 ? primaryButton : secondaryButton}>
                  Post It on {PLATFORMS[p]}
                </a>
              ))}
            </>
          ) : (
            <></>
          )
        }
      >
        <p>
          {rating} out of 5. That means a lot to us.{" "}
          {platforms.length
            ? "Would you share it with others? A short public review helps other local business owners find us, and it only takes a minute."
            : "Thanks for taking the time to let us know."}
        </p>
      </Message>
    );
  }

  if (state.status === "rated") {
    return (
      <Message title="We’re sorry it wasn’t better" actions={<></>}>
        <p>
          Our team takes customer experience seriously, and we&rsquo;d love to make it right and get you exactly what you wanted.
        </p>
        {errorNote}
        <form action="/api/review" method="post" className="space-y-6">
          <input type="hidden" name="t" value={t} />
          <input type="hidden" name="action" value="feedback" />
          <div>
            <label htmlFor="review-feedback" className="block font-display text-lg font-bold display-ui">
              What could we have done better?
            </label>
            <textarea
              id="review-feedback"
              name="feedback"
              rows={5}
              maxLength={5000}
              className="mt-2 block w-full rounded-ui border-2 border-ink bg-surface px-3 py-2 text-base text-ink"
            />
          </div>
          <fieldset>
            <legend className="font-display text-lg font-bold display-ui">Would you like us to contact you to sort it out?</legend>
            {missing === "contact" && (
              <p role="alert" className="mt-2 font-bold text-danger">
                Choose yes or no.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                ["yes", "Yes, please contact me"],
                ["no", "No thanks"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-ui border-2 border-ink bg-surface px-4 font-display font-bold has-[:checked]:bg-ink has-[:checked]:text-on-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                >
                  <input type="radio" name="contact" value={value} required className="h-5 w-5 accent-current" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={primaryButton}>
            Send
          </button>
        </form>
      </Message>
    );
  }

  return state.wants_contact ? (
    <Message title="Thank you. We’ll be in touch">
      <p>Someone from our team will contact you soon to make this right. If it&rsquo;s urgent, call us any time.</p>
    </Message>
  ) : (
    <Message title="Thank you for telling us" actions={<></>}>
      <p>We read every response and use it to do better. If you ever change your mind, just reply to our email.</p>
    </Message>
  );
}

function BrokenLink() {
  return (
    <Message title="This link doesn’t work">
      <p>It may be cut off or old. Reply to our email and tell us how we did, or give us a call.</p>
    </Message>
  );
}
