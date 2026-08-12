"use client";

import { useMutation } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { ApiRequestError, GENERIC_MESSAGE, toApiRequestError } from "@/lib/api-error";
import { browserApi } from "@/lib/browser-api";

// The reset flow needs auth-service's `error.code` to tell "your code is
// wrong" (send the user back to the code step) apart from "your password is
// invalid" (stay put) — both arrive as a 400. Re-exported so importers of this
// module don't need to know the class moved to lib/api-error.
export { ApiRequestError } from "@/lib/api-error";

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

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Signed-in password change (Pengaturan → Keamanan). Lives alongside the reset
// hooks because it shares their ApiRequestError plumbing — the settings form
// needs auth-service's `error.code` to decide which field to blame (a wrong
// current password vs. a rejected new one).
//
// Not retried: a repeat of a wrong current password burns another attempt
// against the server-side lockout for no benefit.
export function useChangePassword() {
  return useMutation<{ success: boolean }, ApiRequestError, ChangePasswordInput>({
    retry: false,
    mutationFn: async (input) => {
      try {
        const { data } = await browserApi.post<ApiResponse<{ success: boolean }>>(
          "/auth/password/change",
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

// Which field a change-password failure belongs to. INVALID_CREDENTIALS and
// the lockout are about the current password; PASSWORD_UNCHANGED and a
// too-short password are about the new one. Anything else is a page-level
// error banner.
const CURRENT_PASSWORD_ERROR_CODES = new Set([
  "INVALID_CREDENTIALS",
  "PASSWORD_CHANGE_RATE_LIMITED",
]);
const NEW_PASSWORD_ERROR_CODES = new Set(["PASSWORD_UNCHANGED", "VALIDATION_ERROR"]);

export type PasswordChangeField = "current" | "new" | null;

export function passwordChangeErrorField(err: unknown): PasswordChangeField {
  if (!(err instanceof ApiRequestError)) return null;
  if (CURRENT_PASSWORD_ERROR_CODES.has(err.code)) return "current";
  if (NEW_PASSWORD_ERROR_CODES.has(err.code)) return "new";
  return null;
}

// Errors that mean "the code is the problem" — the UI sends the user back to
// the code step for these rather than leaving them on the password step.
const CODE_ERROR_CODES = new Set(["RESET_CODE_INVALID", "RESET_CODE_EXPIRED", "RESET_RATE_LIMITED"]);

export function isResetCodeError(err: unknown): boolean {
  return err instanceof ApiRequestError && CODE_ERROR_CODES.has(err.code);
}
