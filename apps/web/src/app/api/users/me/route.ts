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
