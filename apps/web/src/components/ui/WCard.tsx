import * as React from "react";
import { cn } from "@/lib/utils";

export interface WCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding in px (matches the source prototype's `pad` prop). Defaults to 24. */
  pad?: number;
  noPadding?: boolean;
}

// Mirrors the source prototype's WCard: 1px border, 12px radius, subtle shadow.
export const WCard = React.forwardRef<HTMLDivElement, WCardProps>(
  ({ className, style, pad = 24, noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("rounded-xl border border-border bg-surface shadow-sm", className)}
        style={{ padding: noPadding ? 0 : pad, ...style }}
        {...props}
      />
    );
  },
);
WCard.displayName = "WCard";

export default WCard;
