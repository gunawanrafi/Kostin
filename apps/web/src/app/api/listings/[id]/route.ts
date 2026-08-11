import { NextResponse } from "next/server";
import { listingApi, toErrorResponse } from "@/lib/api";

// Thin authenticated proxy to listing-service's /listings/:id endpoints.
// Token handling is identical to the sibling /api/listings proxy: listingApi's
// request interceptor reads the httpOnly access-token cookie via next/headers
// and attaches the Bearer header, so nothing token-related happens here.
//
// GET is public upstream (listing-service registers no preHandler on it), so
// it works signed-out too; PATCH and DELETE are owner-only and enforced by
// listing-service via requireOwner — a non-owner gets that service's 403
// forwarded unchanged rather than a silent success.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { data } = await listingApi.get(`/listings/${params.id}`);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await listingApi.patch(`/listings/${params.id}`, body);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}

// Soft delete upstream — listing-service sets deletedAt and returns
// { id, deletedAt } rather than removing the row.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { data } = await listingApi.delete(`/listings/${params.id}`);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
