import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Mirrors the source prototype's WBtn: 5 variants, 8px radius, Inter/600
// label. sm/md sizing extends the source's small/regular scale.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-body font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accentHover",
        dark: "bg-dark text-white hover:bg-darkMid",
        outline: "border-[1.5px] border-border bg-surface text-text hover:bg-bg",
        ghost: "bg-transparent text-textMid hover:bg-bg",
        success: "bg-success text-white hover:bg-success/90",
      },
      size: {
        sm: "px-4 py-2 text-[12.5px]",
        md: "px-[22px] py-[11px] text-sm",
      },
      fullWidth: {
        true: "flex w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface WButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  loading?: boolean;
}

export const WButton = React.forwardRef<HTMLButtonElement, WButtonProps>(
  ({ className, variant, size, fullWidth, icon, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  },
);
WButton.displayName = "WButton";

export default WButton;
