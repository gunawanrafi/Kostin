import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-body transition-colors",
  {
    variants: {
      variant: {
        default: "bg-accentSoft text-accent",
        success: "bg-successSoft text-success",
        warning: "bg-warningSoft text-warningTextDeep",
        error: "bg-errorSoft text-error",
        info: "bg-infoSoft text-info",
        neutral: "bg-bg text-textMid",
        dark: "bg-dark text-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
