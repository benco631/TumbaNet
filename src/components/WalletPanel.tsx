"use client";

import { useEffect, useState, useCallback } from "react";
import { ACHIEVEMENT_DEFS, MONTH_NAMES } from "@/lib/achievements";
import { CoinAmountSm } from "@/components/TumbaCoin";
import TumbaCoinIcon from "@/components/TumbaCoinIcon";

interface CoinTx {
  id: string;
  amount: number;
  reason: string;
  groupId: string | null;
  createdAt: string;
}

interface AchievementRecord {
  id: string;
  achievementKey: string;
  month: number;
  year: number;
  groupId: string | null;
  rewardCoins: number;
  metricLabel: string | null;
  createdAt: string;
}

interface WalletData {
  tumbaCoins: number;
  transactions: CoinTx[];
  achievements: AchievementRecord[];
}

function txDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function WalletPanel({
  userId,
  groupId,
}: {
  userId: string;
  groupId?: string;
}) {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const url = groupId
      ? `/api/users/${userId}/coins?groupId=${groupId}`
      : `/api/users/${userId}/coins`;
    const res = await fetch(url);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [userId, groupId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 animate-pulse h-40" />
    );
  }

  if (!data) return null;

  return (
    <div className="mt-6 space-y-4">
      {/* Balance card */}
      <div className="rounded-2xl border border-tumba-500/30 bg-tumba-500/5 p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-tumba-500/20 flex items-center justify-center shrink-0">
          <TumbaCoinIcon size={28} />
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">TumbaCoins Balance</p>
          <p className="text-3xl font-extrabold text-tumba-400">{data.tumbaCoins.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent achievements */}
      {data.achievements.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-3">Recent Achievements</p>
          <div className="space-y-2">
            {data.achievements.map((ach) => {
              const def = ACHIEVEMENT_DEFS.find((d) => d.key === ach.achievementKey);
              return (
                <div key={ach.id} className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{def?.icon ?? "🏆"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{def?.name ?? ach.achievementKey}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {MONTH_NAMES[ach.month - 1]} {ach.year}
                      {ach.metricLabel ? ` · ${ach.metricLabel}` : ""}
                    </p>
                  </div>
                  {ach.rewardCoins > 0 && (
                    <CoinAmountSm amount={ach.rewardCoins} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-3">Recent Transactions</p>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">No transactions yet.</p>
        ) : (
          <div className="space-y-2.5">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    tx.amount > 0
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {tx.amount > 0 ? "+" : "−"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] leading-snug">{tx.reason}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{txDate(tx.createdAt)}</p>
                </div>
                <span
                  className={`text-sm font-bold shrink-0 ${
                    tx.amount > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
