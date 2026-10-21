/**
 * Supabase REST access with the public key, for server-rendered pages. Row level
 * security and security-definer functions decide what the public key can see.
 * BLOG_API_URL points the site at a local stand-in for tests.
 */
export const PUBLIC_API = (process.env.BLOG_API_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://woejhqidgykrcdyktuio.supabase.co"}/rest/v1`).replace(/\/$/, "");
export const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_8t4cZS-70QgdKp9DRTiVIQ_bE6rKQtU";
export const publicHeaders = { apikey: PUBLIC_KEY, Authorization: `Bearer ${PUBLIC_KEY}`, Accept: "application/json" };
