import type { ListingConfig } from "../config.js";
import { DEFAULT_HOUSE_RULES, toPublicListing, type PublicListing } from "../lib/dto.js";
import { AppError, ListingErrorCode } from "../lib/errors.js";
import type {
  GeoFilter,
  ListingFilters,
  ListingPricingData,
  ListingRepository,
} from "../lib/listing-repository.js";
import type { PhotoUploader } from "../lib/photo-uploader.js";
import type { RoomRepository } from "../lib/room-repository.js";
import {
  TIPE_TO_KOST_TYPE,
  type AdditionalFeesInput,
  type CreateListingInput,
  type DepositInput,
  type ListQueryInput,
  type SearchQueryInput,
  type UpdateListingInput,
} from "../lib/validation.js";

// A disabled deposit stores NULL, so "enabled" and "amount" can never end up
// contradicting each other on disk. depositSchema has already rejected
// enabled-without-amount, so the `?? null` is only reached when disabled.
function toDepositAmount(deposit: DepositInput | undefined): number | null {
  if (!deposit?.enabled) return null;
  return deposit.amount ?? null;
}

// An omitted fee is NULL ("not charged"), which is why this maps undefined to
// null rather than leaving it out — sending `additionalFees` at all means the
// owner reviewed all three.
function toFeeColumns(fees: AdditionalFeesInput | undefined) {
  return {
    feeExtraOccupant: fees?.extraOccupant ?? null,
    feeMotorcycleParking: fees?.motorcycleParking ?? null,
    feeCarParking: fees?.carParking ?? null,
  };
}

export interface ListingDeps {
  config: ListingConfig;
  listingRepository: ListingRepository;
  roomRepository: RoomRepository;
  photoUploader: PhotoUploader;
}

export interface PhotoFile {
  buffer: Buffer;
  mimetype: string;
}

export interface ListResult {
  items: PublicListing[];
  nextCursor: string | null;
}

function clampLimit(config: ListingConfig, requested: number | undefined): number {
  const limit = requested ?? config.defaultPageSize;
  return Math.min(Math.max(limit, 1), config.maxPageSize);
}

function toFilters(
  q: Pick<ListQueryInput, "hargaMin" | "hargaMax" | "tipe" | "fasilitas" | "status">,
  ownerId?: string,
): ListingFilters {
  return {
    ...(q.hargaMin !== undefined ? { minPrice: q.hargaMin } : {}),
    ...(q.hargaMax !== undefined ? { maxPrice: q.hargaMax } : {}),
    ...(q.tipe !== undefined ? { type: TIPE_TO_KOST_TYPE[q.tipe] } : {}),
    ...(q.fasilitas !== undefined ? { facilities: q.fasilitas } : {}),
    ...(q.status !== undefined ? { status: q.status } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
  };
}

export async function listListings(
  deps: ListingDeps,
  query: ListQueryInput,
  ownerId?: string,
): Promise<ListResult> {
  const filters = toFilters(query, ownerId);
  const geo: GeoFilter | null =
    query.lat !== undefined && query.lng !== undefined
      ? { lat: query.lat, lng: query.lng, ...(query.radiusKm !== undefined ? { radiusKm: query.radiusKm } : {}) }
      : null;
  const limit = clampLimit(deps.config, query.limit);

  const page = await deps.listingRepository.list(filters, geo, query.cursor ?? null, limit);
  return { items: page.items.map(toPublicListing), nextCursor: page.nextCursor };
}

export async function searchListings(deps: ListingDeps, query: SearchQueryInput): Promise<ListResult> {
  const filters = toFilters(query);
  const limit = clampLimit(deps.config, query.limit);

  const page = await deps.listingRepository.search(query.q, filters, query.cursor ?? null, limit);
  return { items: page.items.map(toPublicListing), nextCursor: page.nextCursor };
}

export async function getListing(deps: ListingDeps, id: string): Promise<PublicListing> {
  const listing = await deps.listingRepository.findById(id);
  if (!listing) throw new AppError(404, ListingErrorCode.NOT_FOUND, "Listing not found");
  return toPublicListing(listing);
}

export async function createListing(
  deps: ListingDeps,
  ownerId: string,
  input: CreateListingInput,
): Promise<PublicListing> {
  const listing = await deps.listingRepository.create({
    ownerId,
    title: input.title,
    description: input.description,
    address: input.address,
    kelurahan: input.kelurahan,
    kecamatan: input.kecamatan,
    city: input.city,
    lat: input.lat,
    lng: input.lng,
    type: TIPE_TO_KOST_TYPE[input.type],
    pricePerMonth: input.pricePerMonth,
    facilities: input.facilities,
    amenities: input.amenities,
    rules: input.rules,
    pricing: {
      depositAmount: toDepositAmount(input.deposit),
      paymentDuration: input.paymentDuration,
      // Omitted entirely => no rules declared, which is what all-false means.
      houseRules: input.houseRules ?? DEFAULT_HOUSE_RULES,
      ...toFeeColumns(input.additionalFees),
    },
  });
  return toPublicListing(listing);
}

// Shared by update/delete/addPhotos: 404 if missing, 403 if the caller
// doesn't own it. Role (OWNER) is checked earlier by requireOwner() in the
// route — this is the per-resource ownership check role alone can't cover.
async function loadOwnedListing(deps: ListingDeps, userId: string, id: string) {
  const listing = await deps.listingRepository.findById(id);
  if (!listing) throw new AppError(404, ListingErrorCode.NOT_FOUND, "Listing not found");
  if (listing.ownerId !== userId) {
    throw new AppError(403, ListingErrorCode.FORBIDDEN, "You do not own this listing");
  }
  return listing;
}

export async function updateListing(
  deps: ListingDeps,
  userId: string,
  id: string,
  input: UpdateListingInput,
): Promise<PublicListing> {
  await loadOwnedListing(deps, userId, id);

  // Only the keys the caller actually sent are patched — omitting `deposit`
  // leaves the stored deposit alone, whereas sending `{ enabled: false }`
  // deliberately clears it.
  const pricingPatch: Partial<ListingPricingData> = {
    ...(input.deposit !== undefined ? { depositAmount: toDepositAmount(input.deposit) } : {}),
    ...(input.paymentDuration !== undefined ? { paymentDuration: input.paymentDuration } : {}),
    ...(input.houseRules !== undefined ? { houseRules: input.houseRules } : {}),
    ...(input.additionalFees !== undefined ? toFeeColumns(input.additionalFees) : {}),
  };
  const hasPricingPatch = Object.keys(pricingPatch).length > 0 ? pricingPatch : null;

  const updated = await deps.listingRepository.update(id, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.kelurahan !== undefined ? { kelurahan: input.kelurahan } : {}),
    ...(input.kecamatan !== undefined ? { kecamatan: input.kecamatan } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.lat !== undefined ? { lat: input.lat } : {}),
    ...(input.lng !== undefined ? { lng: input.lng } : {}),
    ...(input.type !== undefined ? { type: TIPE_TO_KOST_TYPE[input.type] } : {}),
    ...(input.pricePerMonth !== undefined ? { pricePerMonth: input.pricePerMonth } : {}),
    ...(input.facilities !== undefined ? { facilities: input.facilities } : {}),
    ...(input.amenities !== undefined ? { amenities: input.amenities } : {}),
    ...(input.rules !== undefined ? { rules: input.rules } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(hasPricingPatch !== null ? { pricing: hasPricingPatch } : {}),
  });
  return toPublicListing(updated);
}

export interface DeleteResult {
  id: string;
  deletedAt: Date;
}

export async function deleteListing(deps: ListingDeps, userId: string, id: string): Promise<DeleteResult> {
  await loadOwnedListing(deps, userId, id);
  const deleted = await deps.listingRepository.softDelete(id);
  return { id: deleted.id, deletedAt: deleted.deletedAt as Date };
}

export async function addPhotos(
  deps: ListingDeps,
  userId: string,
  id: string,
  files: PhotoFile[],
): Promise<PublicListing> {
  const listing = await loadOwnedListing(deps, userId, id);

  if (files.length === 0) {
    throw new AppError(400, ListingErrorCode.INVALID_FILE, "No files were uploaded");
  }
  for (const file of files) {
    if (!file.mimetype.startsWith("image/")) {
      throw new AppError(400, ListingErrorCode.INVALID_FILE, `Unsupported file type: ${file.mimetype}`);
    }
  }

  const existingPhotos = Array.isArray(listing.photos) ? (listing.photos as string[]) : [];
  const totalAfterUpload = existingPhotos.length + files.length;
  if (totalAfterUpload > deps.config.maxPhotosPerListing) {
    throw new AppError(
      400,
      ListingErrorCode.TOO_MANY_PHOTOS,
      `A listing may have at most ${deps.config.maxPhotosPerListing} photos ` +
        `(has ${existingPhotos.length}, tried to add ${files.length})`,
    );
  }

  const uploaded = await Promise.all(
    files.map((file, index) => deps.photoUploader.upload(file.buffer, id, existingPhotos.length + index)),
  );
  const newPhotos = [...existingPhotos, ...uploaded.map((u) => u.url)];

  const updated = await deps.listingRepository.setPhotos(id, newPhotos);
  return toPublicListing(updated);
}
