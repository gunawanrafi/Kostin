import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeListing } from "./helpers.js";
import type { PublicListing } from "../lib/dto.js";

const listing1 = makeListing({
  id: "search-1",
  title: "Kost Nyaman Sumbersari",
  description: "Dekat kampus, nyaman dan aman, wifi cepat.",
  type: "KOST_CAMPUR",
});
const listing2 = makeListing({
  id: "search-2",
  title: "Kost Elite Dinoyo",
  description: "Fasilitas lengkap, ada kolam renang dan gym.",
  type: "KOST_PUTRI",
});
const listing3 = makeListing({
  id: "search-3",
  title: "Kost Griya Asri Lowokwaru",
  description: "Kost nyaman dan tenang, cocok untuk belajar.",
  type: "KOST_PUTRA",
});
const listingDraftMatch = makeListing({
  id: "search-draft",
  title: "Kost Nyaman Tapi Draft",
  status: "DRAFT",
});
const listingDeletedMatch = makeListing({
  id: "search-deleted",
  title: "Kost Nyaman Tapi Dihapus",
  deletedAt: new Date(),
});

function seed() {
  return [listing1, listing2, listing3, listingDraftMatch, listingDeletedMatch];
}

describe("GET /listings/search", () => {
  it("ranks results by relevance and excludes non-matches", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings/search?q=nyaman" });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicListing[]>>();
    // listing1 mentions "nyaman" in both title and description (higher rank)
    expect(body.data?.map((l) => l.id)).toEqual(["search-1", "search-3"]);
  });

  it("matches multi-word queries against title+description+address", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings/search?q=kolam renang" });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id)).toEqual(["search-2"]);
  });

  it("excludes DRAFT and soft-deleted listings even when they match", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings/search?q=nyaman" });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id)).not.toContain("search-draft");
    expect(body.data?.map((l) => l.id)).not.toContain("search-deleted");
  });

  it("returns an empty page for no matches", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings/search?q=tidakada" });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data).toEqual([]);
    expect(body.meta.nextCursor).toBeNull();
  });

  it("combines full-text search with the tipe filter", async () => {
    const { app } = buildTestApp({ listings: seed() });

    const res = await app.inject({ method: "GET", url: "/listings/search?q=kost&tipe=PUTRI" });

    const body = res.json<ApiResponse<PublicListing[]>>();
    expect(body.data?.map((l) => l.id)).toEqual(["search-2"]);
  });

  it("paginates search results by cursor without duplicates", async () => {
    const { app } = buildTestApp({ listings: seed() });
    const seen = new Set<string>();
    let cursor: string | null = null;

    for (let i = 0; i < 5; i++) {
      const url: string = cursor
        ? `/listings/search?q=kost&limit=1&cursor=${encodeURIComponent(cursor)}`
        : "/listings/search?q=kost&limit=1";
      const res = await app.inject({ method: "GET", url });
      const body = res.json<ApiResponse<PublicListing[]>>();
      for (const item of body.data ?? []) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
      cursor = body.meta.nextCursor ?? null;
      if (!cursor) break;
    }

    expect(seen).toEqual(new Set(["search-1", "search-2", "search-3"]));
  });
});
