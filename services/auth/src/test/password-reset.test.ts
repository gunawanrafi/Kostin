import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp } from "./helpers.js";
import type { AuthResult } from "../lib/dto.js";

const EMAIL = "budi@example.com";
const PHONE = "081234567890";
const NORMALIZED_PHONE = "+6281234567890";
const OLD_PASSWORD = "OldSecret123";
const NEW_PASSWORD = "BrandNewSecret456";

type App = ReturnType<typeof buildTestApp>["app"];
type Deps = ReturnType<typeof buildTestApp>["deps"];

async function registerUser(app: App): Promise<void> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: "Budi Santoso", email: EMAIL, phone: PHONE, password: OLD_PASSWORD },
  });
  expect(res.statusCode).toBe(201);
}

async function requestReset(app: App, email = EMAIL) {
  return app.inject({ method: "POST", url: "/auth/password/forgot", payload: { email } });
}

// The code never reaches the client — it's only observable through the sender.
function lastSentCode(deps: Deps): string {
  const last = deps.otpSender.sent.at(-1);
  expect(last).toBeDefined();
  return last!.code;
}

async function login(app: App, password: string) {
  return app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { identifier: EMAIL, password },
  });
}

describe("POST /auth/password/forgot", () => {
  it("sends a 6-digit code to the account's registered phone", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);

    const res = await requestReset(app);

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ channel: string; expiresInSec: number }>>();
    expect(body.data?.channel).toBe("whatsapp");
    expect(body.data?.expiresInSec).toBe(300);

    expect(deps.otpSender.sent).toHaveLength(1);
    expect(deps.otpSender.sent[0]?.phone).toBe(NORMALIZED_PHONE);
    expect(deps.otpSender.sent[0]?.code).toMatch(/^\d{6}$/);
  });

  it("never returns the code in the response body", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);

    const res = await requestReset(app);

    expect(JSON.stringify(res.json())).not.toContain(lastSentCode(deps));
  });

  it("answers identically for an unregistered email and sends nothing", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);

    const known = await requestReset(app);
    const unknown = await requestReset(app, "nobody@example.com");

    // Same status and same body shape — no account enumeration.
    expect(unknown.statusCode).toBe(known.statusCode);
    expect(unknown.json<ApiResponse<unknown>>().data).toEqual(known.json<ApiResponse<unknown>>().data);
    // ...but nothing was actually dispatched for the unknown address.
    expect(deps.otpSender.sent).toHaveLength(1);
  });

  it("does not send a second code while the cooldown is active, but still returns 200", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);

    const first = await requestReset(app);
    const second = await requestReset(app);

    expect(first.statusCode).toBe(200);
    // A 429 here would leak that the account exists, so the cooldown is
    // enforced silently: same response, no extra send.
    expect(second.statusCode).toBe(200);
    expect(deps.otpSender.sent).toHaveLength(1);
  });

  it("rejects a malformed email with 400 VALIDATION_ERROR", async () => {
    const { app } = buildTestApp();

    const res = await requestReset(app, "not-an-email");

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /auth/password/reset", () => {
  it("resets the password with a valid code, and the new password logs in", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);
    await requestReset(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code: lastSentCode(deps), newPassword: NEW_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<{ success: boolean }>>().data?.success).toBe(true);

    const newLogin = await login(app, NEW_PASSWORD);
    expect(newLogin.statusCode).toBe(200);
    expect(newLogin.json<ApiResponse<AuthResult>>().data?.user.email).toBe(EMAIL);
  });

  it("invalidates the old password after a reset", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);
    await requestReset(app);

    await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code: lastSentCode(deps), newPassword: NEW_PASSWORD },
    });

    const oldLogin = await login(app, OLD_PASSWORD);
    expect(oldLogin.statusCode).toBe(401);
    expect(oldLogin.json<ApiResponse<null>>().error?.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a wrong code with 400 RESET_CODE_INVALID and leaves the password unchanged", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);
    await requestReset(app);

    const wrong = String((Number(lastSentCode(deps)) + 1) % 1_000_000).padStart(6, "0");
    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code: wrong, newPassword: NEW_PASSWORD },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("RESET_CODE_INVALID");
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
  });

  it("rejects an expired code with 410 RESET_CODE_EXPIRED", async () => {
    // otpTtlSec: 1 with a controllable clock — InMemoryRedis expires lazily
    // against Date.now(), so advancing real time past the TTL is enough.
    const { app, deps } = buildTestApp({ config: { otpTtlSec: 1 } });
    await registerUser(app);
    await requestReset(app);
    const code = lastSentCode(deps);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code, newPassword: NEW_PASSWORD },
    });

    expect(res.statusCode).toBe(410);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("RESET_CODE_EXPIRED");
  });

  it("rejects a code that was never requested with 410 RESET_CODE_EXPIRED", async () => {
    const { app } = buildTestApp();
    await registerUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code: "123456", newPassword: NEW_PASSWORD },
    });

    expect(res.statusCode).toBe(410);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("RESET_CODE_EXPIRED");
  });

  it("treats an unknown email the same as an expired code (no enumeration)", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: "nobody@example.com", code: "123456", newPassword: NEW_PASSWORD },
    });

    expect(res.statusCode).toBe(410);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("RESET_CODE_EXPIRED");
  });

  it("consumes the code so it cannot be replayed", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);
    await requestReset(app);
    const code = lastSentCode(deps);

    const first = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code, newPassword: NEW_PASSWORD },
    });
    expect(first.statusCode).toBe(200);

    const replay = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code, newPassword: "YetAnotherPass789" },
    });

    expect(replay.statusCode).toBe(410);
    expect(replay.json<ApiResponse<null>>().error?.code).toBe("RESET_CODE_EXPIRED");
    // The second password was never applied.
    expect((await login(app, NEW_PASSWORD)).statusCode).toBe(200);
  });

  it("rate-limits repeated wrong codes with 429 RESET_RATE_LIMITED", async () => {
    const { app, deps } = buildTestApp({ config: { otpMaxAttempts: 3 } });
    await registerUser(app);
    await requestReset(app);

    const wrong = String((Number(lastSentCode(deps)) + 1) % 1_000_000).padStart(6, "0");
    const attempt = () =>
      app.inject({
        method: "POST",
        url: "/auth/password/reset",
        payload: { email: EMAIL, code: wrong, newPassword: NEW_PASSWORD },
      });

    expect((await attempt()).statusCode).toBe(400);
    expect((await attempt()).statusCode).toBe(400);
    expect((await attempt()).statusCode).toBe(400);

    const limited = await attempt();
    expect(limited.statusCode).toBe(429);
    expect(limited.json<ApiResponse<null>>().error?.code).toBe("RESET_RATE_LIMITED");
  });

  it("rejects a too-short new password with 400 VALIDATION_ERROR", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);
    await requestReset(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code: lastSentCode(deps), newPassword: "short" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("password-reset / OTP namespace isolation", () => {
  it("does not let a reset code be redeemed at /auth/otp/verify for tokens", async () => {
    // The critical one: if reset codes shared otp-store's `otp:` namespace, a
    // code sent for a password reset could be posted to /auth/otp/verify and
    // mint a full token pair — account takeover without the password.
    const { app, deps } = buildTestApp();
    await registerUser(app);
    await requestReset(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: PHONE, code: lastSentCode(deps) },
    });

    expect(res.statusCode).toBe(410);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("OTP_EXPIRED");
  });

  it("does not let a login OTP be redeemed at /auth/password/reset", async () => {
    const { app, deps } = buildTestApp();
    await registerUser(app);
    await app.inject({ method: "POST", url: "/auth/otp/request", payload: { phone: PHONE } });

    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: EMAIL, code: lastSentCode(deps), newPassword: NEW_PASSWORD },
    });

    expect(res.statusCode).toBe(410);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("RESET_CODE_EXPIRED");
  });
});
