"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/lib/hooks/useAuth";
import { WTopBar, type WTopBarProps } from "@/components/layout/WTopBar";

// (dashboard)/layout.tsx is a Server Component and can't pass a function
// prop (onLogout) directly to WTopBar (a Client Component) — function props
// can't cross that boundary. This thin client wrapper owns the logout
// mutation instead, so the layout just renders <DashboardTopBar /> with no
// props to pass across.
export function DashboardTopBar(props: Omit<WTopBarProps, "onLogout">): React.JSX.Element {
  const router = useRouter();
  const logout = useLogout();

  const handleLogout = (): void => {
    logout.mutate(undefined, {
      onSettled: () => {
        router.push("/login");
        router.refresh();
      },
    });
  };

  return <WTopBar {...props} onLogout={handleLogout} />;
}

export default DashboardTopBar;
