import { NextResponse } from "next/server";
import { listingApi, toErrorResponse } from "@/lib/api";

// Thin authenticated proxy to listing-service's /rooms/:id endpoints. Rooms
// are addressed by their own (globally unique) id here, matching the upstream
// route shape — ownership is resolved server-side through the room's parent
// listing, so the client does not carry a listing id on these calls.
//
// Both methods are owner-only upstream; there is deliberately no GET, since
// GET /api/listings/:id/rooms already serves the whole roster.

// PATCH is how a room's status (AVAILABLE / BOOKED / OCCUPIED / MAINTENANCE)
// is set — the field behind B1's peta hunian.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await listingApi.patch(`/rooms/${params.id}`, body);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}

// Soft delete upstream — listing-service sets deletedAt and returns
// { id, deletedAt } rather than removing the row, so booking history that
// references the room is not orphaned.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { data } = await listingApi.delete(`/rooms/${params.id}`);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
