import type { ChangeEvent, FocusEvent, HTMLInputTypeAttribute } from "react";

type Common = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  placeholder?: string;
  autoComplete?: string;
};

type Props =
  | (Common & {
      as?: "input";
      type?: HTMLInputTypeAttribute;
      inputMode?: "text" | "email" | "tel" | "url";
      spellCheck?: boolean;
      autoCapitalize?: string;
    })
  | (Common & { as: "textarea"; rows?: number })
  | (Common & { as: "select"; options: string[] });

const control =
  "rz-input block w-full rounded-ui border-2 bg-surface px-3 text-base text-ink transition-colors duration-fast placeholder:text-muted";

/** Label above, control, then hint or error. Errors are linked via aria-describedby. */
export function Field(props: Props) {
  const { id, name, label, value, onChange, onBlur, error, hint, optionalLabel, placeholder, autoComplete } = props;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const state = error ? "border-danger" : "border-ink";
  const shared = {
    id,
    name,
    value,
    onChange,
    onBlur,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    required: !optionalLabel,
  } as const;

  return (
    <div>
      <label htmlFor={id} className="rz-label block font-display text-sm font-bold display-ui">
        {label}
        {optionalLabel && <span className="font-normal text-muted"> {optionalLabel}</span>}
      </label>
      <div className="relative mt-2">
        {props.as === "textarea" ? (
          <textarea {...shared} rows={props.rows ?? 4} placeholder={placeholder} className={`${control} ${state} min-h-32 py-3`} />
        ) : props.as === "select" ? (
          <>
            <select {...shared} className={`${control} ${state} min-h-12 appearance-none pr-10`}>
              <option value="" disabled={!optionalLabel}>
                {placeholder}
              </option>
              {props.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-display font-bold">
              ▾
            </span>
          </>
        ) : (
          <input
            {...shared}
            type={props.type ?? "text"}
            inputMode={props.inputMode}
            spellCheck={props.spellCheck}
            autoCapitalize={props.autoCapitalize}
            placeholder={placeholder}
            className={`${control} ${state} min-h-12`}
          />
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 flex gap-2 text-sm font-semibold text-danger">
          <span aria-hidden="true" className="font-display">!</span>
          {error}
        </p>
      )}
    </div>
  );
}
