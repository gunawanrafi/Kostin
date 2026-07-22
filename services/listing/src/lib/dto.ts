import type { Listing, ListingStatus } from "@kostin/database";
import { KOST_TYPE_TO_TIPE, type Tipe } from "./validation.js";

export interface PublicListing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  address: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  lat: number;
  lng: number;
  tipe: Tipe;
  pricePerMonth: number;
  facilities: Record<string, unknown>;
  photos: string[];
  amenities: string[];
  rules: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  distanceKm?: number;
}

// Prisma's Decimal (decimal.js) comes back from both the normal client and
// $queryRaw; guard with a duck-type check rather than importing the Decimal
// class just for an instanceof check.
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// Raw-SQL rows (geo/search paths) come back as plain objects with the same
// column names but no guaranteed JSON typing — Listing here is a superset
// input, not a strict Prisma model instance.
export function toPublicListing(
  listing: Listing & { distanceKm?: number | null },
): PublicListing {
  return {
    id: listing.id,
    ownerId: listing.ownerId,
    title: listing.title,
    description: listing.description,
    address: listing.address,
    kelurahan: listing.kelurahan,
    kecamatan: listing.kecamatan,
    city: listing.city,
    lat: toNumber(listing.lat),
    lng: toNumber(listing.lng),
    tipe: KOST_TYPE_TO_TIPE[listing.type],
    pricePerMonth: toNumber(listing.pricePerMonth),
    facilities: (listing.facilities ?? {}) as Record<string, unknown>,
    photos: toStringArray(listing.photos),
    amenities: listing.amenities,
    rules: listing.rules,
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    ...(listing.distanceKm != null ? { distanceKm: Math.round(listing.distanceKm * 100) / 100 } : {}),
  };
}
