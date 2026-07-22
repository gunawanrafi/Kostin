import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeUser, signAccessToken } from "./helpers.js";
import type { PublicUser } from "../lib/dto.js";

describe("PATCH /users/me", () => {
  it("updates the user's name", async () => {
    const user = makeUser({ name: "Old Name" });
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "New Name" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicUser>>();
    expect(body.data?.name).toBe("New Name");
  });

  it("upserts profile fields (bio, university, major, yearOfStudy)", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        bio: "CS student who loves quiet kosts",
        university: "Universitas Brawijaya",
        major: "Computer Science",
        yearOfStudy: 2,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicUser>>();
    expect(body.data?.bio).toBe("CS student who loves quiet kosts");
    expect(body.data?.university).toBe("Universitas Brawijaya");
    expect(body.data?.major).toBe("Computer Science");
    expect(body.data?.yearOfStudy).toBe(2);
  });

  it("rejects an empty body with 400 VALIDATION_ERROR", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an out-of-range yearOfStudy with 400 VALIDATION_ERROR", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);

    const res = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
      payload: { yearOfStudy: 99 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects requests without an Authorization header with 401 UNAUTHORIZED", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "PATCH", url: "/users/me", payload: { name: "X" } });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });
});
