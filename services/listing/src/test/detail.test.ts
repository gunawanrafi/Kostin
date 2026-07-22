import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeListing } from "./helpers.js";
import type { PublicListing } from "../lib/dto.js";

describe("GET /listings/:id", () => {
  it("returns the listing", async () => {
    const listing = makeListing({ title: "Kost Griya Asri" });
    const { app } = buildTestApp({ listings: [listing] });

    const res = await app.inject({ method: "GET", url: `/listings/${listing.id}` });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicListing>>();
    expect(body.data?.id).toBe(listing.id);
    expect(body.data?.title).toBe("Kost Griya Asri");
    expect(body.data?.tipe).toBe("CAMPUR");
    expect(body.data?.pricePerMonth).toBe(1500000);
  });

  it("returns 404 for an unknown id", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "GET", url: "/listings/does-not-exist" });

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a soft-deleted listing", async () => {
    const listing = makeListing({ deletedAt: new Date() });
    const { app } = buildTestApp({ listings: [listing] });

    const res = await app.inject({ method: "GET", url: `/listings/${listing.id}` });

    expect(res.statusCode).toBe(404);
  });
});
