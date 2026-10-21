"use client";

import { useEffect } from "react";
import { setReferral } from "@/lib/attribution";

/** Tags this visit (and the next 30 days) with the referral code. Renders nothing. */
export function ReferralTag({ code }: { code: string }) {
  useEffect(() => setReferral(code), [code]);
  return null;
}
