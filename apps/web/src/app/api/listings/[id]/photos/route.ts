import { NextResponse, type NextRequest } from "next/server";
import { listingApi, toErrorResponse } from "@/lib/api";

// Thin authenticated multipart proxy to listing-service's
// POST /listings/:id/photos. The browser's multipart body (including its
// boundary in the Content-Type header) is forwarded verbatim as raw bytes,
// so @fastify/multipart on the other end parses it exactly as sent — no
// re-encoding of the form data here. The Bearer token is attached by
// listingApi's request interceptor (see lib/api.ts).
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const body = Buffer.from(await request.arrayBuffer());

  try {
    const { data } = await listingApi.post(`/listings/${params.id}/photos`, body, {
      headers: { "Content-Type": contentType },
      // Uploads can exceed axios's small defaults; let large image payloads through.
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120_000,
    });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body: errorBody } = toErrorResponse(err);
    return NextResponse.json(errorBody, { status });
  }
}
