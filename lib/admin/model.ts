/** Shapes and labels for the ryzon_landing_* tables the dashboard reads. */

export type Status =
  | "contact"
  | "demo_in_progress"
  | "demo_review"
  | "converted_full"
  | "converted_50_month"
  | "converted_50_year"
  | "design_files"
  | "files_delivered"
  | "closed_no_response"
  | "changes_received"
  | "call_scheduled"
  | "in_build"
  | "ready_to_launch"
  | "live";

export type Submission = {
  id: string;
  public_token: string;
  form_type: "demo" | "contact";
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  industry: string | null;
  current_site: string | null;
  goals: string | null;
  style: string | null;
  message: string | null;
  form_answers: Record<string, unknown>;
  timezone: string;
  status: Status;
  demo_url: string | null;
  demo_image_url: string | null;
  demo_uploaded_at: string | null;
  plan: string | null;
  billing_interval: string | null;
  offer: string | null;
  paid_at: string | null;
  files_path: string | null;
  files_url: string | null;
  files_url_expires_at: string | null;
  live_url: string | null;
  source_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  automations_paused: boolean;
  unsubscribed_at: string | null;
  admin_notes: string | null;
  last_status_at: string;
  created_at: string;
  updated_at: string;
};

export type QueueRow = {
  id: number;
  submission_id: string | null;
  referrer_id: string | null;
  template_key: string;
  send_at: string;
  state: "pending" | "sending" | "sent" | "cancelled" | "failed";
  requires_status: string[] | null;
  change_request_id: number | null;
  vars: Record<string, unknown>;
  attempts: number;
  last_error: string | null;
  cancel_reason: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
};

export type HistoryRow = {
  id: number;
  submission_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  note: string | null;
  created_at: string;
};

export type ChangeRequest = {
  id: number;
  submission_id: string;
  kind: "form" | "call";
  details: string | null;
  call_time: string | null;
  call_method: "meet" | "phone" | null;
  call_purpose: "changes" | "launch" | "question" | null;
  call_phone: string | null;
  call_status: "scheduled" | "done" | "cancelled" | null;
  created_at: string;
};

export type Payment = {
  id: number;
  submission_id: string;
  stripe_session_id: string;
  product: string;
  billing_interval: string | null;
  offer_code: string;
  amount_total: number | null;
  currency: string | null;
  created_at: string;
};

export type Template = { key: string; recipient: "customer" | "admin" | "referrer"; is_promotional: boolean; subject: string; description: string | null };

export type Referrer = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Leads from a referral link carry utm_source=referral and utm_campaign=<code>. */
export const isReferral = (s: Pick<Submission, "utm_source" | "utm_campaign">) => s.utm_source === "referral" && !!s.utm_campaign;

export const STATUSES: { id: Status; label: string; short: string }[] = [
  { id: "demo_in_progress", label: "Demo in progress", short: "Making demo" },
  { id: "demo_review", label: "Demo review", short: "Reviewing demo" },
  { id: "converted_full", label: "Converted (full price)", short: "Paid: full" },
  { id: "converted_50_month", label: "Converted (50% first month)", short: "Paid: 50% month" },
  { id: "converted_50_year", label: "Converted (50% first year)", short: "Paid: 50% year" },
  { id: "call_scheduled", label: "Call scheduled", short: "Call booked" },
  { id: "changes_received", label: "Changes received", short: "Changes in" },
  { id: "in_build", label: "In build", short: "Building" },
  { id: "ready_to_launch", label: "Ready to launch", short: "Ready" },
  { id: "live", label: "Live", short: "Live" },
  { id: "design_files", label: "Bought design files ($99)", short: "Files: paid" },
  { id: "files_delivered", label: "Design files delivered", short: "Files: sent" },
  { id: "closed_no_response", label: "Closed (no response)", short: "Closed" },
  { id: "contact", label: "Question (contact form)", short: "Question" },
];

export const statusLabel = (s: string) => STATUSES.find((x) => x.id === s)?.label ?? s;

export const PAID: Status[] = ["converted_full", "converted_50_month", "converted_50_year"];

export const OFFERS: Record<string, string> = {
  standard: "Standard",
  "host50-month": "50% off first month",
  "host50-year": "50% off first year",
  files99: "$99 design files",
};

export const PLANS: Record<string, string> = { starter: "Starter", growth: "Growth", complete: "Complete", files99: "Design files" };

export const SUBMISSION_COLUMNS =
  "id,public_token,form_type,name,email,phone,business_name,industry,current_site,goals,style,message,form_answers,timezone,status,demo_url,demo_image_url,demo_uploaded_at,plan,billing_interval,offer,paid_at,files_path,files_url,files_url_expires_at,live_url,source_page,referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,automations_paused,unsubscribed_at,admin_notes,last_status_at,created_at,updated_at";

export function daysSince(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Detroit" });
const fmtDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Detroit" });

/** Times show in Detroit time, where the owner works. */
export const when = (iso: string | null) => (iso ? fmt.format(new Date(iso)) : "");
export const day = (iso: string | null) => (iso ? fmtDay.format(new Date(iso)) : "");

export const displayName = (s: Pick<Submission, "business_name" | "name">) => s.business_name || s.name;

export function toCsv(rows: Submission[]) {
  const cols: (keyof Submission)[] = [
    "created_at", "status", "business_name", "name", "email", "phone", "industry", "style", "current_site", "goals", "message",
    "demo_url", "plan", "billing_interval", "offer", "paid_at", "live_url", "timezone", "source_page", "referrer",
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "automations_paused", "unsubscribed_at", "admin_notes",
  ];
  const cell = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    // Leading = + - @ would run as a formula in Excel or Sheets.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}
