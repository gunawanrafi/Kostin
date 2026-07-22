// Shared shape used across the Phase 1 discovery screens (Home, Search,
// Detail, Favorit). Deliberately local/lightweight — these screens are
// presentational (driven by props + callbacks, no API wiring yet), the same
// approach used for the auth screens. `typeLabel` is already localized by
// the caller (e.g. "Putri") rather than a raw KostType enum, keeping this
// screens layer decoupled from @kostin/database.
export interface Listing {
  id: string;
  name: string;
  area: string;
  photoUrl?: string | null | undefined;
  /** Gallery for ListingDetailScreen; falls back to [photoUrl] when absent. */
  photos?: string[] | undefined;
  /** Full Rupiah amount (not thousands). */
  pricePerMonth: number;
  rating: number;
  reviewCount?: number | undefined;
  typeLabel: string;
  /** 0–100 AI match score; omit to hide the badge. */
  matchScore?: number | undefined;
  facilities?: string[] | undefined;
  description?: string | undefined;
  distanceKm?: number | undefined;
  verified?: boolean | undefined;
  /** Short promo ribbon, e.g. "Populer". */
  badge?: string | undefined;
  /** All rooms sold out. */
  full?: boolean | undefined;
  owner?:
    | {
        name: string;
        responseTime?: string | undefined;
      }
    | undefined;
}
