import * as React from "react";
import Image from "next/image";
import { Clock } from "lucide-react";
import { WCard } from "@/components/ui/WCard";
import { WButton } from "@/components/ui/WButton";
import { Badge } from "@/components/ui/badge";
import { colors } from "@/lib/design-tokens";
import type { Listing } from "@/lib/types";

// Diagonal hatch standing in for a missing cover photo — the design's
// "[ foto kost ]" placeholder, built from tokens instead of one-off hexes.
const HATCH = `repeating-linear-gradient(135deg, ${colors.border} 0 12px, ${colors.borderLight} 12px 24px)`;

export interface PendingReviewCardProps {
  listing: Listing;
}

// M2 · Listing Menunggu Verifikasi — the dedicated transitional treatment for
// a PENDING_REVIEW listing: cover thumb, title + status badge, an explanation
// of what the owner is waiting for, and a Pratinjau action.
export function PendingReviewCard({ listing }: PendingReviewCardProps): React.JSX.Element {
  const cover = listing.photos[0];

  return (
    <WCard className="flex flex-col items-start gap-[18px] sm:flex-row sm:items-center">
      <div
        className="relative h-[90px] w-[120px] shrink-0 overflow-hidden rounded-[10px]"
        style={{ background: HATCH }}
      >
        {cover ? (
          // `unoptimized` matches the wizard's preview images and keeps this
          // working for any photo host, not just the one in next.config.
          <Image src={cover} alt={listing.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-[10px] text-textLight">[ foto kost ]</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
          <span className="font-heading text-base font-bold text-text">{listing.title}</span>
          <Badge variant="warning">
            <Clock className="mr-1 h-3 w-3" /> Menunggu Verifikasi
          </Badge>
        </div>
        <p className="text-[13px] leading-[1.6] text-textMid">
          Listing sedang ditinjau tim KostIn (biasanya 1×24 jam). Setelah disetujui, listing
          otomatis tayang di pencarian.
        </p>
      </div>

      {/* No listing detail/preview route exists yet — there is no
          /listings/[id] page and no /api/listings/[id] proxy, even though
          listing-service already implements GET /:id (GAP_ANALYSIS.md X3).
          Rendered disabled rather than pointed at a route that would 404.
          Tooltip sits on the wrapper because WButton applies
          `disabled:pointer-events-none`. */}
      <span title="Pratinjau tersedia setelah halaman detail listing dibuat" className="inline-flex shrink-0">
        <WButton type="button" variant="outline" size="sm" disabled aria-disabled>
          Pratinjau
        </WButton>
      </span>
    </WCard>
  );
}

export default PendingReviewCard;
