import type { Listing, ListingStatus, PaymentDuration } from "@kostin/database";
import { KOST_TYPE_TO_TIPE, type Tipe } from "./validation.js";

export interface ListingDeposit {
  enabled: boolean;
  /** Null exactly when `enabled` is false — the two can never disagree. */
  amount: number | null;
}

export interface HouseRules {
  access24Hours: boolean;
  overnightGuestsAllowed: boolean;
  oppositeGenderProhibited: boolean;
  petsProhibited: boolean;
  smokingProhibited: boolean;
}

export interface AdditionalFees {
  /** Null means the surcharge is not charged (distinct from a stored 0). */
  extraOccupant: number | null;
  motorcycleParking: number | null;
  carParking: number | null;
}

// All-false: a listing that has declared no rules. Listings created before
// this feature existed have `houseRules = {}` on disk and normalize to this,
// which is truthful — nobody ever set those toggles.
export const DEFAULT_HOUSE_RULES: HouseRules = {
  access24Hours: false,
  overnightGuestsAllowed: false,
  oppositeGenderProhibited: false,
  petsProhibited: false,
  smokingProhibited: false,
};

// The column is Json, so a stored blob may predate the current shape or come
// from raw SQL untyped. Each flag is taken only when it is actually a boolean
// and defaults otherwise, so a partial blob degrades to "not declared" rather
// than reaching clients as a non-boolean.
export function toHouseRules(stored: unknown): HouseRules {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return { ...DEFAULT_HOUSE_RULES };
  }
  const raw = stored as Record<string, unknown>;
  const flag = (key: keyof HouseRules): boolean =>
    typeof raw[key] === "boolean" ? (raw[key] as boolean) : DEFAULT_HOUSE_RULES[key];

  return {
    access24Hours: flag("access24Hours"),
    overnightGuestsAllowed: flag("overnightGuestsAllowed"),
    oppositeGenderProhibited: flag("oppositeGenderProhibited"),
    petsProhibited: flag("petsProhibited"),
    smokingProhibited: flag("smokingProhibited"),
  };
}

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

  // Harga & Aturan (C5)
  deposit: ListingDeposit;
  paymentDuration: PaymentDuration;
  houseRules: HouseRules;
  additionalFees: AdditionalFees;

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

// Nullable money column -> number | null, preserving "not set" rather than
// collapsing it to 0 (which would read as "free" instead of "not charged").
function toNullableNumber(value: unknown): number | null {
  return value == null ? null : toNumber(value);
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
    deposit: {
      // Presence of an amount IS the enabled flag — see the schema comment on
      // depositAmount. There is no second column that could disagree with it.
      enabled: listing.depositAmount != null,
      amount: toNullableNumber(listing.depositAmount),
    },
    paymentDuration: listing.paymentDuration,
    houseRules: toHouseRules(listing.houseRules),
    additionalFees: {
      extraOccupant: toNullableNumber(listing.feeExtraOccupant),
      motorcycleParking: toNullableNumber(listing.feeMotorcycleParking),
      carParking: toNullableNumber(listing.feeCarParking),
    },
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    ...(listing.distanceKm != null ? { distanceKm: Math.round(listing.distanceKm * 100) / 100 } : {}),
  };
}
