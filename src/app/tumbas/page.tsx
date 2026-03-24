"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { TumbasIcon } from "@/lib/icons";
import { CoinAmountMd } from "@/components/TumbaCoin";

interface TumbaUser {
  id: string;
  name: string;
  tumbaCoins: number;
  status: string;
  createdAt: string;
}

export default function TumbasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<TumbaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [saving, setSaving] = useState(false);

  const userId = (session?.user as { id?: string })?.id;
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchUsers();
    }
  }, [status, router, fetchUsers]);

  async function saveStatus() {
    setSaving(true);
    const res = await fetch("/api/users/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusInput }),
    });
    if (res.ok) {
      setEditingStatus(false);
      fetchUsers();
    }
    setSaving(false);
  }

  async function updateCoins(targetUserId: string, coins: number) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId, tumbaCoins: coins }),
    });
    fetchUsers();
  }

  const [editingCoins, setEditingCoins] = useState<string | null>(null);
  const [coinsInput, setCoinsInput] = useState("");

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TumbasIcon size={32} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
          <span>The Tumbas</span>
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          The legendary crew and their TumbaCoins
        </p>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {users.map((user, index) => {
          const isCurrentUser = user.id === userId;
          const rank = index + 1;
          const medalColor =
            rank === 1 ? "text-[#FFD700]" : rank === 2 ? "text-[#C0C0C0]" : rank === 3 ? "text-[#CD7F32]" : null;

          return (
            <Link
              href={`/tumbas/${user.id}`}
              key={user.id}
              className={`block p-4 sm:p-5 rounded-2xl border transition-all ${
                isCurrentUser
                  ? "border-tumba-500/40 bg-tumba-500/5"
                  : "border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Rank */}
                <div className="w-10 text-center shrink-0">
                  <span className={`text-lg font-bold font-mono ${medalColor ?? "text-[var(--text-secondary)]"}`}>
                    #{rank}
                  </span>
                </div>

                {/* Avatar */}
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-lg font-bold text-white shrink-0">
                  {user.name[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base">
                      {user.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] bg-tumba-500/20 text-tumba-400 px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  {isCurrentUser && editingStatus ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value)}
                        maxLength={100}
                        className="flex-1 px-3 py-1 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500"
                        placeholder="What's on your mind?"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveStatus();
                          if (e.key === "Escape") setEditingStatus(false);
                        }}
                      />
                      <button
                        onClick={saveStatus}
                        disabled={saving}
                        className="text-xs px-3 py-1 rounded-lg bg-tumba-500 text-white font-medium hover:bg-tumba-400 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingStatus(false)}
                        className="text-xs px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-sm text-[var(--text-secondary)] truncate">
                        {user.status || (isCurrentUser ? "Set your status..." : "")}
                      </p>
                      {isCurrentUser && (
                        <button
                          onClick={() => {
                            setStatusInput(user.status);
                            setEditingStatus(true);
                          }}
                          className="text-xs text-tumba-400 hover:text-tumba-300 shrink-0 ml-1"
                        >
                          {user.status ? "edit" : "add"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Coins */}
                <div className="text-right shrink-0">
                  {isAdmin && editingCoins === user.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={coinsInput}
                        onChange={(e) => setCoinsInput(e.target.value)}
                        className="w-20 px-2 py-1 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-right"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateCoins(user.id, parseInt(coinsInput) || 0);
                            setEditingCoins(null);
                          }
                          if (e.key === "Escape") setEditingCoins(null);
                        }}
                      />
                      <button
                        onClick={() => {
                          updateCoins(user.id, parseInt(coinsInput) || 0);
                          setEditingCoins(null);
                        }}
                        className="text-xs text-tumba-400"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`${isAdmin ? "cursor-pointer hover:opacity-75" : ""}`}
                      onClick={() => {
                        if (isAdmin) {
                          setCoinsInput(String(user.tumbaCoins));
                          setEditingCoins(user.id);
                        }
                      }}
                    >
                      <CoinAmountMd amount={user.tumbaCoins} />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <TumbasIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
          <p className="text-lg">No Tumbas yet</p>
          <p className="text-sm mt-1">Be the first to join!</p>
        </div>
      )}
    </div>
  );
}
