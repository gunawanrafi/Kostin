import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp } from "./helpers.js";
import type { AuthResult } from "../lib/dto.js";

async function registerUser(app: ReturnType<typeof buildTestApp>["app"]): Promise<void> {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name: "Siti Aminah",
      email: "siti@example.com",
      phone: "081298765432",
      password: "SuperSecret1",
    },
  });
}

describe("POST /auth/login", () => {
  it("logs in with email + password", async () => {
    const { app } = buildTestApp();
    await registerUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { identifier: "siti@example.com", password: "SuperSecret1" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<AuthResult>>();
    expect(body.data?.user.email).toBe("siti@example.com");
    expect(body.data?.tokens.accessToken).toBeTypeOf("string");
  });

  it("logs in with phone + password", async () => {
    const { app } = buildTestApp();
    await registerUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { identifier: "081298765432", password: "SuperSecret1" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<AuthResult>>().data?.user.email).toBe("siti@example.com");
  });

  it("rejects a wrong password with 401 INVALID_CREDENTIALS", async () => {
    const { app } = buildTestApp();
    await registerUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { identifier: "siti@example.com", password: "WrongPassword1" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects an unknown identifier with 401 INVALID_CREDENTIALS (no user enumeration)", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { identifier: "ghost@example.com", password: "SuperSecret1" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_CREDENTIALS");
  });
});
