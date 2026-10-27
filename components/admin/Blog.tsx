"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, inputClass, labelClass, Notice } from "@/components/admin/ui";
import { when } from "@/lib/admin/model";
import { adminRpc, supabase } from "@/lib/admin/supabase";

type Post = {
  id: string;
  slug: string;
  title: string;
  category: string;
  is_published: boolean;
  published_at: string | null;
  promo_status: "sent" | "failed" | "skipped" | null;
  promo_sent_at: string | null;
  updated_at: string;
};
type Note = { message?: string; error?: string };
type State = "draft" | "scheduled" | "live";

const stateOf = (p: Post, now: number): State =>
  !p.is_published ? "draft" : p.published_at && new Date(p.published_at).getTime() > now ? "scheduled" : "live";

const LABEL: Record<State, string> = { draft: "Draft", scheduled: "Scheduled", live: "Live" };
const TONE: Record<State, string> = { draft: "bg-canvas text-muted", scheduled: "bg-accent text-on-accent", live: "bg-ink text-on-ink" };

/** datetime-local wants "YYYY-MM-DDTHH:mm" in the browser's own time zone. */
const toLocalInput = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Blog posts: publish now, schedule for later, or keep as a draft. Going live sends the post to the social promo workflow. */
export function Blog() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(
    async () =>
      void (await supabase()
        .from("ryzon_landing_blog")
        .select("id,slug,title,category,is_published,published_at,promo_status,promo_sent_at,updated_at")
        .order("published_at", { ascending: false, nullsFirst: true })
        .then(({ data, error: e }) => {
          setError(e?.message ?? "");
          if (data) setPosts(data as Post[]);
          setNow(Date.now());
        })),
    [],
  );
  useEffect(() => {
    reload();
    const id = window.setInterval(reload, 60_000);
    return () => window.clearInterval(id);
  }, [reload]);

  if (error && !posts) return <Notice error={`Couldn’t load posts: ${error}`} />;
  if (!posts) return <p className="text-muted">Loading posts…</p>;

  const counts = posts.reduce((c, p) => ({ ...c, [stateOf(p, now)]: (c[stateOf(p, now)] ?? 0) + 1 }), {} as Record<State, number>);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-heavy display-tight">Blog</h1>
          <p className="mt-1 max-w-measure text-sm text-muted">
            {counts.live ?? 0} live · {counts.scheduled ?? 0} scheduled · {counts.draft ?? 0} drafts. A scheduled post goes live at its time (the blog list
            updates within about 30 minutes), and each post is sent once to your social promo workflow when it goes live.
          </p>
        </div>
        <Button onClick={reload}>Refresh</Button>
      </div>
      <ul className="grid gap-4">
        {posts.map((p) => (
          <PostRow key={`${p.id}-${p.published_at}-${p.is_published}`} p={p} state={stateOf(p, now)} reload={reload} />
        ))}
      </ul>
    </>
  );
}

function PostRow({ p, state, reload }: { p: Post; state: State; reload: () => Promise<void> }) {
  const [at, setAt] = useState(() => toLocalInput(state === "scheduled" ? p.published_at : null));
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Note>({});
  const inputId = `when-${p.id}`;

  const run = async (key: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(key);
    setNote({});
    try {
      await fn();
      setNote({ message });
      await reload();
    } catch (e) {
      setNote({ error: (e as Error).message });
    } finally {
      setBusy("");
    }
  };
  const schedule = (action: string, extra: Record<string, unknown> = {}) =>
    adminRpc("ryzon_landing_admin_blog_schedule", { p_id: p.id, p_action: action, ...extra });

  const promo =
    p.promo_status === "sent"
      ? `Sent to social promo ${when(p.promo_sent_at)}`
      : p.promo_status === "failed"
        ? "Social promo failed"
        : p.promo_status === "skipped"
          ? "Live before social promo was set up"
          : state === "live"
            ? "Social promo: waiting to send"
            : "Social promo sends when it goes live";

  return (
    <li className="rounded-card border-2 border-ink bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-display text-lg font-bold display-tight">{p.title}</p>
          <p className="mt-1 text-sm text-muted">
            {state === "live" && `Live since ${when(p.published_at)}`}
            {state === "scheduled" && `Goes live ${when(p.published_at)} (Detroit time)`}
            {state === "draft" && "Not published"} · {promo}
          </p>
        </div>
        <span className={`inline-block rounded-ui px-2 py-0.5 font-display text-sm font-bold ${TONE[state]}`}>{LABEL[state]}</span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        {state !== "live" && (
          <>
            <div>
              <label htmlFor={inputId} className={labelClass}>
                Go live at (your time)
              </label>
              <input id={inputId} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={`${inputClass} mt-1`} />
            </div>
            <Button
              tone="primary"
              busy={busy === "schedule"}
              onClick={() =>
                run("schedule", () => schedule("schedule", { p_at: new Date(at).toISOString() }), `Scheduled for ${new Date(at).toLocaleString()}.`)
              }
            >
              {state === "scheduled" ? "Reschedule" : "Schedule"}
            </Button>
            <Button busy={busy === "now"} onClick={() => run("now", () => schedule("publish_now"), "Published. It’s live now.")}>
              Publish Now
            </Button>
          </>
        )}
        {state !== "draft" && (
          <Button busy={busy === "draft"} onClick={() => run("draft", () => schedule("draft"), "Moved to drafts. It’s hidden from the blog.")}>
            Move to Draft
          </Button>
        )}
        {state === "live" && p.promo_status !== null && (
          <Button
            busy={busy === "promo"}
            onClick={() => run("promo", () => adminRpc("ryzon_landing_admin_blog_resend_promo", { p_id: p.id }), "Sent to your social promo workflow.")}
          >
            {p.promo_status === "skipped" ? "Make Social Content" : "Send to Social Again"}
          </Button>
        )}
        {state === "live" && (
          <a href={`/blog/${p.slug}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
            View post
          </a>
        )}
      </div>
      <Notice message={note.message} error={note.error} />
    </li>
  );
}
