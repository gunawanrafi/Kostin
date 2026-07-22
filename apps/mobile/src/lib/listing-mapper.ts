import type { PublicListing, Tipe } from "./api";
import type { Listing } from "../screens/main/types";

const TIPE_LABEL: Record<Tipe, string> = {
  PUTRA: "Putra",
  PUTRI: "Putri",
  CAMPUR: "Campur",
};

// Bridges listing-service's real PublicListing shape to the Listing view
// model the (presentational, pre-existing) discovery screens expect.
// Several screen fields have no backend source yet — rating/reviewCount
// (review-service isn't joined in), matchScore (no AI matching yet), owner
// (would need a join to user-service) — left at safe defaults rather than
// faked.
export function toListingViewModel(listing: PublicListing): Listing {
  return {
    id: listing.id,
    name: listing.title,
    area: `${listing.kelurahan}, ${listing.kecamatan}`,
    photoUrl: listing.photos[0] ?? null,
    photos: listing.photos,
    pricePerMonth: listing.pricePerMonth,
    // No review-service aggregate wired in yet.
    rating: 0,
    typeLabel: TIPE_LABEL[listing.tipe],
    facilities: listing.amenities,
    description: listing.description,
    distanceKm: listing.distanceKm,
  };
}
