import type { Metadata } from "next";
import Link from "next/link";
import { ChangesForm } from "@/components/flow/ChangesForm";
import { Message, primaryButton } from "@/components/flow/Message";
import { Container } from "@/components/ui/Container";
import { lookup } from "@/lib/server/lookup";

export const metadata: Metadata = {
  title: "Request your changes",
  description: "Tell Ryzon Automation what to change on your website demo, and we’ll get it ready to launch.",
};

const PLAN_STATUSES = ["converted_full", "converted_50_month", "converted_50_year", "call_scheduled", "changes_received", "in_build", "ready_to_launch", "live"];

export default async function ChangesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const sub = await lookup(t);

  if (!sub) {
    return (
      <Message title="This link isn’t working">
        <p>It may be old or cut off. Reply to any of our emails with your changes, or call us.</p>
      </Message>
    );
  }
  if (!sub.paid || sub.offer === "files99" || !PLAN_STATUSES.includes(sub.status)) {
    return (
      <Message
        title="Changes start with a plan"
        actions={
          sub.status === "demo_review" ? (
            <Link href={`/go-live?t=${t}`} className={primaryButton}>
              See the plans
            </Link>
          ) : undefined
        }
      >
        <p>Hi {sub.first_name}, the change form opens once a website plan is started. Want a completely different look first? Call or email and we&rsquo;ll talk it through.</p>
      </Message>
    );
  }

  return (
    <Container>
      <div className="mx-auto max-w-wide">
        <p className="font-display text-sm font-bold uppercase display-ui">{sub.business_name}</p>
        <h1 className="mt-2 font-display text-3xl font-heavy display-tight md:text-5xl">What should we change?</h1>
        <p className="mt-5 text-lg">
          Hi {sub.first_name}, list anything you&rsquo;d like different on your demo: wording, photos, colors, services, hours, pages. Bullet points are perfect.
          {sub.demo_url && (
            <>
              {" "}
              <a href={sub.demo_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                Open your demo
              </a>{" "}
              in another tab to look while you write.
            </>
          )}
        </p>
        <ChangesForm token={t!} bookHref={`/book?t=${t}&purpose=changes`} />
      </div>
    </Container>
  );
}
