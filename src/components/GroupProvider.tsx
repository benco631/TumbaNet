"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  privacy: "OPEN" | "CLOSED";
  inviteCode: string;
  memberCount: number;
  myRole: "ADMIN" | "MEMBER" | null;
  isActive: boolean;
  joinedAt: string;
}

interface PendingRequest {
  id: string;
  status: string;
  group: { id: string; name: string };
}

interface GroupContextValue {
  activeGroup: GroupInfo | null;
  groups: GroupInfo[];
  pendingRequests: PendingRequest[];
  isLoading: boolean;
  hasNoGroups: boolean;
  switchGroup: (groupId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextValue>({
  activeGroup: null,
  groups: [],
  pendingRequests: [],
  isLoading: true,
  hasNoGroups: false,
  switchGroup: async () => {},
  refreshGroups: async () => {},
});

export function useGroup() {
  return useContext(GroupContext);
}

export default function GroupProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups/my-groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      setGroups(data.groups || []);
      setPendingRequests(data.pendingRequests || []);
    } catch {
      setGroups([]);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchGroups();
    } else {
      setGroups([]);
      setPendingRequests([]);
      setIsLoading(false);
    }
  }, [session, fetchGroups]);

  const switchGroup = useCallback(async (groupId: string) => {
    try {
      const res = await fetch("/api/groups/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) throw new Error("Failed to switch group");
      await fetchGroups();
      // Force a page reload to refresh all group-scoped data
      window.location.reload();
    } catch (err) {
      console.error("Error switching group:", err);
    }
  }, [fetchGroups]);

  const activeGroup = groups.find((g) => g.isActive) || null;
  const hasNoGroups = !isLoading && !!session && groups.length === 0;

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        groups,
        pendingRequests,
        isLoading,
        hasNoGroups,
        switchGroup,
        refreshGroups: fetchGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}
