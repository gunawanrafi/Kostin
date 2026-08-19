import { NextResponse } from "next/server";
import { listingApi, toErrorResponse } from "@/lib/api";

// Thin authenticated proxy to listing-service's /listings/:id/rooms endpoints.
// Same cookie-forwarding pattern as the sibling /api/listings/[id] proxy:
// listingApi's request interceptor reads the httpOnly access-token cookie via
// next/headers and attaches the Bearer header, so nothing token-related
// happens here.
//
// GET is public upstream (listing-service registers no preHandler on it), so
// it works signed-out too — the student-facing detail page needs the room
// roster. POST is owner-only, enforced upstream by requireOwner plus a
// per-listing ownership check; a non-owner gets that service's 403 forwarded
// unchanged rather than a silent success.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { data } = await listingApi.get(`/listings/${params.id}/rooms`);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

// Upstream answers 201 on success; the status is forwarded so the caller can
// distinguish "created" from a 200 the way the service intends.
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data, status } = await listingApi.post(`/listings/${params.id}/rooms`, body);
    return NextResponse.json(data, { status });
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
