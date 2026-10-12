import type { Metadata } from "next";
import Link from "next/link";
import { Message, primaryButton, secondaryButton } from "@/components/flow/Message";
import forms from "@/content/forms.json";
import { fill, type FieldErrorKind } from "@/lib/forms";
import { site } from "@/lib/site";
import { errorText } from "@/lib/submitLead";

export const metadata: Metadata = {
  title: "Thanks, we got your request",
  description: "Your request reached Ryzon Automation. Here is what happens next with your free website demo.",
};

const contact = { phone: site.business.phone, email: site.business.email };
const KINDS: FieldErrorKind[] = ["required", "email", "phone", "url", "select"];

/**
 * Where the demo and contact forms land when they post without JavaScript
 * (with JavaScript the result shows inline). Not indexed: see the (flow) layout.
 */
export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ form?: string; error?: string; fields?: string }> }) {
  const { form, error, fields } = await searchParams;
  const kind = form === "contact" ? "contact" : "demo";
  const copy = forms[kind];
  const back = kind === "contact" ? "/#contact" : "/#demo";

  if (error === "validation") {
    const labels = copy.fields as Record<string, { label: string }>;
    const problems = (fields ?? "")
      .split(",")
      .map((pair) => pair.split(":") as [string, FieldErrorKind])
      .filter(([f, k]) => labels[f] && KINDS.includes(k));
    return (
      <Message
        title="A few details need fixing"
        actions={
          <Link href={back} className={primaryButton}>
            Back to the form
          </Link>
        }
      >
        <ul className="list-disc space-y-2 pl-6">
          {problems.map(([f, k]) => (
            <li key={f}>
              <strong>{labels[f].label}:</strong> {errorText(k, labels[f].label)}
            </li>
          ))}
          {problems.length === 0 && <li>{forms.errors.summary}</li>}
        </ul>
      </Message>
    );
  }

  if (error) {
    return (
      <Message title="That didn’t go through">
        <p>{fill(error === "not_configured" ? forms.errors.notConfigured : forms.errors.server, contact)}</p>
      </Message>
    );
  }

  if (kind === "contact") {
    return (
      <Message
        title={forms.contact.success.heading}
        actions={
          <Link href="/" className={secondaryButton}>
            Back to the home page
          </Link>
        }
      >
        <p>Thanks. We&rsquo;ll reply by email as soon as we can.</p>
      </Message>
    );
  }

  const s = forms.demo.success;
  return (
    <Message
      title={s.heading}
      actions={
        <Link href="/#examples" className={secondaryButton}>
          {s.whileYouWait}
        </Link>
      }
    >
      <p>Thanks. We&rsquo;ve got everything we need to start designing.</p>
      <h2 className="font-display text-xl font-bold display-ui">{s.nextHeading}</h2>
      <ol className="list-decimal space-y-2 pl-6">
        {s.next.map((item) => (
          <li key={item}>{fill(item, { email: "you" })}</li>
        ))}
      </ol>
    </Message>
  );
}
