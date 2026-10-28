"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Field } from "@/components/forms/Field";
import { Honeypot } from "@/components/forms/Honeypot";
import { track } from "@/lib/analytics";
import { AFFILIATE_FIELDS, checkAffiliate, checkAffiliateField, PROMOTE_OPTIONS, type AffiliateError, type AffiliateField } from "@/lib/affiliateForm";
import { HONEYPOT } from "@/lib/forms";
import { site } from "@/lib/site";
import { useHydrated } from "@/lib/useHydrated";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";

const empty = Object.fromEntries(AFFILIATE_FIELDS.map((f) => [f, ""])) as Record<AffiliateField, string>;

const LABELS: Record<AffiliateField, string> = {
  name: "Your name",
  email: "Email",
  phone: "Phone",
  business: "Business or brand",
  website: "Website or social profile",
  audience: "Who do you know or reach?",
  promote: "How will you share your link?",
  notes: "Anything else we should know?",
  agree: "I agree to the affiliate program terms",
};

const MESSAGES: Record<AffiliateError, (label: string) => string> = {
  required: (l) => `Enter ${l.toLowerCase().replace(/^your\s+/, "your ").replace(/\?$/, "")}.`,
  email: () => "Enter an email like name@business.com.",
  phone: () => "Enter a phone number with area code, or leave it blank.",
  url: () => "Enter a web address like yoursite.com, or an @handle.",
  agree: () => "Please agree to the program terms to apply.",
};

const errorText = (f: AffiliateField, kind: AffiliateError) =>
  f === "audience" && kind === "required" ? "Tell us a little about who you'd share it with." : MESSAGES[kind](LABELS[f]);

export function AffiliateForm({ initialError }: { initialError?: string }) {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<AffiliateField, AffiliateError>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState(initialError ?? "");
  const [trap, setTrap] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const js = useHydrated();
  useUnsavedWarning(!sent && Object.entries(values).some(([k, v]) => k !== "agree" && v.trim() !== ""));

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const f = e.target.name as AffiliateField;
    const value = e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? (e.target.checked ? "yes" : "") : e.target.value;
    setValues((v) => ({ ...v, [f]: value }));
    if (errors[f] && !checkAffiliateField(f, value)) setErrors((er) => ({ ...er, [f]: undefined }));
  }

  function onBlur(e: { target: { name: string; value: string } }) {
    const f = e.target.name as AffiliateField;
    if (!e.target.value.trim() || f === "agree") return;
    setErrors((er) => ({ ...er, [f]: checkAffiliateField(f, e.target.value) ?? undefined }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const found = checkAffiliate(values);
    setErrors(found);
    const first = AFFILIATE_FIELDS.find((f) => found[f]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSending(true);
    setFormError("");
    let ok = false;
    let body: { error?: string; fields?: Partial<Record<AffiliateField, AffiliateError>> } = {};
    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, [HONEYPOT]: trap }),
      });
      ok = res.ok;
      if (!ok) body = await res.json().catch(() => ({}));
    } catch {
      body = { error: "network" };
    }
    setSending(false);
    if (ok) {
      track({ name: "affiliate_apply" });
      setSent(true);
      return;
    }
    if (body.error === "validation" && body.fields) {
      setErrors(body.fields);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setFormError(
      body.error === "network"
        ? "We couldn't reach the server. Check your connection and try again."
        : `Something went wrong on our side. Please try again, or email us at ${site.business.email}.`,
    );
  }

  if (sent) {
    return (
      <div role="status" className="rz-form rounded-card border-2 border-ink bg-surface p-6 md:p-8">
        <h3 className="font-display text-xl font-heavy display-tight">Application received. Thank you!</h3>
        <p className="mt-3 text-base">
          Thanks, {values.name.trim().split(/\s+/)[0]}. We sent a confirmation to <strong>{values.email.trim()}</strong>. We review every application by
          hand and usually reply within two business days. Once you&rsquo;re approved, your personal link arrives by email.
        </p>
      </div>
    );
  }

  const err = (f: AffiliateField) => (errors[f] ? errorText(f, errors[f]) : undefined);

  return (
    <form
      ref={formRef}
      action="/api/affiliate"
      method="post"
      onSubmit={onSubmit}
      noValidate={js}
      aria-label="Affiliate program application"
      aria-busy={sending}
      className="rz-form relative grid gap-5 rounded-card border-2 border-ink bg-surface p-5 shadow-hard md:p-8"
    >
      <Honeypot value={trap} onChange={setTrap} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="aff-name" name="name" label={LABELS.name} value={values.name} onChange={onChange} onBlur={onBlur} autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="Jane Smith" error={err("name")} />
        <Field
          id="aff-email"
          name="email"
          type="email"
          inputMode="email"
          spellCheck={false}
          autoCapitalize="off"
          enterKeyHint="next"
          label={LABELS.email}
          value={values.email}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="email"
          placeholder="jane@example.com"
          error={err("email")}
        />
        <Field
          id="aff-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          enterKeyHint="next"
          label={LABELS.phone}
          optionalLabel="(optional)"
          value={values.phone}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="tel"
          placeholder="(555) 555-5555"
          error={err("phone")}
        />
        <Field
          id="aff-business"
          name="business"
          autoCapitalize="words"
          enterKeyHint="next"
          label={LABELS.business}
          optionalLabel="(optional)"
          value={values.business}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="organization"
          placeholder="Smith Marketing"
          error={err("business")}
        />
      </div>
      <Field
        id="aff-website"
        name="website"
        inputMode="url"
        spellCheck={false}
        autoCapitalize="off"
        enterKeyHint="next"
        label={LABELS.website}
        optionalLabel="(optional)"
        value={values.website}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete="url"
        placeholder="yoursite.com or @yourhandle"
        error={err("website")}
      />
      <Field
        as="textarea"
        rows={3}
        id="aff-audience"
        name="audience"
        label={LABELS.audience}
        hint="For example: I'm a bookkeeper with 40 local clients, or I run a Facebook group for contractors."
        value={values.audience}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete="off"
        error={err("audience")}
      />
      <Field
        as="select"
        id="aff-promote"
        name="promote"
        label={LABELS.promote}
        optionalLabel="(optional)"
        placeholder="Pick the main one"
        options={PROMOTE_OPTIONS}
        value={values.promote}
        onChange={onChange}
        error={err("promote")}
      />
      <Field
        as="textarea"
        rows={3}
        id="aff-notes"
        name="notes"
        label={LABELS.notes}
        optionalLabel="(optional)"
        value={values.notes}
        onChange={onChange}
        autoComplete="off"
        error={err("notes")}
      />

      <div>
        <label htmlFor="aff-agree" className="flex min-h-11 cursor-pointer items-start gap-3 text-base">
          <input
            id="aff-agree"
            name="agree"
            type="checkbox"
            value="yes"
            checked={values.agree === "yes"}
            onChange={onChange}
            required
            aria-invalid={errors.agree ? true : undefined}
            aria-describedby={errors.agree ? "aff-agree-error" : undefined}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent,#2F6BFF)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms#affiliate-program" className="font-bold underline decoration-2 underline-offset-4 hover:text-accent">
              affiliate program terms
            </Link>
            , including disclosing that I earn a commission when I share my link.
          </span>
        </label>
        {errors.agree && (
          <p id="aff-agree-error" className="mt-2 flex gap-2 text-sm font-semibold text-danger">
            <span aria-hidden="true" className="font-display">!</span>
            {errorText("agree", errors.agree)}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="rounded-ui border-2 border-danger p-4 text-base font-semibold text-danger">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          className="rz-btn rz-btn-primary inline-flex min-h-12 items-center gap-3 rounded-ui border-2 border-ink bg-cta px-6 font-display text-sm font-bold text-on-cta shadow-hard display-ui transition-button duration-fast hover:-translate-x-lift-x hover:-translate-y-lift-y hover:shadow-hard-lg disabled:cursor-wait"
        >
          {sending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {sending ? "Sending…" : "Apply to Join"}
        </button>
        <p className="text-sm text-muted">Free to join. We reply within two business days.</p>
      </div>
    </form>
  );
}
