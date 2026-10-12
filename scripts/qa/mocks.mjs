
// ---- Supabase mock for /admin
const now = Date.now();
const iso = (d) => new Date(now + d * 86400000).toISOString();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256" })}.${b64({ sub: "u1", role: "authenticated", exp: Math.floor(now / 1000) + 3600 })}.x`;
const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "larryjsab@gmail.com", app_metadata: {}, user_metadata: {} };
const sub = { id: "s1", public_token: "t", form_type: "demo", name: "Pat West", email: "pat@example.com", phone: "2485550101", business_name: "West Plumbing", industry: "Plumbing", current_site: null, goals: "More calls", style: "Minimal", message: null, form_answers: {}, timezone: "America/Detroit", status: "demo_review", demo_url: "https://example.com", demo_image_url: null, demo_uploaded_at: iso(-2), plan: null, billing_interval: null, offer: null, paid_at: null, files_path: null, files_url: null, files_url_expires_at: null, live_url: null, source_page: "/", referrer: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null, automations_paused: false, unsubscribed_at: null, admin_notes: null, last_status_at: iso(-2), created_at: iso(-3), updated_at: iso(0) };
const queue = [{ id: 1, submission_id: "s1", template_key: "offer_1", send_at: iso(2), state: "pending", requires_status: null, change_request_id: null, vars: {}, attempts: 0, last_error: null, cancel_reason: null, sent_at: null, opened_at: null, clicked_at: null, created_at: iso(-2) }];
async function mockSupabase(p) {
  await p.route("https://woejhqidgykrcdyktuio.supabase.co/**", (route) => {
    const u = new URL(route.request().url());
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (u.pathname === "/auth/v1/token") return json({ access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, refresh_token: "r", user });
    if (u.pathname === "/auth/v1/user") return json(user);
    if (u.pathname.includes("is_admin")) return json(true);
    if (u.pathname.includes("/rpc/")) return json(null);
    const single = (route.request().headers()["accept"] || "").includes("vnd.pgrst.object");
    const t = u.pathname.split("/").pop();
    const rows = { ryzon_landing_submissions: [sub], ryzon_landing_email_queue: u.searchParams.get("state") ? [] : queue }[t] ?? [];
    return json(single ? rows[0] ?? null : rows);
  });
}

export { mockSupabase, sub };
