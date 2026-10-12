"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Field } from "@/components/forms/Field";
import { Honeypot } from "@/components/forms/Honeypot";
import { track } from "@/lib/analytics";
import { forms } from "@/lib/content";
import { checkAll, checkField, fill, type DemoField, type FieldErrorKind } from "@/lib/forms";
import { errorText, submitLead } from "@/lib/submitLead";

const copy = forms.demo;
const STEP1: DemoField[] = ["name", "email"];
const STEP2: DemoField[] = ["businessName", "phone", "industry", "website", "notes"];
const empty: Record<DemoField, string> = { name: "", email: "", businessName: "", phone: "", industry: "", website: "", notes: "" };

type Status = "idle" | "sending" | "success";

/**
 * Two-step demo request. Step 1 asks only for name and email, which lowers the
 * first commitment. Step 2 asks for the details we need to design the demo.
 */
export function DemoForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<DemoField, FieldErrorKind>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [trap, setTrap] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Example cards carry data-industry; clicking one pre-selects it here.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-industry]");
      const industry = el?.dataset.industry;
      if (industry && copy.industries.includes(industry)) {
        setValues((v) => ({ ...v, industry }));
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!moved.current) return;
    if (status === "success") successRef.current?.focus();
    else stepHeadingRef.current?.focus();
  }, [step, status]);

  const label = (f: DemoField) => copy.fields[f].label;

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const f = e.target.name as DemoField;
    setValues((v) => ({ ...v, [f]: e.target.value }));
    // Clear an error as soon as the field becomes valid; never add one mid-typing.
    if (errors[f] && !checkField(f, e.target.value)) setErrors((er) => ({ ...er, [f]: undefined }));
  }

  function onBlur(e: { target: { name: string; value: string } }) {
    const f = e.target.name as DemoField;
    if (!e.target.value.trim()) return;
    setErrors((er) => ({ ...er, [f]: checkField(f, e.target.value) ?? undefined }));
  }

  function focusFirstError(found: Partial<Record<DemoField, FieldErrorKind>>, fields: DemoField[]) {
    const first = fields.find((f) => found[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  function next() {
    const found = checkAll(STEP1, values) as Partial<Record<DemoField, FieldErrorKind>>;
    setErrors((er) => ({ ...er, ...found }));
    if (Object.keys(found).length) return focusFirstError(found, STEP1);
    moved.current = true;
    setFormError("");
    setStep(2);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) return next();
    if (status === "sending") return;
    const found = checkAll([...STEP1, ...STEP2], values) as Partial<Record<DemoField, FieldErrorKind>>;
    setErrors(found);
    if (Object.keys(found).length) {
      if (STEP1.some((f) => found[f])) {
        setStep(1);
        return;
      }
      return focusFirstError(found, STEP2);
    }

    setStatus("sending");
    setFormError("");
    const result = await submitLead("demo", values, trap);
    if (result.ok) {
      track({ name: "demo_submit", step: 2 });
      moved.current = true;
      setStatus("success");
      return;
    }
    setStatus("idle");
    setFormError(result.message);
    if (result.fields) {
      setErrors(result.fields as Partial<Record<DemoField, FieldErrorKind>>);
      if (STEP1.some((f) => result.fields?.[f])) setStep(1);
    }
  }

  if (status === "success") {
    const s = copy.success;
    const vars = { name: values.name.trim().split(/\s+/)[0], email: values.email.trim() };
    return (
      <div className="border-2 border-ink bg-surface p-6 shadow-hard md:p-8">
        <h3 ref={successRef} tabIndex={-1} className="font-mono text-2xl font-heavy text-balance mono-condensed md:text-3xl">
          {s.heading}
        </h3>
        <p className="mt-4 text-lg">{fill(s.body, vars)}</p>
        <h4 className="mt-8 font-mono text-lg font-bold mono-semi">{s.nextHeading}</h4>
        <ol className="mt-3 grid gap-3">
          {s.next.map((item, i) => (
            <li key={item} className="flex gap-3 text-base">
              <span aria-hidden="true" className="font-mono font-heavy mono-condensed">
                {i + 1}
              </span>
              <span>{fill(item, vars)}</span>
            </li>
          ))}
        </ol>
        <a
          href="#examples"
          className="mt-8 inline-flex min-h-11 items-center font-mono font-bold underline decoration-2 underline-offset-4 hover:text-accent"
        >
          {s.whileYouWait}
        </a>
      </div>
    );
  }

  const busy = status === "sending";
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-label={copy.label}
      aria-busy={busy}
      className="relative border-2 border-ink bg-surface p-5 shadow-hard md:p-8"
    >
      <Honeypot value={trap} onChange={setTrap} />

      <p className="font-mono text-sm text-muted mono-semi" aria-live="polite">
        {fill(copy.stepOf, { step: String(step) })}
      </p>
      <h3 ref={stepHeadingRef} tabIndex={-1} className="mt-1 font-mono text-xl font-heavy mono-condensed md:text-2xl">
        {step === 1 ? copy.step1Title : copy.step2Title}
      </h3>

      <div className="mt-6 grid gap-5" hidden={step !== 1}>
        <Field
          id="demo-name"
          name="name"
          label={label("name")}
          value={values.name}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="name"
          placeholder={copy.fields.name.placeholder}
          error={errors.name && errorText(errors.name, label("name"))}
        />
        <Field
          id="demo-email"
          name="email"
          type="email"
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

      <div className="mt-6 grid gap-5" hidden={step !== 2}>
        <Field
          id="demo-business"
          name="businessName"
          label={label("businessName")}
          value={values.businessName}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="organization"
          placeholder={copy.fields.businessName.placeholder}
          error={errors.businessName && errorText(errors.businessName, label("businessName"))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="demo-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            label={label("phone")}
            value={values.phone}
            onChange={onChange}
            onBlur={onBlur}
            autoComplete="tel"
            placeholder={copy.fields.phone.placeholder}
            error={errors.phone && errorText(errors.phone, label("phone"))}
          />
          <Field
            as="select"
            id="demo-industry"
            name="industry"
            label={label("industry")}
            value={values.industry}
            onChange={onChange}
            onBlur={onBlur}
            options={copy.industries}
            placeholder={copy.fields.industry.placeholder}
            error={errors.industry && errorText(errors.industry, label("industry"))}
          />
        </div>
        <Field
          id="demo-website"
          name="website"
          type="url"
          inputMode="url"
          spellCheck={false}
          autoCapitalize="off"
          label={label("website")}
          optionalLabel={copy.fields.website.optional}
          hint={copy.fields.website.hint}
          value={values.website}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="url"
          placeholder={copy.fields.website.placeholder}
          error={errors.website && errorText(errors.website, label("website"))}
        />
        <Field
          as="textarea"
          id="demo-notes"
          name="notes"
          label={label("notes")}
          optionalLabel={copy.fields.notes.optional}
          value={values.notes}
          onChange={onChange}
          autoComplete="off"
          placeholder={copy.fields.notes.placeholder}
        />
      </div>

      {formError && (
        <p role="alert" className="mt-6 border-2 border-danger p-4 text-base font-semibold text-danger">
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center">
        {step === 2 && (
          <button
            type="button"
            onClick={() => {
              moved.current = true;
              setStep(1);
            }}
            className="min-h-12 border-2 border-ink px-6 font-mono text-sm font-bold mono-semi hover:bg-ink hover:text-on-ink"
          >
            {copy.back}
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-14 items-center justify-center gap-3 border-2 border-ink bg-cta px-8 font-mono text-lg font-bold text-ink shadow-hard transition-button duration-fast ease-out mono-semi hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-wait disabled:shadow-none"
        >
          {busy && <span aria-hidden="true" className="h-4 w-4 animate-spin border-2 border-ink border-t-transparent" />}
          {busy ? copy.sending : step === 1 ? copy.next : copy.submit}
        </button>
      </div>
      <p className="mt-3 font-mono text-sm text-muted mono-semi">{copy.microcopy}</p>
    </form>
  );
}
