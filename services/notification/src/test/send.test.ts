import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, testConfig } from "./helpers.js";
import type { PublicNotification } from "../lib/dto.js";

const INTERNAL_HEADERS = { "x-internal-api-key": testConfig().internalApiKey };

describe("POST /notifications/send", () => {
  it("renders the default template, persists, and enqueues delivery", async () => {
    const { app, deps } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      headers: INTERNAL_HEADERS,
      payload: {
        userId: "student-1",
        eventType: "BOOKING_CONFIRMED",
        data: { listingTitle: "Kost Griya Asri" },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<PublicNotification>>();
    expect(body.data?.userId).toBe("student-1");
    expect(body.data?.channel).toBe("PUSH");
    expect(body.data?.status).toBe("UNREAD");
    expect(body.data?.eventType).toBe("BOOKING_CONFIRMED");
    expect(body.data?.title).toBe("Booking Dikonfirmasi");
    expect(body.data?.body).toContain("Kost Griya Asri");
    expect(body.data?.sentAt).toBeNull();

    expect(deps.notificationQueue.enqueued).toEqual([body.data!.id]);
  });

  it.each([
    ["BOOKING_CONFIRMED", { listingTitle: "Kost A" }],
    ["BOOKING_CANCELLED", { listingTitle: "Kost A" }],
    ["PAYMENT_SUCCESS", { amount: "1500000" }],
    ["NEW_INQUIRY", { listingTitle: "Kost A" }],
    ["OTP_REQUEST", {}],
  ] as const)("supports the %s event", async (eventType, data) => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      headers: INTERNAL_HEADERS,
      payload: { userId: "student-1", eventType, data },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<PublicNotification>>();
    expect(body.data?.eventType).toBe(eventType);
    expect(body.data?.title.length).toBeGreaterThan(0);
    expect(body.data?.body.length).toBeGreaterThan(0);
  });

  it("honors an explicit title/body override", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      headers: INTERNAL_HEADERS,
      payload: {
        userId: "student-1",
        eventType: "BOOKING_CONFIRMED",
        title: "Custom Title",
        body: "Custom body text",
      },
    });

    const body = res.json<ApiResponse<PublicNotification>>();
    expect(body.data?.title).toBe("Custom Title");
    expect(body.data?.body).toBe("Custom body text");
  });

  it("rejects an unknown userId with 404 NOT_FOUND", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      headers: INTERNAL_HEADERS,
      payload: { userId: "ghost-user", eventType: "OTP_REQUEST" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });

  it("rejects an unsupported eventType with 400 VALIDATION_ERROR", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      headers: INTERNAL_HEADERS,
      payload: { userId: "student-1", eventType: "SOMETHING_ELSE" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a request with no internal API key", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      payload: { userId: "student-1", eventType: "OTP_REQUEST" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });

  it("rejects a request with the wrong internal API key", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      headers: { "x-internal-api-key": "wrong-key" },
      payload: { userId: "student-1", eventType: "OTP_REQUEST" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("rejects a user-JWT Authorization header — this endpoint is internal-only", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/notifications/send",
      headers: { authorization: "Bearer whatever" },
      payload: { userId: "student-1", eventType: "OTP_REQUEST" },
    });

    expect(res.statusCode).toBe(401);
  });
});
