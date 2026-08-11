"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { browserApi } from "@/lib/browser-api";
import type { AppNotification } from "@/lib/types";

// Only the unread count is needed (topbar bell badge), so this fetches a
// single item and reads the total from pagination meta rather than pulling
// the full notification list.
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async (): Promise<number> => {
      const { data } = await browserApi.get<ApiResponse<unknown[]>>("/notifications", {
        params: { status: "UNREAD", limit: 1 },
      });
      if (data.error) throw new Error(data.error.message);
      return data.meta.total ?? 0;
    },
  });
}

export interface NotificationsPage {
  items: AppNotification[];
  total: number | undefined;
}

// notification-service's GET /notifications only filters by read status, not
// by eventType — so the page fetches one page and does the
// Booking/Pembayaran/Sistem split client-side.
//
// 50 is not arbitrary: notification-service clamps `limit` to its
// NOTIFICATION_MAX_PAGE_SIZE (default 50) in listNotifications(), so asking
// for more silently returns 50 anyway. Owners past 50 notifications need real
// pagination; `total` is returned so the caller can tell the list is truncated.
export const NOTIFICATIONS_PAGE_LIMIT = 50;

export function useNotifications(limit: number = NOTIFICATIONS_PAGE_LIMIT) {
  return useQuery({
    queryKey: ["notifications", "list", limit],
    queryFn: async (): Promise<NotificationsPage> => {
      const { data } = await browserApi.get<ApiResponse<AppNotification[]>>("/notifications", {
        params: { limit },
      });
      if (data.error) throw new Error(data.error.message);
      return { items: data.data ?? [], total: data.meta.total };
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<AppNotification> => {
      const { data } = await browserApi.patch<ApiResponse<AppNotification>>(`/notifications/${id}/read`);
      if (data.error) throw new Error(data.error.message);
      if (!data.data) throw new Error("Empty response from server");
      return data.data;
    },
    // Never auto-retry a failed mark-as-read. React Query v5 already defaults
    // mutations to 0 retries, but this is set explicitly so a future global
    // `mutations: { retry: n }` in query-client.ts can't silently turn a
    // failing endpoint into a request storm. Marking read is a cheap,
    // user-initiated action — if it fails, surface it and let the user retry.
    retry: false,
    // Invalidating the ["notifications"] prefix refreshes both the list and
    // the topbar's unread count, so the bell badge drops in the same tick.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
