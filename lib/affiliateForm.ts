/** The affiliate application form. Shared by the browser form and /api/affiliate. */
import { digits } from "@/lib/forms";

export const AFFILIATE_FIELDS = ["name", "email", "phone", "business", "website", "audience", "promote", "notes", "agree"] as const;
export type AffiliateField = (typeof AFFILIATE_FIELDS)[number];
export type AffiliateError = "required" | "email" | "phone" | "url" | "agree";

export const AFFILIATE_LIMITS: Record<AffiliateField, number> = {
  name: 120,
  email: 254,
  phone: 32,
  business: 160,
  website: 300,
  audience: 2000,
  promote: 120,
  notes: 2000,
  agree: 10,
};

export const PROMOTE_OPTIONS = [
  "Word of mouth / my clients",
  "Email newsletter",
  "Social media",
  "Blog or website",
  "YouTube or podcast",
  "Community, group or association",
  "Something else",
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URLISH = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$|^@[\w.]{2,}$/i;

export function checkAffiliateField(field: AffiliateField, raw: string): AffiliateError | null {
  const v = raw.trim();
  if (v.length > AFFILIATE_LIMITS[field]) return "required";
  switch (field) {
    case "name":
    case "audience":
      return v ? null : "required";
    case "email":
      return !v ? "required" : EMAIL.test(v) ? null : "email";
    case "phone": {
      if (!v) return null;
      const d = digits(v).length;
      return d >= 10 && d <= 15 ? null : "phone";
    }
    case "website":
      return !v || URLISH.test(v) ? null : "url";
    case "agree":
      return v === "yes" || v === "on" ? null : "agree";
    default:
      return null;
  }
}

export function checkAffiliate(data: Record<AffiliateField, string>) {
  const errors: Partial<Record<AffiliateField, AffiliateError>> = {};
  for (const f of AFFILIATE_FIELDS) {
    const e = checkAffiliateField(f, data[f] ?? "");
    if (e) errors[f] = e;
  }
  return errors;
}
