"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { Button, inputClass, labelClass, Notice, StatusBadge, Tag } from "@/components/admin/ui";
import {
  daysSince,
  day,
  displayName,
  OFFERS,
  PAID,
  PLANS,
  STATUSES,
  statusLabel,
  SUBMISSION_COLUMNS,
  toCsv,
  when,
  type ChangeRequest,
  type Status,
  type Submission,
} from "@/lib/admin/model";
import { adminRpc, supabase } from "@/lib/admin/supabase";

type FailedEmail = { id: number; submission_id: string; template_key: string; last_error: string | null; updated_at: string };

type Data = { subs: Submission[]; calls: ChangeRequest[]; failed: FailedEmail[]; loadedAt: number };

async function fetchDashboard(): Promise<{ data?: Data; error?: string }> {
  const db = supabase();
  const loadedAt = Date.now();
  const since = new Date(loadedAt - 2 * 3_600_000).toISOString();
  const [subs, calls, failed] = await Promise.all([
    db.from("ryzon_landing_submissions").select(SUBMISSION_COLUMNS).order("created_at", { ascending: false }).limit(2000),
    db.from("ryzon_landing_change_requests").select("*").eq("kind", "call").eq("call_status", "scheduled").gte("call_time", since).order("call_time"),
    db.from("ryzon_landing_email_queue").select("id,submission_id,template_key,last_error,updated_at").eq("state", "failed").order("updated_at", { ascending: false }).limit(50),
  ]);
  const err = subs.error || calls.error || failed.error;
  if (err) return { error: err.message };
  return {
    data: {
      subs: (subs.data ?? []) as unknown as Submission[],
      calls: (calls.data ?? []) as ChangeRequest[],
      failed: (failed.data ?? []) as FailedEmail[],
      loadedAt,
    },
  };
}

function useDashboardData() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  const apply = useCallback((r: { data?: Data; error?: string }) => {
    setError(r.error ?? "");
    if (r.data) setData(r.data);
  }, []);
  const reload = useCallback(() => fetchDashboard().then(apply), [apply]);

  useEffect(() => {
    let alive = true;
    const tick = () => fetchDashboard().then((r) => alive && apply(r));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [apply]);

  return { data, error, reload };
}

export function Dashboard() {
  const params = useSearchParams();
  const view = params.get("view") ?? "today";
  const { data, error, reload } = useDashboardData();

  if (error) return <Notice error={`Couldn't load the pipeline: ${error}`} />;
  if (!data) return <p className="text-muted">Loading the pipeline…</p>;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-heavy display-tight">{view === "board" ? "Pipeline board" : view === "table" ? "All submissions" : "Today"}</h1>
        <Button onClick={reload}>Refresh</Button>
      </div>
      {view === "board" ? <Board subs={data.subs} reload={reload} /> : view === "table" ? <TableView subs={data.subs} /> : <TodayView {...data} />}
    </>
  );
}

// ---------------------------------------------------------------- Today

function TodayView({ subs, calls, failed, loadedAt }: Data) {
  const byId = useMemo(() => new Map(subs.map((s) => [s.id, s])), [subs]);
  const oldestFirst = (a: Submission, b: Submission) => a.last_status_at.localeCompare(b.last_status_at);
  const pick = (statuses: Status[]) => subs.filter((s) => statuses.includes(s.status)).sort(oldestFirst);
  const twoWeeks = loadedAt - 14 * 86_400_000;

  const groups: { title: string; hint: string; rows: Submission[] }[] = [
    { title: "New requests waiting for a demo", hint: "Add the demo link to start the review emails.", rows: pick(["demo_in_progress"]) },
    { title: "Paid, no change form yet", hint: "Reminders go out on day 1 and day 3. A call works too.", rows: pick(PAID) },
    { title: "Changes to build", hint: "Move to In build, then Ready to launch.", rows: pick(["changes_received", "in_build"]) },
    { title: "Ready to launch", hint: "Waiting on the launch call. Mark Live with the live URL.", rows: pick(["ready_to_launch"]) },
    { title: "Design files to send", hint: "Upload their ZIP from the detail page.", rows: pick(["design_files"]) },
    {
      title: "New questions",
      hint: "Contact form messages from the last 14 days. Reply by email.",
      rows: subs.filter((s) => s.status === "contact" && new Date(s.created_at).getTime() > twoWeeks),
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TodayGroup title="Calls coming up" hint="Send a Google Meet invite for Meet calls. Times are Detroit time." count={calls.length}>
        {calls.map((c) => {
          const s = byId.get(c.submission_id);
          return (
            <li key={c.id} className="border-t border-rule py-3 first:border-t-0">
              <Link href={`/admin/s/${c.submission_id}`} className="font-bold underline underline-offset-4">
                {s ? displayName(s) : "Unknown"}
              </Link>
              <p className="text-sm">
                {when(c.call_time)} · {c.call_method === "meet" ? "Google Meet" : `Phone ${c.call_phone ?? ""}`} · {c.call_purpose}
              </p>
            </li>
          );
        })}
      </TodayGroup>

      {groups.map((g) => (
        <TodayGroup key={g.title} title={g.title} hint={g.hint} count={g.rows.length}>
          {g.rows.map((s) => (
            <SubmissionLine key={s.id} s={s} />
          ))}
        </TodayGroup>
      ))}

      {failed.length > 0 && (
        <TodayGroup title="Emails that failed" hint="Gmail refused these 3 times. Open the customer and press Resend." count={failed.length}>
          {failed.map((f) => {
            const s = byId.get(f.submission_id);
            return (
              <li key={f.id} className="border-t border-rule py-3 first:border-t-0">
                <Link href={`/admin/s/${f.submission_id}`} className="font-bold underline underline-offset-4">
                  {s ? displayName(s) : "Unknown"}
                </Link>
                <p className="text-sm">
                  {f.template_key} · {f.last_error}
                </p>
              </li>
            );
          })}
        </TodayGroup>
      )}
    </div>
  );
}

function TodayGroup({ title, hint, count, children }: { title: string; hint: string; count: number; children: ReactNode }) {
  return (
    <section className="rounded-card border-2 border-ink bg-surface p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-heavy display-tight">
        {title} <span className="rounded-ui bg-ink px-2 text-on-ink">{count}</span>
      </h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      {count === 0 ? <p className="mt-3 text-sm">Nothing here.</p> : <ul className="mt-3">{children}</ul>}
    </section>
  );
}

function SubmissionLine({ s }: { s: Submission }) {
  const days = daysSince(s.last_status_at);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule py-3 first:border-t-0">
      <span>
        <Link href={`/admin/s/${s.id}`} className="font-bold underline underline-offset-4">
          {displayName(s)}
        </Link>{" "}
        <span className="text-sm text-muted">{s.email}</span>
      </span>
      <span className="text-sm">
        {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"}`}
        {s.automations_paused && " · paused"}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------- Board

function Board({ subs, reload }: { subs: Submission[]; reload: () => Promise<void> }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [note, setNote] = useState<{ message?: string; error?: string }>({});

  const move = async (s: Submission, to: Status) => {
    if (s.status === to) return;
    if (to === "demo_review" && !s.demo_url) {
      return setNote({ error: `Add the demo link on ${displayName(s)}'s page to start Demo review.` });
    }
    try {
      await adminRpc("ryzon_landing_admin_set_status", { p_id: s.id, p_status: to, p_note: "Moved on the board" });
      setNote({ message: `${displayName(s)} moved to ${statusLabel(to)}.` });
      await reload();
    } catch (err) {
      setNote({ error: (err as Error).message });
    }
  };

  const drop = (e: DragEvent, to: Status) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    const s = subs.find((x) => x.id === id);
    if (s) move(s, to);
  };

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Drag a card to another column to change its status. On a phone, use the &ldquo;Move to&rdquo; list on the card. Each card also opens its page.
      </p>
      <Notice {...note} />
      <div className="mt-3 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {STATUSES.map((col) => {
          const cards = subs.filter((s) => s.status === col.id);
          return (
            <section
              key={col.id}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.id);
              }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => drop(e, col.id)}
              className={`flex min-w-0 flex-col rounded-card border-2 bg-surface ${over === col.id ? "border-accent" : "border-ink"}`}
            >
              <h2 className="flex items-center justify-between gap-2 border-b-2 border-ink px-3 py-2 font-display text-sm font-heavy display-ui">
                <span>{col.label}</span> <span>{cards.length}</span>
              </h2>
              {cards.length === 0 && <p className="p-3 text-sm text-muted">Empty. Drop a card here.</p>}
              <ul className={`flex flex-col gap-2 ${cards.length ? "p-2" : ""}`}>
                {cards.map((s) => (
                  <li
                    key={s.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", s.id);
                      setDragId(s.id);
                    }}
                    className="cursor-grab rounded-ui border-2 border-ink bg-canvas p-2 active:cursor-grabbing"
                  >
                    <Link href={`/admin/s/${s.id}`} className="font-bold underline-offset-4 hover:underline">
                      {displayName(s)}
                    </Link>
                    <p className="text-sm text-muted">
                      {daysSince(s.last_status_at)}d in stage
                      {s.plan ? ` · ${PLANS[s.plan] ?? s.plan}` : ""}
                      {s.offer && s.offer !== "standard" ? ` · ${OFFERS[s.offer] ?? s.offer}` : ""}
                    </p>
                    {(s.automations_paused || s.unsubscribed_at) && (
                      <p className="mt-1 flex gap-1">
                        {s.automations_paused && <Tag>Paused</Tag>}
                        {s.unsubscribed_at && <Tag>Unsubscribed</Tag>}
                      </p>
                    )}
                    <div className="mt-2 md:hidden">
                      <label htmlFor={`move-${s.id}`} className="sr-only">
                        Move {displayName(s)} to
                      </label>
                      <select
                        id={`move-${s.id}`}
                        value=""
                        onChange={(e) => e.target.value && move(s, e.target.value as Status)}
                        className="block min-h-11 w-full rounded-ui border-2 border-ink bg-surface px-2 text-base"
                      >
                        <option value="">Move to…</option>
                        {STATUSES.filter((x) => x.id !== s.status).map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Table

function TableView({ subs }: { subs: Submission[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [offer, setOffer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return subs.filter((s) => {
      const t = new Date(s.created_at).getTime();
      if (t < start || t > end) return false;
      if (status && s.status !== status) return false;
      if (plan && s.plan !== plan) return false;
      if (offer && s.offer !== offer) return false;
      if (!needle) return true;
      return [s.name, s.email, s.business_name, s.phone, s.industry].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [subs, q, status, plan, offer, from, to]);

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ryzon-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="grid gap-3 rounded-card border-2 border-ink bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label htmlFor="f-q" className={labelClass}>
            Search
          </label>
          <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, business, phone" className={`${inputClass} mt-1`} />
        </div>
        <FilterSelect id="f-status" label="Status" value={status} onChange={setStatus} options={STATUSES.map((s) => [s.id, s.label])} />
        <FilterSelect id="f-plan" label="Plan" value={plan} onChange={setPlan} options={Object.entries(PLANS)} />
        <FilterSelect id="f-offer" label="Offer" value={offer} onChange={setOffer} options={Object.entries(OFFERS)} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="f-from" className={labelClass}>
              From
            </label>
            <input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputClass} mt-1 px-1`} />
          </div>
          <div>
            <label htmlFor="f-to" className={labelClass}>
              To
            </label>
            <input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputClass} mt-1 px-1`} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          {rows.length} of {subs.length} submissions
        </p>
        <Button onClick={download} disabled={rows.length === 0}>
          Download CSV
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-card border-2 border-ink bg-surface">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink font-display">
              {["Received", "Business", "Contact", "Status", "Plan", "Offer", "Paid", "Source"].map((h) => (
                <th key={h} scope="col" className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-rule align-top">
                <td className="whitespace-nowrap px-3 py-2">{day(s.created_at)}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/s/${s.id}`} className="font-bold underline underline-offset-4">
                    {displayName(s)}
                  </Link>
                  {s.automations_paused && <span className="ml-2"><Tag>Paused</Tag></span>}
                </td>
                <td className="px-3 py-2">
                  {s.name}
                  <br />
                  <span className="text-muted">{s.email}</span>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-3 py-2">{s.plan ? `${PLANS[s.plan] ?? s.plan}${s.billing_interval ? ` / ${s.billing_interval}` : ""}` : ""}</td>
                <td className="px-3 py-2">{s.offer ? OFFERS[s.offer] ?? s.offer : ""}</td>
                <td className="whitespace-nowrap px-3 py-2">{day(s.paid_at)}</td>
                <td className="px-3 py-2">{s.utm_source || host(s.referrer) || "direct"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function host(url: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1`}>
        <option value="">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
