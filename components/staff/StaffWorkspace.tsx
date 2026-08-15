"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useStaffList } from "@/hooks/useStaffList";
import { useStaffSync } from "@/hooks/useStaffSync";

function sessionIdFromPath(pathname: string) {
  const match = pathname.match(/^\/staff\/([^/]+)$/);
  return match?.[1] ?? null;
}

const StaffWorkspaceContext = createContext<{
  list: ReturnType<typeof useStaffList>;
  session: ReturnType<typeof useStaffSync>;
  prefetchSession: (sessionId: string) => void;
} | null>(null);

export function StaffWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeId = sessionIdFromPath(pathname);
  const [prefetchId, setPrefetchId] = useState<string | null>(null);
  const list = useStaffList();
  const session = useStaffSync(routeId ?? prefetchId);

  return (
    <StaffWorkspaceContext.Provider
      value={{
        list,
        session,
        prefetchSession: setPrefetchId,
      }}
    >
      {children}
    </StaffWorkspaceContext.Provider>
  );
}

export function useStaffWorkspace() {
  const value = useContext(StaffWorkspaceContext);

  if (!value) {
    throw new Error("useStaffWorkspace must be used inside StaffWorkspace");
  }

  return value;
}
