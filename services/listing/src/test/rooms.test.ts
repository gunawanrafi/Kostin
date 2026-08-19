import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeListing, makeRoom, signAccessToken } from "./helpers.js";
import type { PublicRoom } from "../lib/room-dto.js";
import { ROOM_STATUS_VALUES } from "../lib/validation.js";

const OWNER = "owner-1";
const OTHER_OWNER = "owner-2";
const LISTING_ID = "listing-1";

const validRoom = {
  name: "A1",
  type: "DELUXE",
  pricePerMonth: 1350000,
  sizeSqm: 12,
  maxOccupants: 2,
  amenities: ["ac", "kamar_mandi_dalam"],
};

function ownerToken(id = OWNER): string {
  return signAccessToken(id, "OWNER");
}

function setup(rooms: Parameters<typeof buildTestApp>[0] extends { rooms?: infer R } ? R : never = []) {
  const listing = makeListing({ id: LISTING_ID, ownerId: OWNER });
  return buildTestApp({ listings: [listing], rooms });
}

describe("GET /listings/:id/rooms", () => {
  it("lists a listing's rooms without authentication", async () => {
    // Public, like GET /listings/:id — students browsing a kost need the
    // room roster.
    const { app } = setup([
      makeRoom({ id: "r-1", listingId: LISTING_ID, name: "A1" }),
      makeRoom({ id: "r-2", listingId: LISTING_ID, name: "A2", status: "OCCUPIED" }),
    ]);

    const res = await app.inject({ method: "GET", url: `/listings/${LISTING_ID}/rooms` });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicRoom[]>>();
    expect(body.data?.map((r) => r.name)).toEqual(["A1", "A2"]);
    expect(body.meta.total).toBe(2);
  });

  it("returns an empty array for a listing with no rooms", async () => {
    const { app } = setup([]);

    const res = await app.inject({ method: "GET", url: `/listings/${LISTING_ID}/rooms` });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<PublicRoom[]>>().data).toEqual([]);
  });

  it("returns 404 for an unknown listing", async () => {
    // Distinct from "no rooms" — the caller has to tell those apart.
    const { app } = setup([]);

    const res = await app.inject({ method: "GET", url: "/listings/does-not-exist/rooms" });

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });

  it("excludes rooms belonging to other listings", async () => {
    const { app } = setup([
      makeRoom({ id: "r-1", listingId: LISTING_ID, name: "A1" }),
      makeRoom({ id: "r-2", listingId: "listing-other", name: "B1" }),
    ]);

    const res = await app.inject({ method: "GET", url: `/listings/${LISTING_ID}/rooms` });

    expect(res.json<ApiResponse<PublicRoom[]>>().data?.map((r) => r.id)).toEqual(["r-1"]);
  });

  it("orders rooms by name so the occupancy grid is stable", async () => {
    const { app } = setup([
      makeRoom({ id: "r-3", listingId: LISTING_ID, name: "C3" }),
      makeRoom({ id: "r-1", listingId: LISTING_ID, name: "A1" }),
      makeRoom({ id: "r-2", listingId: LISTING_ID, name: "B2" }),
    ]);

    const res = await app.inject({ method: "GET", url: `/listings/${LISTING_ID}/rooms` });

    expect(res.json<ApiResponse<PublicRoom[]>>().data?.map((r) => r.name)).toEqual(["A1", "B2", "C3"]);
  });
});

describe("POST /listings/:id/rooms", () => {
  async function create(payload: Record<string, unknown>, token = ownerToken()) {
    const { app } = setup([]);
    return app.inject({
      method: "POST",
      url: `/listings/${LISTING_ID}/rooms`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  it("creates a room for the owning OWNER", async () => {
    const res = await create(validRoom);

    expect(res.statusCode).toBe(201);
    const room = res.json<ApiResponse<PublicRoom>>().data!;
    expect(room).toMatchObject({
      listingId: LISTING_ID,
      name: "A1",
      type: "DELUXE",
      pricePerMonth: 1350000,
      sizeSqm: 12,
      maxOccupants: 2,
      amenities: ["ac", "kamar_mandi_dalam"],
      status: "AVAILABLE",
    });
    expect(room.id).toBeTruthy();
  });

  it("defaults type/status/occupants when omitted", async () => {
    const res = await create({ name: "B1", pricePerMonth: 900000 });

    const room = res.json<ApiResponse<PublicRoom>>().data!;
    expect(room.type).toBe("STANDARD");
    expect(room.status).toBe("AVAILABLE");
    expect(room.maxOccupants).toBe(1);
    expect(room.sizeSqm).toBeNull();
    expect(room.amenities).toEqual([]);
  });

  it("accepts a non-AVAILABLE status at creation", async () => {
    // Onboarding an existing kost means some rooms already have tenants.
    const res = await create({ ...validRoom, status: "OCCUPIED" });

    expect(res.json<ApiResponse<PublicRoom>>().data?.status).toBe("OCCUPIED");
  });

  it("rejects a caller who does not own the listing with 403", async () => {
    const res = await create(validRoom, ownerToken(OTHER_OWNER));

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("rejects a STUDENT role with 403", async () => {
    const res = await create(validRoom, signAccessToken(OWNER, "STUDENT"));

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("rejects an unauthenticated request with 401", async () => {
    const { app } = setup([]);

    const res = await app.inject({
      method: "POST",
      url: `/listings/${LISTING_ID}/rooms`,
      payload: validRoom,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 for an unknown listing", async () => {
    const { app } = setup([]);

    const res = await app.inject({
      method: "POST",
      url: "/listings/does-not-exist/rooms",
      headers: { authorization: `Bearer ${ownerToken()}` },
      payload: validRoom,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });

  it("rejects an invalid body with 400 VALIDATION_ERROR", async () => {
    for (const bad of [
      { ...validRoom, name: "" },
      { ...validRoom, pricePerMonth: -1 },
      { ...validRoom, maxOccupants: 0 },
      { ...validRoom, maxOccupants: 1.5 },
      { ...validRoom, status: "VACANT" }, // not a RoomStatus value
      { pricePerMonth: 900000 }, // missing name
    ]) {
      const res = await create(bad);
      expect(res.statusCode).toBe(400);
      expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
    }
  });

  it("enforces the per-listing room cap", async () => {
    const listing = makeListing({ id: LISTING_ID, ownerId: OWNER });
    const { app } = buildTestApp({
      config: { maxRoomsPerListing: 2 },
      listings: [listing],
      rooms: [
        makeRoom({ id: "r-1", listingId: LISTING_ID, name: "A1" }),
        makeRoom({ id: "r-2", listingId: LISTING_ID, name: "A2" }),
      ],
    });

    const res = await app.inject({
      method: "POST",
      url: `/listings/${LISTING_ID}/rooms`,
      headers: { authorization: `Bearer ${ownerToken()}` },
      payload: validRoom,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("TOO_MANY_ROOMS");
  });

  it("does not count soft-deleted rooms against the cap", async () => {
    const listing = makeListing({ id: LISTING_ID, ownerId: OWNER });
    const { app } = buildTestApp({
      config: { maxRoomsPerListing: 2 },
      listings: [listing],
      rooms: [
        makeRoom({ id: "r-1", listingId: LISTING_ID, name: "A1" }),
        makeRoom({ id: "r-2", listingId: LISTING_ID, name: "A2", deletedAt: new Date() }),
      ],
    });

    const res = await app.inject({
      method: "POST",
      url: `/listings/${LISTING_ID}/rooms`,
      headers: { authorization: `Bearer ${ownerToken()}` },
      payload: validRoom,
    });

    expect(res.statusCode).toBe(201);
  });
});

describe("PATCH /rooms/:id", () => {
  function patchRoom(payload: Record<string, unknown>, token = ownerToken(), roomId = "r-1") {
    const { app } = setup([makeRoom({ id: "r-1", listingId: LISTING_ID, name: "A1" })]);
    return app.inject({
      method: "PATCH",
      url: `/rooms/${roomId}`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  // The status field is what drives B1's occupancy map, so every value it can
  // hold must actually be settable.
  it.each(ROOM_STATUS_VALUES)("sets status to %s", async (status) => {
    const res = await patchRoom({ status });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<PublicRoom>>().data?.status).toBe(status);
  });

  it("updates other fields without touching status", async () => {
    const res = await patchRoom({ name: "A1 (renovasi)", pricePerMonth: 1400000 });

    const room = res.json<ApiResponse<PublicRoom>>().data!;
    expect(room.name).toBe("A1 (renovasi)");
    expect(room.pricePerMonth).toBe(1400000);
    expect(room.status).toBe("AVAILABLE");
  });

  it("clears sizeSqm when sent null", async () => {
    // null is a real write here, distinct from omitting the key.
    const res = await patchRoom({ sizeSqm: null });

    expect(res.json<ApiResponse<PublicRoom>>().data?.sizeSqm).toBeNull();
  });

  it("leaves untouched fields alone", async () => {
    const res = await patchRoom({ status: "MAINTENANCE" });

    const room = res.json<ApiResponse<PublicRoom>>().data!;
    expect(room.name).toBe("A1");
    expect(room.sizeSqm).toBe(9);
    expect(room.amenities).toEqual(["ac"]);
  });

  it("rejects an empty body with 400", async () => {
    const res = await patchRoom({});

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown status value with 400", async () => {
    const res = await patchRoom({ status: "VACANT" });

    expect(res.statusCode).toBe(400);
  });

  it("rejects a caller who does not own the parent listing with 403", async () => {
    // Ownership lives on the listing, not the room — this is the check that
    // stops one owner editing another owner's occupancy map.
    const res = await patchRoom({ status: "OCCUPIED" }, ownerToken(OTHER_OWNER));

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("rejects a STUDENT role with 403", async () => {
    const res = await patchRoom({ status: "OCCUPIED" }, signAccessToken(OWNER, "STUDENT"));

    expect(res.statusCode).toBe(403);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const { app } = setup([makeRoom({ id: "r-1", listingId: LISTING_ID })]);

    const res = await app.inject({ method: "PATCH", url: "/rooms/r-1", payload: { status: "OCCUPIED" } });

    expect(res.statusCode).toBe(401);
  });

  it("returns 404 for an unknown room", async () => {
    const res = await patchRoom({ status: "OCCUPIED" }, ownerToken(), "does-not-exist");

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a soft-deleted room", async () => {
    const { app } = setup([
      makeRoom({ id: "r-1", listingId: LISTING_ID, deletedAt: new Date() }),
    ]);

    const res = await app.inject({
      method: "PATCH",
      url: "/rooms/r-1",
      headers: { authorization: `Bearer ${ownerToken()}` },
      payload: { status: "AVAILABLE" },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /rooms/:id", () => {
  it("soft-deletes a room and hides it from the list", async () => {
    const { app } = setup([
      makeRoom({ id: "r-1", listingId: LISTING_ID, name: "A1" }),
      makeRoom({ id: "r-2", listingId: LISTING_ID, name: "A2" }),
    ]);

    const res = await app.inject({
      method: "DELETE",
      url: "/rooms/r-1",
      headers: { authorization: `Bearer ${ownerToken()}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ id: string; deletedAt: string }>>();
    expect(body.data?.id).toBe("r-1");
    expect(body.data?.deletedAt).toBeTruthy();

    const list = await app.inject({ method: "GET", url: `/listings/${LISTING_ID}/rooms` });
    expect(list.json<ApiResponse<PublicRoom[]>>().data?.map((r) => r.id)).toEqual(["r-2"]);
  });

  it("keeps the row so booking history is not orphaned", async () => {
    // Booking.roomId references rooms; a hard delete would break that.
    const { app, deps } = setup([makeRoom({ id: "r-1", listingId: LISTING_ID })]);

    await app.inject({
      method: "DELETE",
      url: "/rooms/r-1",
      headers: { authorization: `Bearer ${ownerToken()}` },
    });

    const stored = deps.roomRepository.rooms.find((r) => r.id === "r-1");
    expect(stored).toBeDefined();
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  it("rejects a caller who does not own the parent listing with 403", async () => {
    const { app, deps } = setup([makeRoom({ id: "r-1", listingId: LISTING_ID })]);

    const res = await app.inject({
      method: "DELETE",
      url: "/rooms/r-1",
      headers: { authorization: `Bearer ${ownerToken(OTHER_OWNER)}` },
    });

    expect(res.statusCode).toBe(403);
    expect(deps.roomRepository.rooms[0]?.deletedAt).toBeNull();
  });

  it("rejects a STUDENT role with 403", async () => {
    const { app } = setup([makeRoom({ id: "r-1", listingId: LISTING_ID })]);

    const res = await app.inject({
      method: "DELETE",
      url: "/rooms/r-1",
      headers: { authorization: `Bearer ${signAccessToken(OWNER, "STUDENT")}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const { app } = setup([makeRoom({ id: "r-1", listingId: LISTING_ID })]);

    const res = await app.inject({ method: "DELETE", url: "/rooms/r-1" });

    expect(res.statusCode).toBe(401);
  });

  it("returns 404 for an unknown room", async () => {
    const { app } = setup([]);

    const res = await app.inject({
      method: "DELETE",
      url: "/rooms/does-not-exist",
      headers: { authorization: `Bearer ${ownerToken()}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when deleting an already-deleted room", async () => {
    const { app } = setup([makeRoom({ id: "r-1", listingId: LISTING_ID, deletedAt: new Date() })]);

    const res = await app.inject({
      method: "DELETE",
      url: "/rooms/r-1",
      headers: { authorization: `Bearer ${ownerToken()}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
