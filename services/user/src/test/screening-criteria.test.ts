import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeUser, signAccessToken } from "./helpers.js";
import { DEFAULT_SCREENING_CRITERIA, type ScreeningCriteria } from "../lib/dto.js";

const VALID_CRITERIA = {
  minDurationMonths: 6,
  requireVerifiedAccount: true,
  requireKtm: true,
  requireKtp: false,
  allowSmoking: false,
  allowPets: false,
  preferredUniversities: ["Universitas Brawijaya", "Universitas Negeri Malang"],
  notes: "Diutamakan mahasiswa tingkat akhir.",
};

const URL = "/users/me/screening-criteria";

function ownerApp() {
  const owner = makeUser({ role: "OWNER", email: "owner@example.com" });
  const { app, deps } = buildTestApp({ users: [owner] });
  return { app, deps, owner, token: signAccessToken(owner.id, owner.role) };
}

describe("GET /users/me/screening-criteria", () => {
  it("returns permissive defaults for an owner who has never saved any", async () => {
    const { app, token } = ownerApp();

    const res = await app.inject({ method: "GET", url: URL, headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(200);
    // Defaults must not filter anyone out — an owner who never configured
    // screening should still see every applicant.
    expect(res.json<ApiResponse<ScreeningCriteria>>().data).toEqual(DEFAULT_SCREENING_CRITERIA);
  });

  it("returns what was saved", async () => {
    const { app, token } = ownerApp();

    await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_CRITERIA,
    });
    const res = await app.inject({ method: "GET", url: URL, headers: { authorization: `Bearer ${token}` } });

    expect(res.json<ApiResponse<ScreeningCriteria>>().data).toEqual(VALID_CRITERIA);
  });

  it("rejects a STUDENT with 403 FORBIDDEN", async () => {
    const student = makeUser({ role: "STUDENT" });
    const { app } = buildTestApp({ users: [student] });
    const token = signAccessToken(student.id, student.role);

    const res = await app.inject({ method: "GET", url: URL, headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("rejects an unauthenticated request with 401 UNAUTHORIZED", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "GET", url: URL });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });

  it("normalizes a stored blob that predates the current shape", async () => {
    // The column is Json, so an older/partial object can legitimately be on
    // disk. It must degrade to defaults rather than reach the client with
    // fields of the wrong type.
    const owner = makeUser({ role: "OWNER" });
    const { app } = buildTestApp({
      users: [owner],
      profiles: [
        {
          id: "profile-1",
          userId: owner.id,
          name: null,
          avatar: null,
          bio: null,
          university: null,
          major: null,
          yearOfStudy: null,
          lifestyle: {},
          preferences: {},
          screeningCriteria: { requireKtm: true, minDurationMonths: "six", preferredUniversities: "UB" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const token = signAccessToken(owner.id, owner.role);

    const res = await app.inject({ method: "GET", url: URL, headers: { authorization: `Bearer ${token}` } });

    const data = res.json<ApiResponse<ScreeningCriteria>>().data!;
    expect(data.requireKtm).toBe(true); // the one valid field survives
    expect(data.minDurationMonths).toBe(DEFAULT_SCREENING_CRITERIA.minDurationMonths);
    expect(data.preferredUniversities).toEqual([]);
  });
});

describe("PUT /users/me/screening-criteria", () => {
  it("saves criteria for an owner with no existing profile row", async () => {
    // An owner who never touched their profile has no UserProfile — saving
    // must upsert rather than 404.
    const { app, deps, token, owner } = ownerApp();
    expect(deps.userRepository.profiles).toHaveLength(0);

    const res = await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_CRITERIA,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<ApiResponse<ScreeningCriteria>>().data).toEqual(VALID_CRITERIA);
    expect(deps.userRepository.profiles.find((p) => p.userId === owner.id)).toBeDefined();
  });

  it("replaces the entire object (PUT semantics)", async () => {
    const { app, token } = ownerApp();

    await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_CRITERIA,
    });

    const relaxed = {
      ...VALID_CRITERIA,
      requireKtm: false,
      requireVerifiedAccount: false,
      preferredUniversities: [],
      notes: "",
    };
    const res = await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: relaxed,
    });

    expect(res.json<ApiResponse<ScreeningCriteria>>().data).toEqual(relaxed);
  });

  it("does not disturb the profile's other fields", async () => {
    const { app, token, owner } = ownerApp();

    await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
      payload: { bio: "Pemilik 3 kost di Lowokwaru." },
    });
    await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_CRITERIA,
    });

    const me = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.json<ApiResponse<{ bio: string | null }>>().data?.bio).toBe("Pemilik 3 kost di Lowokwaru.");
    expect(owner.role).toBe("OWNER");
  });

  it("rejects a partial payload with 400 VALIDATION_ERROR", async () => {
    const { app, token } = ownerApp();

    const res = await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: { requireKtm: true },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-integer or out-of-range duration", async () => {
    const { app, token } = ownerApp();

    for (const minDurationMonths of [0, 25, 6.5]) {
      const res = await app.inject({
        method: "PUT",
        url: URL,
        headers: { authorization: `Bearer ${token}` },
        payload: { ...VALID_CRITERIA, minDurationMonths },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects a wrong-typed boolean rather than coercing it", async () => {
    const { app, token } = ownerApp();

    const res = await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_CRITERIA, requireKtm: "yes" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects more than 20 preferred universities", async () => {
    const { app, token } = ownerApp();

    const res = await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ...VALID_CRITERIA,
        preferredUniversities: Array.from({ length: 21 }, (_, i) => `Kampus ${i}`),
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects notes longer than 500 characters", async () => {
    const { app, token } = ownerApp();

    const res = await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_CRITERIA, notes: "a".repeat(501) },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects a STUDENT with 403 and saves nothing", async () => {
    const student = makeUser({ role: "STUDENT" });
    const { app, deps } = buildTestApp({ users: [student] });
    const token = signAccessToken(student.id, student.role);

    const res = await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_CRITERIA,
    });

    expect(res.statusCode).toBe(403);
    expect(deps.userRepository.profiles).toHaveLength(0);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "PUT", url: URL, payload: VALID_CRITERIA });

    expect(res.statusCode).toBe(401);
  });

  it("scopes criteria to the calling owner", async () => {
    const owner1 = makeUser({ role: "OWNER", email: "one@example.com", phone: "+6281100000001" });
    const owner2 = makeUser({ role: "OWNER", email: "two@example.com", phone: "+6281100000002" });
    const { app } = buildTestApp({ users: [owner1, owner2] });

    await app.inject({
      method: "PUT",
      url: URL,
      headers: { authorization: `Bearer ${signAccessToken(owner1.id, "OWNER")}` },
      payload: VALID_CRITERIA,
    });

    const res = await app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: `Bearer ${signAccessToken(owner2.id, "OWNER")}` },
    });

    // owner2 never saved anything, so they still see defaults.
    expect(res.json<ApiResponse<ScreeningCriteria>>().data).toEqual(DEFAULT_SCREENING_CRITERIA);
  });
});
