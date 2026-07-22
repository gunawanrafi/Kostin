import { NextResponse } from "next/server";
import { bookingApi, toErrorResponse } from "@/lib/api";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { data } = await bookingApi.patch(`/bookings/${params.id}/confirm`);
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
