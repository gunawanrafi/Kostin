"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
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

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await browserApi.post<ApiResponse<{ success: boolean }>>("/auth/logout");
      return unwrap(data);
    },
  });
}
