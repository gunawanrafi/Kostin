import { NextResponse } from "next/server";
import { toErrorResponse, userApi } from "@/lib/api";

// Thin authenticated proxy to user-service's GET /users/me. The cookie-based
// Bearer token is attached by userApi's request interceptor (see lib/api.ts).
export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await userApi.get("/users/me");
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

// Partial update of the signed-in user's own profile (Pengaturan → Informasi
// Akun). The body is forwarded as-is; user-service's updateMeSchema is the
// single source of truth for which fields are accepted — notably `name`, but
// NOT `email` or `phone`, which are unique sign-in identifiers and would need
// a verification step this project doesn't have yet.
export async function PATCH(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();

  try {
    const { data } = await userApi.patch("/users/me", body);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
