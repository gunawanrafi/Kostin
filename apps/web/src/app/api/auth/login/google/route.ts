import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@kostin/types";
import { ACCESS_TOKEN_COOKIE, authApi, REFRESH_TOKEN_COOKIE, toErrorResponse } from "@/lib/api";
import type { AuthResult } from "@/lib/types";

// Proxies to auth-service's POST /auth/login/google, then swaps the raw
// tokens for httpOnly cookies before the response reaches the browser —
// byte-for-byte the same cookie handling as app/api/auth/login/route.ts, so a
// Google sign-in lands the caller in exactly the same authenticated state as
// an email/password sign-in. The client only ever sees `{ user }`.
//
// Request body: { idToken: string } — a Google ID token minted in the browser
// by Google Identity Services. auth-service verifies it against its
// GOOGLE_CLIENT_ID (see services/auth/src/lib/google.ts).
//
// NOTE: this proxy is complete and correct, but the flow cannot succeed until
// GOOGLE_CLIENT_ID is set for auth-service AND the browser can mint an ID
// token. With GOOGLE_CLIENT_ID empty (its current state) the verifier's
// audience check fails and auth-service returns 401 GOOGLE_TOKEN_INVALID,
// which this handler forwards unchanged.
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await authApi.post<ApiResponse<AuthResult>>("/auth/login/google", body);
    if (!data.data) {
      return NextResponse.json(data, { status: 502 });
    }

    const { user, tokens } = data.data;
    const store = cookies();
    store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expiresIn,
    });
    store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      data: { user },
      error: null,
      meta: data.meta,
    } satisfies ApiResponse<{ user: typeof user }>);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
