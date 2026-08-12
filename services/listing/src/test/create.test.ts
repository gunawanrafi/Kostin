import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, signAccessToken } from "./helpers.js";
import type { PublicListing } from "../lib/dto.js";

const validPayload = {
  title: "Kost Putri Melati Asri",
  description: "Kost putri nyaman dan aman dengan akses mudah ke kampus dan fasilitas lengkap.",
  address: "Jl. Melati No. 10",
  kelurahan: "Ketawanggede",
  kecamatan: "Lowokwaru",
  lat: -7.9553,
  lng: 112.6142,
  type: "PUTRI",
  pricePerMonth: 1200000,
  amenities: ["wifi", "ac", "kamar_mandi_dalam"],
};

describe("POST /listings", () => {
  it("creates a listing for an OWNER", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "POST",
      url: "/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<PublicListing>>();
    expect(body.data?.ownerId).toBe("owner-1");
    expect(body.data?.title).toBe(validPayload.title);
    expect(body.data?.tipe).toBe("PUTRI");
    expect(body.data?.pricePerMonth).toBe(1200000);
    expect(body.data?.status).toBe("DRAFT");
    expect(body.data?.city).toBe("Malang");
  });

  it("rejects a request with no Authorization header", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "POST", url: "/listings", payload: validPayload });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });

  it("rejects a non-OWNER role with 403 FORBIDDEN", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "POST",
      url: "/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload,
    });

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("rejects an invalid body with 400 VALIDATION_ERROR", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "POST",
      url: "/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload, title: "hi", pricePerMonth: -5 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });
});

// C5 · Harga & Aturan. The wizard used to collect deposit/rules/fees and drop
// every one of them on the floor — POST /listings had nowhere to put them.
describe("POST /listings — Harga & Aturan (C5)", () => {
  const HOUSE_RULES = {
    access24Hours: true,
    overnightGuestsAllowed: false,
    oppositeGenderProhibited: true,
    petsProhibited: true,
    smokingProhibited: true,
  };

  const FULL_PAYLOAD = {
    ...validPayload,
    deposit: { enabled: true, amount: 500000 },
    paymentDuration: "QUARTERLY",
    houseRules: HOUSE_RULES,
    additionalFees: { extraOccupant: 300000, motorcycleParking: 50000, carParking: 150000 },
    rules: ["Jam malam pukul 22.00", "Wajib lapor jika menginap di luar"],
  };

  async function create(payload: Record<string, unknown>) {
    const { app } = buildTestApp();
    const token = signAccessToken("owner-1", "OWNER");
    return app.inject({
      method: "POST",
      url: "/listings",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  it("persists deposit, payment duration, rules and fees", async () => {
    const res = await create(FULL_PAYLOAD);

    expect(res.statusCode).toBe(201);
    const listing = res.json<ApiResponse<PublicListing>>().data!;
    expect(listing.deposit).toEqual({ enabled: true, amount: 500000 });
    expect(listing.paymentDuration).toBe("QUARTERLY");
    expect(listing.houseRules).toEqual(HOUSE_RULES);
    expect(listing.additionalFees).toEqual({
      extraOccupant: 300000,
      motorcycleParking: 50000,
      carParking: 150000,
    });
    expect(listing.rules).toEqual([
      "Jam malam pukul 22.00",
      "Wajib lapor jika menginap di luar",
    ]);
  });

  it("round-trips through GET /listings/:id", async () => {
    // Guards against a write path that only echoes its own input back.
    const { app } = buildTestApp();
    const token = signAccessToken("owner-1", "OWNER");
    const created = await app.inject({
      method: "POST",
      url: "/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: FULL_PAYLOAD,
    });
    const id = created.json<ApiResponse<PublicListing>>().data!.id;

    const fetched = await app.inject({ method: "GET", url: `/listings/${id}` });

    const listing = fetched.json<ApiResponse<PublicListing>>().data!;
    expect(listing.deposit).toEqual({ enabled: true, amount: 500000 });
    expect(listing.houseRules).toEqual(HOUSE_RULES);
    expect(listing.additionalFees.carParking).toBe(150000);
    expect(listing.paymentDuration).toBe("QUARTERLY");
  });

  it("stores a disabled deposit as no amount", async () => {
    const res = await create({ ...FULL_PAYLOAD, deposit: { enabled: false } });

    expect(res.json<ApiResponse<PublicListing>>().data!.deposit).toEqual({
      enabled: false,
      amount: null,
    });
  });

  it("ignores an amount sent alongside enabled:false", async () => {
    // The two can't disagree on disk: enabled is derived from the amount's
    // presence, so a disabled deposit stores nothing regardless.
    const res = await create({ ...FULL_PAYLOAD, deposit: { enabled: false, amount: 900000 } });

    expect(res.json<ApiResponse<PublicListing>>().data!.deposit).toEqual({
      enabled: false,
      amount: null,
    });
  });

  it("rejects an enabled deposit with no amount", async () => {
    const res = await create({ ...FULL_PAYLOAD, deposit: { enabled: true } });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a zero or negative deposit amount", async () => {
    for (const amount of [0, -1]) {
      const res = await create({ ...FULL_PAYLOAD, deposit: { enabled: true, amount } });
      expect(res.statusCode).toBe(400);
    }
  });

  it("defaults to MONTHLY and no rules when the C5 fields are omitted", async () => {
    // Listings created before this step existed must stay meaningful.
    const res = await create(validPayload);

    const listing = res.json<ApiResponse<PublicListing>>().data!;
    expect(listing.paymentDuration).toBe("MONTHLY");
    expect(listing.deposit).toEqual({ enabled: false, amount: null });
    expect(listing.houseRules).toEqual({
      access24Hours: false,
      overnightGuestsAllowed: false,
      oppositeGenderProhibited: false,
      petsProhibited: false,
      smokingProhibited: false,
    });
    expect(listing.additionalFees).toEqual({
      extraOccupant: null,
      motorcycleParking: null,
      carParking: null,
    });
  });

  it("distinguishes an unset fee from an explicit zero", async () => {
    const res = await create({
      ...FULL_PAYLOAD,
      additionalFees: { motorcycleParking: 0 },
    });

    const fees = res.json<ApiResponse<PublicListing>>().data!.additionalFees;
    // 0 = charged, but free. null = not charged at all. The UI renders these
    // differently, so the distinction has to survive the round trip.
    expect(fees.motorcycleParking).toBe(0);
    expect(fees.extraOccupant).toBeNull();
    expect(fees.carParking).toBeNull();
  });

  it("rejects a partial houseRules object", async () => {
    // All five toggles are required together, so a half-sent object can't
    // leave some rules at an unintended default.
    const res = await create({
      ...FULL_PAYLOAD,
      houseRules: { smokingProhibited: true },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-boolean rule flag rather than coercing it", async () => {
    const res = await create({
      ...FULL_PAYLOAD,
      houseRules: { ...HOUSE_RULES, smokingProhibited: "ya" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects an unknown payment duration", async () => {
    const res = await create({ ...FULL_PAYLOAD, paymentDuration: "WEEKLY" });

    expect(res.statusCode).toBe(400);
  });

  it("rejects a negative fee", async () => {
    const res = await create({
      ...FULL_PAYLOAD,
      additionalFees: { carParking: -1000 },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects an amount that would overflow the DECIMAL(12,2) column", async () => {
    const res = await create({
      ...FULL_PAYLOAD,
      deposit: { enabled: true, amount: 10_000_000_000 },
    });

    expect(res.statusCode).toBe(400);
  });
});
