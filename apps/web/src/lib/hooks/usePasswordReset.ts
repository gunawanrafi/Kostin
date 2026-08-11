"use client";

import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { browserApi } from "@/lib/browser-api";

// Carries auth-service's `error.code` through to the UI. The reset flow needs
// it to tell "your code is wrong" (send the user back to the code step) apart
// from "your password is invalid" (stay put) — both arrive as a 400.
export class ApiRequestError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
  }
}

const GENERIC_MESSAGE = "Terjadi kesalahan. Silakan coba lagi.";
const OFFLINE_MESSAGE = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";

// Non-2xx responses reject in axios, so the envelope arrives on the thrown
// error rather than in `data`. Both paths funnel into ApiRequestError.
function toApiRequestError(err: unknown): ApiRequestError {
  if (axios.isAxiosError<ApiResponse<null>>(err)) {
    if (!err.response) return new ApiRequestError(OFFLINE_MESSAGE, "NETWORK_ERROR");
    const apiError = err.response.data?.error;
    if (apiError) return new ApiRequestError(apiError.message, apiError.code);
  }
  return new ApiRequestError(GENERIC_MESSAGE, "UNKNOWN");
}

export interface ForgotPasswordResult {
  channel: "whatsapp";
  expiresInSec: number;
}

// Requests a reset code. Resolves the same way whether or not the email is
// registered — auth-service answers uniformly so this endpoint can't be used
// to probe which addresses have accounts.
export function useForgotPassword() {
  return useMutation<ForgotPasswordResult, ApiRequestError, string>({
    // Never auto-retry: a retry burns against the server-side cooldown and
    // silently produces no second code.
    retry: false,
    mutationFn: async (email) => {
      try {
        const { data } = await browserApi.post<ApiResponse<ForgotPasswordResult>>(
          "/auth/password/forgot",
          { email },
        );
        if (!data.data) throw new ApiRequestError(GENERIC_MESSAGE, "EMPTY_RESPONSE");
        return data.data;
      } catch (err) {
        throw err instanceof ApiRequestError ? err : toApiRequestError(err);
      }
    },
  });
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}

// Consumes the reset code and sets the new password. The code is single-use,
// so this must not retry — a retry would fail with RESET_CODE_EXPIRED even
// when the first attempt succeeded.
export function useResetPassword() {
  return useMutation<{ success: boolean }, ApiRequestError, ResetPasswordInput>({
    retry: false,
    mutationFn: async (input) => {
      try {
        const { data } = await browserApi.post<ApiResponse<{ success: boolean }>>(
          "/auth/password/reset",
          input,
        );
        if (!data.data) throw new ApiRequestError(GENERIC_MESSAGE, "EMPTY_RESPONSE");
        return data.data;
      } catch (err) {
        throw err instanceof ApiRequestError ? err : toApiRequestError(err);
      }
    },
  });
}

// Errors that mean "the code is the problem" — the UI sends the user back to
// the code step for these rather than leaving them on the password step.
const CODE_ERROR_CODES = new Set(["RESET_CODE_INVALID", "RESET_CODE_EXPIRED", "RESET_RATE_LIMITED"]);

export function isResetCodeError(err: unknown): boolean {
  return err instanceof ApiRequestError && CODE_ERROR_CODES.has(err.code);
}
