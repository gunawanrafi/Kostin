import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, createTestDeps } from "./helpers.js";
import { buildApp } from "../app.js";
import type { AuthResult } from "../lib/dto.js";

describe("POST /auth/otp/request", () => {
  it("sends a 6-digit code over WhatsApp and returns expiresInSec", async () => {
    const { app, deps } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone: "081234567890" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ phone: string; expiresInSec: number }>>();
    expect(body.data?.phone).toBe("+6281234567890");
    expect(body.data?.expiresInSec).toBe(300);

    expect(deps.otpSender.sent).toHaveLength(1);
    expect(deps.otpSender.sent[0]?.phone).toBe("+6281234567890");
    expect(deps.otpSender.sent[0]?.code).toMatch(/^\d{6}$/);
  });

  it("rejects a second request within the cooldown window with 429 OTP_COOLDOWN", async () => {
    const { app } = buildTestApp();
    const payload = { phone: "081234567890" };

    await app.inject({ method: "POST", url: "/auth/otp/request", payload });
    const res = await app.inject({ method: "POST", url: "/auth/otp/request", payload });

    expect(res.statusCode).toBe(429);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("OTP_COOLDOWN");
  });
});

describe("POST /auth/otp/verify", () => {
  async function registerAndRequestOtp(app: ReturnType<typeof buildTestApp>["app"]) {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Rina",
        email: "rina@example.com",
        phone: "081211112222",
        password: "SuperSecret1",
      },
    });
    await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone: "081211112222" },
    });
  }

  it("verifies the correct code and returns tokens, activating a pending user", async () => {
    const { app, deps } = buildTestApp();
    await registerAndRequestOtp(app);
    const code = deps.otpSender.sent[0]!.code;

    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "081211112222", code },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<AuthResult>>();
    expect(body.data?.user.status).toBe("ACTIVE");
    expect(body.data?.tokens.accessToken).toBeTypeOf("string");
  });

  it("rejects an incorrect code with 400 OTP_INVALID", async () => {
    const { app } = buildTestApp();
    await registerAndRequestOtp(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "081211112222", code: "000000" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("OTP_INVALID");
  });

  it("rejects verification when no code was requested with 410 OTP_EXPIRED", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "089900001111", code: "123456" },
    });

    expect(res.statusCode).toBe(410);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("OTP_EXPIRED");
  });

  it("locks out after too many wrong attempts with 429 OTP_RATE_LIMITED", async () => {
    const { app } = buildTestApp({ config: { otpMaxAttempts: 2 } });
    await registerAndRequestOtp(app);

    await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "081211112222", code: "000000" },
    });
    await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "081211112222", code: "111111" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "081211112222", code: "222222" },
    });

    expect(res.statusCode).toBe(429);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("OTP_RATE_LIMITED");
  });

  it("returns 404 NOT_FOUND for a phone with no matching account", async () => {
    const deps = createTestDeps();
    const app = buildApp({ ...deps, logger: false });

    await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone: "089900002222" },
    });
    const code = deps.otpSender.sent[0]!.code;

    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "089900002222", code },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("NOT_FOUND");
  });
});
