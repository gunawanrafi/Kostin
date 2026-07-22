import type { KostType, Listing, ListingStatus, PrismaClient } from "@kostin/database";
import { Prisma } from "@kostin/database";
import { decodeCursor, encodeCursor } from "./cursor.js";

export interface ListingFilters {
  minPrice?: number;
  maxPrice?: number;
  type?: KostType;
  facilities?: string[];
  status?: ListingStatus;
  ownerId?: string;
}

export interface GeoFilter {
  lat: number;
  lng: number;
  radiusKm?: number;
}

export interface ListPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CreateListingData {
  ownerId: string;
  title: string;
  description: string;
  address: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  lat: number;
  lng: number;
  type: KostType;
  pricePerMonth: number;
  facilities: Record<string, unknown>;
  amenities: string[];
  rules: string[];
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  address?: string;
  kelurahan?: string;
  kecamatan?: string;
  city?: string;
  lat?: number;
  lng?: number;
  type?: KostType;
  pricePerMonth?: number;
  facilities?: Record<string, unknown>;
  amenities?: string[];
  rules?: string[];
  status?: ListingStatus;
}

export type ListingWithDistance = Listing & { distanceKm?: number };
export type ListingWithRank = Listing & { rank?: number };

export interface ListingRepository {
  findById(id: string): Promise<Listing | null>;
  list(
    filters: ListingFilters,
    geo: GeoFilter | null,
    cursor: string | null,
    limit: number,
  ): Promise<ListPage<ListingWithDistance>>;
  search(
    query: string,
    filters: ListingFilters,
    cursor: string | null,
    limit: number,
  ): Promise<ListPage<ListingWithRank>>;
  create(input: CreateListingData): Promise<Listing>;
  update(id: string, input: UpdateListingData): Promise<Listing>;
  softDelete(id: string): Promise<Listing>;
  setPhotos(id: string, photos: string[]): Promise<Listing>;
}

const DEFAULT_STATUS: ListingStatus = "ACTIVE";

// The public ACTIVE-only default only applies when browsing broadly. Once a
// query is scoped to a specific owner (the "mine=true" dashboard mode), the
// owner needs to see their DRAFT/PENDING_REVIEW/INACTIVE listings too — so
// an explicit ownerId suppresses the default unless a status was also given.
function resolveStatus(filters: ListingFilters): ListingStatus | undefined {
  return filters.status ?? (filters.ownerId ? undefined : DEFAULT_STATUS);
}

function buildWhere(filters: ListingFilters): Prisma.ListingWhereInput {
  const status = resolveStatus(filters);
  const where: Prisma.ListingWhereInput = {
    deletedAt: null,
    ...(status !== undefined ? { status } : {}),
    ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
  };
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.pricePerMonth = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.type) where.type = filters.type;
  if (filters.facilities?.length) where.amenities = { hasEvery: filters.facilities };
  return where;
}

// Same filters as buildWhere(), expressed as a raw-SQL fragment for the geo
// and full-text-search paths that can't be expressed with the query builder.
// Casts enum columns to text (Postgres won't compare enum = text directly).
function buildRawWhere(filters: ListingFilters): Prisma.Sql {
  const status = resolveStatus(filters);
  const conditions: Prisma.Sql[] = [Prisma.sql`"deletedAt" IS NULL`];
  if (status !== undefined) conditions.push(Prisma.sql`"status"::text = ${status}`);
  if (filters.ownerId) conditions.push(Prisma.sql`"ownerId" = ${filters.ownerId}`);
  if (filters.minPrice != null) conditions.push(Prisma.sql`"pricePerMonth" >= ${filters.minPrice}`);
  if (filters.maxPrice != null) conditions.push(Prisma.sql`"pricePerMonth" <= ${filters.maxPrice}`);
  if (filters.type) conditions.push(Prisma.sql`"type"::text = ${filters.type}`);
  if (filters.facilities?.length) {
    const arr = Prisma.join(
      filters.facilities.map((f) => Prisma.sql`${f}`),
      ", ",
    );
    conditions.push(Prisma.sql`"amenities" @> ARRAY[${arr}]::text[]`);
  }
  return Prisma.join(conditions, " AND ");
}

// Haversine great-circle distance, mirrored exactly in lib/geo.ts's
// haversineKm() so the in-memory test fake agrees with this SQL.
function haversineSql(lat: number, lng: number): Prisma.Sql {
  return Prisma.sql`(
    6371 * 2 * asin(sqrt(
      power(sin(radians("lat" - ${lat}) / 2), 2) +
      cos(radians(${lat})) * cos(radians("lat")) * power(sin(radians("lng" - ${lng}) / 2), 2)
    ))
  )`;
}

async function listWithGeo(
  prisma: PrismaClient,
  filters: ListingFilters,
  geo: GeoFilter,
  cursorRaw: string | null,
  limit: number,
): Promise<ListPage<ListingWithDistance>> {
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const cursorDistance = cursor ? Number(cursor.v) : null;
  const cursorId = cursor ? cursor.id : null;

  const rows = await prisma.$queryRaw<ListingWithDistance[]>(Prisma.sql`
    WITH scored AS (
      SELECT *, ${haversineSql(geo.lat, geo.lng)} AS "distanceKm"
      FROM "listings"
      WHERE ${buildRawWhere(filters)}
    )
    SELECT * FROM scored
    WHERE ${geo.radiusKm != null ? Prisma.sql`"distanceKm" <= ${geo.radiusKm}` : Prisma.sql`TRUE`}
      ${
        cursor
          ? Prisma.sql`AND ("distanceKm" > ${cursorDistance} OR ("distanceKm" = ${cursorDistance} AND "id" > ${cursorId}))`
          : Prisma.empty
      }
    ORDER BY "distanceKm" ASC, "id" ASC
    LIMIT ${limit + 1}
  `);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ v: last.distanceKm ?? 0, id: last.id }) : null;
  return { items, nextCursor };
}

export function createPrismaListingRepository(prisma: PrismaClient): ListingRepository {
  return {
    findById: (id) => prisma.listing.findFirst({ where: { id, deletedAt: null } }),

    list: async (filters, geo, cursorRaw, limit) => {
      if (geo) return listWithGeo(prisma, filters, geo, cursorRaw, limit);

      const AND: Prisma.ListingWhereInput[] = [buildWhere(filters)];
      if (cursorRaw) {
        const c = decodeCursor(cursorRaw);
        const createdAt = new Date(String(c.v));
        AND.push({
          OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: c.id } }],
        });
      }

      const rows = await prisma.listing.findMany({
        where: { AND },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const last = items[items.length - 1];
      const nextCursor =
        hasMore && last ? encodeCursor({ v: last.createdAt.toISOString(), id: last.id }) : null;
      return { items, nextCursor };
    },

    search: async (query, filters, cursorRaw, limit) => {
      const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
      const cursorRank = cursor ? Number(cursor.v) : null;
      const cursorId = cursor ? cursor.id : null;

      // 'simple' config (lowercase + tokenize, no stemming) — Postgres ships
      // no built-in Indonesian text-search dictionary.
      const tsVector = Prisma.sql`to_tsvector('simple',
        coalesce("title", '') || ' ' || coalesce("description", '') || ' ' ||
        coalesce("address", '') || ' ' || coalesce("kelurahan", '') || ' ' || coalesce("kecamatan", '')
      )`;
      const tsQuery = Prisma.sql`plainto_tsquery('simple', ${query})`;

      const rows = await prisma.$queryRaw<ListingWithRank[]>(Prisma.sql`
        WITH scored AS (
          SELECT *, ts_rank(${tsVector}, ${tsQuery}) AS "rank"
          FROM "listings"
          WHERE ${buildRawWhere(filters)} AND ${tsVector} @@ ${tsQuery}
        )
        SELECT * FROM scored
        WHERE "rank" > 0
          ${
            cursor
              ? Prisma.sql`AND ("rank" < ${cursorRank} OR ("rank" = ${cursorRank} AND "id" < ${cursorId}))`
              : Prisma.empty
          }
        ORDER BY "rank" DESC, "id" DESC
        LIMIT ${limit + 1}
      `);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const last = items[items.length - 1];
      const nextCursor = hasMore && last ? encodeCursor({ v: last.rank ?? 0, id: last.id }) : null;
      return { items, nextCursor };
    },

    create: (input) =>
      prisma.listing.create({
        data: { ...input, facilities: input.facilities as Prisma.InputJsonValue },
      }),

    update: (id, input) => {
      const data: Prisma.ListingUpdateInput = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.kelurahan !== undefined ? { kelurahan: input.kelurahan } : {}),
        ...(input.kecamatan !== undefined ? { kecamatan: input.kecamatan } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.lat !== undefined ? { lat: input.lat } : {}),
        ...(input.lng !== undefined ? { lng: input.lng } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.pricePerMonth !== undefined ? { pricePerMonth: input.pricePerMonth } : {}),
        ...(input.facilities !== undefined
          ? { facilities: input.facilities as Prisma.InputJsonValue }
          : {}),
        ...(input.amenities !== undefined ? { amenities: { set: input.amenities } } : {}),
        ...(input.rules !== undefined ? { rules: { set: input.rules } } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      return prisma.listing.update({ where: { id }, data });
    },

    softDelete: (id) => prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } }),

    setPhotos: (id, photos) => prisma.listing.update({ where: { id }, data: { photos } }),
  };
}
