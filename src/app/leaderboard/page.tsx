"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { CoinAmountSm } from "@/components/TumbaCoin";
import {
  TrophyIcon,
  CrownIcon,
  HostIcon,
  CarIcon,
  WearIndexIcon,
  FlameIcon,
} from "@/lib/icons";

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar: string | null;
  tag: string | null;
  tumbaCoins: number;
  memberSince: string;
  hostCount: number;
  carCount: number;
  wearIndex: number;
}

const RANK_STYLES = [
  {
    ring: "ring-2 ring-yellow-400/50",
    bg: "bg-gradient-to-br from-yellow-400/20 to-yellow-600/10",
    badge: "from-yellow-400 to-amber-500",
    text: "text-yellow-400",
    glow: "shadow-[0_0_20px_rgba(250,204,21,0.15)]",
  },
  {
    ring: "ring-2 ring-gray-300/40",
    bg: "bg-gradient-to-br from-gray-300/15 to-gray-400/5",
    badge: "from-gray-300 to-gray-400",
    text: "text-gray-300",
    glow: "shadow-[0_0_15px_rgba(209,213,219,0.1)]",
  },
  {
    ring: "ring-2 ring-amber-600/40",
    bg: "bg-gradient-to-br from-amber-600/15 to-amber-700/5",
    badge: "from-amber-600 to-amber-700",
    text: "text-amber-500",
    glow: "shadow-[0_0_15px_rgba(217,119,6,0.1)]",
  },
];

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = (session?.user as { id?: string })?.id;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) setEntries(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--text-secondary)]">Please log in to view the leaderboard.</p>
      </div>
    );
  }

  const maxWear = entries[0]?.wearIndex || 1;
  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-mesh min-h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-tumba-500/20 to-neon-pink/10 border border-tumba-500/20 mb-4">
          <TrophyIcon size={28} strokeWidth={1.75} className="text-tumba-400" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1">
          <span className="gradient-text">Leaderboard</span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Ranked by Wear Index — Hosting &times;3 + Rides &times;2
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--bg-card)] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Podium — Top 3 */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 0, 2].map((podiumIdx) => {
                const entry = topThree[podiumIdx];
                if (!entry) return <div key={podiumIdx} />;
                const rank = podiumIdx;
                const style = RANK_STYLES[rank];
                const isMe = entry.userId === userId;
                return (
                  <div
                    key={entry.userId}
                    className={`relative flex flex-col items-center p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] ${style.glow} ${
                      rank === 0 ? "mt-0" : "mt-6"
                    } transition-all hover:scale-[1.02]`}
                  >
                    {/* Rank badge */}
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br ${style.badge} flex items-center justify-center text-xs font-extrabold text-black shadow-lg`}
                    >
                      {rank + 1}
                    </div>

                    {/* Avatar */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mt-2 mb-2 ${style.ring} ${
                        rank === 0
                          ? "bg-gradient-to-br from-tumba-400 to-neon-pink"
                          : "bg-gradient-to-br from-[var(--bg-card-hover)] to-[var(--border)]"
                      }`}
                    >
                      {entry.name[0]?.toUpperCase()}
                    </div>

                    {/* Name */}
                    <p className={`text-sm font-bold truncate max-w-full ${isMe ? "text-tumba-300" : ""}`}>
                      {entry.name}
                    </p>
                    {entry.tag && (
                      <p className="text-[10px] text-[var(--text-secondary)] truncate max-w-full">
                        {entry.tag}
                      </p>
                    )}

                    {/* Score */}
                    <div className={`mt-2 text-xl font-extrabold ${style.text}`}>
                      {entry.wearIndex}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)]">Wear Index</p>

                    {/* Mini stats */}
                    <div className="flex gap-2 mt-2 text-[10px] text-[var(--text-secondary)]">
                      <span className="flex items-center gap-0.5">
                        <HostIcon size={10} strokeWidth={1.75} />
                        {entry.hostCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <CarIcon size={10} strokeWidth={1.75} />
                        {entry.carCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <div className="space-y-2">
            {rest.map((entry, i) => {
              const rank = i + 4;
              const pct = Math.max((entry.wearIndex / maxWear) * 100, 3);
              const isMe = entry.userId === userId;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all hover:scale-[1.005] ${
                    isMe
                      ? "border-tumba-500/30 bg-tumba-500/[0.06] shadow-[0_0_20px_rgba(192,38,211,0.06)]"
                      : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-light)]"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 shrink-0 text-center">
                    <span className={`text-sm font-bold ${isMe ? "text-tumba-400" : "text-[var(--text-secondary)]"}`}>
                      {rank}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--bg-card-hover)] to-[var(--border)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {entry.name[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <span className={`text-sm font-semibold truncate block ${isMe ? "text-tumba-300" : ""}`}>
                          {entry.name}
                        </span>
                        {entry.tag && (
                          <span className="text-[10px] text-[var(--text-secondary)] truncate block">
                            {entry.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] shrink-0 ml-2">
                        <span className="flex items-center gap-0.5">
                          <HostIcon size={11} strokeWidth={1.75} />
                          {entry.hostCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <CarIcon size={11} strokeWidth={1.75} />
                          {entry.carCount}
                        </span>
                        <span className="font-bold text-tumba-400 text-sm">{entry.wearIndex}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full animate-grow-bar bg-gradient-to-r from-tumba-700 to-tumba-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zero contributors */}
          {entries.filter((e) => e.wearIndex === 0).length > 0 && (
            <div className="mt-6 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <FlameIcon size={12} strokeWidth={1.75} className="text-[var(--text-secondary)]" />
                No contributions yet:{" "}
                {entries
                  .filter((e) => e.wearIndex === 0)
                  .map((e) => e.name)
                  .join(", ")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
