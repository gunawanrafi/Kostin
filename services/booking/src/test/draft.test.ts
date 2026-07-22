import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, signAccessToken } from "./helpers.js";
import type { StoredDraft } from "../lib/draft-store.js";

describe("session-recovery draft (PUT/GET /bookings/draft/:listingId)", () => {
  it("saves and resumes a partial booking form across requests", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    const putRes = await app.inject({
      method: "PUT",
      url: "/bookings/draft/listing-1",
      headers: { authorization: `Bearer ${token}` },
      payload: { roomId: "room-1", step: "room" },
    });
    expect(putRes.statusCode).toBe(200);

    // Simulate the user leaving mid-flow and coming back later, having
    // progressed one more step.
    await app.inject({
      method: "PUT",
      url: "/bookings/draft/listing-1",
      headers: { authorization: `Bearer ${token}` },
      payload: { roomId: "room-1", durationMonths: 3, step: "duration" },
    });

    const getRes = await app.inject({
      method: "GET",
      url: "/bookings/draft/listing-1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(getRes.statusCode).toBe(200);
    const body = getRes.json<ApiResponse<StoredDraft>>();
    expect(body.data?.roomId).toBe("room-1");
    expect(body.data?.durationMonths).toBe(3);
    expect(body.data?.step).toBe("duration");
  });

  it("keeps drafts isolated per listing for the same user", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    await app.inject({
      method: "PUT",
      url: "/bookings/draft/listing-1",
      headers: { authorization: `Bearer ${token}` },
      payload: { step: "room" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/bookings/draft/listing-2",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("keeps drafts isolated per user for the same listing", async () => {
    const { app } = buildTestApp();
    const tokenA = signAccessToken("student-a", "STUDENT");
    const tokenB = signAccessToken("student-b", "STUDENT");

    await app.inject({
      method: "PUT",
      url: "/bookings/draft/listing-1",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { step: "room" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/bookings/draft/listing-1",
      headers: { authorization: `Bearer ${tokenB}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for a listing with no saved draft", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: "/bookings/draft/never-touched",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });

  it("rejects an unauthenticated request", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "GET", url: "/bookings/draft/listing-1" });

    expect(res.statusCode).toBe(401);
  });
});
