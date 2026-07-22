import type { ApiResponse } from "@kostin/types";
import { AppError, BookingErrorCode } from "./errors.js";

export interface HoldEscrowInput {
  bookingId: string;
  amount: number;
}

export interface HoldEscrowResult {
  escrowId: string;
  status: string;
}

// Narrow contract booking-service needs from escrow-service, so tests can
// inject a fake instead of making a real HTTP call. escrow-service is
// CRITICAL/100%-coverage and versioned separately — this client only
// depends on its documented response envelope, not its internals.
export interface EscrowClient {
  holdEscrow(input: HoldEscrowInput): Promise<HoldEscrowResult>;
}

interface EscrowHoldData {
  id: string;
  status: string;
}

export class HttpEscrowClient implements EscrowClient {
  constructor(private readonly baseUrl: string) {}

  async holdEscrow(input: HoldEscrowInput): Promise<HoldEscrowResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/escrow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
    } catch (err) {
      throw new AppError(
        502,
        BookingErrorCode.ESCROW_UNAVAILABLE,
        `Could not reach escrow-service: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    let body: ApiResponse<EscrowHoldData> | null = null;
    try {
      body = (await response.json()) as ApiResponse<EscrowHoldData>;
    } catch {
      // fall through — !response.ok or !body below will surface a clear error
    }

    if (!response.ok || !body || body.error || !body.data) {
      throw new AppError(
        502,
        BookingErrorCode.ESCROW_UNAVAILABLE,
        body?.error?.message ?? `escrow-service returned HTTP ${response.status}`,
      );
    }

    return { escrowId: body.data.id, status: body.data.status };
  }
}
