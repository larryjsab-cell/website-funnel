/**
 * Referral links: /r/<code>. The page looks up who sent the visitor (first name and
 * business only) through a public database function; turned-off or unknown codes get
 * null. Leads from the link are tagged utm_source=referral, utm_medium=referrer,
 * utm_campaign=<code> (see lib/attribution.ts).
 */
import { PUBLIC_API, publicHeaders } from "@/lib/publicApi";

export const REFERRAL_REVALIDATE = 300;
export const REFERRAL_CODE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type PublicReferrer = { code: string; first_name: string; business_name: string };

/** The referrer, null when the code is unknown or turned off, undefined when the lookup failed. */
export async function getReferrer(code: string): Promise<PublicReferrer | null | undefined> {
  const c = code.toLowerCase();
  if (c.length < 3 || c.length > 40 || !REFERRAL_CODE.test(c)) return null;
  try {
    const res = await fetch(`${PUBLIC_API}/rpc/ryzon_landing_referrer_public`, {
      method: "POST",
      headers: { ...publicHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code: c }),
      next: { revalidate: REFERRAL_REVALIDATE, tags: ["referrers"] },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = (await res.json()) as PublicReferrer | null;
    return data?.code ? data : null;
  } catch (e) {
    console.warn(`[referral] lookup failed (${(e as Error).message})`);
    return undefined;
  }
}
