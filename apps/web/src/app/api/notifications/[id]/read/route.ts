import { NextResponse } from "next/server";
import { notificationApi, toErrorResponse } from "@/lib/api";

// Thin authenticated proxy to notification-service's PATCH
// /notifications/:id/read. Same shape as the bookings confirm/cancel proxies:
// notificationApi's request interceptor reads the httpOnly access-token cookie
// via next/headers and attaches the Bearer header, so nothing token-related
// happens here.
export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { data } = await notificationApi.patch(`/notifications/${params.id}/read`);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
