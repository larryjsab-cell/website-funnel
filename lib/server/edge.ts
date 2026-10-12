/**
 * Server-only client for the Supabase edge function `ryzon-landing`.
 * The token never reaches the browser: only route handlers import this file.
 */
const DEFAULT_URL = "https://woejhqidgykrcdyktuio.supabase.co/functions/v1/ryzon-landing";

export class EdgeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function edgeConfigured() {
  return Boolean(process.env.RYZON_EDGE_TOKEN);
}

export async function edge<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.RYZON_EDGE_TOKEN;
  if (!token) throw new EdgeError("not_configured", 503);
  let res: Response;
  try {
    res = await fetch(process.env.RYZON_EDGE_URL || DEFAULT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ryzon-token": token },
      body: JSON.stringify({ action, ...payload }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new EdgeError("upstream", 502);
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new EdgeError(body.error || "upstream", res.status === 422 ? 422 : 502);
  return body as T;
}
