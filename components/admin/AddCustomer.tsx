"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Button, inputClass, labelClass, Notice, Panel } from "@/components/admin/ui";
import { PAID, PLANS, STATUSES, statusLabel, type Status } from "@/lib/admin/model";
import { adminRpc } from "@/lib/admin/supabase";

type Note = { message?: string; error?: string };
type Person = { name: string; email: string; phone: string; business_name: string };
type Added = { id: string; name: string };

// Everyone except contact-form questions: those only come in from the site.
const STAGES = STATUSES.filter((s) => s.id !== "contact");
const PAID_STAGES: Status[] = [...PAID, "design_files", "files_delivered", "in_build", "changes_received", "call_scheduled", "ready_to_launch", "live"];
const PERSON = { name: "", email: "", phone: "", business_name: "" };
const DETAILS = { industry: "", current_site: "", plan: "", billing_interval: "", paid_on: "", live_url: "", demo_url: "", notes: "" };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Detroit" });

/**
 * One line per person, from typing or a spreadsheet paste (commas or tabs):
 * "Jane Smith, jane@example.com, 248-555-0101, Jane's Bakery". Only name and email are needed.
 */
export function parseList(text: string) {
  const people: Person[] = [];
  const bad: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split(/\t|,/).map((p) => p.trim()).filter(Boolean);
    const email = parts.find((p) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(p));
    const rest = parts.filter((p) => p !== email);
    const phone = rest.find((p) => /^[\d\s().+-]{7,}$/.test(p)) ?? "";
    const [name = "", business_name = ""] = rest.filter((p) => p !== phone);
    if (!email || !name) bad.push(line.trim());
    else people.push({ name, email, phone, business_name });
  }
  return { people, bad };
}

/** Put existing customers (or anyone from outside the site) straight into a stage. */
export function AddCustomer() {
  const [mode, setMode] = useState<"one" | "list">("one");
  const [person, setPerson] = useState(PERSON);
  const [list, setList] = useState("");
  const [status, setStatus] = useState<Status>("live");
  const [details, setDetails] = useState(DETAILS);
  const [paid, setPaid] = useState(true);
  const [sendEmails, setSendEmails] = useState(false);
  const [sendReview, setSendReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>({});
  const [added, setAdded] = useState<Added[]>([]);

  const parsed = useMemo(() => parseList(list), [list]);
  const paidStage = PAID_STAGES.includes(status);
  const setP = (k: keyof Person) => (e: { target: { value: string } }) => setPerson((f) => ({ ...f, [k]: e.target.value }));
  const setD = (k: keyof typeof DETAILS) => (e: { target: { value: string } }) => setDetails((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const people = mode === "one" ? [person] : parsed.people;
    if (!people.length) return setNote({ error: "Add at least one person: a name and an email on each line." });
    setBusy(true);
    setNote({});
    const shared = {
      ...details,
      paid_on: paidStage && paid ? details.paid_on || today() : "",
      status,
      send_emails: sendEmails,
      send_review: sendReview,
    };
    const done: Added[] = [];
    const failed: string[] = [];
    const left: Person[] = [];
    // One at a time, so one bad line doesn't stop the rest.
    for (const p of people) {
      try {
        const res = await adminRpc<{ id: string }>("ryzon_landing_admin_add_customer", { p: { ...shared, ...p } });
        done.push({ id: res.id, name: p.business_name || p.name });
      } catch (err) {
        failed.push((err as Error).message);
        left.push(p);
      }
    }
    setBusy(false);
    setAdded((a) => [...done, ...a]);
    if (done.length) {
      if (mode === "one") setPerson(PERSON);
      // Leave only the people who weren't added, so trying again doesn't double up.
      else setList(left.map((p) => [p.name, p.email, p.phone, p.business_name].filter(Boolean).join(", ")).join("\n"));
      setDetails(DETAILS);
    }
    const ok = done.length ? `Added ${done.length} to ${statusLabel(status)}.` : "";
    setNote(failed.length ? { error: `${ok} Not added: ${failed.join(" ")}`.trim() } : { message: ok });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-heavy display-tight">Add a customer</h1>
        <p className="mt-1 max-w-measure text-sm text-muted">
          For customers you already have, or anyone who didn&rsquo;t come through the website. They go straight into the stage you pick and show up on the board.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <form onSubmit={submit} className="grid gap-6">
          <Panel
            title="Who"
            actions={
              <div role="group" aria-label="How many" className="flex overflow-hidden rounded-ui border-2 border-ink">
                {(
                  [
                    ["one", "One person"],
                    ["list", "Paste a list"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={mode === id}
                    onClick={() => setMode(id)}
                    className={`min-h-11 px-3 font-display text-sm font-bold ${mode === id ? "bg-ink text-on-ink" : "bg-surface hover:underline"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {mode === "one" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="add-name" label="Name" required value={person.name} onChange={setP("name")} autoComplete="off" />
                <Field id="add-email" label="Email" type="email" required value={person.email} onChange={setP("email")} autoComplete="off" spellCheck={false} />
                <Field id="add-phone" label="Phone (optional)" type="tel" value={person.phone} onChange={setP("phone")} autoComplete="off" />
                <Field id="add-business" label="Business name (optional)" value={person.business_name} onChange={setP("business_name")} autoComplete="off" />
                <Field id="add-industry" label="Industry (optional)" value={details.industry} onChange={setD("industry")} autoComplete="off" />
                <Field id="add-site" label="Their old website (optional)" type="url" placeholder="https://" value={details.current_site} onChange={setD("current_site")} autoComplete="off" />
              </div>
            ) : (
              <div>
                <label htmlFor="add-list" className={labelClass}>
                  One person per line
                </label>
                <p id="add-list-hint" className="mt-1 text-sm text-muted">
                  Name, email, phone, business. Only name and email are needed. You can paste straight from a spreadsheet.
                </p>
                <textarea
                  id="add-list"
                  rows={8}
                  value={list}
                  onChange={(e) => setList(e.target.value)}
                  aria-describedby="add-list-hint add-list-count"
                  placeholder={"Jane Smith, jane@example.com, 248-555-0101, Jane's Bakery\nBob Lee, bob@example.com"}
                  spellCheck={false}
                  className={`${inputClass} mt-2 py-2 font-mono text-sm`}
                />
                <p id="add-list-count" aria-live="polite" className="mt-2 text-sm">
                  {parsed.people.length} {parsed.people.length === 1 ? "person" : "people"} ready
                  {parsed.bad.length > 0 && (
                    <span className="text-danger">
                      {" "}
                      · {parsed.bad.length} line{parsed.bad.length === 1 ? "" : "s"} missing a name or email: {parsed.bad.slice(0, 3).join(" | ")}
                    </span>
                  )}
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Where they are now">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="add-stage" className={labelClass}>
                  Stage
                </label>
                <select id="add-stage" value={status} onChange={(e) => setStatus(e.target.value as Status)} className={`${inputClass} mt-2`}>
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-plan" className={labelClass}>
                  Plan (optional)
                </label>
                <select id="add-plan" value={details.plan} onChange={setD("plan")} className={`${inputClass} mt-2`}>
                  <option value="">Not set</option>
                  {Object.entries(PLANS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-billing" className={labelClass}>
                  Billing (optional)
                </label>
                <select
                  id="add-billing"
                  value={details.plan === "files99" ? "once" : details.billing_interval}
                  disabled={details.plan === "files99"}
                  onChange={setD("billing_interval")}
                  className={`${inputClass} mt-2 disabled:opacity-60`}
                >
                  <option value="">Not set</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                  <option value="once">One time</option>
                </select>
              </div>
              {paidStage && (
                <div className="sm:col-span-2">
                  <label className="flex min-h-11 items-center gap-3 font-display text-sm font-bold">
                    <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-5 w-5 accent-current" />
                    They&rsquo;ve already paid
                  </label>
                  {paid && (
                    <Field
                      id="add-paid-on"
                      label="Paid on (optional)"
                      hint="Leave empty for today. Counts them as a paying customer in your numbers."
                      type="date"
                      max={today()}
                      value={details.paid_on}
                      onChange={setD("paid_on")}
                    />
                  )}
                </div>
              )}
              <Field id="add-live" label="Live website (optional)" type="url" placeholder="https://" value={details.live_url} onChange={setD("live_url")} autoComplete="off" />
              <Field id="add-demo" label="Demo link (optional)" type="url" placeholder="https://" value={details.demo_url} onChange={setD("demo_url")} autoComplete="off" />
              <div className="sm:col-span-2">
                <label htmlFor="add-notes" className={labelClass}>
                  Notes (optional, only you see these)
                </label>
                <textarea id="add-notes" rows={3} value={details.notes} onChange={setD("notes")} className={`${inputClass} mt-2 py-2`} />
              </div>
            </div>
          </Panel>

          <Panel title="Emails">
            <div className="grid gap-3">
              <Check
                id="add-send-emails"
                checked={sendEmails}
                onChange={setSendEmails}
                label="Send them automatic emails from here on"
                hint="Off is best for existing customers. They won’t get any automatic emails until you turn it on from their page. Nothing is sent just for adding them either way."
              />
              <Check
                id="add-send-review"
                checked={sendReview}
                onChange={setSendReview}
                label="Send them a review request now"
                hint="The “How did we do?” email. Happy customers get your Google review link."
              />
            </div>
          </Panel>

          <div>
            <Button type="submit" tone="primary" busy={busy} className="w-full sm:w-auto">
              {mode === "list" && parsed.people.length > 1 ? `Add ${parsed.people.length} People` : "Add Customer"}
            </Button>
            <Notice message={note.message} error={note.error} />
          </div>
        </form>

        <section aria-labelledby="added-heading" className="rounded-card border-2 border-ink bg-surface p-4 sm:p-5">
          <h2 id="added-heading" className="font-display text-lg font-heavy display-tight">
            Added just now
          </h2>
          {added.length === 0 ? (
            <p className="mt-2 text-sm text-muted">People you add show up here with a link to their page.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {added.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/s/${a.id}`} className="font-bold underline underline-offset-4">
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm">
            <Link href="/admin?view=board" className="underline underline-offset-4">
              See the board
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}

type FieldProps = { id: string; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>;

function Field({ id, label, hint, ...input }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <input id={id} name={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} className={`${inputClass} mt-2`} />
    </div>
  );
}

function Check({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={`${id}-hint`} className="mt-3 h-5 w-5 shrink-0 accent-current" />
      <div>
        <label htmlFor={id} className="flex min-h-11 items-center font-display text-sm font-bold">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      </div>
    </div>
  );
}
