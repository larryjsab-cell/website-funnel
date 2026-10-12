import type { ButtonHTMLAttributes, ReactNode } from "react";
import { statusLabel } from "@/lib/admin/model";

export const inputClass =
  "block w-full min-h-11 rounded-ui border-2 border-ink bg-surface px-3 text-base text-ink placeholder:text-muted";
export const labelClass = "block font-display text-sm font-bold display-ui";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "plain" | "danger"; busy?: boolean };

export function Button({ tone = "plain", busy, className = "", children, disabled, ...rest }: ButtonProps) {
  const look =
    tone === "primary"
      ? "border-ink bg-ink text-on-ink hover:bg-accent hover:text-on-accent active:bg-accent active:text-on-accent"
      : tone === "danger"
        ? "border-danger bg-surface text-danger hover:bg-danger hover:text-canvas active:bg-danger active:text-canvas"
        : "border-ink bg-surface text-ink hover:bg-ink hover:text-on-ink active:bg-ink active:text-on-ink";
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-ui border-2 px-4 font-display text-sm font-bold display-ui transition-colors duration-fast disabled:cursor-not-allowed disabled:border-dashed disabled:border-muted disabled:bg-surface disabled:text-muted ${look} ${className}`}
    >
      {busy ? "Working…" : children}
    </button>
  );
}

export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-card border-2 border-ink bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-heavy display-tight">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "live" ? "bg-ink text-on-ink" : status === "closed_no_response" ? "bg-canvas text-muted" : "bg-accent text-on-accent";
  return <span className={`inline-block rounded-ui px-2 py-0.5 font-display text-sm font-bold ${tone}`}>{statusLabel(status)}</span>;
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-ui border border-ink px-2 font-display text-sm">{children}</span>;
}

/** Inline result line for an action: success or error, announced to screen readers. */
export function Notice({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  return (
    <p role={error ? "alert" : "status"} className={`mt-3 text-sm font-semibold ${error ? "text-danger" : "text-ink"}`}>
      {error || message}
    </p>
  );
}
