import { NextResponse } from "next/server";
import { edge } from "@/lib/server/edge";
import { originOf } from "@/lib/server/origin";

/** Stops offer emails (4 to 8). Emails about anything they buy still send. */
export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("t") ?? "");
  const origin = originOf(request);
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.redirect(`${origin}/unsubscribe?error=1`, 303);
  try {
    await edge("unsubscribe", { token });
    return NextResponse.redirect(`${origin}/unsubscribe?t=${token}&done=1`, 303);
  } catch {
    return NextResponse.redirect(`${origin}/unsubscribe?t=${token}&error=1`, 303);
  }
}
