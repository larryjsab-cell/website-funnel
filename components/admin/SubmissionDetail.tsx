"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AffiliateCredit } from "@/components/admin/Affiliates";
import { Button, inputClass, labelClass, Notice, Panel, StatusBadge, Tag } from "@/components/admin/ui";
import {
  daysSince,
  displayName,
  isReferral,
  OFFERS,
  PLANS,
  STATUSES,
  statusLabel,
  SUBMISSION_COLUMNS,
  when,
  type ChangeRequest,
  type HistoryRow,
  type Payment,
  type QueueRow,
  type Submission,
  type Template,
} from "@/lib/admin/model";
import { adminRpc, FILES_BUCKET, supabase } from "@/lib/admin/supabase";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";

type Detail = {
  s: Submission;
  queue: QueueRow[];
  history: HistoryRow[];
  changes: ChangeRequest[];
  payments: Payment[];
  templates: Map<string, Template>;
  referredBy: { name: string; business_name: string | null } | null;
};
type Note = { message?: string; error?: string };

const FILE_LINK_DAYS = 7;

async function fetchDetail(id: string): Promise<{ detail?: Detail; error?: string }> {
  const db = supabase();
  const [s, queue, history, changes, payments, templates] = await Promise.all([
    db.from("ryzon_landing_submissions").select(SUBMISSION_COLUMNS).eq("id", id).maybeSingle(),
    db.from("ryzon_landing_email_queue").select("*").eq("submission_id", id).order("send_at"),
    db.from("ryzon_landing_status_history").select("*").eq("submission_id", id).order("created_at", { ascending: false }),
    db.from("ryzon_landing_change_requests").select("*").eq("submission_id", id).order("created_at", { ascending: false }),
    db.from("ryzon_landing_payments").select("*").eq("submission_id", id).order("created_at", { ascending: false }),
    db.from("ryzon_landing_email_templates").select("key,recipient,is_promotional,subject,description"),
  ]);
  const err = s.error || queue.error || history.error || changes.error || payments.error || templates.error;
  if (err) return { error: err.message };
  if (!s.data) return { error: "This submission doesn’t exist." };
  const sub = s.data as unknown as Submission;
  const ref = isReferral(sub)
    ? await db.from("ryzon_landing_referrers").select("name,business_name").eq("code", sub.utm_campaign!).maybeSingle()
    : null;
  return {
    detail: {
      s: sub,
      referredBy: (ref?.data as Detail["referredBy"]) ?? null,
      queue: (queue.data ?? []) as QueueRow[],
      history: (history.data ?? []) as HistoryRow[],
      changes: (changes.data ?? []) as ChangeRequest[],
      payments: (payments.data ?? []) as Payment[],
      templates: new Map(((templates.data ?? []) as Template[]).map((t) => [t.key, t])),
    },
  };
}

function useDetail(id: string) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  const apply = useCallback((r: { detail?: Detail; error?: string }) => {
    setError(r.error ?? "");
    if (r.detail) setDetail(r.detail);
  }, []);
  const reload = useCallback(() => fetchDetail(id).then(apply), [id, apply]);

  useEffect(() => {
    let alive = true;
    fetchDetail(id).then((r) => alive && apply(r));
    return () => {
      alive = false;
    };
  }, [id, apply]);

  return { detail, error, reload };
}

/** Run an admin action, show its result, then reload the page data. */
function useAction(reload: () => Promise<void>) {
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Note & { at?: string }>({});
  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      setNote({ message: success, at: key });
      await reload();
    } catch (e) {
      setNote({ error: (e as Error).message, at: key });
    } finally {
      setBusy("");
    }
  };
  const noteFor = (key: string) => (note.at === key ? note : {});
  return { busy, run, noteFor };
}

export function SubmissionDetail({ id }: { id: string }) {
  const { detail, error, reload } = useDetail(id);
  const action = useAction(reload);

  if (error) return <Notice error={error} />;
  if (!detail) return <p className="text-muted">Loading…</p>;
  const { s } = detail;
  const canUploadDemo = s.form_type === "demo" && ["demo_in_progress", "demo_review", "closed_no_response"].includes(s.status);
  const isFiles = s.offer === "files99" || s.status === "design_files" || s.status === "files_delivered";

  return (
    <div>
      <p>
        <Link href="/admin" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
          ← Back to the pipeline
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words font-display text-2xl font-heavy display-tight sm:text-3xl">{displayName(s)}</h1>
        <StatusBadge status={s.status} />
        {s.automations_paused && <Tag>Automations paused</Tag>}
        {s.unsubscribed_at && <Tag>Unsubscribed from offers</Tag>}
      </div>
      <p className="mt-2 text-sm text-muted">
        {daysSince(s.last_status_at)} days in this stage · received {when(s.created_at)} · their timezone {s.timezone}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          {canUploadDemo && <DemoPanel key={s.demo_uploaded_at ?? "new"} s={s} action={action} />}
          {isFiles && <FilesPanel s={s} action={action} />}
          <EmailsPanel detail={detail} action={action} />
          <ChangesPanel changes={detail.changes} action={action} />
          <AnswersPanel s={s} referredBy={detail.referredBy} />
        </div>
        <div className="space-y-6">
          <StatusPanel key={`${s.status}-${s.live_url ?? ""}`} s={s} action={action} />
          <NotesPanel s={s} action={action} />
          <PaymentsPanel payments={detail.payments} />
          <AffiliateCredit submissionId={s.id} />
          <HistoryPanel history={detail.history} />
          <DeletePanel s={s} />
        </div>
      </div>
    </div>
  );
}

type PersonSummary = {
  email: string;
  submission_ids: string[];
  submissions: number;
  history: number;
  change_requests: number;
  payments: number;
  reviews: number;
  referrer: boolean;
  emails: number;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Removes the person's uploaded design files, one folder per submission. */
async function deleteFiles(ids: string[]) {
  const store = supabase().storage.from(FILES_BUCKET);
  for (const id of ids) {
    const { data, error } = await store.list(id, { limit: 1000 });
    if (error) throw new Error(`Couldn’t list their files: ${error.message}`);
    const paths = (data ?? []).map((f) => `${id}/${f.name}`);
    if (paths.length) {
      const { error: rmError } = await store.remove(paths);
      if (rmError) throw new Error(`Couldn’t delete their files: ${rmError.message}`);
    }
  }
}

/** Permanently deletes everyone with this email and everything stored about them. */
function DeletePanel({ s }: { s: Submission }) {
  const router = useRouter();
  const [summary, setSummary] = useState<PersonSummary | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"" | "check" | "delete">("");
  const [error, setError] = useState("");

  const check = async () => {
    setBusy("check");
    setError("");
    try {
      setSummary(await adminRpc<PersonSummary>("ryzon_landing_admin_person_summary", { p_id: s.id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    if (!summary) return;
    setBusy("delete");
    setError("");
    try {
      await deleteFiles(summary.submission_ids);
      await adminRpc("ryzon_landing_admin_delete_person", { p_id: s.id, p_confirm: confirm });
      router.replace(`/admin?view=table&deleted=${encodeURIComponent(summary.email)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  };

  // The table's Delete links open this page at #delete; the panel only exists once the data loads.
  useEffect(() => {
    if (window.location.hash === "#delete") document.getElementById("delete")?.scrollIntoView({ block: "center" });
  }, []);

  const matches = !!summary && confirm.trim().toLowerCase() === summary.email;

  return (
    <section id="delete" aria-labelledby="delete-heading" className="scroll-mt-24 rounded-card border-2 border-danger bg-surface p-4 sm:p-5">
      <h2 id="delete-heading" className="font-display text-lg font-heavy text-danger display-tight">
        Delete this person
      </h2>
      <p className="mt-2 text-sm">
        Permanently removes everything stored about <strong className="break-words">{s.email}</strong>. This can&rsquo;t be undone.
      </p>
      {!summary ? (
        <Button tone="danger" className="mt-4" busy={busy === "check"} onClick={check}>
          Delete Person…
        </Button>
      ) : (
        <form onSubmit={remove} className="mt-4 grid gap-4">
          <div>
            <p className="font-display text-sm font-bold">This deletes:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>{plural(summary.submissions, "submission")} with this email{summary.submissions > 1 ? " (all of them, not only this one)" : ""}</li>
              <li>{plural(summary.history, "status history entry", "status history entries")}</li>
              <li>{plural(summary.emails, "scheduled or sent email record")}</li>
              {summary.change_requests > 0 && <li>{plural(summary.change_requests, "change request or call", "change requests and calls")}</li>}
              {summary.payments > 0 && <li>{plural(summary.payments, "payment record")} (Stripe keeps its own copy)</li>}
              {summary.reviews > 0 && <li>{plural(summary.reviews, "review request")}</li>}
              {summary.referrer && <li>Their referrer record and referral link</li>}
              <li>Any design files you uploaded for them</li>
            </ul>
          </div>
          <div>
            <label htmlFor="delete-confirm" className={labelClass}>
              Type their email to confirm
            </label>
            <input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={summary.email}
              className={`${inputClass} mt-2`}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" tone="danger" busy={busy === "delete"} disabled={!matches}>
              Delete Everything
            </Button>
            <Button
              onClick={() => {
                setSummary(null);
                setConfirm("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      <Notice error={error} />
    </section>
  );
}

type Action = ReturnType<typeof useAction>;

function DemoPanel({ s, action }: { s: Submission; action: Action }) {
  const [url, setUrl] = useState(s.demo_url ?? "");
  const [image, setImage] = useState(s.demo_image_url ?? "");
  const again = Boolean(s.demo_uploaded_at);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (again && !window.confirm("This restarts the demo emails from today (demo email now, then days 1, 3, 5, 10 and 15). Continue?")) return;
    action.run("demo", () => adminRpc("ryzon_landing_admin_upload_demo", { p_id: s.id, p_demo_url: url.trim(), p_demo_image_url: image.trim() || null }), "Demo saved. The demo email is on its way and the follow-ups are scheduled.");
  };

  return (
    <Panel title={again ? "Demo (sent)" : "Add the demo link"}>
      <p className="mb-4 text-sm text-muted">
        {again
          ? `Uploaded ${when(s.demo_uploaded_at)}. Saving a new link restarts the review emails.`
          : "Saving the link moves them to Demo review, emails the demo right away and schedules the reminders and offers at 10 AM their time."}
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="demo-url" className={labelClass}>
            Demo URL
          </label>
          <input id="demo-url" name="demo_url" type="url" required autoComplete="off" spellCheck={false} autoCapitalize="off" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} className={`${inputClass} mt-2`} />
        </div>
        <div>
          <label htmlFor="demo-image" className={labelClass}>
            Screenshot URL <span className="font-normal text-muted">(optional, shown in the emails)</span>
          </label>
          <input id="demo-image" name="demo_image_url" type="url" autoComplete="off" spellCheck={false} autoCapitalize="off" placeholder="https://…" value={image} onChange={(e) => setImage(e.target.value)} className={`${inputClass} mt-2`} />
        </div>
        <Button type="submit" tone="primary" busy={action.busy === "demo"}>
          {again ? "Save New Demo Link" : "Save Demo and Start Emails"}
        </Button>
        <Notice {...action.noteFor("demo")} />
      </form>
    </Panel>
  );
}

function FilesPanel({ s, action }: { s: Submission; action: Action }) {
  const [file, setFile] = useState<File | null>(null);
  const linkLive = s.files_url_expires_at && new Date(s.files_url_expires_at) > new Date();

  const sign = async (path: string) => {
    const db = supabase();
    const { data, error } = await db.storage.from(FILES_BUCKET).createSignedUrl(path, FILE_LINK_DAYS * 86_400, { download: true });
    if (error || !data) throw new Error(error?.message ?? "Couldn’t create the download link");
    const expires = new Date(Date.now() + FILE_LINK_DAYS * 86_400_000).toISOString();
    await adminRpc("ryzon_landing_admin_set_files", { p_id: s.id, p_path: path, p_url: data.signedUrl, p_expires: expires });
  };

  const upload = (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    action.run(
      "files",
      async () => {
        const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-80) || "design-files.zip";
        const path = `${s.id}/${Date.now()}-${safe}`;
        const { error } = await supabase().storage.from(FILES_BUCKET).upload(path, file, { contentType: file.type || "application/zip", upsert: false });
        if (error) throw new Error(error.message);
        await sign(path);
      },
      "Uploaded. Their download email is on its way.",
    );
  };

  return (
    <Panel title="Design files ($99)">
      {s.files_path ? (
        <p className="mb-4 text-sm">
          Sent <strong>{s.files_path.split("/").pop()}</strong>. Link {linkLive ? `works until ${when(s.files_url_expires_at)}` : "has expired"}.
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted">Upload their ZIP. They get an email with a download link that works for {FILE_LINK_DAYS} days.</p>
      )}
      <form onSubmit={upload} className="space-y-4">
        <div>
          <label htmlFor="files-zip" className={labelClass}>
            ZIP file
          </label>
          <input id="files-zip" name="files" type="file" accept=".zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-base" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" tone="primary" disabled={!file} busy={action.busy === "files"}>
            Upload and Email the Link
          </Button>
          {s.files_path && (
            <Button busy={action.busy === "relink"} onClick={() => action.run("relink", () => sign(s.files_path!), "A fresh link is on its way.")}>
              Email a Fresh Link
            </Button>
          )}
        </div>
        <Notice {...action.noteFor("files")} />
        <Notice {...action.noteFor("relink")} />
      </form>
    </Panel>
  );
}

function StatusPanel({ s, action }: { s: Submission; action: Action }) {
  const [status, setStatus] = useState<string>(s.status);
  const [note, setNote] = useState("");
  const [live, setLive] = useState(s.live_url ?? "");

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (status === "live" && !s.live_url && !live.trim()) return window.alert("Add the live URL first so the launch email links to it.");
    action.run(
      "status",
      async () => {
        if (status === "live" && live.trim() && live.trim() !== s.live_url) await adminRpc("ryzon_landing_admin_set_live_url", { p_id: s.id, p_url: live.trim() });
        await adminRpc("ryzon_landing_admin_set_status", { p_id: s.id, p_status: status, p_note: note.trim() || null });
      },
      `Status set to ${statusLabel(status)}.`,
    );
    setNote("");
  };

  return (
    <Panel title="Status">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="status" className={labelClass}>
            Move to
          </label>
          <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-2`}>
            {STATUSES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-muted">
            {status === "ready_to_launch"
              ? "Sends the “let’s talk before we go live” email with a booking link."
              : status === "live"
                ? "Sends the “you’re live” email with the live URL."
                : "Queued emails that don’t fit the new status are cancelled."}
          </p>
        </div>
        {(status === "live" || s.live_url) && (
          <div>
            <label htmlFor="live-url" className={labelClass}>
              Live URL
            </label>
            <input id="live-url" name="live_url" type="url" autoComplete="off" spellCheck={false} autoCapitalize="off" placeholder="https://…" value={live} onChange={(e) => setLive(e.target.value)} className={`${inputClass} mt-2`} />
          </div>
        )}
        <div>
          <label htmlFor="status-note" className={labelClass}>
            Note for the history <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="status-note" name="note" autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-2`} />
        </div>
        <Button type="submit" tone="primary" busy={action.busy === "status"} disabled={status === s.status && !note.trim()}>
          Save Status
        </Button>
        <Notice {...action.noteFor("status")} />
      </form>

      <div className="mt-6 border-t-2 border-ink pt-4">
        <p className="text-sm">
          {s.automations_paused ? "Automations are paused: no emails go to this customer until you resume." : "Automations are running."}
        </p>
        <Button
          className="mt-3"
          busy={action.busy === "pause"}
          onClick={() =>
            action.run(
              "pause",
              () => adminRpc("ryzon_landing_admin_set_paused", { p_id: s.id, p_paused: !s.automations_paused }),
              s.automations_paused ? "Resumed. Anything overdue sends now." : "Paused.",
            )
          }
        >
          {s.automations_paused ? "Resume Automations" : "Pause Automations"}
        </Button>
        <Notice {...action.noteFor("pause")} />
      </div>
    </Panel>
  );
}

function NotesPanel({ s, action }: { s: Submission; action: Action }) {
  const [notes, setNotes] = useState(s.admin_notes ?? "");
  useUnsavedWarning(notes !== (s.admin_notes ?? ""));
  return (
    <Panel title="Private notes">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run("notes", () => adminRpc("ryzon_landing_admin_set_notes", { p_id: s.id, p_notes: notes }), "Notes saved.");
        }}
      >
        <label htmlFor="notes" className="sr-only">
          Private notes
        </label>
        <textarea id="notes" name="notes" rows={5} autoComplete="off" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} py-2`} />
        <p className="mt-2 text-sm text-muted">Never emailed or shown to the customer.</p>
        <Button type="submit" className="mt-3" busy={action.busy === "notes"}>
          Save Notes
        </Button>
        <Notice {...action.noteFor("notes")} />
      </form>
    </Panel>
  );
}

function EmailsPanel({ detail, action }: { detail: Detail; action: Action }) {
  const { queue, templates } = detail;
  const label = (k: string) => templates.get(k)?.description?.replace(/\.$/, "") || k;
  const stateText = (q: QueueRow) =>
    q.state === "pending"
      ? `Scheduled ${when(q.send_at)}`
      : q.state === "sent"
        ? `Sent ${when(q.sent_at)}`
        : q.state === "cancelled"
          ? `Cancelled${q.cancel_reason ? `: ${q.cancel_reason}` : ""}`
          : q.state === "failed"
            ? `Failed after ${q.attempts} tries: ${q.last_error ?? ""}`
            : "Sending now";

  return (
    <Panel title="Emails">
      {queue.length === 0 ? (
        <p className="text-sm">No emails yet.</p>
      ) : (
        <ul>
          {queue.map((q) => (
            <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-rule py-3 first:border-t-0">
              {/* Wraps the buttons under the text on narrow phones instead of squeezing the text. */}
              <div className="min-w-0 flex-[1_1_12rem]">
                <p className="font-bold">
                  {templates.get(q.template_key)?.recipient === "admin" ? "To you: " : ""}
                  {label(q.template_key)}
                </p>
                <p className={`text-sm ${q.state === "failed" ? "text-danger" : "text-muted"}`}>{stateText(q)}</p>
                {q.attempts > 0 && q.state === "pending" && q.last_error && <p className="text-sm text-danger">Last try failed: {q.last_error}</p>}
              </div>
              <div className="flex gap-2">
                {q.state === "pending" && (
                  <>
                    <Button aria-label={`Send now: ${label(q.template_key)}`} busy={action.busy === `now-${q.id}`} onClick={() => action.run(`now-${q.id}`, () => adminRpc("ryzon_landing_admin_send_now", { p_queue_id: q.id }), "Sending now.")}>
                      Send Now
                    </Button>
                    <Button
                      tone="danger"
                      aria-label={`Cancel: ${label(q.template_key)}`}
                      busy={action.busy === `cancel-${q.id}`}
                      onClick={() => {
                        if (window.confirm(`Cancel “${label(q.template_key)}”? It won’t send unless you press Resend later.`))
                          action.run(`cancel-${q.id}`, () => adminRpc("ryzon_landing_admin_cancel_email", { p_queue_id: q.id }), "Cancelled.");
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {(q.state === "sent" || q.state === "failed" || q.state === "cancelled") && (
                  <Button aria-label={`Resend: ${label(q.template_key)}`} busy={action.busy === `resend-${q.id}`} onClick={() => action.run(`resend-${q.id}`, () => adminRpc("ryzon_landing_admin_resend", { p_queue_id: q.id }), "Queued to send again now.")}>
                    Resend
                  </Button>
                )}
              </div>
              <div className="w-full">
                <Notice {...action.noteFor(`now-${q.id}`)} />
                <Notice {...action.noteFor(`cancel-${q.id}`)} />
                <Notice {...action.noteFor(`resend-${q.id}`)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ChangesPanel({ changes, action }: { changes: ChangeRequest[]; action: Action }) {
  if (changes.length === 0) return null;
  return (
    <Panel title="Change requests and calls">
      <ul>
        {changes.map((c) => (
          <li key={c.id} className="border-t border-rule py-3 first:border-t-0">
            {c.kind === "form" ? (
              <>
                <p className="font-bold">Change form · {when(c.created_at)}</p>
                <p className="mt-1 whitespace-pre-wrap">{c.details}</p>
              </>
            ) : (
              <>
                <p className="font-bold">
                  {c.call_method === "meet" ? "Google Meet" : "Phone call"} · {when(c.call_time)} · {c.call_purpose}
                </p>
                <p className="text-sm text-muted">
                  {c.call_phone ? `Phone ${c.call_phone} · ` : ""}
                  {c.call_status}
                </p>
                {c.details && <p className="mt-1 whitespace-pre-wrap">{c.details}</p>}
                {c.call_status === "scheduled" && (
                  <div className="mt-2 flex gap-2">
                    <Button busy={action.busy === `done-${c.id}`} onClick={() => action.run(`done-${c.id}`, () => adminRpc("ryzon_landing_admin_set_call_status", { p_call_id: c.id, p_status: "done" }), "Marked done.")}>
                      Mark Done
                    </Button>
                    <Button
                      tone="danger"
                      busy={action.busy === `cancelcall-${c.id}`}
                      onClick={() => {
                        if (window.confirm("Cancel this call? Its reminder emails are cancelled too. The customer isn’t emailed, so let them know."))
                          action.run(`cancelcall-${c.id}`, () => adminRpc("ryzon_landing_admin_set_call_status", { p_call_id: c.id, p_status: "cancelled" }), "Call cancelled.");
                      }}
                    >
                      Cancel Call
                    </Button>
                  </div>
                )}
                <Notice {...action.noteFor(`done-${c.id}`)} />
                <Notice {...action.noteFor(`cancelcall-${c.id}`)} />
              </>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AnswersPanel({ s, referredBy }: { s: Submission; referredBy: Detail["referredBy"] }) {
  const rows: [string, ReactNode][] = [
    [
      "Referred by",
      isReferral(s) ? (
        <Link key="r" href="/admin/referrers" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
          {referredBy ? `${referredBy.name}${referredBy.business_name ? ` (${referredBy.business_name})` : ""}` : s.utm_campaign} · $50 credit if they pay
        </Link>
      ) : (
        ""
      ),
    ],
    ["Name", s.name],
    ["Email", <a key="e" href={`mailto:${s.email}`} className="inline-flex min-h-11 items-center break-all underline underline-offset-4">{s.email}</a>],
    ["Phone", s.phone ? <a key="p" href={`tel:${s.phone}`} className="inline-flex min-h-11 items-center break-all underline underline-offset-4">{s.phone}</a> : ""],
    ["Business", s.business_name],
    ["Industry", s.industry],
    ["Style they like", s.style],
    ["Current website", s.current_site],
    [s.form_type === "contact" ? "Message" : "Notes", s.form_type === "contact" ? s.message : s.goals],
    ["Demo", s.demo_url ? <a key="d" href={s.demo_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center break-all underline underline-offset-4">{s.demo_url}</a> : ""],
    ["Live site", s.live_url ? <a key="l" href={s.live_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center break-all underline underline-offset-4">{s.live_url}</a> : ""],
    ["Page", s.source_page],
    ["Referrer", s.referrer],
    ["UTM", [s.utm_source, s.utm_medium, s.utm_campaign, s.utm_term, s.utm_content].filter(Boolean).join(" / ")],
  ];
  return (
    <Panel title={s.form_type === "contact" ? "Their question" : "Form answers"}>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-y-2">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-bold">{k}</dt>
              <dd className="whitespace-pre-wrap break-words">{v}</dd>
            </div>
          ))}
      </dl>
    </Panel>
  );
}

function PaymentsPanel({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return null;
  const money = (p: Payment) =>
    p.amount_total == null ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: (p.currency || "usd").toUpperCase() }).format(p.amount_total / 100);
  return (
    <Panel title="Payments">
      <ul>
        {payments.map((p) => (
          <li key={p.id} className="border-t border-rule py-2 first:border-t-0">
            <p className="font-bold">
              {PLANS[p.product] ?? p.product}
              {p.billing_interval && p.billing_interval !== "once" ? ` / ${p.billing_interval}` : ""} · {money(p)}
            </p>
            <p className="text-sm text-muted">
              {OFFERS[p.offer_code] ?? p.offer_code} · {when(p.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function HistoryPanel({ history }: { history: HistoryRow[] }) {
  return (
    <Panel title="History">
      <ol>
        {history.map((h) => (
          <li key={h.id} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-sm font-bold">
              {h.from_status && h.from_status !== h.to_status ? `${statusLabel(h.from_status)} → ${statusLabel(h.to_status)}` : statusLabel(h.to_status)}
            </p>
            <p className="text-sm text-muted">
              {when(h.created_at)} · {h.changed_by}
              {h.note ? ` · ${h.note}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
