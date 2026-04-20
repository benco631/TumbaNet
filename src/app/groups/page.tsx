"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGroup } from "@/components/GroupProvider";
import { MotionPage } from "@/components/motion";
import Link from "next/link";

export default function GroupsPage() {
  const { groups, activeGroup, switchGroup, pendingRequests, refreshGroups } = useGroup();
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoinLoading(true);
    setJoinError("");

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      if (data.status === "joined" || data.status === "already_member") {
        await refreshGroups();
        setShowJoin(false);
        setInviteCode("");
      } else if (data.status === "requested" || data.status === "pending") {
        await refreshGroups();
        setShowJoin(false);
        setInviteCode("");
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to leave "${groupName}"?`)) return;
    setLeaveLoading(groupId);
    try {
      const res = await fetch("/api/groups/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to leave group");
        return;
      }
      await refreshGroups();
      if (groupId === activeGroup?.id) {
        window.location.reload();
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLeaveLoading(null);
    }
  };

  return (
    <MotionPage className="max-w-2xl mx-auto px-4 py-6 space-y-6 bg-mesh min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">My Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoin(!showJoin)}
            className="btn-secondary text-sm px-4 py-2"
          >
            Join Group
          </button>
          <Link href="/groups/create" className="btn-primary text-sm px-4 py-2">
            Create Group
          </Link>
        </div>
      </div>

      {/* Join group form */}
      {showJoin && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleJoin}
          className="card-premium p-4 space-y-3"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50 font-mono text-center"
              autoFocus
            />
            <button
              type="submit"
              disabled={!inviteCode.trim() || joinLoading}
              className="btn-primary px-5 py-2.5 disabled:opacity-50"
            >
              {joinLoading ? "..." : "Join"}
            </button>
          </div>
          {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
        </motion.form>
      )}

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">Pending Requests</p>
          {pendingRequests.map((req) => (
            <div key={req.id} className="card-premium p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-yellow-500/15 flex items-center justify-center text-yellow-400 text-xs font-bold">
                {req.group.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{req.group.name}</p>
                <p className="text-[10px] text-yellow-400">Awaiting approval</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Groups list */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.id}
            className={`card-premium p-4 transition-all ${
              group.isActive ? "border-tumba-500/30" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-lg font-bold text-white shrink-0">
                {group.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold truncate">{group.name}</h3>
                  {group.isActive && (
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-tumba-500/15 text-tumba-400 border border-tumba-500/25 font-semibold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {group.memberCount} member{group.memberCount !== 1 ? "s" : ""} · {group.myRole} · {group.privacy}
                </p>
                {group.description && (
                  <p className="text-xs text-[var(--text-secondary)]/70 mt-1 truncate">
                    {group.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]/50">
              {!group.isActive && (
                <button
                  onClick={() => switchGroup(group.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-tumba-500/10 text-tumba-400 hover:bg-tumba-500/20 transition-colors font-medium"
                >
                  Switch Here
                </button>
              )}
              {group.myRole === "ADMIN" && (
                <Link
                  href={`/groups/settings?groupId=${group.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors font-medium"
                >
                  Settings
                </Link>
              )}
              <button
                onClick={() => handleLeave(group.id, group.name)}
                disabled={leaveLoading === group.id}
                className="text-xs px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium ml-auto"
              >
                {leaveLoading === group.id ? "..." : "Leave"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <p>You&apos;re not in any groups yet.</p>
        </div>
      )}
    </MotionPage>
  );
}
