"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MotionPage } from "@/components/motion";
import { useGroup } from "@/components/GroupProvider";

interface GroupSettings {
  id: string;
  name: string;
  description: string | null;
  privacy: "OPEN" | "CLOSED";
  inviteCode: string;
  memberships: {
    id: string;
    role: string;
    user: { id: string; name: string; avatar: string | null; email: string };
  }[];
}

interface JoinRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatar: string | null };
}

export default function GroupSettingsPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const { activeGroup, refreshGroups } = useGroup();
  const targetGroupId = groupId || activeGroup?.id;

  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!targetGroupId) return;
    try {
      const [settingsRes, requestsRes] = await Promise.all([
        fetch(`/api/groups/settings?groupId=${targetGroupId}`),
        fetch(`/api/groups/requests?groupId=${targetGroupId}`),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.group);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, [targetGroupId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handlePrivacyChange = async (newPrivacy: "OPEN" | "CLOSED") => {
    if (!targetGroupId || !settings) return;
    setSavingPrivacy(true);
    try {
      const res = await fetch("/api/groups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: targetGroupId, privacy: newPrivacy }),
      });
      if (res.ok) {
        setSettings({ ...settings, privacy: newPrivacy });
        await refreshGroups();
      }
    } catch {
      // handle error
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleRequest = async (requestId: string, action: "approve" | "reject") => {
    setProcessingRequest(requestId);
    try {
      const res = await fetch("/api/groups/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        await fetchSettings();
      }
    } catch {
      // handle error
    } finally {
      setProcessingRequest(null);
    }
  };

  const copyInviteCode = () => {
    if (settings?.inviteCode) {
      navigator.clipboard.writeText(settings.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (settings?.inviteCode) {
      const link = `${window.location.origin}/join/${settings.inviteCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-tumba-500/10 rounded" />
          <div className="h-40 bg-tumba-500/10 rounded-xl" />
          <div className="h-40 bg-tumba-500/10 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center text-[var(--text-secondary)]">
        <p>Group not found or you don&apos;t have admin access.</p>
      </div>
    );
  }

  return (
    <MotionPage className="max-w-2xl mx-auto px-4 py-6 space-y-6 bg-mesh min-h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-extrabold">Group Settings</h1>
      <p className="text-sm text-[var(--text-secondary)] -mt-4">{settings.name}</p>

      {/* Invite Section */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="text-base font-bold">Invite People</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Invite Code</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] font-mono text-center text-lg tracking-wider">
                {settings.inviteCode}
              </code>
              <button onClick={copyInviteCode} className="btn-secondary px-4 text-sm">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <button
            onClick={copyInviteLink}
            className="w-full text-sm px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            Copy Invite Link
          </button>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="text-base font-bold">Group Privacy</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handlePrivacyChange("OPEN")}
            disabled={savingPrivacy}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              settings.privacy === "OPEN"
                ? "border-green-500/50 bg-green-500/10 text-green-400"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-green-500/30"
            }`}
          >
            Open
            <p className="text-[10px] mt-0.5 opacity-70">Anyone with code joins instantly</p>
          </button>
          <button
            onClick={() => handlePrivacyChange("CLOSED")}
            disabled={savingPrivacy}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              settings.privacy === "CLOSED"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-orange-500/30"
            }`}
          >
            Closed
            <p className="text-[10px] mt-0.5 opacity-70">You approve each join request</p>
          </button>
        </div>
      </div>

      {/* Join Requests Section */}
      {settings.privacy === "CLOSED" && (
        <div className="card-premium p-5 space-y-4">
          <h2 className="text-base font-bold">
            Join Requests
            {requests.length > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
                {requests.length}
              </span>
            )}
          </h2>

          {requests.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <motion.div
                  key={request.id}
                  layout
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {request.user.avatar ? (
                      <img src={request.user.avatar} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      request.user.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{request.user.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{request.user.email}</p>
                    {request.message && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 italic">&ldquo;{request.message}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRequest(request.id, "approve")}
                      disabled={processingRequest === request.id}
                      className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, "reject")}
                      disabled={processingRequest === request.id}
                      className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Section */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="text-base font-bold">
          Members
          <span className="ml-2 text-xs text-[var(--text-secondary)] font-normal">
            ({settings.memberships.length})
          </span>
        </h2>
        <div className="space-y-2">
          {settings.memberships.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                {m.user.avatar ? (
                  <img src={m.user.avatar} className="w-full h-full object-cover" />
                ) : (
                  m.user.name[0]?.toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${
                m.role === "ADMIN"
                  ? "bg-tumba-500/15 text-tumba-400 border border-tumba-500/25"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MotionPage>
  );
}
