import { describe, expect, it } from "vitest";
import { Prisma } from "@kostin/database";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeListing, signAccessToken } from "./helpers.js";
import type { PublicListing } from "../lib/dto.js";

// Malang-area cluster (A/B/C close together) + Medan (D, ~2000km away) +
// a DRAFT (E, excluded by default status filter) + a soft-deleted ACTIVE
// listing (F, must never appear).
const listingA = makeListing({
  id: "listing-a",
  title: "Kost A dekat kampus",
  createdAt: new Date("2026-01-05T00:00:00Z"),
  pricePerMonth: new Prisma.Decimal(1000000),
  lat: -7.9547,
  lng: 112.6147,
  type: "KOST_CAMPUR",
  amenities: ["wifi"],
});
const listingB = makeListing({
  id: "listing-b",
  title: "Kost B putri asri",
  createdAt: new Date("2026-01-04T00:00:00Z"),
  pricePerMonth: new Prisma.Decimal(2000000),
  lat: -7.9553,
  lng: 112.6142,
  type: "KOST_PUTRI",
  amenities: ["wifi", "ac"],
});
const listingC = makeListing({
  id: "listing-c",
  title: "Kost C putra hemat",
  createdAt: new Date("2026-01-03T00:00:00Z"),
  pricePerMonth: new Prisma.Decimal(1500000),
  lat: -7.95,
  lng: 112.61,
  type: "KOST_PUTRA",
  amenities: ["wifi", "ac", "parkir"],
});
const listingD = makeListing({
  id: "listing-d",
  title: "Kost D jauh di Medan",
  createdAt: new Date("2026-01-02T00:00:00Z"),
  pricePerMonth: new Prisma.Decimal(3000000),
  lat: 3.5952,
  lng: 98.6722,
  type: "KOST_CAMPUR",
  amenities: ["wifi"],
});
const listingDraft = makeListing({
  id: "listing-draft",
  createdAt: new Date("2026-01-06T00:00:00Z"),
  status: "DRAFT",
});
const listingDeleted = makeListing({
  id: "listing-deleted",
  createdAt: new Date("2026-01-07T00:00:00Z"),
  deletedAt: new Date("2026-01-07T01:00:00Z"),
});

function seed() {
  return [listingA, listingB, listingC, listingD, listingDraft, listingDeleted];
}

describe("GET /listings", () => {
  it("defaults to ACTIVE, non-deleted listings ordered newest first", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings" });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id)).toEqual(["listing-a", "listing-b", "listing-c", "listing-d"]);
    expect(body.meta.nextCursor).toBeNull();
  });

  it("paginates with a cursor, no overlap between pages", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const page1 = await app.inject({ method: "GET", url: "/listings?limit=2" });
    const page1Body = page1.json<ApiResponse<PublicListing[]>>();
    expect(page1Body.data?.map((l) => l.id)).toEqual(["listing-a", "listing-b"]);
    expect(page1Body.meta.nextCursor).toBeTypeOf("string");

    const page2 = await app.inject({
      method: "GET",
      url: `/listings?limit=2&cursor=${encodeURIComponent(page1Body.meta.nextCursor!)}`,
    });
    const page2Body = page2.json<ApiResponse<PublicListing[]>>();
    expect(page2Body.data?.map((l) => l.id)).toEqual(["listing-c", "listing-d"]);
    expect(page2Body.meta.nextCursor).toBeNull();
  });

  it("filters by hargaMin/hargaMax", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings?hargaMin=1200000&hargaMax=2500000" });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id).sort()).toEqual(["listing-b", "listing-c"]);
  });

  it("filters by tipe", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings?tipe=PUTRA" });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id)).toEqual(["listing-c"]);
    expect(body.data?.[0]?.tipe).toBe("PUTRA");
  });

  it("filters by fasilitas (must have every requested amenity)", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings?fasilitas=wifi,ac" });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id).sort()).toEqual(["listing-b", "listing-c"]);
  });

  it("filters by lat/lng + radiusKm, ordered nearest-first, excludes far listings", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({
      method: "GET",
      url: "/listings?lat=-7.9547&lng=112.6147&radiusKm=5",
    });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id)).toEqual(["listing-a", "listing-b", "listing-c"]);
    expect(body.data?.[0]?.distanceKm).toBe(0);
    for (const l of body.data ?? []) {
      expect(l.distanceKm).toBeLessThanOrEqual(5);
    }
  });

  it("shrinks the geo match set with a tighter radius", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({
      method: "GET",
      url: "/listings?lat=-7.9547&lng=112.6147&radiusKm=0.1",
    });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id)).toEqual(["listing-a", "listing-b"]);
  });

  it("rejects lat without lng with 400 VALIDATION_ERROR", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings?lat=-7.9547" });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a malformed cursor with 400 INVALID_CURSOR", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings?cursor=not-a-valid-cursor" });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_CURSOR");
  });

  describe("mine=true (owner dashboard)", () => {
    it("returns every status (not just ACTIVE) for the authenticated owner", async () => {
      const { app } = buildTestApp({ listings: seed() });
      const token = signAccessToken("owner-1", "OWNER");

      const res = await app.inject({
        method: "GET",
        url: "/listings?mine=true",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<PublicListing[]>>();
      // listing-draft (DRAFT) included, listing-deleted (soft-deleted) never is.
      expect(body.data?.map((l) => l.id)).toEqual([
        "listing-draft",
        "listing-a",
        "listing-b",
        "listing-c",
        "listing-d",
      ]);
    });

    it("returns an empty list for an owner with no listings", async () => {
      const { app } = buildTestApp({ listings: seed() });
      const token = signAccessToken("owner-2", "OWNER");

      const res = await app.inject({
        method: "GET",
        url: "/listings?mine=true",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.json<ApiResponse<PublicListing[]>>().data).toEqual([]);
    });

    it("rejects an unauthenticated request with 401 UNAUTHORIZED", async () => {
      const { app } = buildTestApp({ listings: seed() });

      const res = await app.inject({ method: "GET", url: "/listings?mine=true" });

      expect(res.statusCode).toBe(401);
    });

    it("rejects a non-OWNER role with 403 FORBIDDEN", async () => {
      const { app } = buildTestApp({ listings: seed() });
      const token = signAccessToken("student-1", "STUDENT");

      const res = await app.inject({
        method: "GET",
        url: "/listings?mine=true",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("does not require auth when mine is omitted (public browsing unaffected)", async () => {
      const { app } = buildTestApp({ listings: seed() });

      const res = await app.inject({ method: "GET", url: "/listings" });

      expect(res.statusCode).toBe(200);
    });
  });
});
