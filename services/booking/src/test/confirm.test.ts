import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeBooking, signAccessToken } from "./helpers.js";
import type { PublicBooking } from "../lib/dto.js";

describe("PATCH /bookings/:id/confirm", () => {
  it("confirms a PENDING booking, holds escrow, and stops the auto-cancel timer", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1", status: "PENDING" });
    const { app, deps } = buildTestApp({ bookings: [booking] });
    deps.bookingQueue.scheduled.set(booking.id, { bookingId: booking.id, delayMs: 1000 });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicBooking>>();
    expect(body.data?.status).toBe("CONFIRMED");
    expect(body.data?.confirmedAt).not.toBeNull();

    expect(deps.escrowClient.calls).toEqual([{ bookingId: booking.id, amount: 4500000 }]);
    expect(deps.bookingQueue.scheduled.has(booking.id)).toBe(false);
  });

  it("rejects a non-owner with 403 FORBIDDEN", async () => {
    const booking = makeBooking({ studentId: "student-1", ownerId: "owner-1", status: "PENDING" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects confirming an already-CONFIRMED booking with 409 INVALID_STATUS_TRANSITION", async () => {
    const booking = makeBooking({ ownerId: "owner-1", status: "CONFIRMED" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("does not confirm the booking if escrow-service fails", async () => {
    const booking = makeBooking({ ownerId: "owner-1", status: "PENDING" });
    const { app, deps } = buildTestApp({
      bookings: [booking],
      escrowImpl: async () => {
        throw new Error("escrow-service unreachable");
      },
    });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/bookings/${booking.id}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(500);
    expect(deps.bookingRepository.bookings.find((b) => b.id === booking.id)?.status).toBe("PENDING");
  });
});
