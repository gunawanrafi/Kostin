import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import {
  buildTestApp,
  makeBooking,
  makeListing,
  makeRoom,
  makeStudent,
  signAccessToken,
} from "./helpers.js";
import type { PublicBooking, PublicBookingWithContext } from "../lib/dto.js";

function seed() {
  const base = new Date("2026-01-01T00:00:00Z");
  return [
    makeBooking({
      id: "b-1",
      ownerId: "owner-1",
      studentId: "student-1",
      status: "PENDING",
      createdAt: new Date(base.getTime() + 3000),
    }),
    makeBooking({
      id: "b-2",
      ownerId: "owner-1",
      studentId: "student-2",
      status: "CONFIRMED",
      createdAt: new Date(base.getTime() + 2000),
    }),
    makeBooking({
      id: "b-3",
      ownerId: "owner-2",
      studentId: "student-1",
      status: "PENDING",
      createdAt: new Date(base.getTime() + 1000),
    }),
  ];
}

describe("GET /bookings", () => {
  it("scopes an OWNER to bookings on their own listings, newest first", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({ method: "GET", url: "/bookings", headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-1", "b-2"]);
    expect(body.meta.total).toBe(2);
  });

  it("scopes a STUDENT to their own bookings across different owners", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({ method: "GET", url: "/bookings", headers: { authorization: `Bearer ${token}` } });

    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-1", "b-3"]);
  });

  it("filters by status", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "GET",
      url: "/bookings?status=CONFIRMED",
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-2"]);
  });

  it("paginates with page/limit", async () => {
    const { app } = buildTestApp({ bookings: seed() });
    const token = signAccessToken("owner-1", "OWNER");

    const res = await app.inject({
      method: "GET",
      url: "/bookings?page=2&limit=1",
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json<ApiResponse<PublicBooking[]>>();
    expect(body.data?.map((b) => b.id)).toEqual(["b-2"]);
    expect(body.meta.page).toBe(2);
    expect(body.meta.total).toBe(2);
  });

  it("rejects a request with no Authorization header", async () => {
    const { app } = buildTestApp({ bookings: seed() });

    const res = await app.inject({ method: "GET", url: "/bookings" });

    expect(res.statusCode).toBe(401);
  });
});

// X4 — the owner's Calon Penyewa list used to render "Penyewa #cmsppkqw"
// because this endpoint returned nothing but foreign keys.
describe("GET /bookings — applicant, listing and room identity", () => {
  function contextFixture() {
    return {
      listings: [makeListing({ id: "listing-1", title: "Kost Integration Test Malang" })],
      rooms: [makeRoom({ id: "room-1", listingId: "listing-1", name: "Kamar A1" })],
      students: [
        makeStudent({
          id: "student-1",
          name: "Budi Mahasiswa",
          university: "Universitas Brawijaya",
          major: "Teknik Informatika",
          yearOfStudy: 2,
        }),
      ],
      bookings: [
        makeBooking({
          id: "b-1",
          ownerId: "owner-1",
          studentId: "student-1",
          listingId: "listing-1",
          roomId: "room-1",
        }),
      ],
    };
  }

  async function listAsOwner(overrides: Parameters<typeof buildTestApp>[0]) {
    const { app } = buildTestApp(overrides);
    const token = signAccessToken("owner-1", "OWNER");
    const res = await app.inject({
      method: "GET",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    return res.json<ApiResponse<PublicBookingWithContext[]>>().data![0]!;
  }

  it("embeds the applicant's real name, role and academic profile", async () => {
    const booking = await listAsOwner(contextFixture());

    expect(booking.student).toMatchObject({
      id: "student-1",
      name: "Budi Mahasiswa",
      role: "STUDENT",
      university: "Universitas Brawijaya",
      major: "Teknik Informatika",
      yearOfStudy: 2,
    });
  });

  it("embeds the listing title and room name instead of bare ids", async () => {
    const booking = await listAsOwner(contextFixture());

    expect(booking.listing).toEqual({ id: "listing-1", title: "Kost Integration Test Malang" });
    expect(booking.room).toEqual({ id: "room-1", name: "Kamar A1" });
  });

  it("returns a null room when the booking is against the listing as a whole", async () => {
    const fixture = contextFixture();
    const booking = await listAsOwner({
      ...fixture,
      bookings: [makeBooking({ id: "b-1", ownerId: "owner-1", studentId: "student-1", roomId: null })],
    });

    expect(booking.room).toBeNull();
    // The listing is still named — a roomless booking is not an anonymous one.
    expect(booking.listing.title).toBe("Kost Integration Test Malang");
  });

  it("reports accountVerified true only for an ACTIVE account", async () => {
    const fixture = contextFixture();
    const booking = await listAsOwner({
      ...fixture,
      students: [makeStudent({ id: "student-1", status: "ACTIVE" })],
    });

    expect(booking.student.accountVerified).toBe(true);
  });

  it("reports accountVerified false for PENDING_VERIFICATION and SUSPENDED", async () => {
    // The real seeded booking is exactly this case: Budi Mahasiswa's account
    // is PENDING_VERIFICATION, so the owner must not see a verified badge.
    const fixture = contextFixture();

    for (const status of ["PENDING_VERIFICATION", "SUSPENDED"] as const) {
      const booking = await listAsOwner({
        ...fixture,
        students: [makeStudent({ id: "student-1", status })],
      });
      expect(booking.student.accountVerified).toBe(false);
    }
  });

  it("nulls the academic fields when the applicant has no profile row", async () => {
    const fixture = contextFixture();
    const booking = await listAsOwner({
      ...fixture,
      students: [
        makeStudent({ id: "student-1", university: null, major: null, yearOfStudy: null }),
      ],
    });

    // Null, not an invented placeholder — the UI decides whether to show a
    // line at all.
    expect(booking.student.university).toBeNull();
    expect(booking.student.major).toBeNull();
    expect(booking.student.yearOfStudy).toBeNull();
    expect(booking.student.name).toBe("Budi Mahasiswa");
  });

  it("never leaks the applicant's contact details or credentials", async () => {
    const booking = await listAsOwner(contextFixture());

    // The owner screens applicants; they don't get their email/phone from a
    // list endpoint, and password material must never cross this boundary.
    expect(booking.student).not.toHaveProperty("email");
    expect(booking.student).not.toHaveProperty("phone");
    expect(booking.student).not.toHaveProperty("passwordHash");
    expect(booking.student).not.toHaveProperty("googleId");
  });

  it("keeps the booking's own fields intact alongside the joined rows", async () => {
    const booking = await listAsOwner(contextFixture());

    // The context is additive — nothing that already worked was displaced.
    const asBooking: PublicBooking = booking;
    expect(asBooking.id).toBe("b-1");
    expect(asBooking.status).toBe("PENDING");
    expect(asBooking.durationMonths).toBe(3);
    expect(asBooking.totalPrice).toBe(4500000);
  });

  it("hydrates a STUDENT's own listing view too", async () => {
    const { app } = buildTestApp(contextFixture());
    const token = signAccessToken("student-1", "STUDENT");

    const res = await app.inject({
      method: "GET",
      url: "/bookings",
      headers: { authorization: `Bearer ${token}` },
    });

    const booking = res.json<ApiResponse<PublicBookingWithContext[]>>().data![0]!;
    expect(booking.listing.title).toBe("Kost Integration Test Malang");
  });
});
