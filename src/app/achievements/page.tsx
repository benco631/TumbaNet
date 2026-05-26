"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MotionPage } from "@/components/motion";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { MONTH_NAMES } from "@/lib/achievements";
import { MedalIcon } from "@/lib/icons";
import TumbaCoinIcon from "@/components/TumbaCoinIcon";
import EmptyState from "@/components/EmptyState";

interface Winner {
  userId: string;
  userName: string;
  rewardCoins: number;
  metricValue: number | null;
  metricLabel: string | null;
}

interface AchievementRow {
  key: string;
  name: string;
  description: string;
  icon: string;
  rewardCoins: number;
  winners: Winner[];
  processed: boolean;
}

interface ApiResponse {
  month: number;
  year: number;
  achievements: AchievementRow[];
}

function chevronLeft(cls = "") {
  return (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} width={16} height={16}>
      <path d="M13 16l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function chevronRight(cls = "") {
  return (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} width={16} height={16}>
      <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AchievementsPage() {
  const { data: session } = useSession();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [data, setData]   = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = (session?.user as { id?: string })?.id;

  const fetchData = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/achievements?month=${m}&year=${y}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) fetchData(month, year);
  }, [session, month, year, fetchData]);

  function stepMonth(dir: 1 | -1) {
    let m = month + dir;
    let y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setMonth(m);
    setYear(y);
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--text-secondary)]">Please log in to view achievements.</p>
      </div>
    );
  }

  const processedCount = data?.achievements.filter((a) => a.processed && a.winners.length > 0).length ?? 0;

  return (
    <MotionPage className="max-w-2xl mx-auto px-4 py-6 bg-mesh min-h-[calc(100vh-4rem)]">

      {/* ── Header ── */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-tumba-500/20 to-neon-pink/10 border border-tumba-500/20 mb-4 shadow-[0_0_24px_rgba(192,38,211,0.1)]">
          <MedalIcon size={30} strokeWidth={1.75} className="text-tumba-400" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1">
          <span className="gradient-text">Monthly Achievements</span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Monthly prizes awarded for outstanding Tumba contributions
        </p>
      </div>

      {/* ── Month Navigator ── */}
      <div className="flex items-center justify-between mb-6 p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => stepMonth(-1)}
          className="p-2 rounded-xl hover:bg-tumba-500/10 text-[var(--text-secondary)] hover:text-tumba-400 transition-colors"
        >
          {chevronLeft()}
        </motion.button>

        <div className="text-center">
          <p className="text-base font-extrabold">{MONTH_NAMES[month - 1]} {year}</p>
          {processedCount > 0 && (
            <p className="text-[10px] text-tumba-400/80 font-semibold mt-0.5">{processedCount} achievements awarded</p>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => stepMonth(1)}
          disabled={month === now.getMonth() + 1 && year === now.getFullYear()}
          className="p-2 rounded-xl hover:bg-tumba-500/10 text-[var(--text-secondary)] hover:text-tumba-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {chevronRight()}
        </motion.button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : !data || data.achievements.every((a) => !a.processed) ? (
        <div className="card-premium">
          <EmptyState
            icon={<MedalIcon size={28} strokeWidth={1.5} className="text-tumba-400/50" />}
            title="No achievements yet"
            description={`${MONTH_NAMES[month - 1]} ${year} hasn't been processed. Check back later or ask an admin.`}
          />
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {data.achievements.map((ach) => (
            <AchievementCard key={ach.key} achievement={ach} currentUserId={userId} />
          ))}
        </motion.div>
      )}
    </MotionPage>
  );
}

// ── Achievement Card ──────────────────────────────────────────────────────

function AchievementCard({
  achievement,
  currentUserId,
}: {
  achievement: AchievementRow;
  currentUserId?: string;
}) {
  const hasWinner = achievement.winners.length > 0;
  const isMe = achievement.winners.some((w) => w.userId === currentUserId);

  return (
    <motion.div
      variants={fadeInUp}
      className={`relative overflow-hidden flex flex-col p-4 rounded-2xl border transition-all
        ${isMe
          ? "border-tumba-500/30 bg-gradient-to-br from-tumba-900/40 via-[var(--bg-card)] to-[var(--bg-card)] shadow-[0_0_20px_rgba(192,38,211,0.1)]"
          : hasWinner
          ? "border-[var(--border)] bg-[var(--bg-card)]"
          : "border-[var(--border)]/50 bg-[var(--bg-card)]/50 opacity-60"
        }`}
    >
      {/* Glow for my wins */}
      {isMe && (
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-tumba-500/10 blur-2xl pointer-events-none" />
      )}

      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl leading-none">{achievement.icon}</span>
        {achievement.rewardCoins > 0 && (
          <div className="flex items-center gap-0.5">
            <TumbaCoinIcon size={14} />
            <span className="text-[10px] font-bold text-tumba-300 tabular-nums">{achievement.rewardCoins}</span>
          </div>
        )}
        {achievement.rewardCoins === 0 && (
          <span className="text-[10px] font-semibold text-[var(--text-secondary)]">👻</span>
        )}
      </div>

      {/* Name + description */}
      <p className="text-sm font-extrabold leading-tight mb-1">{achievement.name}</p>
      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-3 flex-1">
        {achievement.description}
      </p>

      {/* Winner(s) */}
      {hasWinner ? (
        <div>
          {achievement.winners.map((w) => (
            <div key={w.userId} className={`mb-1 last:mb-0 ${w.userId === currentUserId ? "text-tumba-300" : ""}`}>
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                  {w.userName[0]?.toUpperCase()}
                </div>
                <span className="text-xs font-bold truncate">{w.userName}</span>
                {w.userId === currentUserId && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-tumba-500/20 text-tumba-400 font-bold shrink-0">You</span>
                )}
              </div>
              {w.metricLabel && (
                <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 ml-6.5 pl-px">{w.metricLabel}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-[var(--text-secondary)] italic">No winner this month</p>
      )}
    </motion.div>
  );
}
