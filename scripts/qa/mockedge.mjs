// Stand-in for the ryzon-landing edge function so the flow pages can be tested offline.
import http from "node:http";
const T = { review: "a".repeat(48), paid: "b".repeat(48), closed: "c".repeat(48), files: "d".repeat(48) };
const now = Date.now();
const base = { found: true, id: "s1", first_name: "Pat", name: "Pat West", email: "pat@example.com", phone: "2485550101", business_name: "West Plumbing", demo_url: "https://example.com/demo", demo_image_url: null, plan: null, offer: null, paid: false, files_url: null, timezone: "America/Los_Angeles" };
const seen = [];
const slots = [];
for (let d = 0; d < 14; d++) for (let h = 0; h < 6; h++) slots.push(new Date(Math.ceil(now / 1800000) * 1800000 + d * 86400000 + (5 + h) * 1800000).toISOString());

http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const b = JSON.parse(raw || "{}");
    seen.push(b.action);
    const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    if (req.headers["x-ryzon-token"] !== "test-token") return send(401, { error: "unauthorized" });
    if (b.action === "__seen") return send(200, { seen });
    if (b.action === "slots") return send(200, { slots });
    if (b.action === "lookup") {
      const offer = b.offer;
      if (b.token === T.review) {
        const active = offer == null ? null : offer === "standard" || offer === "host50-year";
        return send(200, { ...base, status: "demo_review", offer_active: active, offer_reason: active || offer == null ? null : "expired", offer_ends_at: offer === "host50-year" ? new Date(now + 3 * 86400000).toISOString() : null });
      }
      if (b.token === T.files) return send(200, { ...base, status: "demo_review", offer_active: true, offer_reason: null, offer_ends_at: new Date(now + 5 * 86400000).toISOString() });
      if (b.token === T.paid) return send(200, { ...base, status: "converted_full", paid: true, plan: "growth", offer: "standard", offer_active: offer ? false : null, offer_reason: offer ? "already_paid" : null });
      if (b.token === T.closed) return send(200, { ...base, status: "closed_no_response", offer_active: offer ? false : null, offer_reason: offer ? "not_available" : null });
      return send(200, { found: false });
    }
    if (b.action === "submit_changes" || b.action === "unsubscribe" || b.action === "submit") return send(200, { ok: true });
    if (b.action === "book_call") return b.data.call_time === slots[1] ? send(422, { error: "slot_unavailable" }) : send(200, { ok: true, call_id: 1 });
    send(400, { error: "unknown action" });
  });
}).listen(4000, () => console.log("mock edge on 4000"));
