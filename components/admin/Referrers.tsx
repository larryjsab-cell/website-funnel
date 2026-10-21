"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, inputClass, labelClass, Notice, Panel, StatusBadge, Tag } from "@/components/admin/ui";
import { day, displayName, when, type QueueRow, type Referrer, type Submission } from "@/lib/admin/model";
import { adminRpc, supabase } from "@/lib/admin/supabase";

type Lead = Pick<Submission, "id" | "name" | "business_name" | "status" | "paid_at" | "created_at" | "utm_campaign">;
type Mail = Pick<QueueRow, "id" | "referrer_id" | "state" | "sent_at" | "created_at" | "last_error">;
type Data = { referrers: Referrer[]; leads: Lead[]; mail: Mail[] };
type Note = { message?: string; error?: string };

// The dashboard runs on the site itself, so its address is the link's address.
const linkFor = (code: string) => `${typeof window === "undefined" ? "" : window.location.origin}/r/${code}`;

async function fetchReferrers(): Promise<{ data?: Data; error?: string }> {
  const db = supabase();
  const [referrers, leads, mail] = await Promise.all([
    db.from("ryzon_landing_referrers").select("*").order("created_at", { ascending: false }),
    db.from("ryzon_landing_submissions").select("id,name,business_name,status,paid_at,created_at,utm_campaign").eq("utm_source", "referral").order("created_at", { ascending: false }).limit(2000),
    db.from("ryzon_landing_email_queue").select("id,referrer_id,state,sent_at,created_at,last_error").not("referrer_id", "is", null).order("created_at", { ascending: false }).limit(2000),
  ]);
  const err = referrers.error || leads.error || mail.error;
  if (err) return { error: err.message };
  return { data: { referrers: (referrers.data ?? []) as Referrer[], leads: (leads.data ?? []) as Lead[], mail: (mail.data ?? []) as Mail[] } };
}

/** Referral program: add people, email them their link, see who they sent. */
export function Referrers() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(
    () =>
      fetchReferrers().then((r) => {
        setError(r.error ?? "");
        if (r.data) setData(r.data);
      }),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const totals = useMemo(() => {
    const leads = data?.leads ?? [];
    return { leads: leads.length, paid: leads.filter((l) => l.paid_at).length };
  }, [data]);

  if (error && !data) return <Notice error={`Couldn’t load referrers: ${error}`} />;
  if (!data) return <p className="text-muted">Loading referrers…</p>;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-heavy display-tight">Referrers</h1>
          <p className="mt-1 text-sm text-muted">
            {data.referrers.length} referrer{data.referrers.length === 1 ? "" : "s"} · {totals.leads} lead{totals.leads === 1 ? "" : "s"} · {totals.paid} paid. Each paid lead earns
            their referrer a $50 credit.
          </p>
        </div>
        <Button onClick={reload}>Refresh</Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <AddReferrer onAdded={reload} />
        <section aria-labelledby="referrer-list-heading">
          <h2 id="referrer-list-heading" className="sr-only">
            All referrers
          </h2>
          {data.referrers.length === 0 ? (
            <p className="rounded-card border-2 border-dashed border-ink p-5 text-sm">No referrers yet. Add the first one and they’ll get their link by email.</p>
          ) : (
            <ul className="grid gap-4">
              {data.referrers.map((r) => (
                <ReferrerCard
                  key={r.id}
                  r={r}
                  leads={data.leads.filter((l) => l.utm_campaign === r.code)}
                  mail={data.mail.filter((m) => m.referrer_id === r.id)}
                  reload={reload}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- add

const EMPTY = { name: "", email: "", phone: "", business: "", notes: "", code: "" };

function AddReferrer({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [send, setSend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>({});
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote({});
    try {
      const res = await adminRpc<{ code: string }>("ryzon_landing_admin_add_referrer", {
        p_name: form.name,
        p_email: form.email,
        p_phone: form.phone || null,
        p_business: form.business || null,
        p_notes: form.notes || null,
        p_code: form.code || null,
        p_send: send,
      });
      setNote({ message: `Added. Their link is ${linkFor(res.code)}${send ? " and the email is on its way." : "."}` });
      setForm(EMPTY);
      onAdded();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Add a referrer">
      <form onSubmit={submit} className="grid gap-4">
        <Field id="ref-name" label="Name" required value={form.name} onChange={set("name")} autoComplete="off" />
        <Field id="ref-email" label="Email" type="email" required value={form.email} onChange={set("email")} autoComplete="off" spellCheck={false} />
        <Field id="ref-phone" label="Phone (optional)" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
        <Field id="ref-business" label="Their business (optional)" hint="Shown on their page: “Jane from Jane’s Bakery sent you”." value={form.business} onChange={set("business")} autoComplete="off" />
        <Field
          id="ref-code"
          label="Custom link ending (optional)"
          hint="Leave empty for one like /r/jane-k3p9. Letters, numbers and dashes."
          value={form.code}
          onChange={set("code")}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          pattern="[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*"
        />
        <div>
          <label htmlFor="ref-notes" className={labelClass}>
            Notes (only you see these)
          </label>
          <textarea id="ref-notes" name="notes" rows={2} value={form.notes} onChange={set("notes")} className={`${inputClass} mt-2 py-2`} />
        </div>
        <label className="flex min-h-11 items-center gap-3 font-display text-sm font-bold display-ui">
          <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} className="h-5 w-5 accent-ink" />
          Email them their link now
        </label>
        <Button type="submit" tone="primary" busy={busy}>
          Add Referrer
        </Button>
        <Notice {...note} />
      </form>
    </Panel>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string };

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

// ---------------------------------------------------------------- one referrer

function ReferrerCard({ r, leads, mail, reload }: { r: Referrer; leads: Lead[]; mail: Mail[]; reload: () => void }) {
  const [busy, setBusy] = useState<"" | "send" | "active">("");
  const [note, setNote] = useState<Note>({});
  const [editing, setEditing] = useState(false);
  const link = linkFor(r.code);
  const paid = leads.filter((l) => l.paid_at).length;
  const last = mail[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNote({ message: "Link copied." });
    } catch {
      setNote({ error: "Couldn’t copy. Select the link and copy it by hand." });
    }
  };

  const sendLink = async () => {
    setBusy("send");
    setNote({});
    try {
      await adminRpc("ryzon_landing_admin_send_referral_link", { p_id: r.id });
      setNote({ message: `Email queued to ${r.email}.` });
      reload();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  const toggle = async () => {
    setBusy("active");
    setNote({});
    try {
      await adminRpc("ryzon_landing_admin_update_referrer", {
        p_id: r.id,
        p_name: r.name,
        p_email: r.email,
        p_phone: r.phone,
        p_business: r.business_name,
        p_notes: r.notes,
        p_active: !r.is_active,
      });
      reload();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  return (
    <li className={`rounded-card border-2 bg-surface p-4 sm:p-5 ${r.is_active ? "border-ink" : "border-dashed border-muted"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-heavy display-tight">
            {r.name}
            {r.business_name && <span className="font-normal text-muted"> · {r.business_name}</span>}
          </h3>
          <p className="break-all text-sm">
            <a href={`mailto:${r.email}`} className="underline underline-offset-4">
              {r.email}
            </a>
            {r.phone && <span className="text-muted"> · {r.phone}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 whitespace-nowrap">
          {!r.is_active && <Tag>Turned off</Tag>}
          <span className="rounded-ui bg-ink px-2 py-0.5 font-display text-sm font-bold tabular-nums text-on-ink">
            {leads.length} lead{leads.length === 1 ? "" : "s"}
          </span>
          <span className="rounded-ui bg-accent px-2 py-0.5 font-display text-sm font-bold tabular-nums text-on-accent">{paid} paid</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="w-full min-w-0 break-all sm:w-auto sm:flex-1 rounded-ui border-2 border-ink bg-canvas px-3 py-2 text-sm">{link}</code>
        <Button onClick={copy}>Copy Link</Button>
      </div>

      <p className="mt-3 text-sm text-muted">
        {last
          ? last.state === "sent"
            ? `Link emailed ${when(last.sent_at)}.`
            : last.state === "failed"
              ? `Last email failed: ${last.last_error ?? "unknown error"}.`
              : last.state === "cancelled"
                ? "Last email was cancelled."
                : "Link email is sending."
          : "Link not emailed yet."}{" "}
        Added {day(r.created_at)}.{paid > 0 && ` Credits earned: $${paid * 50}.`}
      </p>
      {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={sendLink} busy={busy === "send"} disabled={!r.is_active}>
          {mail.length ? "Resend Link Email" : "Send Link Email"}
        </Button>
        <Button onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
          {editing ? "Close Edit" : "Edit"}
        </Button>
        <Button tone={r.is_active ? "danger" : "plain"} onClick={toggle} busy={busy === "active"}>
          {r.is_active ? "Turn Off Link" : "Turn On Link"}
        </Button>
      </div>
      <Notice {...note} />

      {editing && (
        <EditReferrer
          r={r}
          onSaved={() => {
            setEditing(false);
            setNote({ message: "Saved." });
            reload();
          }}
        />
      )}

      {leads.length > 0 && (
        <details className="mt-4 border-t border-rule pt-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-display text-sm font-bold display-ui">People they sent ({leads.length})</summary>
          <ul className="mt-1">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-rule py-2 first:border-t-0">
                <span>
                  <Link href={`/admin/s/${l.id}`} className="font-bold underline underline-offset-4">
                    {displayName(l)}
                  </Link>{" "}
                  <span className="text-sm text-muted">{day(l.created_at)}</span>
                </span>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function EditReferrer({ r, onSaved }: { r: Referrer; onSaved: () => void }) {
  const [form, setForm] = useState({ name: r.name, email: r.email, phone: r.phone ?? "", business: r.business_name ?? "", notes: r.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const id = (k: string) => `edit-${r.id}-${k}`;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminRpc("ryzon_landing_admin_update_referrer", {
        p_id: r.id,
        p_name: form.name,
        p_email: form.email,
        p_phone: form.phone || null,
        p_business: form.business || null,
        p_notes: form.notes || null,
        p_active: r.is_active,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-4 grid gap-4 border-t border-rule pt-4 sm:grid-cols-2">
      <Field id={id("name")} label="Name" required value={form.name} onChange={set("name")} autoComplete="off" />
      <Field id={id("email")} label="Email" type="email" required value={form.email} onChange={set("email")} autoComplete="off" spellCheck={false} />
      <Field id={id("phone")} label="Phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
      <Field id={id("business")} label="Their business" value={form.business} onChange={set("business")} autoComplete="off" />
      <div className="sm:col-span-2">
        <label htmlFor={id("notes")} className={labelClass}>
          Notes
        </label>
        <textarea id={id("notes")} rows={2} value={form.notes} onChange={set("notes")} className={`${inputClass} mt-2 py-2`} />
      </div>
      <div className="sm:col-span-2">
        <p className="text-sm text-muted">The link stays the same, so anything they already shared keeps working.</p>
        <Button type="submit" tone="primary" busy={busy} className="mt-3">
          Save Changes
        </Button>
        <Notice error={error} />
      </div>
    </form>
  );
}
