import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeBooking, signAccessToken } from "./helpers.js";
import type { PublicBooking } from "../lib/dto.js";

function seed() {
  const base = new Date("2026-01-01T00:00:00Z");
  return [
    makeBooking({
      id: "b-1",
      ownerId: "owner-1",
      studentId: "student-1",
      status: "PENDING",
      createdAt: new Date(base.getTime() + 3000),
    }),
    makeBooking({
      id: "b-2",
      ownerId: "owner-1",
      studentId: "student-2",
      status: "CONFIRMED",
      createdAt: new Date(base.getTime() + 2000),
    }),
    makeBooking({
      id: "b-3",
      ownerId: "owner-2",
      studentId: "student-1",
      status: "PENDING",
      createdAt: new Date(base.getTime() + 1000),
    }),
  ];
}

describe("GET /bookings", () => {
  it("scopes an OWNER to bookings on their own listings, newest first", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({ method: "GET", url: "/bookings", headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-1", "b-2"]);
    expect(body.meta.total).toBe(2);
  });

  it("scopes a STUDENT to their own bookings across different owners", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({ method: "GET", url: "/bookings", headers: { authorization: `Bearer ${token}` } });

    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-1", "b-3"]);
  });

  it("filters by status", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "GET",
      url: "/bookings?status=CONFIRMED",
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-2"]);
  });

  it("paginates with page/limit", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "GET",
      url: "/bookings?page=2&limit=1",
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-2"]);
    expect(body.meta.page).toBe(2);
    expect(body.meta.total).toBe(2);
  });

  it("rejects a request with no Authorization header", async () => {
    const { app } = buildTestApp({ bookings: seed() });

    const res = await app.inject({ method: "GET", url: "/bookings" });

    expect(res.statusCode).toBe(401);
  });
});
