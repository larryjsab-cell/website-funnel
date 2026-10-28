// Ryzon Landing back office. Called by the website's server routes and by n8n with the
// x-ryzon-token header. The token lives in public.ryzon_landing_config (service-role only),
// so JWT verification is off. Every decision lives in the ryzon_landing_* SQL functions;
// this function only checks the token and forwards.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let cachedToken: string | null = null;
async function expectedToken() {
  if (cachedToken) return cachedToken;
  const { data, error } = await db.from("ryzon_landing_config").select("value").eq("key", "edge_token").single();
  if (error || !data) throw new Error("edge_token missing from ryzon_landing_config");
  cachedToken = data.value as string;
  return cachedToken;
}

function sameToken(a: string | null, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const str = (v: unknown, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) {
    // RAISE EXCEPTION in the SQL functions means bad input, not a server fault.
    const status = error.code === "P0001" ? 422 : 500;
    throw Object.assign(new Error(error.message), { status });
  }
  return data;
}

// Creates (or finds) the dashboard login and grants it admin. Password is optional on reruns.
async function bootstrapAdmin(email: string, password: string | null) {
  let userId: string | null = null;
  let created = false;
  const { data, error } = await db.auth.admin.createUser({ email, password: password ?? undefined, email_confirm: true });
  if (!error && data.user) {
    userId = data.user.id;
    created = true;
  } else {
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list, error: listErr } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) throw listErr;
      userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
      if (list.users.length < 200) break;
    }
    if (!userId) throw error ?? new Error("could not create or find user");
    if (password) {
      const { error: updErr } = await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
      if (updErr) throw updErr;
    }
  }
  const { error: adminErr } = await db.from("ryzon_landing_admins").upsert({ user_id: userId, email }, { onConflict: "user_id" });
  if (adminErr) throw adminErr;
  return { user_id: userId, created };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    if (!sameToken(req.headers.get("x-ryzon-token"), await expectedToken())) return json({ error: "unauthorized" }, 401);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  try {
    switch (body.action) {
      // Website (server routes)
      case "submit":
        return json(await rpc("ryzon_landing_submit", { p: body.data ?? {} }));
      case "lookup":
        return json(await rpc("ryzon_landing_lookup", { p_token: str(body.token, 100), p_offer: str(body.offer, 30) }));
      case "slots":
        return json({ slots: await rpc("ryzon_landing_slots", { p_days: Number(body.days) || 14 }) });
      case "book_call":
        return json(await rpc("ryzon_landing_book_call", { p: body.data ?? {} }));
      case "submit_changes":
        return json(await rpc("ryzon_landing_submit_changes", { p_token: str(body.token, 100), p_details: str(body.details, 5000) }));
      case "unsubscribe":
        return json(await rpc("ryzon_landing_unsubscribe", { p_token: str(body.token, 100) }));
      case "record_payment":
        return json(await rpc("ryzon_landing_record_payment", { p: body.data ?? {} }));
      case "record_invoice":
        // Subscription renewals (Stripe invoice.paid), for recurring affiliate commissions.
        return json(await rpc("ryzon_landing_record_invoice", { p: body.data ?? {} }));

      // n8n email sender
      case "claim_due":
        return json({ emails: await rpc("ryzon_landing_claim_due", { p_limit: Math.min(Number(body.limit) || 25, 50) }) });
      case "mark_sent":
        await rpc("ryzon_landing_mark_sent", { p_queue_id: Number(body.queue_id), p_message_id: str(body.message_id, 200) });
        return json({ ok: true });
      case "mark_failed":
        await rpc("ryzon_landing_mark_failed", { p_queue_id: Number(body.queue_id), p_error: str(body.error, 1000) ?? "unknown error" });
        return json({ ok: true });
      case "close_stale":
        return json({ closed: await rpc("ryzon_landing_close_stale", {}) });

      // One-time setup
      case "bootstrap_admin": {
        const email = str(body.email, 254);
        if (!email) return json({ error: "email required" }, 422);
        return json(await bootstrapAdmin(email, str(body.password, 200)));
      }

      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    if (status >= 500) console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, status);
  }
});
