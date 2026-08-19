import jwt from "jsonwebtoken";
import { Prisma, type Listing, type Room } from "@kostin/database";
import { buildApp } from "../app.js";
import type { ListingConfig } from "../config.js";
import { decodeCursor, encodeCursor } from "../lib/cursor.js";
import { haversineKm } from "../lib/geo.js";
import type {
  CreateListingData,
  GeoFilter,
  ListingFilters,
  ListingRepository,
  UpdateListingData,
} from "../lib/listing-repository.js";
import type { PhotoUploader, PhotoUploadResult } from "../lib/photo-uploader.js";
import type {
  CreateRoomData,
  RoomRepository,
  UpdateRoomData,
} from "../lib/room-repository.js";

export function testConfig(overrides: Partial<ListingConfig> = {}): ListingConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    corsOrigin: "*",
    databaseUrl: "",
    jwtAccessSecret: "test_access_secret",
    defaultPageSize: 20,
    maxPageSize: 50,
    maxPhotosPerListing: 20,
    maxPhotoUploadBytes: 5 * 1024 * 1024,
    maxRoomsPerListing: 200,
    cloudinaryCloudName: "test-cloud",
    cloudinaryApiKey: "test-key",
    cloudinaryApiSecret: "test-secret",
    ...overrides,
  };
}

// Hand-rolled multipart/form-data body — light-my-request (Fastify's inject())
// doesn't accept a FormData payload, so tests build the wire format directly.
export function buildMultipartBody(
  files: Array<{ filename: string; content: Buffer; contentType: string }>,
  fieldName = "photos",
): { payload: Buffer; contentType: string } {
  const boundary = `----kostinTestBoundary${crypto.randomUUID().replace(/-/g, "")}`;
  const parts: Buffer[] = [];
  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${fieldName}"; filename="${file.filename}"\r\n` +
          `Content-Type: ${file.contentType}\r\n\r\n`,
      ),
    );
    parts.push(file.content);
    parts.push(Buffer.from("\r\n"));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { payload: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

export function signAccessToken(
  userId: string,
  role: string,
  secret: string = testConfig().jwtAccessSecret,
): string {
  return jwt.sign({ sub: userId, role, type: "access" }, secret, { expiresIn: "15m" });
}

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    ownerId: "owner-1",
    title: "Kost Nyaman Dekat Kampus Brawijaya",
    description: "Kost bersih, aman, dan nyaman dekat kampus dengan fasilitas lengkap dan wifi cepat.",
    address: "Jl. Sumbersari No. 1",
    kelurahan: "Sumbersari",
    kecamatan: "Lowokwaru",
    city: "Malang",
    lat: -7.9547,
    lng: 112.6147,
    type: "KOST_CAMPUR",
    pricePerMonth: new Prisma.Decimal(1500000),
    facilities: {},
    photos: [],
    amenities: ["wifi", "ac"],
    rules: ["Dilarang merokok"],
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    depositAmount: null,
    paymentDuration: "MONTHLY",
    houseRules: {},
    feeExtraOccupant: null,
    feeMotorcycleParking: null,
    feeCarParking: null,
    ...overrides,
  };
}

function cloneListing(l: Listing): Listing {
  return {
    ...l,
    facilities: JSON.parse(JSON.stringify(l.facilities)) as Prisma.JsonValue,
    photos: JSON.parse(JSON.stringify(l.photos)) as Prisma.JsonValue,
    houseRules: JSON.parse(JSON.stringify(l.houseRules)) as Prisma.JsonValue,
    amenities: [...l.amenities],
    rules: [...l.rules],
  };
}

function priceOf(l: Listing): number {
  return l.pricePerMonth instanceof Prisma.Decimal ? l.pricePerMonth.toNumber() : Number(l.pricePerMonth);
}

// Mirrors listing-repository.ts's resolveStatus(): the public ACTIVE-only
// default is suppressed once a query is scoped to a specific owner.
function matchesFilters(l: Listing, filters: ListingFilters): boolean {
  if (l.deletedAt) return false;
  if (filters.ownerId && l.ownerId !== filters.ownerId) return false;
  const status = filters.status ?? (filters.ownerId ? undefined : "ACTIVE");
  if (status !== undefined && l.status !== status) return false;
  const price = priceOf(l);
  if (filters.minPrice != null && price < filters.minPrice) return false;
  if (filters.maxPrice != null && price > filters.maxPrice) return false;
  if (filters.type && l.type !== filters.type) return false;
  if (filters.facilities?.length) {
    const has = new Set(l.amenities);
    if (!filters.facilities.every((f) => has.has(f))) return false;
  }
  return true;
}

// Mirrors ts_rank's "does it match at all" gate loosely: count term
// occurrences across the same columns the raw SQL concatenates. Good enough
// for exercising ranking/pagination behavior without a real Postgres tsvector.
function simpleRank(l: Listing, query: string): number {
  const haystack = `${l.title} ${l.description} ${l.address} ${l.kelurahan} ${l.kecamatan}`.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    score += haystack.split(term).length - 1;
  }
  return score;
}

function compareIdDesc(a: string, b: string): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

// In-memory ListingRepository fake — replicates the Prisma-backed
// implementation's filtering/geo/rank/cursor logic in plain JS (including
// lib/geo.ts's haversineKm, kept numerically identical to the raw-SQL
// Haversine expression) so tests don't need a live Postgres.
export function createFakeListingRepository(
  seed: Listing[] = [],
): ListingRepository & { listings: Listing[] } {
  const listings = [...seed];

  return {
    listings,

    findById: async (id) => {
      const found = listings.find((l) => l.id === id && !l.deletedAt);
      return found ? cloneListing(found) : null;
    },

    list: async (filters, geo: GeoFilter | null, cursorRaw, limit) => {
      let rows = listings.filter((l) => matchesFilters(l, filters));

      if (geo) {
        const withDistance = rows.map((l) => ({
          listing: l,
          distanceKm: haversineKm(geo.lat, geo.lng, l.lat, l.lng),
        }));
        const inRadius = withDistance.filter((r) => geo.radiusKm == null || r.distanceKm <= geo.radiusKm);
        inRadius.sort((a, b) => a.distanceKm - b.distanceKm || (a.listing.id < b.listing.id ? -1 : 1));

        let filtered = inRadius;
        if (cursorRaw) {
          const c = decodeCursor(cursorRaw);
          const cd = Number(c.v);
          filtered = inRadius.filter(
            (r) => r.distanceKm > cd || (r.distanceKm === cd && r.listing.id > c.id),
          );
        }

        const hasMore = filtered.length > limit;
        const page = filtered.slice(0, limit);
        const last = page[page.length - 1];
        const nextCursor =
          hasMore && last ? encodeCursor({ v: last.distanceKm, id: last.listing.id }) : null;
        return {
          items: page.map((r) => ({ ...cloneListing(r.listing), distanceKm: r.distanceKm })),
          nextCursor,
        };
      }

      rows = [...rows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || compareIdDesc(a.id, b.id),
      );
      if (cursorRaw) {
        const c = decodeCursor(cursorRaw);
        const cd = new Date(String(c.v)).getTime();
        rows = rows.filter(
          (l) => l.createdAt.getTime() < cd || (l.createdAt.getTime() === cd && l.id < c.id),
        );
      }

      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);
      const last = items[items.length - 1];
      const nextCursor =
        hasMore && last ? encodeCursor({ v: last.createdAt.toISOString(), id: last.id }) : null;
      return { items: items.map(cloneListing), nextCursor };
    },

    search: async (query, filters, cursorRaw, limit) => {
      const ranked = listings
        .filter((l) => matchesFilters(l, filters))
        .map((l) => ({ listing: l, rank: simpleRank(l, query) }))
        .filter((r) => r.rank > 0);
      ranked.sort((a, b) => b.rank - a.rank || compareIdDesc(a.listing.id, b.listing.id));

      let filtered = ranked;
      if (cursorRaw) {
        const c = decodeCursor(cursorRaw);
        const cr = Number(c.v);
        filtered = ranked.filter((r) => r.rank < cr || (r.rank === cr && r.listing.id < c.id));
      }

      const hasMore = filtered.length > limit;
      const page = filtered.slice(0, limit);
      const last = page[page.length - 1];
      const nextCursor = hasMore && last ? encodeCursor({ v: last.rank, id: last.listing.id }) : null;
      return {
        items: page.map((r) => ({ ...cloneListing(r.listing), rank: r.rank })),
        nextCursor,
      };
    },

    create: async (input: CreateListingData) => {
      const now = new Date();
      const listing: Listing = {
        id: crypto.randomUUID(),
        ownerId: input.ownerId,
        title: input.title,
        description: input.description,
        address: input.address,
        kelurahan: input.kelurahan,
        kecamatan: input.kecamatan,
        city: input.city,
        lat: input.lat,
        lng: input.lng,
        type: input.type,
        pricePerMonth: new Prisma.Decimal(input.pricePerMonth),
        facilities: input.facilities as Prisma.JsonValue,
        photos: [],
        amenities: input.amenities,
        rules: input.rules,
        status: "DRAFT",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        // Mirrors the Prisma mapping: Decimal columns for money, Json for the
        // rule flags.
        depositAmount:
          input.pricing.depositAmount == null ? null : new Prisma.Decimal(input.pricing.depositAmount),
        paymentDuration: input.pricing.paymentDuration,
        houseRules: input.pricing.houseRules as unknown as Prisma.JsonValue,
        feeExtraOccupant:
          input.pricing.feeExtraOccupant == null
            ? null
            : new Prisma.Decimal(input.pricing.feeExtraOccupant),
        feeMotorcycleParking:
          input.pricing.feeMotorcycleParking == null
            ? null
            : new Prisma.Decimal(input.pricing.feeMotorcycleParking),
        feeCarParking:
          input.pricing.feeCarParking == null ? null : new Prisma.Decimal(input.pricing.feeCarParking),
      };
      listings.push(listing);
      return cloneListing(listing);
    },

    update: async (id, input: UpdateListingData) => {
      const listing = listings.find((l) => l.id === id);
      if (!listing) throw new Error("Listing not found");
      if (input.title !== undefined) listing.title = input.title;
      if (input.description !== undefined) listing.description = input.description;
      if (input.address !== undefined) listing.address = input.address;
      if (input.kelurahan !== undefined) listing.kelurahan = input.kelurahan;
      if (input.kecamatan !== undefined) listing.kecamatan = input.kecamatan;
      if (input.city !== undefined) listing.city = input.city;
      if (input.lat !== undefined) listing.lat = input.lat;
      if (input.lng !== undefined) listing.lng = input.lng;
      if (input.type !== undefined) listing.type = input.type;
      if (input.pricePerMonth !== undefined) listing.pricePerMonth = new Prisma.Decimal(input.pricePerMonth);
      if (input.facilities !== undefined) listing.facilities = input.facilities as Prisma.JsonValue;
      if (input.amenities !== undefined) listing.amenities = input.amenities;
      if (input.rules !== undefined) listing.rules = input.rules;
      if (input.status !== undefined) listing.status = input.status;
      // `undefined` checks, not truthiness — null is a real write here
      // (clearing a deposit or a fee).
      const p = input.pricing;
      if (p?.depositAmount !== undefined) {
        listing.depositAmount = p.depositAmount == null ? null : new Prisma.Decimal(p.depositAmount);
      }
      if (p?.paymentDuration !== undefined) listing.paymentDuration = p.paymentDuration;
      if (p?.houseRules !== undefined) {
        listing.houseRules = p.houseRules as unknown as Prisma.JsonValue;
      }
      if (p?.feeExtraOccupant !== undefined) {
        listing.feeExtraOccupant =
          p.feeExtraOccupant == null ? null : new Prisma.Decimal(p.feeExtraOccupant);
      }
      if (p?.feeMotorcycleParking !== undefined) {
        listing.feeMotorcycleParking =
          p.feeMotorcycleParking == null ? null : new Prisma.Decimal(p.feeMotorcycleParking);
      }
      if (p?.feeCarParking !== undefined) {
        listing.feeCarParking = p.feeCarParking == null ? null : new Prisma.Decimal(p.feeCarParking);
      }
      listing.updatedAt = new Date();
      return cloneListing(listing);
    },

    softDelete: async (id) => {
      const listing = listings.find((l) => l.id === id);
      if (!listing) throw new Error("Listing not found");
      listing.deletedAt = new Date();
      listing.updatedAt = new Date();
      return cloneListing(listing);
    },

    setPhotos: async (id, photos) => {
      const listing = listings.find((l) => l.id === id);
      if (!listing) throw new Error("Listing not found");
      listing.photos = photos;
      listing.updatedAt = new Date();
      return cloneListing(listing);
    },
  };
}

export function createFakePhotoUploader(): PhotoUploader & {
  uploads: Array<{ listingId: string; index: number }>;
} {
  const uploads: Array<{ listingId: string; index: number }> = [];
  return {
    uploads,
    upload: async (_buffer: Buffer, listingId: string, index: number): Promise<PhotoUploadResult> => {
      uploads.push({ listingId, index });
      return { url: `https://res.cloudinary.com/test-cloud/image/upload/kostin/listings/${listingId}/${index}.jpg` };
    },
  };
}

export interface TestDepsOverrides {
  config?: Partial<ListingConfig>;
  listings?: Listing[];
  rooms?: Room[];
}

export function createTestDeps(overrides: TestDepsOverrides = {}) {
  return {
    config: testConfig(overrides.config),
    listingRepository: createFakeListingRepository(overrides.listings),
    roomRepository: createFakeRoomRepository(overrides.rooms),
    photoUploader: createFakePhotoUploader(),
  };
}

// Wires createTestDeps() straight into buildApp() with logging silenced, so
// each test file just does `const app = buildTestApp()` and gets a fully
// isolated Fastify instance backed by in-memory fakes.
export function buildTestApp(overrides: TestDepsOverrides = {}) {
  const deps = createTestDeps(overrides);
  const app = buildApp({ ...deps, logger: false });
  return { app, deps };
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    listingId: "listing-1",
    name: "A1",
    type: "STANDARD",
    pricePerMonth: new Prisma.Decimal(1200000),
    sizeSqm: 9,
    maxOccupants: 1,
    imageUrls: [],
    amenities: ["ac"],
    status: "AVAILABLE",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function cloneRoom(r: Room): Room {
  return { ...r, amenities: [...r.amenities], imageUrls: [...r.imageUrls] };
}

// In-memory RoomRepository fake. Mirrors the Prisma-backed implementation,
// including the deletedAt filter on every read — a soft-deleted room must be
// invisible to findById as well as to the list.
export function createFakeRoomRepository(seed: Room[] = []): RoomRepository & { rooms: Room[] } {
  const rooms = [...seed];

  return {
    rooms,

    findById: async (id) => {
      const found = rooms.find((r) => r.id === id && !r.deletedAt);
      return found ? cloneRoom(found) : null;
    },

    findByListingId: async (listingId) =>
      rooms
        .filter((r) => r.listingId === listingId && !r.deletedAt)
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name) || a.createdAt.getTime() - b.createdAt.getTime(),
        )
        .map(cloneRoom),

    countByListingId: async (listingId) =>
      rooms.filter((r) => r.listingId === listingId && !r.deletedAt).length,

    create: async (input: CreateRoomData) => {
      const now = new Date();
      const room: Room = {
        id: crypto.randomUUID(),
        listingId: input.listingId,
        name: input.name,
        type: input.type,
        pricePerMonth: new Prisma.Decimal(input.pricePerMonth),
        sizeSqm: input.sizeSqm,
        maxOccupants: input.maxOccupants,
        imageUrls: input.imageUrls,
        amenities: input.amenities,
        status: input.status,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      rooms.push(room);
      return cloneRoom(room);
    },

    update: async (id, input: UpdateRoomData) => {
      const room = rooms.find((r) => r.id === id);
      if (!room) throw new Error("Room not found");
      if (input.name !== undefined) room.name = input.name;
      if (input.type !== undefined) room.type = input.type;
      if (input.pricePerMonth !== undefined) {
        room.pricePerMonth = new Prisma.Decimal(input.pricePerMonth);
      }
      // undefined check, not truthiness — null clears the size.
      if (input.sizeSqm !== undefined) room.sizeSqm = input.sizeSqm;
      if (input.maxOccupants !== undefined) room.maxOccupants = input.maxOccupants;
      if (input.amenities !== undefined) room.amenities = input.amenities;
      if (input.imageUrls !== undefined) room.imageUrls = input.imageUrls;
      if (input.status !== undefined) room.status = input.status;
      room.updatedAt = new Date();
      return cloneRoom(room);
    },

    softDelete: async (id) => {
      const room = rooms.find((r) => r.id === id);
      if (!room) throw new Error("Room not found");
      room.deletedAt = new Date();
      room.updatedAt = new Date();
      return cloneRoom(room);
    },
  };
}
