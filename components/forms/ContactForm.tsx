"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Field } from "@/components/forms/Field";
import { Honeypot } from "@/components/forms/Honeypot";
import { track } from "@/lib/analytics";
import forms from "@/content/forms.json";
import { checkAll, checkField, contactFields, fill, type ContactField, type FieldErrorKind } from "@/lib/forms";
import { errorText, submitLead } from "@/lib/submitLead";
import { useHydrated } from "@/lib/useHydrated";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";

const copy = forms.contact;
const empty: Record<ContactField, string> = { name: "", email: "", message: "" };

export function ContactForm() {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<ContactField, FieldErrorKind>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [trap, setTrap] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const js = useHydrated();
  useUnsavedWarning(!sent && Object.values(values).some((v) => v.trim() !== ""));

  const label = (f: ContactField) => copy.fields[f].label;

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const f = e.target.name as ContactField;
    setValues((v) => ({ ...v, [f]: e.target.value }));
    if (errors[f] && !checkField(f, e.target.value)) setErrors((er) => ({ ...er, [f]: undefined }));
  }

  function onBlur(e: { target: { name: string; value: string } }) {
    const f = e.target.name as ContactField;
    if (!e.target.value.trim()) return;
    setErrors((er) => ({ ...er, [f]: checkField(f, e.target.value) ?? undefined }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const found = checkAll(contactFields, values) as Partial<Record<ContactField, FieldErrorKind>>;
    setErrors(found);
    const first = contactFields.find((f) => found[f]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSending(true);
    setFormError("");
    const result = await submitLead("contact", values, trap);
    setSending(false);
    if (result.ok) {
      track({ name: "contact_submit" });
      setSent(true);
      return;
    }
    setFormError(result.message);
    if (result.fields) setErrors(result.fields as Partial<Record<ContactField, FieldErrorKind>>);
  }

  if (sent) {
    return (
      <div role="status" className="rz-form rounded-card border-2 border-ink bg-surface p-6">
        <h3 className="font-display text-xl font-heavy display-tight">{copy.success.heading}</h3>
        <p className="mt-3 text-base">
          {fill(copy.success.body, { name: values.name.trim().split(/\s+/)[0], email: values.email.trim() })}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action="/api/lead"
      method="post"
      onSubmit={onSubmit}
      noValidate={js}
      aria-label={copy.label}
      aria-busy={sending}
      className="rz-form relative grid gap-5 rounded-card border-2 border-ink bg-surface p-5 md:p-6"
    >
      <Honeypot value={trap} onChange={setTrap} />
      <input type="hidden" name="form_type" value="contact" />
      <input type="hidden" name="page" value="/#contact" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="contact-name"
          name="name"
          autoCapitalize="words"
          enterKeyHint="next"
          label={label("name")}
          value={values.name}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="name"
          placeholder={copy.fields.name.placeholder}
          error={errors.name && errorText(errors.name, label("name"))}
        />
        <Field
          id="contact-email"
          name="email"
          type="email"
          enterKeyHint="next"
          inputMode="email"
          spellCheck={false}
          autoCapitalize="off"
          label={label("email")}
          value={values.email}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="email"
          placeholder={copy.fields.email.placeholder}
          error={errors.email && errorText(errors.email, label("email"))}
        />
      </div>
      <Field
        as="textarea"
        id="contact-message"
        name="message"
        label={label("message")}
        value={values.message}
        onChange={onChange}
        autoComplete="off"
        placeholder={copy.fields.message.placeholder}
        error={errors.message && errorText(errors.message, label("message"))}
      />
      {formError && (
        <p role="alert" className="rounded-ui border-2 border-danger p-4 text-base font-semibold text-danger">
          {formError}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={sending}
          className="rz-btn rz-btn-secondary inline-flex min-h-12 items-center gap-3 rounded-ui border-2 border-ink px-6 font-display text-sm font-bold display-ui transition-button duration-fast hover:bg-ink hover:text-on-ink disabled:cursor-wait"
        >
          {sending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {sending ? copy.sending : copy.submit}
        </button>
      </div>
    </form>
  );
}
