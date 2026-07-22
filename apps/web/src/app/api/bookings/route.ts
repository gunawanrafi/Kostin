import { NextResponse, type NextRequest } from "next/server";
import { bookingApi, toErrorResponse } from "@/lib/api";

// Thin authenticated proxy to booking-service's GET /bookings — scoped
// server-side (owner sees bookings on their listings, student sees their
// own) based on the JWT read from the httpOnly cookie.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  try {
    const { data } = await bookingApi.get("/bookings", { params: Object.fromEntries(searchParams) });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
