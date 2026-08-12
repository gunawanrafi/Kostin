"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { ApiRequestError, GENERIC_MESSAGE, toApiRequestError } from "@/lib/api-error";
import { browserApi } from "@/lib/browser-api";
import type { ScreeningCriteria } from "@/lib/types";

const QUERY_KEY = ["users", "me", "screening-criteria"];

// D3 · Kriteria Penyewa. user-service always answers with a full object —
// defaults when the owner has never saved any — so the form never has to
// invent a starting state.
export function useScreeningCriteria() {
  return useQuery<ScreeningCriteria, ApiRequestError>({
    queryKey: QUERY_KEY,
    // A STUDENT hitting this gets a 403 that will never resolve by retrying.
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await browserApi.get<ApiResponse<ScreeningCriteria>>(
          "/users/me/screening-criteria",
        );
        if (!data.data) throw new ApiRequestError(GENERIC_MESSAGE, "EMPTY_RESPONSE");
        return data.data;
      } catch (err) {
        throw toApiRequestError(err);
      }
    },
  });
}

// PUT replaces the whole object, so the form always submits every field.
export function useSaveScreeningCriteria() {
  const queryClient = useQueryClient();

  return useMutation<ScreeningCriteria, ApiRequestError, ScreeningCriteria>({
    retry: false,
    mutationFn: async (input) => {
      try {
        const { data } = await browserApi.put<ApiResponse<ScreeningCriteria>>(
          "/users/me/screening-criteria",
          input,
        );
        if (!data.data) throw new ApiRequestError(GENERIC_MESSAGE, "EMPTY_RESPONSE");
        return data.data;
      } catch (err) {
        throw toApiRequestError(err);
      }
    },
    // Seed with the server's normalized copy rather than the submitted object,
    // so what the form shows after saving is what a reload would show.
    onSuccess: (saved) => {
      queryClient.setQueryData(QUERY_KEY, saved);
    },
  });
}
