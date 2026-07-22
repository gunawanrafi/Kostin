import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeNotification, signAccessToken } from "./helpers.js";
import type { PublicNotification } from "../lib/dto.js";

function seed() {
  const base = new Date("2026-01-01T00:00:00Z");
  return [
    makeNotification({
      id: "n-1",
      userId: "student-1",
      status: "UNREAD",
      createdAt: new Date(base.getTime() + 3000),
    }),
    makeNotification({
      id: "n-2",
      userId: "student-1",
      status: "READ",
      readAt: new Date(base.getTime() + 4000),
      createdAt: new Date(base.getTime() + 2000),
    }),
    makeNotification({
      id: "n-3",
      userId: "student-1",
      status: "UNREAD",
      createdAt: new Date(base.getTime() + 1000),
    }),
    makeNotification({ id: "n-other", userId: "owner-1", status: "UNREAD", createdAt: base }),
  ];
}

describe("GET /notifications", () => {
  it("lists only the caller's notifications, newest first", async () => {
    const { app } = buildTestApp({ notifications: seed() });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: "/notifications",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicNotification[]>>();
    expect(body.data?.map((n) => n.id)).toEqual(["n-1", "n-2", "n-3"]);
    expect(body.meta.total).toBe(3);
  });

  it("filters by status=UNREAD", async () => {
    const { app } = buildTestApp({ notifications: seed() });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: "/notifications?status=UNREAD",
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json<ApiResponse<PublicNotification[]>>();
    expect(body.data?.map((n) => n.id)).toEqual(["n-1", "n-3"]);
    expect(body.meta.total).toBe(2);
  });

  it("paginates with page/limit", async () => {
    const { app } = buildTestApp({ notifications: seed() });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: "/notifications?page=2&limit=2",
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json<ApiResponse<PublicNotification[]>>();
    expect(body.data?.map((n) => n.id)).toEqual(["n-3"]);
    expect(body.meta.page).toBe(2);
    expect(body.meta.limit).toBe(2);
    expect(body.meta.total).toBe(3);
  });

  it("rejects a request with no Authorization header", async () => {
    const { app } = buildTestApp({ notifications: seed() });

    const res = await app.inject({ method: "GET", url: "/notifications" });

    expect(res.statusCode).toBe(401);
  });
});
