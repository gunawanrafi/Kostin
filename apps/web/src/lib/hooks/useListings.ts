"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { browserApi } from "@/lib/browser-api";
import type {
  HouseRules,
  Listing,
  ListingStatus,
  ListingTipe,
  PaymentDuration,
} from "@/lib/types";

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

// Single listing by id. Keyed under the "listings" prefix so the existing
// create/photo-upload mutations, which invalidate ["listings"], also refresh
// an open detail view.
export function useListing(id: string) {
  return useQuery({
    queryKey: ["listings", "detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Listing> => {
      const { data } = await browserApi.get<ApiResponse<Listing>>(`/listings/${id}`);
      if (data.error) throw new Error(data.error.message);
      if (!data.data) throw new Error("Empty response from server");
      return data.data;
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
  /** Free-form additional rules, one per entry ("Aturan Tambahan"). */
  rules?: string[];

  // Harga & Aturan (C5). `amount` must be present whenever `enabled` is true —
  // listing-service rejects the pair otherwise.
  deposit?: { enabled: boolean; amount?: number };
  paymentDuration?: PaymentDuration;
  houseRules?: HouseRules;
  /** An omitted fee is stored as "not charged", distinct from an explicit 0. */
  additionalFees?: {
    extraOccupant?: number;
    motorcycleParking?: number;
    carParking?: number;
  };
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

export interface UploadListingPhotosInput {
  id: string;
  files: File[];
  onProgress?: (percent: number) => void;
}

// Uploads photo files to listing-service's POST /listings/:id/photos (via the
// same-origin multipart proxy at /api/listings/:id/photos). Kept as a separate
// mutation from useCreateListing so the listing can be created first and the
// photos uploaded against its returned id — and so a photo failure is
// distinguishable from a create failure (the listing already exists).
export function useUploadListingPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, files, onProgress }: UploadListingPhotosInput) => {
      const formData = new FormData();
      // Field name is irrelevant — listing-service reads every multipart file
      // part via request.files() regardless of field name.
      for (const file of files) formData.append("photos", file, file.name);

      const { data } = await browserApi.post<ApiResponse<Listing>>(`/listings/${id}/photos`, formData, {
        // Photo uploads can be large/slow; override browserApi's 15s default.
        // The browser sets the multipart Content-Type (with boundary) itself.
        timeout: 120_000,
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      if (data.error) throw new Error(data.error.message);
      if (!data.data) throw new Error("Empty response from server");
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
