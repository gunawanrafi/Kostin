import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_LABELS } from "./types";

export interface WizardStepsProps {
  current: number;
}

// Mirrors the source prototype's WizardSteps: numbered circles connected by
// a line, success/accent/neutral per completed/current/upcoming step.
export function WizardSteps({ current }: WizardStepsProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-center">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-sm font-bold",
                i < current ? "bg-success text-white" : i === current ? "bg-accent text-white" : "bg-border text-textLight",
              )}
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "whitespace-nowrap text-[12.5px]",
                i === current ? "font-bold text-accent" : i < current ? "font-medium text-success" : "font-medium text-textLight",
              )}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 ? (
            <div className={cn("mb-[22px] mx-2 h-0.5 w-[70px] sm:w-[90px]", i < current ? "bg-success" : "bg-border")} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default WizardSteps;
