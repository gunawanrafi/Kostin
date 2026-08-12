import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { Prisma } from "@kostin/database";
import { buildTestApp, makeListing, signAccessToken } from "./helpers.js";
import type { PublicListing } from "../lib/dto.js";

describe("PATCH /listings/:id", () => {
  it("updates fields for the owning OWNER", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { pricePerMonth: 1750000, status: "INACTIVE" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicListing>>();
    expect(body.data?.pricePerMonth).toBe(1750000);
    expect(body.data?.status).toBe("INACTIVE");
  });

  it("rejects a caller who doesn't own the listing with 403 FORBIDDEN", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-2", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Kost Baru Nama Lain" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("FORBIDDEN");
  });

  it("returns 404 for an unknown listing", async () => {
    const { app } = buildTestApp();
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "PATCH",
      url: "/listings/does-not-exist",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Kost Baru Nama Lain" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects a STUDENT role with 403 FORBIDDEN", async () => {
    const listing = makeListing({ ownerId: "owner-1" });
    const { app } = buildTestApp({ listings: [listing] });
    const token = signAccessToken("owner-1", "STUDENT");

    const res = await app.inject({
      method: "PATCH",
      url: `/listings/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Kost Baru Nama Lain" },
    });

    expect(res.statusCode).toBe(403);
  });
});

// C5 fields via PATCH. Per-object replace semantics: sending `houseRules`
// replaces all five toggles, omitting the key leaves the stored value alone.
describe("PATCH /listings/:id — Harga & Aturan (C5)", () => {
  const HOUSE_RULES = {
    access24Hours: true,
    overnightGuestsAllowed: false,
    oppositeGenderProhibited: true,
    petsProhibited: true,
    smokingProhibited: true,
  };

  function patch(payload: Record<string, unknown>, seed = makeListing({ ownerId: "owner-1" })) {
    const { app } = buildTestApp({ listings: [seed] });
    const token = signAccessToken("owner-1", "OWNER");
    return app.inject({
      method: "PATCH",
      url: `/listings/${seed.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  it("sets deposit, duration, rules and fees", async () => {
    const res = await patch({
      deposit: { enabled: true, amount: 750000 },
      paymentDuration: "ANNUAL",
      houseRules: HOUSE_RULES,
      additionalFees: { extraOccupant: 200000 },
    });

    expect(res.statusCode).toBe(200);
    const listing = res.json<ApiResponse<PublicListing>>().data!;
    expect(listing.deposit).toEqual({ enabled: true, amount: 750000 });
    expect(listing.paymentDuration).toBe("ANNUAL");
    expect(listing.houseRules).toEqual(HOUSE_RULES);
    expect(listing.additionalFees.extraOccupant).toBe(200000);
  });

  it("clears the deposit when sent enabled:false", async () => {
    const seeded = makeListing({ ownerId: "owner-1", depositAmount: new Prisma.Decimal(500000) });

    const res = await patch({ deposit: { enabled: false } }, seeded);

    expect(res.json<ApiResponse<PublicListing>>().data!.deposit).toEqual({
      enabled: false,
      amount: null,
    });
  });

  it("leaves stored pricing untouched when the C5 keys are omitted", async () => {
    // A PATCH of an unrelated field must not silently wipe the deposit —
    // this is the failure the `undefined` checks in the repository prevent.
    const seeded = makeListing({
      ownerId: "owner-1",
      depositAmount: new Prisma.Decimal(500000),
      paymentDuration: "SEMIANNUAL",
      houseRules: HOUSE_RULES,
      feeCarParking: new Prisma.Decimal(150000),
    });

    const res = await patch({ title: "Kost Melati Sudah Direnovasi" }, seeded);

    const listing = res.json<ApiResponse<PublicListing>>().data!;
    expect(listing.deposit).toEqual({ enabled: true, amount: 500000 });
    expect(listing.paymentDuration).toBe("SEMIANNUAL");
    expect(listing.houseRules).toEqual(HOUSE_RULES);
    expect(listing.additionalFees.carParking).toBe(150000);
  });

  it("replaces every fee when additionalFees is sent", async () => {
    const seeded = makeListing({
      ownerId: "owner-1",
      feeExtraOccupant: new Prisma.Decimal(300000),
      feeCarParking: new Prisma.Decimal(150000),
    });

    const res = await patch({ additionalFees: { motorcycleParking: 50000 } }, seeded);

    const fees = res.json<ApiResponse<PublicListing>>().data!.additionalFees;
    expect(fees.motorcycleParking).toBe(50000);
    // Sending the object means "these are my fees now" — the omitted ones are
    // cleared rather than merged, matching the form that submits all three.
    expect(fees.extraOccupant).toBeNull();
    expect(fees.carParking).toBeNull();
  });

  it("rejects a partial houseRules object", async () => {
    const res = await patch({ houseRules: { petsProhibited: true } });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });
});
