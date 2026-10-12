import { NextResponse } from "next/server";
import { digits } from "@/lib/forms";
import { edge, EdgeError } from "@/lib/server/edge";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Books a slot on the owner's own calendar. Both sides get a confirmation and a 1-hour reminder. */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (text(b.company_fax, 100)) return NextResponse.json({ ok: true });

  const token = text(b.t, 100);
  const method = b.method === "phone" ? "phone" : b.method === "meet" ? "meet" : "";
  const purpose = ["changes", "launch", "question"].includes(String(b.purpose)) ? String(b.purpose) : "question";
  const time = text(b.time, 40);
  const phone = text(b.phone, 32);
  const fields: Record<string, string> = {};
  if (!method) fields.method = "select";
  if (!time || Number.isNaN(Date.parse(time))) fields.time = "select";
  if (method === "phone" && digits(phone).length < 10) fields.phone = "phone";
  if (!token) {
    if (!text(b.name, 120)) fields.name = "required";
    if (!EMAIL.test(text(b.email, 254))) fields.email = "email";
  } else if (!/^[a-f0-9]{48}$/.test(token)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (Object.keys(fields).length) return NextResponse.json({ error: "validation", fields }, { status: 422 });

  try {
    await edge("book_call", {
      data: {
        token: token || null,
        call_time: new Date(time).toISOString(),
        call_method: method,
        call_purpose: purpose,
        phone,
        notes: text(b.notes, 2000),
        name: text(b.name, 120),
        email: text(b.email, 254),
        business_name: text(b.business, 160),
        timezone: text(b.timezone, 64),
        source_page: "/book",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("slot_unavailable")) return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    const status = e instanceof EdgeError && e.status === 422 ? 422 : 502;
    return NextResponse.json({ error: status === 422 ? "invalid" : "upstream" }, { status });
  }
}
