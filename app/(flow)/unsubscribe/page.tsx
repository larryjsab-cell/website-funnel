import type { Metadata } from "next";
import { HomeLink, Message, primaryButton } from "@/components/flow/Message";

export const metadata: Metadata = {
  title: "Email preferences",
  description: "Stop offer emails from Ryzon Automation. Emails about anything you buy still come through.",
};

/** Linked from offer emails. A button, not a bare link, so email scanners can't unsubscribe people. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const { t, done, error } = await searchParams;
  const valid = Boolean(t && /^[a-f0-9]{48}$/.test(t));

  if (done) {
    return (
      <Message title="You're unsubscribed" actions={<HomeLink />}>
        <p>You won&rsquo;t get any more offer emails from us. If you buy anything, we&rsquo;ll still email you about it.</p>
      </Message>
    );
  }
  if (!valid || error) {
    return (
      <Message title="We couldn't update your preferences">
        <p>The link may be old or cut off. Reply &ldquo;unsubscribe&rdquo; to any of our emails and we&rsquo;ll take care of it.</p>
      </Message>
    );
  }
  return (
    <Message
      title="Stop offer emails?"
      actions={
        <form action="/api/unsubscribe" method="post">
          <input type="hidden" name="t" value={t} />
          <button type="submit" className={primaryButton}>
            Unsubscribe from offers
          </button>
        </form>
      }
    >
      <p>We&rsquo;ll stop sending reminders and discount offers about your demo. Emails about anything you buy still come through.</p>
    </Message>
  );
}
