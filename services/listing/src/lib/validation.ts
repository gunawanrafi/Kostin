import { z } from "zod";
import type {
  KostType,
  ListingStatus,
  PaymentDuration,
  RoomStatus,
  RoomType,
} from "@kostin/database";

// The API speaks the short "tipe" vocabulary from the task spec
// (PUTRA/PUTRI/CAMPUR); Postgres/Prisma store the full KostType enum.
export const TIPE_VALUES = ["PUTRA", "PUTRI", "CAMPUR"] as const;
export type Tipe = (typeof TIPE_VALUES)[number];

export const TIPE_TO_KOST_TYPE: Record<Tipe, KostType> = {
  PUTRA: "KOST_PUTRA",
  PUTRI: "KOST_PUTRI",
  CAMPUR: "KOST_CAMPUR",
};

export const KOST_TYPE_TO_TIPE: Record<KostType, Tipe> = {
  KOST_PUTRA: "PUTRA",
  KOST_PUTRI: "PUTRI",
  KOST_CAMPUR: "CAMPUR",
};

const STATUS_VALUES = ["DRAFT", "ACTIVE", "INACTIVE", "PENDING_REVIEW"] as const satisfies readonly ListingStatus[];

const tipeInputSchema = z.enum(TIPE_VALUES);
const statusInputSchema = z.enum(STATUS_VALUES);

// Comma-separated list, e.g. "wifi,ac,kamar_mandi_dalam" -> ["wifi","ac","kamar_mandi_dalam"]
const csvSchema = z
  .string()
  .transform((v) => v.split(",").map((s) => s.trim()).filter((s) => s.length > 0));

// ── Harga & Aturan (C5) ────────────────────────────────────────────────────

export const PAYMENT_DURATION_VALUES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
] as const satisfies readonly PaymentDuration[];

const paymentDurationSchema = z.enum(PAYMENT_DURATION_VALUES);

// Rupiah amounts: whole currency units, no sub-rupiah precision in practice.
// Capped so a mistyped figure is rejected rather than stored — the column is
// DECIMAL(12,2), which overflows above 10^10.
const rupiahSchema = z.number().nonnegative().max(9_999_999_999);

// The deposit toggle and its amount arrive together, and "enabled with no
// amount" is rejected here rather than silently persisted as a null deposit
// that the owner believes they configured.
export const depositSchema = z
  .object({
    enabled: z.boolean(),
    amount: rupiahSchema.positive().optional(),
  })
  .refine((d) => !d.enabled || d.amount !== undefined, {
    message: "amount is required when the deposit is enabled",
    path: ["amount"],
  });
export type DepositInput = z.infer<typeof depositSchema>;

// The five fixed toggles from the C5 artboard. Every field is required so a
// half-sent object can't leave some rules at an unintended default; the whole
// object is optional on create (see createListingSchema).
//
// Named for what they assert, matching the design's copy:
//   access24Hours            — "Akses 24 Jam"
//   overnightGuestsAllowed   — "Boleh Bawa Tamu Menginap"
//   oppositeGenderProhibited — "Lawan Jenis Dilarang Masuk Kamar"
//   petsProhibited           — "Dilarang Bawa Hewan"
//   smokingProhibited        — "Dilarang Merokok"
export const houseRulesSchema = z.object({
  access24Hours: z.boolean(),
  overnightGuestsAllowed: z.boolean(),
  oppositeGenderProhibited: z.boolean(),
  petsProhibited: z.boolean(),
  smokingProhibited: z.boolean(),
});
export type HouseRulesInput = z.infer<typeof houseRulesSchema>;

// Optional monthly surcharges. An omitted field means "not charged" and is
// stored as NULL — distinct from an explicit 0.
export const additionalFeesSchema = z.object({
  extraOccupant: rupiahSchema.optional(),
  motorcycleParking: rupiahSchema.optional(),
  carParking: rupiahSchema.optional(),
});
export type AdditionalFeesInput = z.infer<typeof additionalFeesSchema>;

export const createListingSchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().min(20).max(5000),
  address: z.string().trim().min(5).max(300),
  kelurahan: z.string().trim().min(2).max(100),
  kecamatan: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100).optional().default("Malang"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: tipeInputSchema.optional().default("CAMPUR"),
  pricePerMonth: z.number().positive(),
  facilities: z.record(z.string(), z.unknown()).optional().default({}),
  amenities: z.array(z.string().trim().min(1)).optional().default([]),
  // Free-form additional rules ("Aturan Tambahan"), one per entry.
  rules: z.array(z.string().trim().min(1)).max(30).optional().default([]),

  deposit: depositSchema.optional(),
  paymentDuration: paymentDurationSchema.optional().default("MONTHLY"),
  houseRules: houseRulesSchema.optional(),
  additionalFees: additionalFeesSchema.optional(),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = z.object({
  title: z.string().trim().min(5).max(150).optional(),
  description: z.string().trim().min(20).max(5000).optional(),
  address: z.string().trim().min(5).max(300).optional(),
  kelurahan: z.string().trim().min(2).max(100).optional(),
  kecamatan: z.string().trim().min(2).max(100).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  type: tipeInputSchema.optional(),
  pricePerMonth: z.number().positive().optional(),
  facilities: z.record(z.string(), z.unknown()).optional(),
  amenities: z.array(z.string().trim().min(1)).optional(),
  rules: z.array(z.string().trim().min(1)).max(30).optional(),
  status: statusInputSchema.optional(),

  deposit: depositSchema.optional(),
  paymentDuration: paymentDurationSchema.optional(),
  // PUT-like semantics per object: sending `houseRules` replaces all five
  // toggles, sending `additionalFees` replaces all three fees. Omitting the
  // key leaves the stored value untouched.
  houseRules: houseRulesSchema.optional(),
  additionalFees: additionalFeesSchema.optional(),
});
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

// Shared filter fields for both GET /listings and GET /listings/search.
// Fastify hands every query param in as a string, hence z.coerce.
const filterFields = {
  hargaMin: z.coerce.number().nonnegative().optional(),
  hargaMax: z.coerce.number().positive().optional(),
  tipe: tipeInputSchema.optional(),
  fasilitas: csvSchema.optional(),
  status: statusInputSchema.optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
};

export const listQuerySchema = z
  .object({
    ...filterFields,
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(200).optional(),
    // Owner-dashboard mode: scope to the authenticated OWNER's own listings
    // across every status, instead of the public ACTIVE-only default.
    // z.coerce.boolean() would treat "false" as truthy (non-empty string) —
    // compare the raw string instead.
    mine: z
      .string()
      .optional()
      .transform((v) => v === "true"),
  })
  .superRefine((v, ctx) => {
    if (v.hargaMin != null && v.hargaMax != null && v.hargaMin > v.hargaMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hargaMin"], message: "hargaMin must be <= hargaMax" });
    }
    const hasLat = v.lat != null;
    const hasLng = v.lng != null;
    if (hasLat !== hasLng) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lat"], message: "lat and lng must be provided together" });
    }
    if (v.radiusKm != null && !(hasLat && hasLng)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["radiusKm"], message: "radiusKm requires lat and lng" });
    }
  });
export type ListQueryInput = z.infer<typeof listQuerySchema>;

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200),
    ...filterFields,
  })
  .superRefine((v, ctx) => {
    if (v.hargaMin != null && v.hargaMax != null && v.hargaMin > v.hargaMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hargaMin"], message: "hargaMin must be <= hargaMax" });
    }
  });
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

// ── Rooms ──────────────────────────────────────────────────────────────────

export const ROOM_TYPE_VALUES = ["STANDARD", "DELUXE", "PREMIUM"] as const satisfies readonly RoomType[];

// Mirrors the RoomStatus enum. AVAILABLE is the only bookable state (see
// booking-service's createBooking); the other three all block a booking.
export const ROOM_STATUS_VALUES = [
  "AVAILABLE",
  "BOOKED",
  "OCCUPIED",
  "MAINTENANCE",
] as const satisfies readonly RoomStatus[];

const roomTypeSchema = z.enum(ROOM_TYPE_VALUES);
export const roomStatusSchema = z.enum(ROOM_STATUS_VALUES);

// Room names are the labels on B1's occupancy grid ("A1", "Kamar 3"), so they
// are short by nature.
const roomNameSchema = z.string().trim().min(1).max(50);
const roomAmenitiesSchema = z.array(z.string().trim().min(1).max(60)).max(30);
const roomImageUrlsSchema = z.array(z.string().trim().url()).max(20);

export const createRoomSchema = z.object({
  name: roomNameSchema,
  type: roomTypeSchema.optional().default("STANDARD"),
  pricePerMonth: z.number().positive().max(9_999_999_999),
  // Nullable rather than merely optional: an owner can explicitly say "size
  // unknown", which is what the nullable column already models.
  sizeSqm: z.number().positive().max(1000).nullable().optional().default(null),
  maxOccupants: z.number().int().min(1).max(20).optional().default(1),
  amenities: roomAmenitiesSchema.optional().default([]),
  imageUrls: roomImageUrlsSchema.optional().default([]),
  // Settable at creation so an owner can add a room that is already occupied
  // when they onboard an existing kost.
  status: roomStatusSchema.optional().default("AVAILABLE"),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

// PATCH: every field optional, but at least one required — an empty body is a
// no-op the caller almost certainly didn't intend.
export const updateRoomSchema = z
  .object({
    name: roomNameSchema.optional(),
    type: roomTypeSchema.optional(),
    pricePerMonth: z.number().positive().max(9_999_999_999).optional(),
    sizeSqm: z.number().positive().max(1000).nullable().optional(),
    maxOccupants: z.number().int().min(1).max(20).optional(),
    amenities: roomAmenitiesSchema.optional(),
    imageUrls: roomImageUrlsSchema.optional(),
    status: roomStatusSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
