import type { Metadata } from "next";
import Link from "next/link";
import { Message, primaryButton, secondaryButton } from "@/components/flow/Message";
import { recordSession, retrieveSession, type Recorded } from "@/lib/server/stripe";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "You're in" };

/**
 * Stripe sends the customer here after paying. Fetching the session from Stripe
 * (not trusting the URL) and recording it means the pipeline updates instantly;
 * the webhook covers anyone who closes the tab first.
 */
export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let result: Recorded | null = null;
  if (session_id && /^cs_(test|live)_\w+$/.test(session_id)) {
    try {
      result = await recordSession(await retrieveSession(session_id));
    } catch (e) {
      console.error("success page record failed", e);
    }
  }

  if (result?.reason === "unpaid") {
    return (
      <Message title="Your payment is processing">
        <p>Stripe is still confirming your payment. You&rsquo;ll get an email from us as soon as it clears, usually within a few minutes.</p>
      </Message>
    );
  }

  if (result?.offer === "files99") {
    return (
      <Message
        title="Thanks! Your design files are on the way"
        actions={
          <a href={site.business.phoneHref} className={secondaryButton}>
            Call {site.business.phone}
          </a>
        }
      >
        <p>We&rsquo;re packaging your files now. They arrive in a separate email with a secure download link.</p>
        <p>A receipt from Stripe is on its way to your inbox too.</p>
      </Message>
    );
  }

  return (
    <Message
      title="You're in! Welcome to Ryzon"
      actions={
        result?.token ? (
          <>
            <Link href={`/changes?t=${encodeURIComponent(result.token)}`} className={primaryButton}>
              Request my changes
            </Link>
            <Link href={`/book?t=${encodeURIComponent(result.token)}&purpose=changes`} className={secondaryButton}>
              Book a call instead
            </Link>
          </>
        ) : undefined
      }
    >
      <p>Thank you. Your payment went through and your new website is officially on its way.</p>
      <p>Next, tell us what you&rsquo;d like changed on your demo: wording, photos, colors, services, anything. The more you share, the faster we finish. The same link is in your confirmation email.</p>
    </Message>
  );
}
