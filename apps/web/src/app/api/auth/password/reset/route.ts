import { NextResponse } from "next/server";
import { authApi, toErrorResponse } from "@/lib/api";

// Proxies to auth-service's POST /auth/password/reset. Unauthenticated (the
// reset code is the credential), and it issues no tokens — a successful reset
// deliberately does NOT sign the user in; they return to /login and sign in
// with the new password.
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await authApi.post("/auth/password/reset", body);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
