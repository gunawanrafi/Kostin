"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { browserApi } from "@/lib/browser-api";
import type { Booking, BookingStatus, BookingWithContext } from "@/lib/types";

export interface BookingsQueryParams {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface BookingsPage {
  items: BookingWithContext[];
  total: number | undefined;
}

// booking-service embeds the applicant, listing and room on this endpoint
// (see its findByScope include), so the list view gets real names rather than
// the foreign keys it used to render as "Penyewa #cmsppkqw".
export function useBookings(params: BookingsQueryParams = {}) {
  return useQuery({
    queryKey: ["bookings", params],
    queryFn: async (): Promise<BookingsPage> => {
      const { data } = await browserApi.get<ApiResponse<BookingWithContext[]>>("/bookings", {
        params,
      });
      if (data.error) throw new Error(data.error.message);
      return { items: data.data ?? [], total: data.meta.total };
    },
  });
}

function useBookingStatusMutation(action: "confirm" | "cancel") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await browserApi.patch<ApiResponse<Booking>>(`/bookings/${id}/${action}`);
      if (data.error) throw new Error(data.error.message);
      if (!data.data) throw new Error("Empty response from server");
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useConfirmBooking() {
  return useBookingStatusMutation("confirm");
}

export function useCancelBooking() {
  return useBookingStatusMutation("cancel");
}
