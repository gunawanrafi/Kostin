import * as React from "react";
import { WCard } from "./WCard";

export interface WSectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

// Mirrors the source prototype's WSectionCard: WCard with a colored left
// accent bar next to the title — used throughout the Tambah Kost wizard.
export function WSectionCard({ title, children, className }: WSectionCardProps): React.JSX.Element {
  return (
    <WCard className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-[18px] w-1 rounded-sm bg-accent" />
          <span className="font-heading text-base font-bold text-text">{title}</span>
        </div>
        {children}
      </div>
    </WCard>
  );
}

export default WSectionCard;
