import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildMultipartBody, buildTestApp, makeListing, signAccessToken } from "./helpers.js";
import type { PublicListing } from "../lib/dto.js";

const fakeJpeg = () => Buffer.from("fake-jpeg-bytes");

describe("POST /listings/:id/photos", () => {
  it("uploads photos to Cloudinary and appends their URLs", async () => {
    const listing = makeListing({ ownerId: "owner-1", photos: [] });
    const { app, deps } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");
    const { payload, contentType } = buildMultipartBody([
      { filename: "a.jpg", content: fakeJpeg(), contentType: "image/jpeg" },
      { filename: "b.jpg", content: fakeJpeg(), contentType: "image/jpeg" },
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/listings/${listing.id}/photos`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicListing>>();
    expect(body.data?.photos).toHaveLength(2);
    expect(body.data?.photos[0]).toContain(`kostin/listings/${listing.id}`);
    expect(deps.photoUploader.uploads).toHaveLength(2);
  });

  it("rejects uploads that would exceed the 20-photo limit", async () => {
    const existingPhotos = Array.from({ length: 19 }, (_, i) => `https://res.cloudinary.com/test/${i}.jpg`);
    const listing = makeListing({ ownerId: "owner-1", photos: existingPhotos });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");
    const { payload, contentType } = buildMultipartBody([
      { filename: "a.jpg", content: fakeJpeg(), contentType: "image/jpeg" },
      { filename: "b.jpg", content: fakeJpeg(), contentType: "image/jpeg" },
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/listings/${listing.id}/photos`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("TOO_MANY_PHOTOS");
  });

  it("rejects non-image files with 400 INVALID_FILE", async () => {
    const listing = makeListing({ ownerId: "owner-1", photos: [] });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");
    const { payload, contentType } = buildMultipartBody([
      { filename: "a.pdf", content: Buffer.from("%PDF-1.4"), contentType: "application/pdf" },
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/listings/${listing.id}/photos`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_FILE");
  });

  it("rejects a caller who doesn't own the listing with 403 FORBIDDEN", async () => {
    const listing = makeListing({ ownerId: "owner-1", photos: [] });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-2", "OWNER");
    const { payload, contentType } = buildMultipartBody([
      { filename: "a.jpg", content: fakeJpeg(), contentType: "image/jpeg" },
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/listings/${listing.id}/photos`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(403);
  });
});
