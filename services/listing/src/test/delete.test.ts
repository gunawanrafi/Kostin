import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeListing, signAccessToken } from "./helpers.js";

describe("DELETE /listings/:id", () => {
  it("soft-deletes the listing for its owner", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app, deps } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "DELETE",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ id: string; deletedAt: string }>>();
    expect(body.data?.id).toBe(listing.id);
    expect(body.data?.deletedAt).toBeTypeOf("string");
    expect(deps.listingRepository.listings.find((l) => l.id === listing.id)?.deletedAt).not.toBeNull();
  });

  it("makes the listing invisible to GET /listings/:id afterward", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");

    await app.inject({
      method: "DELETE",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const getRes = await app.inject({ method: "GET", url: `/listings/${listing.id}` });

    expect(getRes.statusCode).toBe(404);
  });

  it("rejects a caller who doesn't own the listing with 403 FORBIDDEN", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-2", "OWNER");

    const res = await app.inject({
      method: "DELETE",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });
});
