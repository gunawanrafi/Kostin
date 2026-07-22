import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeListing, makeRoom, signAccessToken } from "./helpers.js";
import type { PublicBooking } from "../lib/dto.js";

const validPayload = {
  listingId: "listing-1",
  checkIn: "2026-08-01T00:00:00.000Z",
  durationMonths: 3,
  notes: "Mohon kamar di lantai 1",
};

describe("POST /bookings", () => {
  it("creates a booking priced from the listing and schedules the auto-cancel job", async () => {
    const listing = makeListing();
    const { app, deps } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<PublicBooking>>();
    expect(body.data?.studentId).toBe("student-1");
    expect(body.data?.ownerId).toBe(listing.ownerId);
    expect(body.data?.status).toBe("PENDING");
    expect(body.data?.totalPrice).toBe(1500000 * 3);
    expect(body.data?.checkOut).toBe("2026-11-01T00:00:00.000Z");

    const bookingId = body.data!.id;
    expect(deps.bookingQueue.scheduled.has(bookingId)).toBe(true);
    expect(deps.bookingQueue.scheduled.get(bookingId)?.delayMs).toBe(deps.config.autoCancelDelayMs);
  });

  it("prices from the room when roomId is given", async () => {
    const listing = makeListing();
    const room = makeRoom({ pricePerMonth: makeRoom().pricePerMonth });
    const { app } = buildTestApp({ listings: [listing], rooms: [room] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload, roomId: room.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<PublicBooking>>();
    expect(body.data?.roomId).toBe(room.id);
    expect(body.data?.totalPrice).toBe(1200000 * 3);
  });

  it("clears any saved draft for the listing on success", async () => {
    const listing = makeListing();
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("student-1", "STUDENT");

    await app.inject({
      method: "PUT",
      url: `/bookings/draft/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { step: "duration", durationMonths: 3 },
    });
    await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload,
    });
    const draftRes = await app.inject({
      method: "GET",
      url: `/bookings/draft/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(draftRes.statusCode).toBe(404);
  });

  it("rejects an unknown listingId with 404 NOT_FOUND", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload,
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects booking a non-ACTIVE listing with 409 LISTING_NOT_BOOKABLE", async () => {
    const listing = makeListing({ status: "DRAFT" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("LISTING_NOT_BOOKABLE");
  });

  it("rejects an owner booking their own listing with 400 SELF_BOOKING", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("SELF_BOOKING");
  });

  it("rejects an unavailable room with 409 ROOM_NOT_AVAILABLE", async () => {
    const listing = makeListing();
    const room = makeRoom({ available: false });
    const { app } = buildTestApp({ listings: [listing], rooms: [room] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload, roomId: room.id },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("ROOM_NOT_AVAILABLE");
  });

  it("rejects a room belonging to a different listing with 404 NOT_FOUND", async () => {
    const listing = makeListing();
    const room = makeRoom({ listingId: "some-other-listing" });
    const { app } = buildTestApp({ listings: [listing], rooms: [room] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload, roomId: room.id },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects a request with no Authorization header", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "POST", url: "/bookings", payload: validPayload });

    expect(res.statusCode).toBe(401);
  });

  it("rejects an invalid body with 400 VALIDATION_ERROR", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload, durationMonths: 0 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });
});
