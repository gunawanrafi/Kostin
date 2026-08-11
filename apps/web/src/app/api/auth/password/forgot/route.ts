import { NextResponse } from "next/server";
import { authApi, toErrorResponse } from "@/lib/api";

// Proxies to auth-service's POST /auth/password/forgot. Uses `authApi`
// (attachToken: false) — this endpoint is unauthenticated by definition, and
// no tokens come back, so unlike the login/register proxies there are no
// cookies to set here.
//
// Always answers 200 with the same body whether or not the email is
// registered; the response never contains the reset code.
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await authApi.post("/auth/password/forgot", body);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
