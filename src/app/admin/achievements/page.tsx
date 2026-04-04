"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACHIEVEMENT_DEFS, MONTH_NAMES, getAchievementDef } from "@/lib/achievements";
import { TrophyIcon, MedalIcon } from "@/lib/icons";
import { MotionPage } from "@/components/motion";
import { CoinAmountSm } from "@/components/TumbaCoin";
import TumbaCoinIcon from "@/components/TumbaCoinIcon";

interface AwardResult {
  achievementKey: string;
  achievementName: string;
  achievementIcon: string;
  userId: string;
  rewardCoins: number;
  metricValue?: number;
  metricLabel?: string;
  alreadyAwarded: boolean;
}

interface RunResponse {
  results: AwardResult[];
  newCount: number;
  totalCoins: number;
  summary: string;
}

// Enrich results with user names by joining from a users endpoint
// We'll resolve names from the results list using a simple map
export default function AdminAchievementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({}); // id → name

  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && !isAdmin) { router.push("/"); return; }
  }, [status, isAdmin, router]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) => {
        const map: Record<string, string> = {};
        for (const u of data) map[u.id] = u.name;
        setUsers(map);
      })
      .catch(() => {});
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const res = await fetch("/api/admin/achievements/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Unknown error"); return; }
      setRunResult(data);
    } catch {
      setError("Network error");
    } finally {
      setRunning(false);
    }
  };

  if (status === "loading" || !isAdmin) return null;

  const newResults  = runResult?.results.filter((r) => !r.alreadyAwarded) ?? [];
  const skipResults = runResult?.results.filter((r) =>  r.alreadyAwarded) ?? [];

  return (
    <MotionPage className="max-w-3xl mx-auto px-4 py-6 bg-mesh min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-tumba-500/20 to-neon-pink/10 border border-tumba-500/20 flex items-center justify-center">
          <MedalIcon size={22} strokeWidth={1.75} className="text-tumba-400" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold gradient-text">Monthly Achievements</h1>
          <p className="text-xs text-[var(--text-secondary)]">Admin — calculate and award monthly prizes</p>
        </div>
      </div>

      {/* Run Panel */}
      <div className="card-premium p-5 mb-6">
        <h2 className="text-sm font-bold mb-4">Run Achievement Calculation</h2>

        <div className="flex flex-wrap gap-3 mb-5">
          {/* Month picker */}
          <div className="flex flex-col gap-1.5">
            <label className="section-label">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-tumba-500/50 min-w-[140px]"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          {/* Year picker */}
          <div className="flex flex-col gap-1.5">
            <label className="section-label">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-tumba-500/50"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Achievement definitions preview */}
        <div className="mb-5 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
          <p className="section-label mb-2">Achievements to process ({ACHIEVEMENT_DEFS.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {ACHIEVEMENT_DEFS.map((d) => (
              <span key={d.key} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-tumba-500/10 text-tumba-300 border border-tumba-500/15">
                {d.icon} {d.name}
              </span>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleRun}
          disabled={running}
          className="btn-primary w-full"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : (
            <>🏆 Run Achievements for {MONTH_NAMES[month - 1]} {year}</>
          )}
        </motion.button>

        {error && (
          <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {runResult && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {/* Summary banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-tumba-900/50 via-[var(--bg-card)] to-[var(--bg-card)] border border-tumba-500/20 mb-4">
              <p className="text-sm font-semibold text-tumba-300">{runResult.summary}</p>
              <div className="flex gap-4 mt-2">
                <div>
                  <p className="section-label">New awards</p>
                  <p className="text-xl font-extrabold text-[var(--text-primary)]">{runResult.newCount}</p>
                </div>
                <div>
                  <p className="section-label">Total TC awarded</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TumbaCoinIcon size={22} />
                    <span className="text-xl font-extrabold text-tumba-300">{runResult.totalCoins}</span>
                  </div>
                </div>
                <div>
                  <p className="section-label">Already awarded (skipped)</p>
                  <p className="text-xl font-extrabold text-[var(--text-secondary)]">{skipResults.length}</p>
                </div>
              </div>
            </div>

            {/* New awards */}
            {newResults.length > 0 && (
              <div className="mb-4">
                <p className="section-label mb-2">✅ Newly awarded</p>
                <div className="space-y-2">
                  {newResults.map((r, i) => {
                    const def = getAchievementDef(r.achievementKey);
                    return (
                      <motion.div
                        key={`${r.achievementKey}-${r.userId}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-tumba-500/15 bg-tumba-500/[0.04]"
                      >
                        <span className="text-2xl leading-none">{r.achievementIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{r.achievementName}</p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {users[r.userId] || r.userId}
                            {r.metricLabel && <> · {r.metricLabel}</>}
                          </p>
                        </div>
                        {r.rewardCoins > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <TumbaCoinIcon size={18} />
                            <span className="text-sm font-extrabold text-tumba-300">+{r.rewardCoins}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skipped */}
            {skipResults.length > 0 && (
              <div>
                <p className="section-label mb-2 text-[var(--text-secondary)]">⏭ Already awarded (skipped)</p>
                <div className="space-y-1.5">
                  {skipResults.map((r) => (
                    <div
                      key={`${r.achievementKey}-${r.userId}-skip`}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] opacity-60"
                    >
                      <span className="text-lg leading-none">{r.achievementIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{r.achievementName}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {users[r.userId] || r.userId}
                        </p>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] shrink-0">skipped</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {runResult.results.length === 0 && (
              <div className="card-premium py-10 text-center">
                <p className="text-lg mb-1">🤷</p>
                <p className="text-sm font-semibold">No winners found</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  No qualifying activity was recorded for {MONTH_NAMES[month - 1]} {year}.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}
