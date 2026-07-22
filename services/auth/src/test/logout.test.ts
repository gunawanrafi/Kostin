import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp } from "./helpers.js";
import type { AuthResult, AuthTokens } from "../lib/dto.js";

async function registerAndGetTokens(
  app: ReturnType<typeof buildTestApp>["app"],
): Promise<AuthTokens> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name: "Wati",
      email: "wati@example.com",
      phone: "081266665555",
      password: "SuperSecret1",
    },
  });
  const tokens = res.json<ApiResponse<AuthResult>>().data?.tokens;
  if (!tokens) throw new Error("register did not return tokens");
  return tokens;
}

describe("POST /auth/logout", () => {
  it("invalidates the refresh token so it can no longer be used", async () => {
    const { app } = buildTestApp();
    const tokens = await registerAndGetTokens(app);

    const logoutRes = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.json<ApiResponse<{ success: boolean }>>().data?.success).toBe(true);

    const refreshRes = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
    expect(refreshRes.json<ApiResponse<null>>().error?.code).toBe("TOKEN_INVALID");
  });

  it("is idempotent — logging out twice still returns success", async () => {
    const { app } = buildTestApp();
    const tokens = await registerAndGetTokens(app);

    const first = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: tokens.refreshToken },
    });
    const second = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: tokens.refreshToken },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
  });

  it("is tolerant of a garbage token — still returns success", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: "totally-not-a-jwt-but-long-enough" },
    });

    expect(res.statusCode).toBe(200);
  });

  it("rejects a missing refreshToken with 400 VALIDATION_ERROR", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "POST", url: "/auth/logout", payload: {} });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });
});
