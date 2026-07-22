import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@kostin/types";
import { ACCESS_TOKEN_COOKIE, authApi, REFRESH_TOKEN_COOKIE } from "@/lib/api";

// Best-effort: tells auth-service to revoke the refresh token, then clears
// both cookies regardless of whether that call succeeds — an unreachable
// auth-service shouldn't strand the user in a logged-in browser.
export async function POST(): Promise<NextResponse> {
  const store = cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      await authApi.post("/auth/logout", { refreshToken });
    } catch {
      // ignore — cookies are cleared below either way
    }
  }

  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);

  return NextResponse.json({ data: { success: true }, error: null, meta: {} } satisfies ApiResponse<{
    success: boolean;
  }>);
}
