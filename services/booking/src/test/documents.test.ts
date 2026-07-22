import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildMultipartBody, buildTestApp, makeBooking, signAccessToken } from "./helpers.js";
import type { PublicBooking } from "../lib/dto.js";

const fakeImage = () => Buffer.from("fake-image-bytes");

describe("POST /bookings/:id/documents", () => {
  it("uploads a KTM and sets ktmUrl", async () => {
    const booking = makeBooking({ studentId: "student-1" });
    const { app, deps } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");
    const { payload, contentType } = buildMultipartBody({
      filename: "ktm.jpg",
      content: fakeImage(),
      contentType: "image/jpeg",
    });

    const res = await app.inject({
      method: "POST",
      url: `/bookings/${booking.id}/documents?type=KTM`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicBooking>>();
    expect(body.data?.ktmUrl).toContain(`kostin/bookings/${booking.id}`);
    expect(body.data?.ktpUrl).toBeNull();
    expect(deps.documentUploader.uploads).toEqual([{ bookingId: booking.id, documentType: "KTM" }]);
  });

  it("uploads a KTP independently of KTM", async () => {
    const booking = makeBooking({ studentId: "student-1", ktmUrl: "https://res.cloudinary.com/test/ktm.jpg" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");
    const { payload, contentType } = buildMultipartBody({
      filename: "ktp.jpg",
      content: fakeImage(),
      contentType: "image/jpeg",
    });

    const res = await app.inject({
      method: "POST",
      url: `/bookings/${booking.id}/documents?type=KTP`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    const body = res.json<ApiResponse<PublicBooking>>();
    expect(body.data?.ktpUrl).toContain(`kostin/bookings/${booking.id}`);
    expect(body.data?.ktmUrl).toBe("https://res.cloudinary.com/test/ktm.jpg");
  });

  it("rejects a non-owning-student caller with 403 FORBIDDEN", async () => {
    const booking = makeBooking({ studentId: "student-1" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-2", "STUDENT");
    const { payload, contentType } = buildMultipartBody({
      filename: "ktm.jpg",
      content: fakeImage(),
      contentType: "image/jpeg",
    });

    const res = await app.inject({
      method: "POST",
      url: `/bookings/${booking.id}/documents?type=KTM`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects an invalid document type query param with 400 VALIDATION_ERROR", async () => {
    const booking = makeBooking({ studentId: "student-1" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");
    const { payload, contentType } = buildMultipartBody({
      filename: "ktm.jpg",
      content: fakeImage(),
      contentType: "image/jpeg",
    });

    const res = await app.inject({
      method: "POST",
      url: `/bookings/${booking.id}/documents?type=PASSPORT`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-image, non-pdf file with 400 INVALID_FILE", async () => {
    const booking = makeBooking({ studentId: "student-1" });
    const { app } = buildTestApp({ bookings: [booking] });
    const token = signAccessToken("student-1", "STUDENT");
    const { payload, contentType } = buildMultipartBody({
      filename: "ktm.exe",
      content: Buffer.from("MZ"),
      contentType: "application/x-msdownload",
    });

    const res = await app.inject({
      method: "POST",
      url: `/bookings/${booking.id}/documents?type=KTM`,
      headers: { authorization: `Bearer ${token}`, "content-type": contentType },
      payload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_FILE");
  });
});
