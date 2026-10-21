import { NextResponse } from "next/server";
import { originOf } from "@/lib/server/origin";
import { REVIEW_TOKEN, reviewRpc } from "@/lib/review";

/** The review page's forms: a star rating, then (for 1-3 stars) feedback and the contact question. */
export async function POST(request: Request) {
  const origin = originOf(request);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.redirect(`${origin}/review?error=1`, 303);
  }
  const token = String(form.get("t") ?? "");
  if (!REVIEW_TOKEN.test(token)) return NextResponse.redirect(`${origin}/review?error=1`, 303);
  const back = `${origin}/review?t=${token}`;

  try {
    if (form.get("action") === "rate") {
      const rating = Number(form.get("rating"));
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.redirect(`${back}&missing=rating`, 303);
      await reviewRpc("ryzon_landing_review_rate", { p_token: token, p_rating: rating });
    } else if (form.get("action") === "feedback") {
      const contact = form.get("contact");
      if (contact !== "yes" && contact !== "no") return NextResponse.redirect(`${back}&missing=contact`, 303);
      const feedback = String(form.get("feedback") ?? "").slice(0, 5000);
      await reviewRpc("ryzon_landing_review_feedback", { p_token: token, p_feedback: feedback, p_contact: contact === "yes" });
    }
  } catch {
    return NextResponse.redirect(`${back}&error=1`, 303);
  }
  return NextResponse.redirect(back, 303);
}
