import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeBooking, signAccessToken } from "./helpers.js";
import type { PublicBooking } from "../lib/dto.js";

describe("GET /bookings/:id", () => {
  it("is visible to the student who made it", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: `/bookings/${booking.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<PublicBooking>>().data?.id).toBe(booking.id);
  });

  it("is visible to the listing owner", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "GET",
      url: `/bookings/${booking.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("is forbidden for an unrelated user", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("stranger-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: `/bookings/${booking.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("returns 404 for an unknown booking", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: "/bookings/does-not-exist",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects a request with no Authorization header", async () => {
    const booking = makeBooking();
    const { app } = buildTestApp({ bookings: [booking] });

    const res = await app.inject({ method: "GET", url: `/bookings/${booking.id}` });

    expect(res.statusCode).toBe(401);
  });
});
