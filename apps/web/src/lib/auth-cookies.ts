// Cookie names only — kept dependency-free (no axios, no next/headers) so
// this can be imported from src/middleware.ts, which runs on the Edge
// runtime and can't bundle Node-only code like axios.
export const ACCESS_TOKEN_COOKIE = "kostin_access_token";
export const REFRESH_TOKEN_COOKIE = "kostin_refresh_token";
