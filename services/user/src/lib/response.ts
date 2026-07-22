import type { ApiError, ApiMeta, ApiResponse } from "@kostin/types";

export function ok<T>(data: T, meta: ApiMeta = {}): ApiResponse<T> {
  return {
    data,
    error: null,
    meta: { requestId: crypto.randomUUID(), ...meta },
  };
}

export function fail(error: ApiError, meta: ApiMeta = {}): ApiResponse<null> {
  return {
    data: null,
    error,
    meta: { requestId: crypto.randomUUID(), ...meta },
  };
}
