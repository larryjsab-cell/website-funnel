import { HONEYPOT } from "@/lib/forms";
import forms from "@/content/forms.json";

/** Off-screen trap field. Humans never see or reach it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-80 h-px w-px overflow-hidden">
      <label htmlFor={HONEYPOT}>{forms.honeypotLabel}</label>
      <input
        id={HONEYPOT}
        name={HONEYPOT}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
