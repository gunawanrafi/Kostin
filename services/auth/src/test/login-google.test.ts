import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, createFakeGoogleVerifier, createTestDeps } from "./helpers.js";
import { buildApp } from "../app.js";
import { AppError, AuthErrorCode } from "../lib/errors.js";
import type { AuthResult } from "../lib/dto.js";

describe("POST /auth/login/google", () => {
  it("provisions a new account on first Google login", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login/google",
      payload: { idToken: "fake-valid-token" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<AuthResult>>();
    expect(body.data?.user.email).toBe("googleuser@example.com");
    expect(body.data?.tokens.accessToken).toBeTypeOf("string");
  });

  it("logs an existing Google-linked user back in without creating a duplicate", async () => {
    const { app } = buildTestApp();

    const first = await app.inject({
      method: "POST",
      url: "/auth/login/google",
      payload: { idToken: "fake-valid-token" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/auth/login/google",
      payload: { idToken: "fake-valid-token" },
    });

    const firstId = first.json<ApiResponse<AuthResult>>().data?.user.id;
    const secondId = second.json<ApiResponse<AuthResult>>().data?.user.id;
    expect(secondId).toBe(firstId);
  });

  it("links Google to an existing password account with the same email", async () => {
    const deps = createTestDeps();
    const app = buildApp({ ...deps, logger: false });

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Existing User",
        email: "googleuser@example.com",
        phone: "081200000001",
        password: "SuperSecret1",
      },
    });
    const registeredId = registerRes.json<ApiResponse<AuthResult>>().data?.user.id;

    const googleRes = await app.inject({
      method: "POST",
      url: "/auth/login/google",
      payload: { idToken: "fake-valid-token" },
    });

    expect(googleRes.statusCode).toBe(200);
    expect(googleRes.json<ApiResponse<AuthResult>>().data?.user.id).toBe(registeredId);
  });

  it("surfaces an unexpected verifier failure as 500 INTERNAL_ERROR", async () => {
    const deps = createTestDeps();
    deps.googleVerifier = { verifyIdToken: async () => { throw new Error("boom"); } };
    const app = buildApp({ ...deps, logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login/google",
      payload: { idToken: "garbage-token-value" },
    });

    expect(res.statusCode).toBe(500);
  });

  it("propagates GOOGLE_TOKEN_INVALID from the verifier (as GoogleOAuthVerifier raises it)", async () => {
    const deps = createTestDeps();
    deps.googleVerifier = createFakeGoogleVerifier(() => {
      throw new AppError(401, AuthErrorCode.GOOGLE_TOKEN_INVALID, "Invalid Google ID token");
    });
    const app = buildApp({ ...deps, logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login/google",
      payload: { idToken: "garbage-token-value" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("GOOGLE_TOKEN_INVALID");
  });
});
