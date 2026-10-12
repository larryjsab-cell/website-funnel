import { attribution } from "@/lib/attribution";
import forms from "@/content/forms.json";
import { fill, HONEYPOT, type FieldErrorKind, type FormType } from "@/lib/forms";
import { site } from "@/lib/site";

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string; fields?: Record<string, FieldErrorKind> };

const contactValues = { phone: site.business.phone, email: site.business.email };

/** POST to /api/lead and translate every failure into copy the user can act on. */
export async function submitLead(
  formType: FormType,
  data: Record<string, string>,
  honeypot: string,
): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch(site.site.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...attribution(),
        ...data,
        form_type: formType,
        page: `${window.location.pathname}#${formType === "demo" ? "demo" : "contact"}`,
        [HONEYPOT]: honeypot,
      }),
    });
  } catch {
    return { ok: false, message: fill(forms.errors.network, contactValues) };
  }
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, FieldErrorKind> };
  if (body.error === "validation") return { ok: false, message: forms.errors.summary, fields: body.fields };
  if (body.error === "not_configured") return { ok: false, message: fill(forms.errors.notConfigured, contactValues) };
  return { ok: false, message: fill(forms.errors.server, contactValues) };
}

export function errorText(kind: FieldErrorKind, label: string) {
  return fill(forms.errors[kind], { field: label.toLowerCase() });
}
