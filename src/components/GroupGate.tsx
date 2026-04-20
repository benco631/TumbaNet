"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useGroup } from "./GroupProvider";
import GroupOnboarding from "./GroupOnboarding";

// Pages that should be accessible without a group
const UNGATED_PATHS = ["/login", "/register", "/api", "/groups", "/join"];

export default function GroupGate({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { hasNoGroups, isLoading } = useGroup();
  const pathname = usePathname();

  // Don't gate if not logged in, still loading, or on ungated paths
  if (!session || isLoading || UNGATED_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  // Show onboarding if user has no groups
  if (hasNoGroups) {
    return <GroupOnboarding />;
  }

  return <>{children}</>;
}
