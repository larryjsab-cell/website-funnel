"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { primaryButton, secondaryButton } from "@/components/flow/Message";
import { Honeypot } from "@/components/forms/Honeypot";
import { site } from "@/lib/site";

export function ChangesForm({ token, bookHref }: { token: string; bookHref: string }) {
  const [details, setDetails] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const doneRef = useRef<HTMLHeadingElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (details.trim().length < 3) return setError("Tell us at least one thing to change, or book a call instead.");
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, details, company_fax: trap }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setState("idle");
      setError(`That didn't send. Try again, or email your changes to ${site.business.email}.`);
    }
  };

  if (state === "done") {
    return (
      <div className="mt-8 rounded-card border-2 border-ink bg-surface p-6 shadow-hard">
        <h2 ref={doneRef} tabIndex={-1} className="font-display text-2xl font-heavy display-tight">
          Got it, we&rsquo;re on it
        </h2>
        <p className="mt-3 text-lg">We&rsquo;ll build your changes in and email you when your site is ready to launch. Thought of something else? Just reply to our email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="relative mt-8 rounded-card border-2 border-ink bg-surface p-5 md:p-6">
      <Honeypot value={trap} onChange={setTrap} />
      <label htmlFor="changes" className="block font-display text-sm font-bold display-ui">
        Your changes
      </label>
      <textarea
        id="changes"
        rows={10}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "changes-error" : "changes-hint"}
        placeholder={"• Use our new logo (I'll reply with it)\n• Change hours to Mon–Sat 8–6\n• Add a page for emergency service"}
        className="mt-2 block w-full rounded-ui border-2 border-ink bg-canvas px-3 py-3 text-base text-ink placeholder:text-muted"
      />
      {error ? (
        <p id="changes-error" role="alert" className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : (
        <p id="changes-hint" className="mt-2 text-sm text-muted">
          Have photos or a logo? Send this, then reply to our email with them attached.
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={state === "sending"} className={primaryButton}>
          {state === "sending" ? "Sending…" : "Send my changes"}
        </button>
        <Link href={bookHref} className={secondaryButton}>
          Rather talk it through? Book a call
        </Link>
      </div>
    </form>
  );
}
