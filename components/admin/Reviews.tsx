"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, inputClass, labelClass, Notice, Panel, Tag } from "@/components/admin/ui";
import { day, needsContact, REVIEW_COLUMNS, stars, when, type Review } from "@/lib/admin/model";
import { adminRpc, supabase } from "@/lib/admin/supabase";

type Links = { google?: string; facebook?: string; yelp?: string };
type Note = { message?: string; error?: string };
type Filter = "all" | "waiting" | "happy" | "unhappy";

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["waiting", "Waiting"],
  ["happy", "4–5 stars"],
  ["unhappy", "1–3 stars"],
];

const PLATFORM_LABEL: Record<string, string> = { google: "Google", facebook: "Facebook", yelp: "Yelp" };

/** Review requests: send them, see the answers, and follow up with unhappy customers. */
export function Reviews() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [links, setLinks] = useState<Links>({});
  const [error, setError] = useState("");

  const reload = useCallback(
    () =>
      Promise.all([
        supabase().from("ryzon_landing_reviews").select(REVIEW_COLUMNS).order("created_at", { ascending: false }).limit(2000),
        adminRpc<Links>("ryzon_landing_admin_review_settings", {}).catch(() => null),
      ]).then(([rows, settings]) => {
        if (rows.error) return setError(rows.error.message);
        setError("");
        setReviews((rows.data ?? []) as unknown as Review[]);
        if (settings) setLinks(settings);
      }),
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const stats = useMemo(() => {
    const all = reviews ?? [];
    const rated = all.filter((r) => r.rating);
    const avg = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : 0;
    return {
      sent: all.length,
      answered: rated.length,
      avg,
      happy: rated.filter((r) => (r.rating ?? 0) >= 4).length,
      posted: all.filter((r) => r.platform_clicked).length,
    };
  }, [reviews]);

  if (error && !reviews) return <Notice error={`Couldn’t load reviews: ${error}`} />;
  if (!reviews) return <p className="text-muted">Loading reviews…</p>;

  const attention = reviews.filter(needsContact);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-heavy display-tight">Reviews</h1>
          <p className="mt-1 text-sm text-muted">
            {stats.sent} sent · {stats.answered} answered
            {stats.answered > 0 && ` · ${stats.avg.toFixed(1)} average`} · {stats.happy} happy · {stats.posted} went to post a review. New customers get a
            request automatically when they pay.
          </p>
        </div>
        <Button onClick={reload}>Refresh</Button>
      </div>

      {attention.length > 0 && <NeedsContact rows={attention} reload={reload} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <SendRequests onSent={reload} />
          <ReviewLinks links={links} onSaved={setLinks} />
        </div>
        <AllRequests rows={reviews} reload={reload} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- unhappy customers

function NeedsContact({ rows, reload }: { rows: Review[]; reload: () => void }) {
  return (
    <section aria-labelledby="attention-heading" className="mb-6 rounded-card border-2 border-danger bg-surface p-4 sm:p-5">
      <h2 id="attention-heading" className="flex items-center gap-2 font-display text-lg font-heavy display-tight">
        Unhappy customers to contact <span className="rounded-ui bg-danger px-2 tabular-nums text-canvas">{rows.length}</span>
      </h2>
      <p className="mt-1 text-sm text-muted">They rated 1–3 stars and asked us to reach out. Mark each one resolved once it&rsquo;s sorted.</p>
      <ul className="mt-3 grid gap-3">
        {rows.map((r) => (
          <ContactCard key={r.id} r={r} reload={reload} />
        ))}
      </ul>
    </section>
  );
}

function ContactCard({ r, reload }: { r: Review; reload: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Note>({});

  const resolve = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminRpc("ryzon_landing_admin_resolve_review", { p_id: r.id, p_note: note || null });
      reload();
    } catch (err) {
      setResult({ error: (err as Error).message });
      setBusy(false);
    }
  };

  return (
    <li className="rounded-ui border-2 border-ink bg-canvas p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">
          {r.name || r.email}{" "}
          <span aria-label={`${r.rating} out of 5 stars`} className="text-[#B7791F]">
            {stars(r.rating)}
          </span>
        </p>
        <span className="text-sm text-muted">{when(r.feedback_at)}</span>
      </div>
      <p className="mt-1 text-sm">
        <a href={`mailto:${r.email}`} className="inline-flex min-h-11 items-center break-all underline underline-offset-4">
          {r.email}
        </a>
        {r.submission_id && (
          <>
            {" · "}
            <Link href={`/admin/s/${r.submission_id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
              Open their lead
            </Link>
          </>
        )}
      </p>
      <p className="mt-2 whitespace-pre-wrap rounded-ui bg-surface p-3">{r.feedback || <span className="text-muted">They didn&rsquo;t leave a comment.</span>}</p>
      <form onSubmit={resolve} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor={`note-${r.id}`} className={labelClass}>
            What you did (optional)
          </label>
          <input id={`note-${r.id}`} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-2`} autoComplete="off" />
        </div>
        <Button type="submit" tone="primary" busy={busy}>
          Mark Resolved
        </Button>
      </form>
      <Notice {...result} />
    </li>
  );
}

// ---------------------------------------------------------------- send

/** "Name, email" or just an email, one per line. Commas, tabs or semicolons all work. */
function parsePeople(text: string) {
  const people: { name: string; email: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const email = line.match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/)?.[0];
    if (!email) continue;
    const name = line.replace(email, "").replace(/[<>,;\t]+/g, " ").trim();
    people.push({ name, email });
  }
  return people;
}

function SendRequests({ onSent }: { onSent: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>({});
  const people = useMemo(() => parsePeople(text), [text]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!people.length) return setNote({ error: "Add at least one email." });
    setBusy(true);
    setNote({});
    try {
      const res = await adminRpc<{ sent: number; skipped: { email: string; reason: string }[] }>("ryzon_landing_admin_send_review_requests", { p_people: people });
      const skipped = res.skipped.map((s) => `${s.email} (${s.reason})`).join(", ");
      setNote({ message: `Sent ${res.sent} request${res.sent === 1 ? "" : "s"}.${skipped ? ` Skipped: ${skipped}.` : ""}` });
      if (res.sent) setText("");
      onSent();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Send review requests">
      <form onSubmit={send}>
        <label htmlFor="review-people" className={labelClass}>
          Who to ask
        </label>
        <p id="review-people-hint" className="mt-1 text-sm text-muted">
          One person per line: name and email, or just the email. You can paste from a spreadsheet.
        </p>
        <textarea
          id="review-people"
          aria-describedby="review-people-hint"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Jane Smith, jane@example.com\nbob@example.com"}
          spellCheck={false}
          className={`${inputClass} mt-2 py-2`}
        />
        <p className="mt-2 text-sm" aria-live="polite">
          {people.length ? `${people.length} ${people.length === 1 ? "person" : "people"} ready.` : "No emails found yet."} Anyone asked in the last 30 days is skipped.
        </p>
        <Button type="submit" tone="primary" busy={busy} className="mt-3 w-full">
          Send Review Requests
        </Button>
        <Notice {...note} />
      </form>
    </Panel>
  );
}

// ---------------------------------------------------------------- platform links

function ReviewLinks({ links, onSaved }: { links: Links; onSaved: (l: Links) => void }) {
  // null = show the saved links; an object once the owner starts editing.
  const [draft, setDraft] = useState<Links | null>(null);
  const form = draft ?? links;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>({});

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote({});
    try {
      const saved = await adminRpc<Links>("ryzon_landing_admin_set_review_links", {
        p_google: form.google || null,
        p_facebook: form.facebook || null,
        p_yelp: form.yelp || null,
      });
      onSaved(saved);
      setDraft(null);
      setNote({ message: "Saved. Happy customers will see these buttons." });
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof Links, label: string, hint?: string) => (
    <div>
      <label htmlFor={`link-${key}`} className={labelClass}>
        {label}
      </label>
      {hint && (
        <p id={`link-${key}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <input
        id={`link-${key}`}
        type="url"
        inputMode="url"
        aria-describedby={hint ? `link-${key}-hint` : undefined}
        value={form[key] ?? ""}
        onChange={(e) => setDraft({ ...form, [key]: e.target.value })}
        placeholder="https://"
        spellCheck={false}
        autoComplete="off"
        className={`${inputClass} mt-2`}
      />
    </div>
  );

  return (
    <Panel title="Where happy customers post">
      <form onSubmit={save} className="grid gap-4">
        {!links.google && <p className="rounded-ui border-2 border-dashed border-ink p-3 text-sm">Add your Google review link so 4–5 star customers get a button to post their review.</p>}
        {field("google", "Google review link", "In your Google Business Profile, choose “Ask for reviews” and copy the link.")}
        {field("facebook", "Facebook reviews link (optional)")}
        {field("yelp", "Yelp page (optional)")}
        <Button type="submit" busy={busy}>
          Save Links
        </Button>
        <Notice {...note} />
      </form>
    </Panel>
  );
}

// ---------------------------------------------------------------- list

function statusText(r: Review) {
  if (!r.rating) return "Waiting for a rating";
  if (r.rating >= 4) return r.platform_clicked ? `Went to post on ${PLATFORM_LABEL[r.platform_clicked] ?? r.platform_clicked}` : "Happy";
  if (r.status === "rated") return "Rated low, didn’t finish the follow-up";
  if (r.status === "resolved") return "Resolved";
  return r.wants_contact ? "Wants to be contacted" : "Gave feedback, no contact wanted";
}

function AllRequests({ rows, reload }: { rows: Review[]; reload: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = rows.filter((r) =>
    filter === "waiting" ? !r.rating : filter === "happy" ? (r.rating ?? 0) >= 4 : filter === "unhappy" ? !!r.rating && r.rating <= 3 : true,
  );
  return (
    <section aria-labelledby="all-reviews-heading" className="rounded-card border-2 border-ink bg-surface p-4 sm:p-5">
      <h2 id="all-reviews-heading" className="font-display text-lg font-heavy display-tight">
        All requests
      </h2>
      <div role="group" aria-label="Show" className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`min-h-11 rounded-ui border-2 border-ink px-3 font-display text-sm font-bold ${filter === id ? "bg-ink text-on-ink" : "bg-surface"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm">{rows.length ? "Nothing here." : "No review requests yet. Send your first one on the left."}</p>
      ) : (
        <ul className="mt-3">
          {shown.map((r) => (
            <RequestRow key={r.id} r={r} reload={reload} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestRow({ r, reload }: { r: Review; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>({});
  const resend = async () => {
    setBusy(true);
    setNote({});
    try {
      await adminRpc("ryzon_landing_admin_resend_review", { p_id: r.id });
      setNote({ message: "Sent again." });
      reload();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="border-t border-rule py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">
            {r.name || r.email} {r.source === "converted" && <Tag>New customer</Tag>}
          </p>
          <p className="break-all text-sm text-muted">
            {r.name ? `${r.email} · ` : ""}asked {day(r.created_at)}
          </p>
        </div>
        <div className="text-right">
          {r.rating ? (
            <p aria-label={`${r.rating} out of 5 stars`} className="text-lg text-[#B7791F]">
              {stars(r.rating)}
            </p>
          ) : null}
          <p className="text-sm">{statusText(r)}</p>
        </div>
      </div>
      {r.feedback && <p className="mt-2 whitespace-pre-wrap rounded-ui bg-canvas p-2 text-sm">{r.feedback}</p>}
      {r.resolution_note && <p className="mt-1 text-sm text-muted">Resolved: {r.resolution_note}</p>}
      {!r.rating && (
        <Button onClick={resend} busy={busy} className="mt-2">
          Send Again
        </Button>
      )}
      <Notice {...note} />
    </li>
  );
}
