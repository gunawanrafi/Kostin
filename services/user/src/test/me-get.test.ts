import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeUser, signAccessToken } from "./helpers.js";
import type { PublicUser } from "../lib/dto.js";

describe("GET /users/me", () => {
  it("returns the authenticated user's public profile", async () => {
    const user = makeUser({ email: "budi@example.com", name: "Budi Santoso" });
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicUser>>();
    expect(body.error).toBeNull();
    expect(body.data?.id).toBe(user.id);
    expect(body.data?.email).toBe("budi@example.com");
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(body.data?.lifestyle).toEqual({});
    expect(body.meta.requestId).toBeTypeOf("string");
  });

  it("rejects requests without an Authorization header with 401 UNAUTHORIZED", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "GET", url: "/users/me" });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });

  it("rejects an invalid access token with 401 UNAUTHORIZED", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: "Bearer not-a-real-token" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 NOT_FOUND when the token references a user that no longer exists", async () => {
    const { app } = buildTestApp({ users: [] });
    const token = signAccessToken("nonexistent-user-id", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });
});
