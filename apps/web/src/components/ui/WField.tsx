import * as React from "react";
import { cn } from "@/lib/utils";

interface WFieldBaseProps {
  label?: string | undefined;
  prefix?: string | undefined;
  note?: string | undefined;
  error?: string | undefined;
  containerClassName?: string | undefined;
}

export type WFieldProps = WFieldBaseProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> & { textarea?: false };

export type WTextareaFieldProps = WFieldBaseProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { textarea: true };

// Mirrors the source prototype's WField: bordered box on colors.bg, Rubik/700
// label, focus ring in accent, error state in error. `textarea` switches the
// control to a <textarea> (used for kost descriptions / aturan tambahan).
export const WField = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, WFieldProps | WTextareaFieldProps>(
  ({ label, prefix, note, error, containerClassName, className, textarea, ...props }, ref) => {
    const fieldClasses = cn(
      // The disabled styling is load-bearing, not decoration: settings shows
      // real values (phone, email) in fields that genuinely cannot be edited
      // yet, and they have to read as such at a glance rather than looking
      // like inputs that silently refuse to save.
      "flex w-full items-center gap-2 rounded-md border bg-bg px-3.5 py-[11px] text-sm text-text placeholder:text-textLight transition-colors focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:bg-bgAlt disabled:text-textMid",
      error ? "border-error focus:ring-error" : "border-border focus:border-accent",
      textarea && "min-h-[84px] items-start py-3",
      className,
    );

    return (
      <div className={cn("flex flex-1 flex-col gap-1.5", containerClassName)}>
        {label ? <span className="font-heading text-[13px] font-bold text-textSec">{label}</span> : null}
        <div className="relative flex items-center">
          {prefix ? (
            <span className="pointer-events-none absolute left-3.5 text-[13px] font-semibold text-textMid">
              {prefix}
            </span>
          ) : null}
          {textarea ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={cn(fieldClasses, prefix && "pl-9")}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              className={cn(fieldClasses, prefix && "pl-9")}
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
        </div>
        {error ? (
          <span className="text-[11px] text-error">{error}</span>
        ) : note ? (
          <span className="text-[11px] text-textLight">{note}</span>
        ) : null}
      </div>
    );
  },
);
WField.displayName = "WField";

export default WField;
