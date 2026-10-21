/**
 * Review requests (/review?t=<token>). The token in the email is the only key; the
 * database functions behind these calls check it, so the public key is enough.
 */
import { PUBLIC_API, publicHeaders } from "@/lib/publicApi";

export const REVIEW_TOKEN = /^[a-f0-9]{48}$/;
export const PLATFORMS = { google: "Google", facebook: "Facebook", yelp: "Yelp" } as const;
export type Platform = keyof typeof PLATFORMS;

export type ReviewState = {
  first_name: string;
  status: "sent" | "rated" | "feedback" | "resolved";
  rating: number | null;
  wants_contact: boolean | null;
  links: Partial<Record<Platform, string>>;
};

export async function reviewRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`${PUBLIC_API}/rpc/${fn}`, {
    method: "POST",
    headers: { ...publicHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${fn} ${res.status}`);
  const text = await res.text();
  return text ? (JSON.parse(text) as T | null) : null;
}

export const lookupReview = (token: string) => reviewRpc<ReviewState>("ryzon_landing_review_lookup", { p_token: token });
