import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp } from "./helpers.js";
import type { AuthResult } from "../lib/dto.js";

describe("POST /auth/register", () => {
  it("creates a user and returns tokens", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Budi Santoso",
        email: "budi@example.com",
        phone: "081234567890",
        password: "SuperSecret1",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<AuthResult>>();
    expect(body.error).toBeNull();
    expect(body.data?.user.email).toBe("budi@example.com");
    expect(body.data?.user.phone).toBe("+6281234567890");
    expect(body.data?.user.role).toBe("STUDENT");
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(body.data?.tokens.accessToken).toBeTypeOf("string");
    expect(body.data?.tokens.refreshToken).toBeTypeOf("string");
    expect(body.data?.tokens.expiresIn).toBe(15 * 60);
    expect(body.meta.requestId).toBeTypeOf("string");
  });

  it("defaults role to STUDENT but accepts OWNER", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Pak Budi",
        email: "pakbudi@example.com",
        phone: "081234500000",
        password: "SuperSecret1",
        role: "OWNER",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json<ApiResponse<AuthResult>>().data?.user.role).toBe("OWNER");
  });

  it("rejects duplicate email/phone with 409 USER_EXISTS", async () => {
    const { app } = buildTestApp();
    const payload = {
      name: "Budi Santoso",
      email: "dupe@example.com",
      phone: "081234567891",
      password: "SuperSecret1",
    };

    await app.inject({ method: "POST", url: "/auth/register", payload });
    const res = await app.inject({ method: "POST", url: "/auth/register", payload });

    expect(res.statusCode).toBe(409);
    const body = res.json<ApiResponse<null>>();
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe("USER_EXISTS");
  });

  it("rejects a request body that fails validation", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "A", email: "not-an-email", phone: "123", password: "short" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });
});
