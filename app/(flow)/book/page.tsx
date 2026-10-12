import type { Metadata } from "next";
import { BookingForm } from "@/components/flow/BookingForm";
import { Message } from "@/components/flow/Message";
import { Container } from "@/components/ui/Container";
import { edge, edgeConfigured } from "@/lib/server/edge";
import { lookup } from "@/lib/server/lookup";

export const metadata: Metadata = { title: "Book a call" };

const TITLES: Record<string, string> = {
  changes: "Book a call to go over your changes",
  launch: "Book your launch call",
  question: "Book a quick call",
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ t?: string; purpose?: string }> }) {
  const { t, purpose: rawPurpose } = await searchParams;
  const purpose = rawPurpose && rawPurpose in TITLES ? rawPurpose : "question";
  const [sub, slots] = await Promise.all([
    t ? lookup(t) : Promise.resolve(null),
    edgeConfigured() ? edge<{ slots: string[] }>("slots", { days: 21 }).then((r) => r.slots).catch(() => null) : Promise.resolve(null),
  ]);

  if (!slots) {
    return (
      <Message title="Booking is down for a moment">
        <p>Call or email us and we&rsquo;ll set up a time right away.</p>
      </Message>
    );
  }

  return (
    <Container>
      <div className="mx-auto max-w-wide">
        {sub && <p className="font-display text-sm font-bold uppercase display-ui">{sub.business_name}</p>}
        <h1 className="mt-2 font-display text-3xl font-heavy display-tight md:text-5xl">{TITLES[purpose]}</h1>
        <p className="mt-5 text-lg">
          {sub ? `Hi ${sub.first_name}, pick` : "Pick"} a time that suits you and how you&rsquo;d like to talk: Google Meet or a phone call. Calls take about 20 minutes. You&rsquo;ll get a confirmation now and a reminder an hour before.
        </p>
        <BookingForm token={sub ? t! : ""} purpose={purpose} slots={slots} knownPhone={sub?.phone ?? ""} />
      </div>
    </Container>
  );
}
