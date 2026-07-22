import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeNotification, signAccessToken } from "./helpers.js";
import type { PublicNotification } from "../lib/dto.js";

describe("PATCH /notifications/:id/read", () => {
  it("marks an UNREAD notification as READ", async () => {
    const notification = makeNotification({ userId: "student-1", status: "UNREAD" });
    const { app } = buildTestApp({ notifications: [notification] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/notifications/${notification.id}/read`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicNotification>>();
    expect(body.data?.status).toBe("READ");
    expect(body.data?.readAt).not.toBeNull();
  });

  it("is idempotent — marking an already-read notification preserves readAt", async () => {
    const originalReadAt = new Date("2026-01-01T00:00:00Z");
    const notification = makeNotification({ userId: "student-1", status: "READ", readAt: originalReadAt });
    const { app } = buildTestApp({ notifications: [notification] });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/notifications/${notification.id}/read`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicNotification>>();
    expect(new Date(body.data!.readAt!).toISOString()).toBe(originalReadAt.toISOString());
  });

  it("rejects a caller who doesn't own the notification with 403 FORBIDDEN", async () => {
    const notification = makeNotification({ userId: "student-1" });
    const { app } = buildTestApp({ notifications: [notification] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/notifications/${notification.id}/read`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("returns 404 for an unknown notification", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: "/notifications/does-not-exist/read",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects a request with no Authorization header", async () => {
    const notification = makeNotification({ userId: "student-1" });
    const { app } = buildTestApp({ notifications: [notification] });

    const res = await app.inject({ method: "PATCH", url: `/notifications/${notification.id}/read` });

    expect(res.statusCode).toBe(401);
  });
});
