import * as React from "react";
import { WCard } from "@/components/ui/WCard";
import { cn } from "@/lib/utils";

export interface WEmptyBlockProps {
  /** Illustration glyph — a lucide icon sized ~h-9/w-9 to match the design's 38px. */
  icon: React.ReactNode;
  title: string;
  description: string;
  /** CTA slot (usually a Link styled with buttonVariants). */
  action?: React.ReactNode;
  /** Icon-well tint. Matches the source prototype's `tone` prop. */
  tone?: "accent" | "warning";
  className?: string;
}

// Mirrors the source prototype's shared WEmptyBlock: a 460px-min centred card
// with an 84px rounded icon well, Rubik/800 title, constrained subtitle, and an
// optional CTA. Shared because the design reuses it across M1 (Belum ada
// listing) and M3 (Maintenance kosong).
export function WEmptyBlock({
  icon,
  title,
  description,
  action,
  tone = "accent",
  className,
}: WEmptyBlockProps): React.JSX.Element {
  return (
    <WCard
      className={cn(
        "flex min-h-[460px] flex-col items-center justify-center gap-4 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-[84px] w-[84px] items-center justify-center rounded-3xl",
          tone === "accent" ? "bg-accentSoft text-accent" : "bg-warningSoft text-warning",
        )}
      >
        {icon}
      </div>

      <div className="max-w-[380px]">
        <h2 className="font-heading text-xl font-extrabold text-text">{title}</h2>
        <p className="mt-2.5 text-[13.5px] leading-[1.65] text-textMid">{description}</p>
      </div>

      {action}
    </WCard>
  );
}

export default WEmptyBlock;
