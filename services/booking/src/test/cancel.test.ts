import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeBooking, signAccessToken } from "./helpers.js";
import type { PublicBooking } from "../lib/dto.js";

describe("PATCH /bookings/:id/cancel", () => {
  it("lets the student cancel a PENDING booking and stops the auto-cancel timer", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1", status: "PENDING" });
    const { app, deps } = buildTestApp({ bookings: [booking] });
    deps.bookingQueue.scheduled.set(booking.id, { bookingId: booking.id, delayMs: 1000 });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/cancel`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicBooking>>();
    expect(body.data?.status).toBe("CANCELLED");
    expect(body.data?.cancelReason).toBe("STUDENT_CANCELLED");
    expect(deps.bookingQueue.scheduled.has(booking.id)).toBe(false);
  });

  it("lets the owner cancel a CONFIRMED booking", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1", status: "CONFIRMED" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/cancel`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicBooking>>();
    expect(body.data?.status).toBe("CANCELLED");
    expect(body.data?.cancelReason).toBe("OWNER_CANCELLED");
  });

  it("rejects an unrelated user with 403 FORBIDDEN", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1", status: "PENDING" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("stranger-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/cancel`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects cancelling an already-CANCELLED booking with 409 INVALID_STATUS_TRANSITION", async () => {
    const booking = makeBooking({ studentId: "student-1", status: "CANCELLED" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/cancel`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("rejects cancelling a COMPLETED booking with 409 INVALID_STATUS_TRANSITION", async () => {
    const booking = makeBooking({ studentId: "student-1", status: "COMPLETED" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/cancel`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(409);
  });
});
