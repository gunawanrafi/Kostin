"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { browserApi } from "@/lib/browser-api";
import type { Listing, ListingStatus, ListingTipe } from "@/lib/types";

export interface ListingsQueryParams {
  mine?: boolean;
  status?: ListingStatus;
  limit?: number;
}

export interface ListingsPage {
  items: Listing[];
  total: number | undefined;
}

export function useListings(params: ListingsQueryParams = {}) {
  return useQuery({
    queryKey: ["listings", params],
    queryFn: async (): Promise<ListingsPage> => {
      const { data } = await browserApi.get<ApiResponse<Listing[]>>("/listings", {
        params: { ...params, mine: params.mine ? "true" : undefined },
      });
      if (data.error) throw new Error(data.error.message);
      return { items: data.data ?? [], total: data.meta.total };
    },
  });
}

// Mirrors listing-service's createListingSchema (services/listing/src/lib/validation.ts).
export interface CreateListingInput {
  title: string;
  description: string;
  address: string;
  kelurahan: string;
  kecamatan: string;
  city?: string;
  lat: number;
  lng: number;
  type: ListingTipe;
  pricePerMonth: number;
  facilities?: Record<string, unknown>;
  amenities?: string[];
  rules?: string[];
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateListingInput) => {
      const { data } = await browserApi.post<ApiResponse<Listing>>("/listings", input);
      if (data.error) throw new Error(data.error.message);
      if (!data.data) throw new Error("Empty response from server");
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
