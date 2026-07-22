import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeListing, signAccessToken } from "./helpers.js";
import type { PublicListing } from "../lib/dto.js";

describe("PATCH /listings/:id", () => {
  it("updates fields for the owning OWNER", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { pricePerMonth: 1750000, status: "INACTIVE" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicListing>>();
    expect(body.data?.pricePerMonth).toBe(1750000);
    expect(body.data?.status).toBe("INACTIVE");
  });

  it("rejects a caller who doesn't own the listing with 403 FORBIDDEN", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-2", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Kost Baru Nama Lain" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("returns 404 for an unknown listing", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: "/listings/does-not-exist",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Kost Baru Nama Lain" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects a STUDENT role with 403 FORBIDDEN", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Kost Baru Nama Lain" },
    });

    expect(res.statusCode).toBe(403);
  });
});
