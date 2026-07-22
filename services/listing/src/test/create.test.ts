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
