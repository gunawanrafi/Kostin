import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookies";

// Auth pages: reachable signed-out, but bounce to the dashboard if you
// already have a token (no point showing a login form to someone logged in).
const AUTH_PATHS = ["/login", "/register"];

// Marketing pages: reachable in BOTH states. Deliberately not in AUTH_PATHS —
// a landing page shouldn't yank a signed-in owner to the dashboard just for
// visiting it (they may be following a shared link).
const MARKETING_PATHS = ["/pemilik"];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Presence-only check (middleware runs on the Edge runtime; full JWT
// verification happens per-request in the Route Handlers / backend
// services). Good enough for "should this browser see the dashboard at
// all" — an expired-but-present token still gets past here and then fails
// normally at the first authenticated API call.
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  const isAuthPath = matchesPath(pathname, AUTH_PATHS);
  // Anything that never requires a token: auth pages + marketing pages.
  const isPublicPath = isAuthPath || matchesPath(pathname, MARKETING_PATHS);

  if (!hasToken && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasToken && isAuthPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except: Next.js internals, static assets, and the API
  // routes (those read the cookie themselves and return 401 JSON instead
  // of a redirect, which is what a fetch()/axios caller actually wants).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
