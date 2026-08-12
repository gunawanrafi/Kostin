import { NextResponse } from "next/server";
import { toErrorResponse, userApi } from "@/lib/api";

// Authenticated proxy to user-service's GET|PUT /users/me/screening-criteria
// (D3 · Kriteria Penyewa). OWNER-only — user-service answers 403 FORBIDDEN for
// any other role, and the caller's role comes from the token, not the request.

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await userApi.get("/users/me/screening-criteria");
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

// PUT replaces the whole criteria object; a partial body is a 400 upstream.
export async function PUT(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await userApi.put("/users/me/screening-criteria", body);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
