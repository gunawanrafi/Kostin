import * as React from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { WCard } from "./WCard";

export type WKpiTone = "success" | "info" | "accent" | "warning" | "neutral";

const TONE_CLASSES: Record<WKpiTone, { iconBg: string; iconFg: string }> = {
  success: { iconBg: "bg-success/10", iconFg: "text-success" },
  info: { iconBg: "bg-info/10", iconFg: "text-info" },
  accent: { iconBg: "bg-accentSoft", iconFg: "text-accent" },
  warning: { iconBg: "bg-warning/10", iconFg: "text-warning" },
  neutral: { iconBg: "bg-bg", iconFg: "text-textMid" },
};

export interface WKpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: WKpiTone;
  /** Colors the value text (defaults to `text-text`). */
  valueClassName?: string;
  delta?: string;
  deltaUp?: boolean;
  sub?: React.ReactNode;
  className?: string;
}

// Mirrors the source prototype's WKpiCard: label + icon chip row, big Rubik
// value, optional delta (▲ up / ● flat) or a plain sub-line.
export function WKpiCard({
  label,
  value,
  icon,
  tone = "neutral",
  valueClassName,
  delta,
  deltaUp,
  sub,
  className,
}: WKpiCardProps): React.JSX.Element {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <WCard pad={22} className={cn("flex flex-1 flex-col gap-3", className)}>
      <div className="flex items-start justify-between">
        <span className="font-heading text-[13px] font-bold text-textMid">{label}</span>
        <div className={cn("flex h-[26px] w-[30px] shrink-0 items-center justify-center rounded-lg", toneClasses.iconBg, toneClasses.iconFg)}>
          {icon}
        </div>
      </div>
      <div>
        <div className={cn("whitespace-pre-line font-heading text-2xl font-bold leading-tight text-text", valueClassName)}>
          {value}
        </div>
        {delta ? (
          <div className="mt-1 flex items-center gap-1">
            <TrendingUp
              className={cn("h-3 w-3", deltaUp ? "text-success" : "rotate-90 text-accent")}
              strokeWidth={2.5}
            />
            <span className={cn("text-[11px]", deltaUp ? "text-success" : "text-textMid")}>{delta}</span>
          </div>
        ) : sub ? (
          <div className="mt-1 text-xs text-textMid">{sub}</div>
        ) : null}
      </div>
    </WCard>
  );
}

export default WKpiCard;
