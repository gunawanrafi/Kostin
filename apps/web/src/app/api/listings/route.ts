import { NextResponse, type NextRequest } from "next/server";
import { listingApi, toErrorResponse } from "@/lib/api";

// Thin authenticated proxy to listing-service. GET is used both for public
// browsing and — with ?mine=true — the owner dashboard's own listings
// (across every status); listing-service itself enforces that distinction.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  try {
    const { data } = await listingApi.get("/listings", { params: Object.fromEntries(searchParams) });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await listingApi.post("/listings", body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
