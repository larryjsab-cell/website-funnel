"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, inputClass, labelClass, Notice, Panel, StatusBadge, Tag } from "@/components/admin/ui";
import { day, displayName, when, type Submission } from "@/lib/admin/model";
import { adminRpc, supabase } from "@/lib/admin/supabase";

/**
 * Affiliate program: review applications, hand out links, see clicks, leads and customers,
 * and track commissions from pending to paid. Needs migration 13 in the database.
 */
export type Affiliate = {
  id: string;
  code: string | null;
  status: "applied" | "active" | "paused" | "rejected";
  source: "form" | "admin";
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  website: string | null;
  audience: string | null;
  promote_how: string | null;
  notes: string | null;
  payout_email: string | null;
  admin_notes: string | null;
  applied_at: string;
  approved_at: string | null;
  created_at: string;
};

type Click = { affiliate_id: string; created_at: string };
type Lead = Pick<Submission, "id" | "name" | "business_name" | "status" | "paid_at" | "created_at"> & { affiliate_id: string };
type Commission = {
  id: number;
  affiliate_id: string;
  submission_id: string | null;
  kind: "hosting" | "design";
  basis_cents: number;
  rate: number;
  amount_cents: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "void";
  note: string | null;
  created_at: string;
  paid_at: string | null;
};
type Mail = { id: number; affiliate_id: string; template_key: string; state: string; sent_at: string | null; last_error: string | null; created_at: string };
type Settings = { cookie_days: number; rate_hosting: number; rate_design: number; hosting_months: string };
type Data = { affiliates: Affiliate[]; clicks: Click[]; clicks30: number; leads: Lead[]; commissions: Commission[]; mail: Mail[]; settings: Settings };
type Note = { message?: string; error?: string };

const linkFor = (code: string) => `${typeof window === "undefined" ? "" : window.location.origin}/a/${code}`;
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const pct = (rate: number) => `${Math.round(Number(rate) * 100)}%`;
const sum = (rows: Commission[], status?: Commission["status"]) =>
  rows.filter((c) => (status ? c.status === status : c.status !== "void")).reduce((t, c) => t + c.amount_cents, 0);
const STATUS_LABEL: Record<Affiliate["status"], string> = { applied: "Applied", active: "Active", paused: "Paused", rejected: "Rejected" };

async function fetchAffiliates(): Promise<{ data?: Data; error?: string; missing?: boolean }> {
  const db = supabase();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [affiliates, clicks, leads, commissions, mail] = await Promise.all([
    db.from("ryzon_landing_affiliates").select("*").order("created_at", { ascending: false }),
    db.from("ryzon_landing_affiliate_clicks").select("affiliate_id,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20000),
    db.from("ryzon_landing_submissions").select("id,name,business_name,status,paid_at,created_at,affiliate_id").not("affiliate_id", "is", null).order("created_at", { ascending: false }).limit(5000),
    db.from("ryzon_landing_affiliate_commissions").select("*").order("created_at", { ascending: false }).limit(5000),
    db.from("ryzon_landing_email_queue").select("id,affiliate_id,template_key,state,sent_at,last_error,created_at").not("affiliate_id", "is", null).order("created_at", { ascending: false }).limit(2000),
  ]);
  const err = affiliates.error || clicks.error || leads.error || commissions.error || mail.error;
  if (err) return { error: err.message, missing: /does not exist|schema cache|affiliate_id/i.test(err.message) };
  let settings: Settings;
  try {
    settings = await adminRpc<Settings>("ryzon_landing_admin_affiliate_settings", { p: null });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return {
    data: {
      affiliates: (affiliates.data ?? []) as Affiliate[],
      clicks: (clicks.data ?? []) as Click[],
      clicks30: ((clicks.data ?? []) as Click[]).filter((c) => new Date(c.created_at).getTime() >= Date.now() - 30 * 86_400_000).length,
      leads: (leads.data ?? []) as Lead[],
      commissions: (commissions.data ?? []) as Commission[],
      mail: (mail.data ?? []) as Mail[],
      settings,
    },
  };
}

export function Affiliates() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const reload = useCallback(
    () =>
      fetchAffiliates().then((r) => {
        setError(r.error ?? "");
        setMissing(Boolean(r.missing));
        if (r.data) setData(r.data);
      }),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const totals = useMemo(() => {
    if (!data) return null;
    return {
      active: data.affiliates.filter((a) => a.status === "active").length,
      applied: data.affiliates.filter((a) => a.status === "applied").length,
      clicks30: data.clicks30,
      leads: data.leads.length,
      customers: data.leads.filter((l) => l.paid_at).length,
      owed: sum(data.commissions, "pending") + sum(data.commissions, "approved"),
      paid: sum(data.commissions, "paid"),
    };
  }, [data]);

  if (missing)
    return (
      <div className="max-w-measure rounded-card border-2 border-dashed border-ink bg-surface p-5">
        <h1 className="font-display text-2xl font-heavy display-tight">Affiliates aren’t set up yet</h1>
        <p className="mt-3">
          The database doesn’t have the affiliate tables yet. Run <code>supabase/migrations/20261028_13_ryzon_landing_affiliates.sql</code> in the Supabase SQL
          editor, then refresh this page.
        </p>
      </div>
    );
  if (error && !data) return <Notice error={`Couldn’t load affiliates: ${error}`} />;
  if (!data || !totals) return <p className="text-muted">Loading affiliates…</p>;

  const applications = data.affiliates.filter((a) => a.status === "applied");
  const others = data.affiliates.filter((a) => a.status !== "applied");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-heavy display-tight">Affiliates</h1>
          <p className="mt-1 text-sm text-muted">
            {pct(data.settings.rate_hosting)} of hosting{data.settings.hosting_months ? ` for ${data.settings.hosting_months} months` : ", for life"} ·{" "}
            {pct(data.settings.rate_design)} of design · {data.settings.cookie_days}-day window, last click wins.
          </p>
        </div>
        <Button onClick={reload}>Refresh</Button>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Active", totals.active],
          ["Applications", totals.applied],
          ["Clicks (30 days)", totals.clicks30],
          ["Leads", totals.leads],
          ["Customers", totals.customers],
          ["Owed", money(totals.owed)],
          ["Paid out", money(totals.paid)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-card border-2 border-ink bg-surface p-3">
            <dt className="font-display text-sm display-ui text-muted">{k}</dt>
            <dd className="mt-1 font-display text-2xl font-heavy tabular-nums display-tight">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <AddAffiliate onAdded={reload} />
          <SettingsPanel settings={data.settings} onSaved={reload} />
        </div>
        <div className="grid gap-6">
          <section aria-labelledby="aff-apps-heading">
            <h2 id="aff-apps-heading" className="mb-3 font-display text-xl font-heavy display-tight">
              Applications ({applications.length})
            </h2>
            {applications.length === 0 ? (
              <p className="rounded-card border-2 border-dashed border-ink p-5 text-sm">No applications waiting. New ones from the Affiliate Program page show up here and in your inbox.</p>
            ) : (
              <ul className="grid gap-4">
                {applications.map((a) => (
                  <AffiliateCard key={a.id} a={a} data={data} reload={reload} />
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="aff-list-heading">
            <h2 id="aff-list-heading" className="mb-3 font-display text-xl font-heavy display-tight">
              Affiliates ({others.length})
            </h2>
            {others.length === 0 ? (
              <p className="rounded-card border-2 border-dashed border-ink p-5 text-sm">No affiliates yet. Approve an application or add someone yourself.</p>
            ) : (
              <ul className="grid gap-4">
                {others.map((a) => (
                  <AffiliateCard key={a.id} a={a} data={data} reload={reload} />
                ))}
              </ul>
            )}
          </section>
          <Ledger data={data} reload={reload} />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- one affiliate

function AffiliateCard({ a, data, reload }: { a: Affiliate; data: Data; reload: () => void }) {
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Note>({});
  const [editing, setEditing] = useState(false);
  const clicks = data.clicks.filter((c) => c.affiliate_id === a.id);
  const leads = data.leads.filter((l) => l.affiliate_id === a.id);
  const customers = leads.filter((l) => l.paid_at).length;
  const commissions = data.commissions.filter((c) => c.affiliate_id === a.id);
  const lastMail = data.mail.find((m) => m.affiliate_id === a.id && m.template_key === "affiliate_approved");
  const link = a.code ? linkFor(a.code) : "";

  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    setNote({});
    try {
      await fn();
      setNote({ message: done });
      reload();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy("");
    }
  };
  const setStatus = (status: Affiliate["status"], done: string) =>
    act(status, () => adminRpc("ryzon_landing_admin_affiliate_update", { p_id: a.id, p: { status } }), done);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNote({ message: "Link copied." });
    } catch {
      setNote({ error: "Couldn’t copy. Select the link and copy it by hand." });
    }
  };

  return (
    <li className={`rounded-card border-2 bg-surface p-4 sm:p-5 ${a.status === "active" || a.status === "applied" ? "border-ink" : "border-dashed border-muted"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-heavy display-tight">
            {a.name}
            {a.business_name && <span className="font-normal text-muted"> · {a.business_name}</span>}
          </h3>
          <p className="break-all text-sm">
            <a href={`mailto:${a.email}`} className="underline underline-offset-4">
              {a.email}
            </a>
            {a.phone && <span className="text-muted"> · {a.phone}</span>}
            {a.website && <span className="text-muted"> · {a.website}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 whitespace-nowrap">
          <Tag>{STATUS_LABEL[a.status]}</Tag>
          {a.status !== "applied" && (
            <>
              <span className="rounded-ui border border-ink px-2 font-display text-sm tabular-nums">{clicks.length} clicks</span>
              <span className="rounded-ui bg-ink px-2 py-0.5 font-display text-sm font-bold tabular-nums text-on-ink">
                {leads.length} lead{leads.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-ui bg-accent px-2 py-0.5 font-display text-sm font-bold tabular-nums text-on-accent">{customers} paid</span>
            </>
          )}
        </div>
      </div>

      {a.status === "applied" && (
        <dl className="mt-3 grid gap-2 text-sm">
          {a.audience && (
            <div>
              <dt className="font-bold">Who they reach</dt>
              <dd className="whitespace-pre-wrap">{a.audience}</dd>
            </div>
          )}
          {a.promote_how && (
            <div>
              <dt className="font-bold">How they’ll share</dt>
              <dd>{a.promote_how}</dd>
            </div>
          )}
          {a.notes && (
            <div>
              <dt className="font-bold">Notes</dt>
              <dd className="whitespace-pre-wrap">{a.notes}</dd>
            </div>
          )}
          <div className="text-muted">Applied {when(a.applied_at)}</div>
        </dl>
      )}

      {link && a.status !== "rejected" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="w-full min-w-0 break-all rounded-ui border-2 border-ink bg-canvas px-3 py-2 text-sm sm:w-auto sm:flex-1">{link}</code>
          <Button onClick={copy}>Copy Link</Button>
        </div>
      )}

      {a.status !== "applied" && (
        <p className="mt-3 text-sm text-muted">
          Earned {money(sum(commissions))} · owed {money(sum(commissions, "pending") + sum(commissions, "approved"))} · paid {money(sum(commissions, "paid"))}.{" "}
          {lastMail
            ? lastMail.state === "sent"
              ? `Link emailed ${when(lastMail.sent_at)}.`
              : lastMail.state === "failed"
                ? `Link email failed: ${lastMail.last_error ?? "unknown error"}.`
                : "Link email is sending."
            : a.status === "active"
              ? "Link not emailed yet."
              : ""}{" "}
          {a.approved_at ? `Approved ${day(a.approved_at)}.` : `Added ${day(a.created_at)}.`}
          {a.payout_email && ` Payouts to ${a.payout_email}.`}
        </p>
      )}
      {a.admin_notes && <p className="mt-2 whitespace-pre-wrap text-sm">{a.admin_notes}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {a.status === "applied" && (
          <>
            <Button tone="primary" busy={busy === "active"} onClick={() => setStatus("active", "Approved. Their link is on its way by email.")}>
              Approve and Send Link
            </Button>
            <Button tone="danger" busy={busy === "rejected"} onClick={() => setStatus("rejected", "Marked as not approved. No email was sent.")}>
              Decline
            </Button>
          </>
        )}
        {a.status === "active" && (
          <>
            <Button busy={busy === "send"} onClick={() => act("send", () => adminRpc("ryzon_landing_admin_affiliate_send_link", { p_id: a.id }), `Email queued to ${a.email}.`)}>
              {lastMail ? "Resend Link Email" : "Send Link Email"}
            </Button>
            <Button tone="danger" busy={busy === "paused"} onClick={() => setStatus("paused", "Paused. Their link no longer credits new leads.")}>
              Pause
            </Button>
          </>
        )}
        {(a.status === "paused" || a.status === "rejected") && (
          <Button busy={busy === "active"} onClick={() => setStatus("active", a.status === "rejected" ? "Approved. Their link is on its way by email." : "Active again.")}>
            {a.status === "rejected" ? "Approve After All" : "Resume"}
          </Button>
        )}
        <Button onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
          {editing ? "Close Edit" : "Edit"}
        </Button>
      </div>
      <Notice {...note} />

      {editing && (
        <EditAffiliate
          a={a}
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

function EditAffiliate({ a, onSaved }: { a: Affiliate; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: a.name,
    phone: a.phone ?? "",
    business_name: a.business_name ?? "",
    website: a.website ?? "",
    payout_email: a.payout_email ?? "",
    admin_notes: a.admin_notes ?? "",
    code: a.code ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const id = (k: string) => `aff-edit-${a.id}-${k}`;
  const codeChanged = Boolean(a.code) && form.code.trim().toLowerCase() !== a.code;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (codeChanged && !window.confirm(`Change their link from /a/${a.code} to /a/${form.code.trim().toLowerCase()}? Links they already shared will stop counting.`)) return;
    setBusy(true);
    setError("");
    try {
      const { code, ...rest } = form;
      await adminRpc("ryzon_landing_admin_affiliate_update", { p_id: a.id, p: { ...rest, ...(code.trim() && code.trim().toLowerCase() !== a.code ? { code } : {}) } });
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
      <Field id={id("phone")} label="Phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
      <Field id={id("business")} label="Business or brand" value={form.business_name} onChange={set("business_name")} autoComplete="off" />
      <Field id={id("website")} label="Website or profile" value={form.website} onChange={set("website")} autoComplete="off" spellCheck={false} />
      <Field id={id("payout")} label="Payout email (PayPal, Venmo…)" value={form.payout_email} onChange={set("payout_email")} autoComplete="off" spellCheck={false} />
      <Field
        id={id("code")}
        label="Link code"
        hint={a.code ? "Changing it breaks links they already shared." : "Set when you approve them. Leave empty for one made from their name."}
        value={form.code}
        onChange={set("code")}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="off"
        pattern="[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*"
      />
      <div className="sm:col-span-2">
        <label htmlFor={id("notes")} className={labelClass}>
          Private notes
        </label>
        <textarea id={id("notes")} rows={2} value={form.admin_notes} onChange={set("admin_notes")} className={`${inputClass} mt-2 py-2`} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" tone="primary" busy={busy}>
          Save Changes
        </Button>
        <Notice error={error} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- add + settings

const EMPTY = { name: "", email: "", phone: "", business_name: "", payout_email: "", code: "", admin_notes: "" };

function AddAffiliate({ onAdded }: { onAdded: () => void }) {
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
      const res = await adminRpc<{ code: string }>("ryzon_landing_admin_affiliate_create", { p: { ...form, send } });
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
    <Panel title="Add an affiliate">
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm text-muted">For someone you recruited yourself. They’re active right away, no application needed.</p>
        <Field id="aff-add-name" label="Name" required value={form.name} onChange={set("name")} autoComplete="off" />
        <Field id="aff-add-email" label="Email" type="email" required value={form.email} onChange={set("email")} autoComplete="off" spellCheck={false} />
        <Field id="aff-add-phone" label="Phone (optional)" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
        <Field id="aff-add-business" label="Business or brand (optional)" value={form.business_name} onChange={set("business_name")} autoComplete="off" />
        <Field id="aff-add-payout" label="Payout email (optional)" value={form.payout_email} onChange={set("payout_email")} autoComplete="off" spellCheck={false} />
        <Field
          id="aff-add-code"
          label="Custom link ending (optional)"
          hint="Leave empty for one like /a/jane-k3p9. Letters, numbers and dashes."
          value={form.code}
          onChange={set("code")}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          pattern="[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*"
        />
        <label className="flex min-h-11 items-center gap-3 font-display text-sm font-bold display-ui">
          <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} className="h-5 w-5 accent-ink" />
          Email them their link now
        </label>
        <Button type="submit" tone="primary" busy={busy}>
          Add Affiliate
        </Button>
        <Notice {...note} />
      </form>
    </Panel>
  );
}

function SettingsPanel({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [form, setForm] = useState({
    cookie_days: String(settings.cookie_days),
    rate_hosting: String(Math.round(Number(settings.rate_hosting) * 100)),
    rate_design: String(Math.round(Number(settings.rate_design) * 100)),
    hosting_months: settings.hosting_months,
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>({});
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote({});
    try {
      await adminRpc("ryzon_landing_admin_affiliate_settings", {
        p: {
          cookie_days: form.cookie_days.trim(),
          rate_hosting: String(Number(form.rate_hosting) / 100),
          rate_design: String(Number(form.rate_design) / 100),
          hosting_months: form.hosting_months.trim(),
        },
      });
      setNote({ message: "Saved. The Affiliate Program page updates within 5 minutes." });
      onSaved();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Program settings">
      <form onSubmit={save} className="grid gap-4">
        <Field
          id="aff-set-days"
          label="Credit window (days)"
          hint="How long after a click a lead still counts. Applies to new clicks and to every form sent from now on."
          type="number"
          min={1}
          max={365}
          required
          value={form.cookie_days}
          onChange={set("cookie_days")}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field id="aff-set-hosting" label="Hosting %" type="number" min={0} max={100} step="0.5" required value={form.rate_hosting} onChange={set("rate_hosting")} />
          <Field id="aff-set-design" label="Design %" type="number" min={0} max={100} step="0.5" required value={form.rate_design} onChange={set("rate_design")} />
        </div>
        <Field
          id="aff-set-months"
          label="Pay hosting commission for (months)"
          hint="Leave empty to pay for as long as the customer stays."
          type="number"
          min={1}
          value={form.hosting_months}
          onChange={set("hosting_months")}
        />
        <p className="text-sm text-muted">New rates apply to payments from now on. Commissions already recorded keep the rate they were earned at.</p>
        <Button type="submit" tone="primary" busy={busy}>
          Save Settings
        </Button>
        <Notice {...note} />
      </form>
    </Panel>
  );
}

// ---------------------------------------------------------------- commissions

const FILTERS = ["owed", "pending", "approved", "paid", "void", "all"] as const;
type Filter = (typeof FILTERS)[number];

function Ledger({ data, reload }: { data: Data; reload: () => void }) {
  const [filter, setFilter] = useState<Filter>("owed");
  const [picked, setPicked] = useState<number[]>([]);
  const [payNote, setPayNote] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Note>({});
  const byId = useMemo(() => new Map(data.affiliates.map((a) => [a.id, a])), [data.affiliates]);
  const leadById = useMemo(() => new Map(data.leads.map((l) => [l.id, l])), [data.leads]);
  const rows = data.commissions.filter((c) => (filter === "all" ? true : filter === "owed" ? c.status === "pending" || c.status === "approved" : c.status === filter));
  const pickedRows = rows.filter((r) => picked.includes(r.id));
  const allPicked = rows.length > 0 && pickedRows.length === rows.length;

  const apply = async (status: Commission["status"]) => {
    if (status === "void" && !window.confirm(`Void ${pickedRows.length} commission${pickedRows.length === 1 ? "" : "s"}? They won’t be paid.`)) return;
    setBusy(status);
    setNote({});
    try {
      const n = await adminRpc<number>("ryzon_landing_admin_commission_set", { p_ids: pickedRows.map((r) => r.id), p_status: status, p_note: payNote || null });
      setNote({ message: `${n} commission${n === 1 ? "" : "s"} marked ${status}.` });
      setPicked([]);
      setPayNote("");
      reload();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  return (
    <Panel title="Commissions">
      <div role="group" aria-label="Show" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => {
              setFilter(f);
              setPicked([]);
            }}
            className={`min-h-11 rounded-ui border-2 border-ink px-3 font-display text-sm font-bold capitalize display-ui ${filter === f ? "bg-ink text-on-ink" : "bg-surface"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing here. Commissions appear automatically when a customer an affiliate sent pays.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th scope="col" className="w-10 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allPicked}
                      onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])}
                      className="h-5 w-5 accent-ink"
                    />
                  </th>
                  <th scope="col" className="py-2 pr-3 font-display">Affiliate</th>
                  <th scope="col" className="py-2 pr-3 font-display">Customer</th>
                  <th scope="col" className="py-2 pr-3 font-display">For</th>
                  <th scope="col" className="py-2 pr-3 text-right font-display">Amount</th>
                  <th scope="col" className="py-2 pr-3 font-display">Status</th>
                  <th scope="col" className="py-2 font-display">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const a = byId.get(c.affiliate_id);
                  const lead = c.submission_id ? leadById.get(c.submission_id) : undefined;
                  return (
                    <tr key={c.id} className="border-b border-rule align-top">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select commission ${c.id}`}
                          checked={picked.includes(c.id)}
                          onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))}
                          className="h-5 w-5 accent-ink"
                        />
                      </td>
                      <td className="py-2 pr-3">{a?.name ?? "Removed"}</td>
                      <td className="py-2 pr-3">
                        {c.submission_id ? (
                          <Link href={`/admin/s/${c.submission_id}`} className="underline underline-offset-4">
                            {lead ? displayName(lead) : "Open"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {c.kind === "hosting" ? "Hosting" : "Design"} · {pct(c.rate)} of {money(c.basis_cents)}
                        {c.note && <span className="block text-muted">{c.note}</span>}
                      </td>
                      <td className="py-2 pr-3 text-right font-bold tabular-nums">{money(c.amount_cents)}</td>
                      <td className="py-2 pr-3 capitalize">{c.status}</td>
                      <td className="whitespace-nowrap py-2">{day(c.paid_at ?? c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3">
            <p className="text-sm">
              {pickedRows.length ? `${pickedRows.length} selected · ${money(pickedRows.reduce((t, r) => t + r.amount_cents, 0))}` : "Select commissions to update them."}
            </p>
            <div className="max-w-sm">
              <label htmlFor="aff-pay-note" className={labelClass}>
                Note (optional)
              </label>
              <input id="aff-pay-note" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="e.g. Paid by PayPal, Nov 1" className={`${inputClass} mt-2`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!pickedRows.length} busy={busy === "approved"} onClick={() => apply("approved")}>
                Approve
              </Button>
              <Button tone="primary" disabled={!pickedRows.length} busy={busy === "paid"} onClick={() => apply("paid")}>
                Mark Paid
              </Button>
              <Button tone="danger" disabled={!pickedRows.length} busy={busy === "void"} onClick={() => apply("void")}>
                Void
              </Button>
            </div>
          </div>
        </>
      )}
      <Notice {...note} />
    </Panel>
  );
}

// ---------------------------------------------------------------- shared

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

/** On a person's page: who gets credit for them, and a way to change it by hand. */
export function AffiliateCredit({ submissionId }: { submissionId: string }) {
  const [state, setState] = useState<{ current: string | null; clickedAt: string | null; options: Pick<Affiliate, "id" | "name" | "code" | "status">[] } | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>({});

  const load = useCallback(() => {
    const db = supabase();
    return Promise.all([
      db.from("ryzon_landing_submissions").select("affiliate_id,affiliate_clicked_at").eq("id", submissionId).maybeSingle(),
      db.from("ryzon_landing_affiliates").select("id,name,code,status").in("status", ["active", "paused"]).order("name"),
    ]).then(([sub, affs]) => {
      // Before migration 13 the columns don't exist: show nothing.
      if (sub.error || affs.error || !sub.data) return setState(null);
      const row = sub.data as { affiliate_id: string | null; affiliate_clicked_at: string | null };
      setState({ current: row.affiliate_id, clickedAt: row.affiliate_clicked_at, options: (affs.data ?? []) as Pick<Affiliate, "id" | "name" | "code" | "status">[] });
      setPick(row.affiliate_id ?? "");
    });
  }, [submissionId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!state) return null;
  const current = state.options.find((o) => o.id === state.current);
  if (!state.current && state.options.length === 0) return null;

  const save = async () => {
    setBusy(true);
    setNote({});
    try {
      await adminRpc("ryzon_landing_admin_set_submission_affiliate", { p_submission: submissionId, p_affiliate: pick || null });
      setNote({ message: pick ? "Credited. Future payments earn them a commission." : "Affiliate credit removed." });
      load();
    } catch (err) {
      setNote({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Affiliate">
      <p className="text-sm">
        {state.current
          ? `Credited to ${current?.name ?? "an affiliate"}${current?.code ? ` (/a/${current.code})` : ""}${state.clickedAt ? `, from a click ${when(state.clickedAt)}` : ", set by hand"}.`
          : "No affiliate. Leads only get one when they came through an affiliate link, or when you set it here."}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="aff-credit" className={labelClass}>
            Credit this person to
          </label>
          <select id="aff-credit" value={pick} onChange={(e) => setPick(e.target.value)} className={`${inputClass} mt-2`}>
            <option value="">No affiliate</option>
            {state.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.code ? ` (${o.code})` : ""}
                {o.status === "paused" ? " · paused" : ""}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={save} busy={busy} disabled={pick === (state.current ?? "")}>
          Save
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">Commissions already recorded stay as they are. Void them under Affiliates if needed.</p>
      <Notice {...note} />
    </Panel>
  );
}
