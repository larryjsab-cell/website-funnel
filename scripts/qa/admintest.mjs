const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const errs = [];
const calls = [];
const log = (k, v) => console.log(k.padEnd(44), v);

const now = Date.now();
const iso = (d) => new Date(now + d * 86_400_000).toISOString();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", email: "larryjsab@gmail.com", role: "authenticated", aud: "authenticated", exp: Math.floor(now / 1000) + 3600 })}.sig`;
const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "larryjsab@gmail.com", app_metadata: {}, user_metadata: {}, created_at: iso(-1) };

const base = {
  public_token: "t", form_answers: {}, timezone: "America/Detroit", demo_image_url: null, billing_interval: null, files_path: null, files_url: null,
  files_url_expires_at: null, live_url: null, source_page: "/#demo", referrer: "https://www.google.com/", utm_source: null, utm_medium: null, utm_campaign: null,
  utm_term: null, utm_content: null, automations_paused: false, unsubscribed_at: null, admin_notes: null, phone: "2485550101", industry: "Plumbing",
  current_site: null, goals: "More calls", style: "Minimal", message: null, plan: null, offer: null, paid_at: null, demo_url: null, demo_uploaded_at: null, updated_at: iso(0),
};
const subs = [
  { ...base, id: "s1", form_type: "demo", name: "Pat West", email: "pat@example.com", business_name: "West Plumbing", status: "demo_in_progress", last_status_at: iso(-2), created_at: iso(-2) },
  { ...base, id: "s2", form_type: "demo", name: "Bea Two", email: "bea@example.com", business_name: "Two Salon", status: "demo_review", demo_url: "https://demo.example.com/two", demo_uploaded_at: iso(-3), last_status_at: iso(-3), created_at: iso(-5), utm_source: "google" },
  { ...base, id: "s3", form_type: "demo", name: "Cy Three", email: "cy@example.com", business_name: "Three Roofing", status: "converted_full", plan: "growth", billing_interval: "month", offer: "standard", paid_at: iso(-1), last_status_at: iso(-1), created_at: iso(-9), automations_paused: true },
  { ...base, id: "s4", form_type: "contact", name: "Q Asker", email: "q@example.com", business_name: null, status: "contact", message: "How long does it take?", last_status_at: iso(-1), created_at: iso(-1) },
];
const queue = [
  { id: 1, submission_id: "s2", template_key: "demo_ready", send_at: iso(-3), state: "sent", requires_status: ["demo_review"], change_request_id: null, vars: {}, attempts: 1, last_error: null, cancel_reason: null, sent_at: iso(-3), opened_at: null, clicked_at: null, created_at: iso(-3) },
  { id: 2, submission_id: "s2", template_key: "offer_1", send_at: iso(2), state: "pending", requires_status: ["demo_review"], change_request_id: null, vars: {}, attempts: 0, last_error: null, cancel_reason: null, sent_at: null, opened_at: null, clicked_at: null, created_at: iso(-3) },
  { id: 3, submission_id: "s2", template_key: "reminder_1", send_at: iso(-2), state: "cancelled", requires_status: ["demo_review"], change_request_id: null, vars: {}, attempts: 0, last_error: null, cancel_reason: "cancelled by admin", sent_at: null, opened_at: null, clicked_at: null, created_at: iso(-3) },
];
const templates = [
  { key: "demo_ready", recipient: "customer", is_promotional: false, subject: "x", description: "Email 3. Sent the moment a demo URL is added in the dashboard." },
  { key: "offer_1", recipient: "customer", is_promotional: true, subject: "x", description: "Email 6. Day 5, 10 AM local." },
  { key: "reminder_1", recipient: "customer", is_promotional: true, subject: "x", description: "Email 4. Day 1, 10 AM local." },
];
const history = [{ id: 1, submission_id: "s2", from_status: "demo_in_progress", to_status: "demo_review", changed_by: "admin", note: "Demo uploaded", created_at: iso(-3) }];
const callRows = [{ id: 9, submission_id: "s3", kind: "call", details: null, call_time: iso(0.2), call_method: "meet", call_purpose: "changes", call_phone: "2485550101", call_status: "scheduled", created_at: iso(-1) }];

const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push(e.message));
await p.route("https://woejhqidgykrcdyktuio.supabase.co/**", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  calls.push(`${req.method()} ${url.pathname}`);
  const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  if (url.pathname === "/auth/v1/token") return json({ access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, refresh_token: "r", user });
  if (url.pathname === "/auth/v1/user") return json(user);
  if (url.pathname.startsWith("/rest/v1/rpc/ryzon_landing_is_admin")) return json(true);
  if (url.pathname.startsWith("/rest/v1/rpc/")) return json(null);
  const table = url.pathname.replace("/rest/v1/", "");
  const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
  const id = url.searchParams.get("id")?.replace("eq.", "");
  const sid = url.searchParams.get("submission_id")?.replace("eq.", "");
  const rows = {
    ryzon_landing_submissions: id ? subs.filter((s) => s.id === id) : subs,
    ryzon_landing_email_queue: url.searchParams.get("state") === "eq.failed" ? [] : queue.filter((q) => !sid || q.submission_id === sid),
    ryzon_landing_status_history: history.filter((h) => !sid || h.submission_id === sid),
    ryzon_landing_change_requests: sid ? callRows.filter((c) => c.submission_id === sid) : callRows,
    ryzon_landing_payments: [],
    ryzon_landing_email_templates: templates,
  }[table] ?? [];
  return json(single ? rows[0] ?? null : rows);
});

await p.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
log("login form visible", await p.locator("#admin-email").isVisible());
await p.screenshot({ path: `${out}/admin-login.png` });
await p.fill("#admin-email", "larryjsab@gmail.com");
await p.fill("#admin-password", "secret-password");
await p.getByRole("button", { name: "Sign in" }).click();
await p.getByRole("heading", { name: "Today" }).waitFor();
log("today groups", await p.locator("main section h2").count());
log("call listed", await p.getByText("Google Meet").first().isVisible());
await p.screenshot({ path: `${out}/admin-today.png`, fullPage: true });

await p.getByRole("link", { name: "Board" }).click();
await p.getByRole("heading", { name: "Pipeline board" }).waitFor();
log("board columns", await p.locator("main section[aria-label]").count());
await p.screenshot({ path: `${out}/admin-board.png` });
// Drag West Plumbing into Demo review: no demo link yet, so it should refuse.
await p.locator("li[draggable]", { hasText: "West Plumbing" }).dragTo(p.locator("section[aria-label='Demo review']"));
log("drag guard message", await p.getByRole("alert").first().textContent());

await p.getByRole("link", { name: "Table" }).click();
await p.getByRole("heading", { name: "All submissions" }).waitFor();
log("table rows", await p.locator("tbody tr").count());
await p.fill("#f-q", "salon");
log("search 'salon' rows", await p.locator("tbody tr").count());
await p.fill("#f-q", "");
await p.selectOption("#f-status", "converted_full");
log("status filter rows", await p.locator("tbody tr").count());
await p.selectOption("#f-status", "");
const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Download CSV" }).click()]);
const csv = await (await dl.createReadStream()).toArray();
log("csv lines", Buffer.concat(csv).toString().split("\r\n").length);
await p.screenshot({ path: `${out}/admin-table.png` });

await p.goto("http://localhost:3000/admin/s/s2", { waitUntil: "networkidle" });
await p.getByRole("heading", { name: "Two Salon" }).waitFor();
log("detail panels", await p.locator("main section h2").count());
log("pending email has Send now", await p.getByRole("button", { name: "Send now" }).count());
await p.screenshot({ path: `${out}/admin-detail.png`, fullPage: true });
await p.getByRole("button", { name: "Send now" }).click();
await p.getByText("Sending now.").waitFor();
log("send-now rpc called", calls.some((c) => c.includes("ryzon_landing_admin_send_now")));

await p.setViewportSize({ width: 375, height: 812 });
await p.reload({ waitUntil: "networkidle" });
await p.getByRole("heading", { name: "Two Salon" }).waitFor();
log("mobile: no horizontal scroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await p.screenshot({ path: `${out}/admin-detail-mobile.png`, fullPage: true });
log("console errors", errs.length ? errs.join(" | ") : "none");
await b.close();
