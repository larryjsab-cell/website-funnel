import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Message, primaryButton, secondaryButton } from "@/components/flow/Message";
import { affiliatesEnabled } from "@/lib/affiliate";
import { site } from "@/lib/site";

/** Where the affiliate form lands with JavaScript off. */
export const metadata: Metadata = { title: { absolute: `Application | ${site.business.name}` }, robots: { index: false, follow: false } };

export default async function AffiliateThanks({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!affiliatesEnabled()) notFound();
  const { error } = await searchParams;
  const back = `${site.affiliates.path}#apply`;
  return (
    <div className="py-16 md:py-24">
      {error ? (
        <Message
          title={error === "validation" ? "A few details are missing" : "That didn't go through"}
          actions={
            <>
              <a href={back} className={primaryButton}>
                Back to the Form
              </a>
              <a href={`mailto:${site.business.email}`} className={secondaryButton}>
                Email Us
              </a>
            </>
          }
        >
          <p>
            {error === "validation"
              ? "Please go back and fill in your name, a valid email, who you'd share your link with, and tick the box to agree to the program terms."
              : `Something went wrong on our side. Please try again in a minute, or email us at ${site.business.email}.`}
          </p>
        </Message>
      ) : (
        <Message
          title="Application received"
          actions={
            <Link href="/" className={secondaryButton}>
              Back to the Home Page
            </Link>
          }
        >
          <p>Thanks for applying. We sent you a confirmation email. We review every application by hand and usually reply within two business days.</p>
          <p>Once you&rsquo;re approved, your personal link arrives by email.</p>
        </Message>
      )}
    </div>
  );
}
