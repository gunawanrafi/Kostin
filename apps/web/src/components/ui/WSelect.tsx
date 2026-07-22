import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  containerClassName?: string;
}

// Mirrors the source prototype's WSelect chrome (WField's bordered box on
// colors.bg) wrapping a native <select> for full accessibility/keyboard
// support without pulling in Radix Select for a simple dropdown.
export const WSelect = React.forwardRef<HTMLSelectElement, WSelectProps>(
  ({ label, containerClassName, className, children, ...props }, ref) => {
    return (
      <div className={cn("flex flex-1 flex-col gap-1.5", containerClassName)}>
        {label ? <span className="font-heading text-[13px] font-bold text-textSec">{label}</span> : null}
        <div className="relative flex items-center">
          <select
            ref={ref}
            className={cn(
              "w-full appearance-none rounded-md border border-border bg-bg py-[11px] pl-3.5 pr-9 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-textMid" />
        </div>
      </div>
    );
  },
);
WSelect.displayName = "WSelect";

export default WSelect;
