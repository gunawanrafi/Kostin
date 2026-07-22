import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeUser, signAccessToken } from "./helpers.js";
import type { ParentInviteResult } from "../services/user.service.js";

describe("POST /users/invite/parent", () => {
  it("creates a pending invite by parentEmail", async () => {
    const student = makeUser({ role: "STUDENT" });
    const { app, deps } = buildTestApp({ users: [student] });
    const token = signAccessToken(student.id, student.role);

    const res = await app.inject({
      method: "POST",
      url: "/users/invite/parent",
      headers: { authorization: `Bearer ${token}` },
      payload: { parentEmail: "ibu@example.com" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<ParentInviteResult>>();
    expect(body.error).toBeNull();
    expect(body.data?.token).toBeTypeOf("string");
    expect(body.data?.expiresAt).toBeTypeOf("string");
    expect(deps.parentInviteRepository.invites).toHaveLength(1);
    expect(deps.parentInviteRepository.invites[0]?.parentEmail).toBe("ibu@example.com");
  });

  it("creates a pending invite by parentPhone", async () => {
    const student = makeUser({ role: "STUDENT" });
    const { app } = buildTestApp({ users: [student] });
    const token = signAccessToken(student.id, student.role);

    const res = await app.inject({
      method: "POST",
      url: "/users/invite/parent",
      headers: { authorization: `Bearer ${token}` },
      payload: { parentPhone: "081234567899" },
    });

    expect(res.statusCode).toBe(201);
  });

  it("rejects a duplicate pending invite to the same parent with 409", async () => {
    const student = makeUser({ role: "STUDENT" });
    const { app } = buildTestApp({ users: [student] });
    const token = signAccessToken(student.id, student.role);
    const payload = { parentEmail: "ibu@example.com" };

    await app.inject({
      method: "POST",
      url: "/users/invite/parent",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    const res = await app.inject({
      method: "POST",
      url: "/users/invite/parent",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVITE_ALREADY_PENDING");
  });

  it("rejects invites from non-student roles with 403", async () => {
    const owner = makeUser({ role: "OWNER" });
    const { app } = buildTestApp({ users: [owner] });
    const token = signAccessToken(owner.id, owner.role);

    const res = await app.inject({
      method: "POST",
      url: "/users/invite/parent",
      headers: { authorization: `Bearer ${token}` },
      payload: { parentEmail: "someone@example.com" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVITE_INVALID_TARGET");
  });

  it("rejects a body with neither parentEmail nor parentPhone with 400", async () => {
    const student = makeUser({ role: "STUDENT" });
    const { app } = buildTestApp({ users: [student] });
    const token = signAccessToken(student.id, student.role);

    const res = await app.inject({
      method: "POST",
      url: "/users/invite/parent",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects requests without an Authorization header with 401 UNAUTHORIZED", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/users/invite/parent",
      payload: { parentEmail: "ibu@example.com" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });
});
