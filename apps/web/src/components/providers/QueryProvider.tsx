"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  // useState (not useMemo) so the client survives Fast Refresh/re-renders
  // without recreating — but is still created fresh per browser tab, not
  // shared across requests the way a module-level singleton would risk on
  // the server.
  const [client] = React.useState(createQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default QueryProvider;
