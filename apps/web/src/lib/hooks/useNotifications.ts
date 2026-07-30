"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@kostin/types";
import { browserApi } from "@/lib/browser-api";

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
