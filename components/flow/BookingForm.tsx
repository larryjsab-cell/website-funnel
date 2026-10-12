"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { primaryButton } from "@/components/flow/Message";
import { Honeypot } from "@/components/forms/Honeypot";
import { site } from "@/lib/site";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";

type Props = { token: string; purpose: string; slots: string[]; knownPhone: string };

const subscribe = () => () => {};
/** The visitor's timezone, read only in the browser so slot times show in their local time. */
function useTimezone() {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Detroit",
    () => null,
  );
}

/** Days shown at once. The rest are a "More dates" click away, so the row never scrolls sideways. */
const DAYS_PER_PAGE = 6;

const control = "mt-2 block w-full min-h-12 rounded-ui border-2 border-ink bg-canvas px-3 text-base text-ink";
const label = "block font-display text-sm font-bold display-ui";

export function BookingForm({ token, purpose, slots, knownPhone }: Props) {
  const tz = useTimezone();
  const [day, setDay] = useState("");
  const [page, setPage] = useState(0);
  const [time, setTime] = useState("");
  const [method, setMethod] = useState<"meet" | "phone" | "">("");
  const [phone, setPhone] = useState(knownPhone);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const doneRef = useRef<HTMLHeadingElement>(null);
  useUnsavedWarning(state !== "done" && (time !== "" || [notes, name, email, business].some((v) => v.trim() !== "")));

  const days = useMemo(() => {
    if (!tz) return [];
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    const dayLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
    const map = new Map<string, { label: string; slots: string[] }>();
    for (const s of slots) {
      if (taken.includes(s)) continue;
      const d = new Date(s);
      const k = dayKey.format(d);
      if (!map.has(k)) map.set(k, { label: dayLabel.format(d), slots: [] });
      map.get(k)!.slots.push(s);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [slots, tz, taken]);

  const timeLabel = useMemo(() => (tz ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }) : null), [tz]);
  const fullLabel = useMemo(
    () => (tz ? new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null),
    [tz],
  );
  const activeDay = day || days[0]?.key || "";
  const daySlots = days.find((d) => d.key === activeDay)?.slots ?? [];
  const pages = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
  const current = Math.min(page, pages - 1);
  const pageDays = days.slice(current * DAYS_PER_PAGE, (current + 1) * DAYS_PER_PAGE);
  const goToPage = (next: number) => {
    setPage(next);
    setDay(days[next * DAYS_PER_PAGE]?.key ?? "");
    setTime("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!time) return setError("Pick a time.");
    if (!method) return setError("Choose Google Meet or a phone call.");
    if (method === "phone" && phone.replace(/\D/g, "").length < 10) return setError("Add the number we should call.");
    if (!token && (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))) return setError("Add your name and email so we can confirm.");
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, purpose, time, method, phone, notes, name, email, business, timezone: tz, company_fax: trap }),
      });
      if (res.status === 409) {
        setTaken((t) => [...t, time]);
        setTime("");
        setState("idle");
        return setError("Someone just booked that time. Please pick another.");
      }
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setState("idle");
      setError(`That didn’t go through. Try again, or call ${site.business.phone}.`);
    }
  };

  if (state === "done") {
    return (
      <div className="mt-8 rounded-card border-2 border-ink bg-surface p-6 shadow-hard">
        <h2 ref={doneRef} tabIndex={-1} className="font-display text-2xl font-heavy display-tight">
          You&rsquo;re booked
        </h2>
        <p className="mt-3 text-lg">
          {fullLabel?.format(new Date(time))}, by {method === "meet" ? "Google Meet" : "phone"}.{" "}
          {method === "meet" ? "We’ll send a calendar invite with the Meet link." : `We’ll call you at ${phone}.`} A confirmation is in your inbox.
        </p>
      </div>
    );
  }

  if (!tz) return <p className="mt-8 text-muted">Loading available times…</p>;

  return (
    <form onSubmit={submit} noValidate className="relative mt-8 space-y-6 rounded-card border-2 border-ink bg-surface p-5 md:p-6">
      <Honeypot value={trap} onChange={setTrap} />
      <fieldset>
        <legend className={label}>Day</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {pageDays.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={d.key === activeDay}
              onClick={() => {
                setDay(d.key);
                setTime("");
              }}
              className={`min-h-12 rounded-ui border-2 border-ink px-2 font-display text-sm font-bold ${d.key === activeDay ? "bg-ink text-on-ink" : "bg-canvas"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {pages > 1 && (
          <div className="mt-3 grid grid-cols-2 items-center gap-2 md:grid-cols-[auto_1fr_auto]">
            <p className="col-span-2 text-center text-sm text-muted md:order-2 md:col-span-1" aria-live="polite">
              Showing {pageDays[0]?.label} – {pageDays[pageDays.length - 1]?.label}
            </p>
            <button
              type="button"
              disabled={current === 0}
              onClick={() => goToPage(current - 1)}
              className="min-h-11 rounded-ui border-2 border-ink bg-canvas px-3 font-display text-sm font-bold disabled:cursor-not-allowed disabled:border-dashed disabled:border-muted disabled:text-muted md:order-1"
            >
              ← Earlier<span className="hidden sm:inline">&nbsp;dates</span>
            </button>
            <button
              type="button"
              disabled={current >= pages - 1}
              onClick={() => goToPage(current + 1)}
              className="min-h-11 rounded-ui border-2 border-ink bg-canvas px-3 font-display text-sm font-bold disabled:cursor-not-allowed disabled:border-dashed disabled:border-muted disabled:text-muted md:order-3"
            >
              Next<span className="hidden sm:inline">&nbsp;dates</span> →
            </button>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className={label}>Time ({tz.replace(/_/g, " ")})</legend>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {daySlots.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={time === s}
              onClick={() => setTime(s)}
              className={`min-h-12 rounded-ui border-2 border-ink font-display text-sm font-bold ${time === s ? "bg-cta text-on-cta" : "bg-canvas"}`}
            >
              {timeLabel?.format(new Date(s))}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>How should we talk?</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {(["meet", "phone"] as const).map((m) => (
            <label key={m} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-ui border-2 border-ink px-4 font-display text-sm font-bold ${method === m ? "bg-ink text-on-ink" : "bg-canvas"}`}>
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="h-5 w-5" />
              {m === "meet" ? "Google Meet (video)" : "Phone call"}
            </label>
          ))}
        </div>
      </fieldset>

      {!token && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="b-name" className={label}>
              Your name
            </label>
            <input id="b-name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={control} />
          </div>
          <div>
            <label htmlFor="b-email" className={label}>
              Email
            </label>
            <input id="b-email" name="email" type="email" autoComplete="email" spellCheck={false} autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} className={control} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="b-business" className={label}>
              Business name <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="b-business" name="business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} className={control} />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="b-phone" className={label}>
          Phone {method !== "phone" && <span className="font-normal text-muted">(optional for Meet)</span>}
        </label>
        <input id="b-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={control} />
      </div>

      <div>
        <label htmlFor="b-notes" className={label}>
          Anything we should know first? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="b-notes" name="notes" rows={3} autoComplete="off" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${control} py-3`} />
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className={`${primaryButton} w-full md:w-auto`}>
        {state === "sending" ? "Booking…" : time ? `Book ${timeLabel?.format(new Date(time))}` : "Book my call"}
      </button>
    </form>
  );
}
