import { NextResponse } from "next/server";
import { authenticatedAuthApi, toErrorResponse } from "@/lib/api";

// Proxies to auth-service's POST /auth/password/change. Unlike the forgot/reset
// pair next door, this one is authenticated: it uses authenticatedAuthApi so
// the access-token cookie is forwarded as a Bearer header, and auth-service
// takes the user id from that token rather than from the body — the browser
// never says whose password is being changed.
//
// No tokens are re-issued and none are revoked, so the caller stays signed in
// on this device afterwards.
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await authenticatedAuthApi.post("/auth/password/change", body);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
