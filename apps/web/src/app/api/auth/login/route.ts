import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@kostin/types";
import { ACCESS_TOKEN_COOKIE, authApi, REFRESH_TOKEN_COOKIE, toErrorResponse } from "@/lib/api";
import type { AuthResult } from "@/lib/types";

// Proxies to auth-service's POST /auth/login, then swaps the raw tokens for
// httpOnly cookies before the response reaches the browser — the client
// only ever sees `{ user }`, never the tokens themselves.
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await authApi.post<ApiResponse<AuthResult>>("/auth/login", body);
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

    return NextResponse.json({ data: { user }, error: null, meta: data.meta } satisfies ApiResponse<{ user: typeof user }>);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
