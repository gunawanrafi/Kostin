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
      name: "Andi",
      email: "andi@example.com",
      phone: "081277778888",
      password: "SuperSecret1",
    },
  });
  const tokens = res.json<ApiResponse<AuthResult>>().data?.tokens;
  if (!tokens) throw new Error("register did not return tokens");
  return tokens;
}

describe("POST /auth/refresh", () => {
  it("issues a new token pair for a valid refresh token", async () => {
    const { app } = buildTestApp();
    const tokens = await registerAndGetTokens(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<AuthTokens>>();
    expect(body.data?.accessToken).toBeTypeOf("string");
    expect(body.data?.refreshToken).not.toBe(tokens.refreshToken);
  });

  it("rotates the refresh token — the old one can't be reused", async () => {
    const { app } = buildTestApp();
    const tokens = await registerAndGetTokens(app);

    await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    const replay = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });

    expect(replay.statusCode).toBe(401);
    expect(replay.json<ApiResponse<null>>().error?.code).toBe("TOKEN_INVALID");
  });

  it("rejects a malformed/garbage token with 401 TOKEN_INVALID", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "not.a.valid.jwt.at.all" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("TOKEN_INVALID");
  });

  it("rejects an access token presented as a refresh token", async () => {
    const { app } = buildTestApp();
    const tokens = await registerAndGetTokens(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.accessToken },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("TOKEN_INVALID");
  });
});
