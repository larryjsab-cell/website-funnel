import { NextResponse } from "next/server";
import { edge, EdgeError } from "@/lib/server/edge";

/** Change form from /changes. Saving it cancels the change reminders and alerts the owner. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { t?: unknown; details?: unknown; company_fax?: unknown };
  if (typeof body.company_fax === "string" && body.company_fax) return NextResponse.json({ ok: true });
  const token = typeof body.t === "string" ? body.t : "";
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 5000) : "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (details.length < 3) return NextResponse.json({ error: "details" }, { status: 422 });
  try {
    await edge("submit_changes", { token, details });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof EdgeError ? e.status : 502;
    return NextResponse.json({ error: status === 422 ? "not_allowed" : "upstream" }, { status: status === 422 ? 422 : 502 });
  }
}
