"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { ApiRequestError, GENERIC_MESSAGE, toApiRequestError } from "@/lib/api-error";
import { browserApi } from "@/lib/browser-api";
import type { AuthUser } from "@/lib/types";

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "STUDENT" | "OWNER";
}

function unwrap<T>(data: ApiResponse<T>): T {
  if (data.error) throw new Error(data.error.message);
  if (data.data === null) throw new Error("Empty response from server");
  return data.data;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await browserApi.post<ApiResponse<{ user: AuthUser }>>("/auth/login", input);
      return unwrap(data);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await browserApi.post<ApiResponse<{ user: AuthUser }>>("/auth/register", input);
      return unwrap(data);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: async () => {
      const { data } = await browserApi.get<ApiResponse<AuthUser>>("/users/me");
      return unwrap(data);
    },
  });
}

// Fields user-service's updateMeSchema actually accepts. `email` and `phone`
// are deliberately absent: they're unique sign-in identifiers, and changing
// either needs a verification step (OTP for the phone, a confirmation for the
// email) that doesn't exist yet — so PATCH /users/me rejects them.
export interface UpdateMeInput {
  name?: string;
  bio?: string;
  university?: string;
  major?: string;
  yearOfStudy?: number;
}

export function useUpdateMe() {
  const queryClient = useQueryClient();

  return useMutation<AuthUser, ApiRequestError, UpdateMeInput>({
    retry: false,
    // Surfaces user-service's own message ("name: String must contain at least
    // 2 character(s)") instead of axios's "Request failed with status code
    // 400", which the settings form would otherwise show verbatim.
    mutationFn: async (input) => {
      try {
        const { data } = await browserApi.patch<ApiResponse<AuthUser>>("/users/me", input);
        if (!data.data) throw new ApiRequestError(GENERIC_MESSAGE, "EMPTY_RESPONSE");
        return data.data;
      } catch (err) {
        throw toApiRequestError(err);
      }
    },
    // The name is rendered in the sidebar and top bar off this same query, so
    // seeding it here updates the whole shell in one go rather than leaving a
    // stale name on screen until the next refetch.
    onSuccess: (user) => {
      queryClient.setQueryData(["users", "me"], user);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await browserApi.post<ApiResponse<{ success: boolean }>>("/auth/logout");
      return unwrap(data);
    },
  });
}
