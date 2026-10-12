import { NextResponse } from "next/server";
import { originOf } from "@/lib/server/origin";
import { setup } from "@/lib/server/stripe";

/**
 * One-time setup, safe to repeat: registers the Stripe webhook for this site and
 * creates the plan prices and offer coupons. Needs the x-ryzon-token header.
 */
export async function POST(request: Request) {
  const token = process.env.RYZON_EDGE_TOKEN;
  if (!token || request.headers.get("x-ryzon-token") !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await setup(originOf(request)));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
