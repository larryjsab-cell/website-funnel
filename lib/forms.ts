/** Shared by the browser forms and the /api/lead route. */

export type FormType = "demo" | "contact";

export const HONEYPOT = "company_fax";

export const demoFields = ["name", "email", "businessName", "phone", "industry", "website", "notes"] as const;
export const contactFields = ["name", "email", "message"] as const;

export type DemoField = (typeof demoFields)[number];
export type ContactField = (typeof contactFields)[number];
export type FieldErrorKind = "required" | "email" | "phone" | "url" | "select";

export const limits: Record<string, number> = {
  name: 120,
  email: 254,
  businessName: 160,
  phone: 32,
  industry: 80,
  website: 300,
  notes: 3000,
  message: 3000,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URLISH = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function checkField(field: string, raw: string): FieldErrorKind | null {
  const value = raw.trim();
  const optional = field === "website" || field === "notes";
  if (!value) return optional ? null : field === "industry" ? "select" : "required";
  if (field === "email" && !EMAIL.test(value)) return "email";
  if (field === "phone") {
    const d = digits(value);
    if (d.length < 10 || d.length > 15) return "phone";
  }
  if (field === "website" && !URLISH.test(value)) return "url";
  return null;
}

export function checkAll(fields: readonly string[], data: Record<string, string>) {
  const errors: Record<string, FieldErrorKind> = {};
  for (const f of fields) {
    const e = checkField(f, data[f] ?? "");
    if (e) errors[f] = e;
  }
  return errors;
}

export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
}
