import { NextResponse, type NextRequest } from "next/server";
import { notificationApi, toErrorResponse } from "@/lib/api";

// Thin authenticated proxy to notification-service's GET /notifications.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  try {
    const { data } = await notificationApi.get("/notifications", {
      params: Object.fromEntries(searchParams),
    });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
