import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeUser, signAccessToken } from "./helpers.js";
import type { PublicUser } from "../lib/dto.js";

const VALID_LIFESTYLE = {
  sleepTime: "early",
  noiseLevel: "quiet",
  smoking: false,
  pets: false,
  guests: "occasionally",
  cleaningFreq: "weekly",
};

describe("PUT /users/me/lifestyle", () => {
  it("creates a profile with lifestyle when none exists", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "PUT",
      url: "/users/me/lifestyle",
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_LIFESTYLE,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicUser>>();
    expect(body.data?.lifestyle).toEqual(VALID_LIFESTYLE);
  });

  it("replaces the entire lifestyle object (PUT semantics)", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    await app.inject({
      method: "PUT",
      url: "/users/me/lifestyle",
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_LIFESTYLE,
    });

    const updated = { ...VALID_LIFESTYLE, sleepTime: "late", smoking: true };
    const res = await app.inject({
      method: "PUT",
      url: "/users/me/lifestyle",
      headers: { authorization: `Bearer ${token}` },
      payload: updated,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<PublicUser>>().data?.lifestyle).toEqual(updated);
  });

  it("rejects a partial payload with 400 VALIDATION_ERROR (PUT requires the full shape)", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "PUT",
      url: "/users/me/lifestyle",
      headers: { authorization: `Bearer ${token}` },
      payload: { sleepTime: "early" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid enum value with 400 VALIDATION_ERROR", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "PUT",
      url: "/users/me/lifestyle",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_LIFESTYLE, noiseLevel: "deafening" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects requests without an Authorization header with 401 UNAUTHORIZED", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users/me/lifestyle",
      payload: VALID_LIFESTYLE,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });
});
