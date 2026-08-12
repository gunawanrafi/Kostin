"use client";

import axios from "axios";
import type { ApiResponse } from "@kostin/types";

// Carries a backend service's `error.code` through to the UI, which axios's
// own error does not — an AxiosError only offers "Request failed with status
// code 400", which is never something to show a user in Indonesian and never
// enough to decide which field to blame.
export class ApiRequestError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
  }
}

export const GENERIC_MESSAGE = "Terjadi kesalahan. Silakan coba lagi.";
export const OFFLINE_MESSAGE = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";

// Non-2xx responses reject in axios, so the { data, error, meta } envelope
// arrives on the thrown error rather than in `data`. Both paths funnel into
// ApiRequestError.
export function toApiRequestError(err: unknown): ApiRequestError {
  if (err instanceof ApiRequestError) return err;
  if (axios.isAxiosError<ApiResponse<null>>(err)) {
    if (!err.response) return new ApiRequestError(OFFLINE_MESSAGE, "NETWORK_ERROR");
    const apiError = err.response.data?.error;
    if (apiError) return new ApiRequestError(apiError.message, apiError.code);
  }
  return new ApiRequestError(GENERIC_MESSAGE, "UNKNOWN");
}
