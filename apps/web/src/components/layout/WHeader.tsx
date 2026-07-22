import * as React from "react";
import { ChevronRight } from "lucide-react";

export interface WHeaderProps {
  trail?: string[];
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

// Mirrors the source prototype's WHeader: breadcrumb trail + Rubik/700/28
// title + optional subtitle, with an action slot (usually a WButton) at the
// far right. Used at the top of every dashboard page.
export function WHeader({ trail = [], title, subtitle, action }: WHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        {trail.length > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-textMid">
            {trail.map((t, i) => (
              <React.Fragment key={t}>
                {i > 0 ? <ChevronRight className="h-3 w-3 text-textLight" /> : null}
                <span className={i === trail.length - 1 ? "font-semibold text-text" : ""}>{t}</span>
              </React.Fragment>
            ))}
          </div>
        ) : null}
        <h1 className="font-heading text-[28px] font-bold leading-tight text-text">{title}</h1>
        {subtitle ? <p className="max-w-[620px] text-sm text-textMid">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default WHeader;
