import { z } from "zod";
import type { KostType, ListingStatus } from "@kostin/database";

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
  rules: z.array(z.string().trim().min(1)).optional().default([]),
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
  rules: z.array(z.string().trim().min(1)).optional(),
  status: statusInputSchema.optional(),
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
