import axios, { type AxiosInstance } from "axios";
import { cookies } from "next/headers";
import type { ApiResponse } from "@kostin/types";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookies";

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";

// Server-only base URLs (no NEXT_PUBLIC_ prefix — the browser never talks to
// these directly). Route Handlers under src/app/api/* are the only callers.
const SERVICE_URLS = {
  auth: process.env["AUTH_SERVICE_URL"] ?? "http://localhost:3001",
  user: process.env["USER_SERVICE_URL"] ?? "http://localhost:3002",
  listing: process.env["LISTING_SERVICE_URL"] ?? "http://localhost:3003",
  booking: process.env["BOOKING_SERVICE_URL"] ?? "http://localhost:3004",
  notification: process.env["NOTIFICATION_SERVICE_URL"] ?? "http://localhost:3008",
} as const;

// The access token is stored httpOnly (never readable by client JS, so a
// classic browser-side "axios interceptor reads a cookie" pattern doesn't
// apply here) — instead, these server-side clients are used exclusively
// inside Next.js Route Handlers, which run in a Node context where
// next/headers' cookies() CAN read httpOnly cookies. Each Route Handler is a
// thin authenticated proxy between the browser (same-origin, no token
// needed) and a backend service (needs the Bearer token, attached below).

function createClient(baseURL: string, options: { attachToken?: boolean } = {}): AxiosInstance {
  const { attachToken = true } = options;
  const instance = axios.create({ baseURL, timeout: 10_000 });

  if (attachToken) {
    // Runs per-request (Next.js's request-scoped AsyncLocalStorage makes
    // cookies() valid here even though `instance` itself is module-level).
    instance.interceptors.request.use((config) => {
      const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  return instance;
}

// login/register never carry a token yet; every other auth-service call
// (logout, refresh) does.
export const authApi = createClient(SERVICE_URLS.auth, { attachToken: false });
export const authenticatedAuthApi = createClient(SERVICE_URLS.auth);
export const userApi = createClient(SERVICE_URLS.user);
export const listingApi = createClient(SERVICE_URLS.listing);
export const bookingApi = createClient(SERVICE_URLS.booking);
export const notificationApi = createClient(SERVICE_URLS.notification);

// Normalizes any backend-service error (validation, 401, 500, network
// failure) into this app's { data, error, meta } envelope so every Route
// Handler can catch-and-forward with one helper instead of duplicating
// axios error unwrapping everywhere.
export function toErrorResponse(err: unknown): { status: number; body: ApiResponse<null> } {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 502;
    const body = err.response?.data as ApiResponse<null> | undefined;
    if (body?.error) return { status, body };
    return {
      status,
      body: {
        data: null,
        error: { code: "UPSTREAM_ERROR", message: err.message },
        meta: { requestId: crypto.randomUUID() },
      },
    };
  }
  return {
    status: 500,
    body: {
      data: null,
      error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Unknown error" },
      meta: { requestId: crypto.randomUUID() },
    },
  };
}
