"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, useLogout } from "@/lib/hooks/useAuth";
import { useUnreadNotificationCount } from "@/lib/hooks/useNotifications";
import { WTopBar, type WTopBarProps } from "@/components/layout/WTopBar";

// (dashboard)/layout.tsx is a Server Component and can't pass a function
// prop (onLogout) directly to WTopBar (a Client Component) — function props
// can't cross that boundary. This thin client wrapper owns the logout
// mutation instead, so the layout just renders <DashboardTopBar /> with no
// props to pass across. It also owns fetching the current user and unread
// notification count, so WTopBar itself stays purely presentational.
export function DashboardTopBar(
  props: Omit<WTopBarProps, "onLogout" | "ownerName" | "avatarUrl" | "notificationCount">,
): React.JSX.Element {
  const router = useRouter();
  const logout = useLogout();
  const { data: currentUser } = useCurrentUser();
  const { data: unreadCount } = useUnreadNotificationCount();

  const handleLogout = (): void => {
    logout.mutate(undefined, {
      onSettled: () => {
        router.push("/login");
        router.refresh();
      },
    });
  };

  return (
    <WTopBar
      {...props}
      {...(currentUser?.name ? { ownerName: currentUser.name } : {})}
      {...(currentUser?.avatarUrl ? { avatarUrl: currentUser.avatarUrl } : {})}
      notificationCount={unreadCount ?? 0}
      onLogout={handleLogout}
    />
  );
}

export default DashboardTopBar;
