import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client for the /admin dashboard. The URL and publishable key are public
 * by design; row level security only lets accounts in ryzon_landing_admins read,
 * and every write goes through an admin-checked SQL function.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://woejhqidgykrcdyktuio.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_8t4cZS-70QgdKp9DRTiVIQ_bE6rKQtU";

export const FILES_BUCKET = "ryzon-landing-files";

let client: SupabaseClient | null = null;

export function supabase() {
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "rz-admin-auth" },
    });
  }
  return client;
}

/** Call an admin SQL function and throw its message on failure. */
export async function adminRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
