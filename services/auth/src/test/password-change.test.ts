import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp } from "./helpers.js";
import type { AuthResult } from "../lib/dto.js";
import { signAccessToken } from "../lib/jwt.js";

const EMAIL = "budi@example.com";
const PHONE = "081234567890";
const OLD_PASSWORD = "OldSecret123";
const NEW_PASSWORD = "BrandNewSecret456";

type App = ReturnType<typeof buildTestApp>["app"];

// Registration hands back a real access token, so tests exercise the same
// preHandler path a browser would rather than forging a payload.
async function registerAndGetToken(app: App): Promise<{ token: string; userId: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: "Budi Santoso", email: EMAIL, phone: PHONE, password: OLD_PASSWORD },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json<ApiResponse<AuthResult>>();
  return { token: body.data!.tokens.accessToken, userId: body.data!.user.id };
}

function changePassword(
  app: App,
  token: string | null,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: "POST",
    url: "/auth/password/change",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload,
  });
}

function login(app: App, password: string) {
  return app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { identifier: EMAIL, password },
  });
}

describe("POST /auth/password/change", () => {
  it("changes the password with the correct current one", async () => {
    const { app } = buildTestApp();
    const { token } = await registerAndGetToken(app);

    const res = await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<{ success: boolean }>>().data?.success).toBe(true);
    expect((await login(app, NEW_PASSWORD)).statusCode).toBe(200);
  });

  it("invalidates the old password", async () => {
    const { app } = buildTestApp();
    const { token } = await registerAndGetToken(app);

    await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    const oldLogin = await login(app, OLD_PASSWORD);
    expect(oldLogin.statusCode).toBe(401);
    expect(oldLogin.json<ApiResponse<null>>().error?.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a wrong current password and leaves the password unchanged", async () => {
    const { app } = buildTestApp();
    const { token } = await registerAndGetToken(app);

    const res = await changePassword(app, token, {
      currentPassword: "NotMyPassword999",
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_CREDENTIALS");
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
    expect((await login(app, NEW_PASSWORD)).statusCode).toBe(401);
  });

  it("rejects an unauthenticated request", async () => {
    const { app } = buildTestApp();
    await registerAndGetToken(app);

    const res = await changePassword(app, null, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const { app } = buildTestApp();
    const { userId } = await registerAndGetToken(app);

    const forged = signAccessToken(userId, "STUDENT", "not_the_access_secret", 900);
    const res = await changePassword(app, forged, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
  });

  it("rejects a refresh token presented as an access token", async () => {
    // verifyAccessToken checks the `type` claim; without that check a stolen
    // refresh token — which is long-lived — would work here too.
    const { app } = buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "Budi Santoso", email: EMAIL, phone: PHONE, password: OLD_PASSWORD },
    });
    const refreshToken = res.json<ApiResponse<AuthResult>>().data!.tokens.refreshToken;

    const changed = await changePassword(app, refreshToken, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(changed.statusCode).toBe(401);
    expect(changed.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });

  it("only ever changes the caller's own password", async () => {
    // Two accounts; the second one's token must not be able to touch the
    // first, no matter what it knows about the first's credentials.
    const { app } = buildTestApp();
    await registerAndGetToken(app);

    const other = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Siti Rahma",
        email: "siti@example.com",
        phone: "081299998888",
        password: "SitiSecret123",
      },
    });
    const otherToken = other.json<ApiResponse<AuthResult>>().data!.tokens.accessToken;

    // Siti's token + Budi's current password: the userId comes from the
    // token, so this is read as "Siti changing Siti's password with the wrong
    // current password" and is rejected.
    const res = await changePassword(app, otherToken, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(401);
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
  });

  it("rejects reusing the current password as the new one", async () => {
    const { app } = buildTestApp();
    const { token } = await registerAndGetToken(app);

    const res = await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: OLD_PASSWORD,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("PASSWORD_UNCHANGED");
  });

  it("rejects a too-short new password with 400 VALIDATION_ERROR", async () => {
    const { app } = buildTestApp();
    const { token } = await registerAndGetToken(app);

    const res = await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: "short",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
  });

  it("refuses on a Google-only account instead of minting a first password", async () => {
    // No current password exists to confirm, so a bare session must not be
    // able to set one — that's the reset flow's job (it verifies by code).
    const { app } = buildTestApp();
    const google = await app.inject({
      method: "POST",
      url: "/auth/login/google",
      payload: { idToken: "valid-google-id-token" },
    });
    const token = google.json<ApiResponse<AuthResult>>().data!.tokens.accessToken;

    const res = await changePassword(app, token, {
      currentPassword: "anything",
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("PASSWORD_NOT_SET");
  });

  it("rate-limits repeated wrong current passwords with 429", async () => {
    const { app } = buildTestApp({ config: { passwordChangeMaxAttempts: 3 } });
    const { token } = await registerAndGetToken(app);

    const attempt = () =>
      changePassword(app, token, {
        currentPassword: "WrongGuess123",
        newPassword: NEW_PASSWORD,
      });

    expect((await attempt()).statusCode).toBe(401);
    expect((await attempt()).statusCode).toBe(401);
    expect((await attempt()).statusCode).toBe(401);

    const limited = await attempt();
    expect(limited.statusCode).toBe(429);
    expect(limited.json<ApiResponse<null>>().error?.code).toBe("PASSWORD_CHANGE_RATE_LIMITED");

    // The lockout holds even once the caller finally guesses right, so the
    // limit can't be walked past by mixing in a correct attempt.
    const correct = await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(correct.statusCode).toBe(429);
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
  });

  it("clears the attempt counter after a successful change", async () => {
    const { app } = buildTestApp({ config: { passwordChangeMaxAttempts: 3 } });
    const { token } = await registerAndGetToken(app);

    await changePassword(app, token, {
      currentPassword: "WrongGuess123",
      newPassword: NEW_PASSWORD,
    });
    await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    // Two fresh wrong guesses would trip the limit if the earlier failure
    // still counted; they don't, so the counter was reset.
    const again = () =>
      changePassword(app, token, {
        currentPassword: "WrongGuess123",
        newPassword: "ThirdPassword789",
      });
    expect((await again()).statusCode).toBe(401);
    expect((await again()).statusCode).toBe(401);
    expect((await again()).statusCode).toBe(401);
  });

  it("expires the lockout once the window passes", async () => {
    const { app } = buildTestApp({
      config: { passwordChangeMaxAttempts: 1, passwordChangeWindowSec: 1 },
    });
    const { token } = await registerAndGetToken(app);

    await changePassword(app, token, {
      currentPassword: "WrongGuess123",
      newPassword: NEW_PASSWORD,
    });
    const locked = await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(locked.statusCode).toBe(429);

    // InMemoryRedis expires lazily against Date.now(), so real elapsed time
    // is enough (same technique as the reset suite's expiry test).
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const after = await changePassword(app, token, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(after.statusCode).toBe(200);
    expect((await login(app, NEW_PASSWORD)).statusCode).toBe(200);
  });

  it("does not accept a password-reset code as the current password", async () => {
    const { app, deps } = buildTestApp();
    const { token } = await registerAndGetToken(app);
    await app.inject({ method: "POST", url: "/auth/password/forgot", payload: { email: EMAIL } });
    const code = deps.otpSender.sent.at(-1)!.code;

    const res = await changePassword(app, token, {
      currentPassword: code,
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(401);
    expect((await login(app, OLD_PASSWORD)).statusCode).toBe(200);
  });
});
